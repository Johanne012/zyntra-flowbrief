import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const envKey = (jsonName: string, legacyName: string) => {
  try {
    const parsed = JSON.parse(Deno.env.get(jsonName) ?? "{}");
    if (typeof parsed.default === "string") return parsed.default;
  } catch { /* use legacy env fallback */ }
  return Deno.env.get(legacyName) ?? "";
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ error: "Authentication required" }, 401);

  const url = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const publicKey = envKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secretKey = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publicKey || !secretKey) return json({ error: "Service unavailable" }, 503);

  const bearer = match[1];
  const auth = await fetch(url + "/auth/v1/user", {
    headers: { apikey: publicKey, Authorization: "Bearer " + bearer },
  });
  if (!auth.ok) return json({ error: "Invalid or expired session" }, 401);
  const user = await auth.json();
  if (!user?.id) return json({ error: "Invalid session" }, 401);

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > 8 * 1024) return json({ error: "Request too large" }, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid JSON object" }, 400);
  } catch { return json({ error: "Invalid JSON" }, 400); }

  const organizationId = text(body.organization_id, 64);
  const assetType = text(body.asset_type, 20);
  const assetCode = text(body.asset_code, 24).toUpperCase();
  const network = text(body.network, 64) || null;
  const amountAtoms = text(body.amount_atoms, 78);
  const idempotencyKey = text(body.idempotency_key, 128);
  const orderReference = text(body.order_reference, 120) || null;

  if (!/^[0-9a-f-]{36}$/i.test(organizationId) ||
      !["fiat", "crypto", "stablecoin"].includes(assetType) ||
      !/^[A-Z0-9._-]{2,24}$/.test(assetCode) ||
      !/^[1-9][0-9]{0,77}$/.test(amountAtoms) ||
      idempotencyKey.length < 12 || !/^[A-Za-z0-9._:-]{12,128}$/.test(idempotencyKey)) {
    return json({ error: "Invalid payment intent fields" }, 400);
  }

  const adminHeaders: Record<string, string> = {
    apikey: secretKey,
    "Content-Type": "application/json",
  };
  if (!secretKey.startsWith("sb_secret_")) adminHeaders.Authorization = "Bearer " + secretKey;

  const rest = (path: string) => url + "/rest/v1/" + path;
  try {
    const membershipUrl = rest(
      "zyntra_organization_members?select=role&organization_id=eq." +
      encodeURIComponent(organizationId) + "&user_id=eq." + encodeURIComponent(user.id),
    );
    const membershipResponse = await fetch(membershipUrl, { headers: adminHeaders });
    if (!membershipResponse.ok) return json({ error: "Authorization check unavailable" }, 503);
    const memberships = await membershipResponse.json();
    const role = memberships?.[0]?.role;
    if (!["owner", "admin", "finance", "operations"].includes(role)) {
      return json({ error: "Not authorized for this organization" }, 403);
    }

    const orgResponse = await fetch(
      rest("zyntra_organizations?select=id,status&id=eq." + encodeURIComponent(organizationId)),
      { headers: adminHeaders },
    );
    if (!orgResponse.ok) return json({ error: "Organization check unavailable" }, 503);
    const organizations = await orgResponse.json();
    if (organizations?.[0]?.status !== "active") return json({ error: "Organization is not active" }, 409);

    const assetFilter = "asset_type=eq." + encodeURIComponent(assetType) +
      "&code=eq." + encodeURIComponent(assetCode) +
      (network ? "&network=eq." + encodeURIComponent(network) : "&network=is.null");
    const assetResponse = await fetch(rest("zyntra_assets?select=id,decimals,is_active&" + assetFilter), {
      headers: adminHeaders,
    });
    if (!assetResponse.ok) return json({ error: "Asset lookup unavailable" }, 503);
    const assets = await assetResponse.json();
    const asset = assets?.[0];
    if (!asset?.id || asset.is_active !== true) return json({ error: "Asset or payment route is not enabled" }, 409);

    const existingResponse = await fetch(
      rest("zyntra_payment_intents?select=id,amount_atoms,asset_id,status,order_reference&organization_id=eq." +
        encodeURIComponent(organizationId) + "&idempotency_key=eq." + encodeURIComponent(idempotencyKey)),
      { headers: adminHeaders },
    );
    if (!existingResponse.ok) return json({ error: "Idempotency lookup unavailable" }, 503);
    const existing = (await existingResponse.json())?.[0];
    if (existing) {
      if (String(existing.amount_atoms) !== amountAtoms || existing.asset_id !== asset.id ||
          (existing.order_reference ?? null) !== orderReference) {
        return json({ error: "Idempotency key already used with different parameters" }, 409);
      }
      return json({ ok: true, payment_intent: existing, reused: true }, 200);
    }

    const insertResponse = await fetch(rest("zyntra_payment_intents"), {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify({
        organization_id: organizationId,
        created_by: user.id,
        order_reference: orderReference,
        amount_atoms: amountAtoms,
        asset_id: asset.id,
        idempotency_key: idempotencyKey,
        status: "created",
      }),
    });
    if (insertResponse.status === 409) {
      const retry = await fetch(
        rest("zyntra_payment_intents?select=id,amount_atoms,asset_id,status,order_reference&organization_id=eq." +
          encodeURIComponent(organizationId) + "&idempotency_key=eq." + encodeURIComponent(idempotencyKey)),
        { headers: adminHeaders },
      );
      if (retry.ok) {
        const duplicate = (await retry.json())?.[0];
        if (duplicate && String(duplicate.amount_atoms) === amountAtoms && duplicate.asset_id === asset.id &&
            (duplicate.order_reference ?? null) === orderReference) {
          return json({ ok: true, payment_intent: duplicate, reused: true }, 200);
        }
      }
      return json({ error: "Idempotency key already used with different parameters" }, 409);
    }
    if (!insertResponse.ok) {
      console.error("Payment intent insert failed", insertResponse.status, (await insertResponse.text()).slice(0, 300));
      return json({ error: "Could not create payment intent" }, 502);
    }
    const created = (await insertResponse.json())?.[0];
    return json({ ok: true, payment_intent: created, reused: false }, 201);
  } catch (error) {
    console.error("Payment intent error", error);
    return json({ error: "Unexpected server error" }, 500);
  }
});
