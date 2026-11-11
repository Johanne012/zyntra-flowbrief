import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
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

const allowedOrigin = (origin:string) => {
  try {
    const u = new URL(origin);
    return u.protocol === "https:" &&
      (u.hostname === "zyntra-flowbrief.vercel.app" ||
       u.hostname === "zyntra-flowbrief-v2.vercel.app" ||
       (u.hostname.startsWith("zyntra-flowbrief-v2-") && u.hostname.endsWith(".vercel.app")));
  } catch { return false; }
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (origin && !allowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403);
  const corsHeaders: HeadersInit = origin ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" } : {};
  const reply = (body: unknown, status = 200) => json(body, status, corsHeaders);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return reply({ error: "Authentication required" }, 401);

  const url = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const publicKey = envKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secretKey = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publicKey || !secretKey) return reply({ error: "Service unavailable" }, 503);

  const bearer = match[1];
  const auth = await fetch(url + "/auth/v1/user", {
    headers: { apikey: publicKey, Authorization: "Bearer " + bearer },
  });
  if (!auth.ok) return reply({ error: "Invalid or expired session" }, 401);
  const user = await auth.json();
  if (!user?.id) return reply({ error: "Invalid session" }, 401);

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > 8 * 1024) return reply({ error: "Request too large" }, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "Invalid JSON object" }, 400);
  } catch { return reply({ error: "Invalid JSON" }, 400); }

  const organizationId = text(body.organization_id, 64);
  const assetType = text(body.asset_type, 20);
  const assetCode = text(body.asset_code, 24).toUpperCase();
  const network = text(body.network, 64) || null;
  const amountAtoms = text(body.amount_atoms, 78);
  const idempotencyKey = text(body.idempotency_key, 128);
  const orderReference = text(body.order_reference, 120) || null;
  const requestedMethod = text(body.payment_method, 64).toLowerCase() || null;
  const customerCountryCode = text(body.customer_country_code, 2).toUpperCase() || null;

  if (!/^[0-9a-f-]{36}$/i.test(organizationId) ||
      !["fiat", "crypto", "stablecoin"].includes(assetType) ||
      !/^[A-Z0-9._-]{2,24}$/.test(assetCode) ||
      !/^[1-9][0-9]{0,77}$/.test(amountAtoms) ||
      idempotencyKey.length < 12 || !/^[A-Za-z0-9._:-]{12,128}$/.test(idempotencyKey) ||
      (requestedMethod !== null && !/^[a-z0-9_-]{2,64}$/.test(requestedMethod)) ||
      (customerCountryCode !== null && !/^[A-Z]{2}$/.test(customerCountryCode))) {
    return reply({ error: "Invalid payment intent fields" }, 400);
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
    if (!membershipResponse.ok) return reply({ error: "Authorization check unavailable" }, 503);
    const memberships = await membershipResponse.json();
    const role = memberships?.[0]?.role;
    if (!["owner", "admin", "finance", "operations"].includes(role)) {
      return reply({ error: "Not authorized for this organization" }, 403);
    }

    const orgResponse = await fetch(
      rest("zyntra_organizations?select=id,status,incorporation_country&id=eq." + encodeURIComponent(organizationId)),
      { headers: adminHeaders },
    );
    if (!orgResponse.ok) return reply({ error: "Organization check unavailable" }, 503);
    const organizations = await orgResponse.json();
    const organization = organizations?.[0];
    if (organization?.status !== "active") return reply({ error: "Organization is not active" }, 409);
    if (!organization.incorporation_country) return reply({ error: "Organization legal country is not verified" }, 409);

    const assetFilter = "asset_type=eq." + encodeURIComponent(assetType) +
      "&code=eq." + encodeURIComponent(assetCode) +
      (network ? "&network=eq." + encodeURIComponent(network) : "&network=is.null");
    const assetResponse = await fetch(rest("zyntra_assets?select=id,decimals,is_active&" + assetFilter), {
      headers: adminHeaders,
    });
    if (!assetResponse.ok) return reply({ error: "Asset lookup unavailable" }, 503);
    const assets = await assetResponse.json();
    const asset = assets?.[0];
    if (!asset?.id) return reply({ error: "Asset is not configured" }, 409);

    const existingResponse = await fetch(
      rest("zyntra_payment_intents?select=id,amount_atoms_text:amount_atoms::text,asset_id,provider_route_id,status,order_reference,requested_method,customer_country_code&organization_id=eq." +
        encodeURIComponent(organizationId) + "&idempotency_key=eq." + encodeURIComponent(idempotencyKey)),
      { headers: adminHeaders },
    );
    if (!existingResponse.ok) return reply({ error: "Idempotency lookup unavailable" }, 503);
    const existing = (await existingResponse.json())?.[0];
    if (existing) {
      if (String(existing.amount_atoms_text) !== amountAtoms || existing.asset_id !== asset.id ||
          (existing.order_reference ?? null) !== orderReference ||
          (existing.requested_method ?? null) !== requestedMethod ||
          (existing.customer_country_code ?? null) !== customerCountryCode) {
        return reply({ error: "Idempotency key already used with different parameters" }, 409);
      }
      return reply({ ok: true, payment_intent: existing, reused: true }, 200);
    }

    if (asset.is_active !== true) return reply({ error: "Asset is not enabled" }, 409);

    const routeResponse = await fetch(
      rest("zyntra_provider_routes?select=id,provider_id,priority,created_at,min_amount_atoms_text:min_amount_atoms::text,max_amount_atoms_text:max_amount_atoms::text,payment_method,customer_country_code&organization_id=eq." +
        encodeURIComponent(organizationId) + "&asset_id=eq." + encodeURIComponent(asset.id) +
        "&merchant_country_code=eq." + encodeURIComponent(organization.incorporation_country) +
        "&enabled=eq.true&approval_status=eq.approved"),
      { headers: adminHeaders },
    );
    if (!routeResponse.ok) return reply({ error: "Provider route lookup unavailable" }, 503);
    let routes = (await routeResponse.json()).filter((route: any) =>
      (!requestedMethod || route.payment_method === requestedMethod) &&
      (customerCountryCode ? (!route.customer_country_code || route.customer_country_code === customerCountryCode) : !route.customer_country_code)
    );
    const providerIds = [...new Set(routes.map((route: any) => route.provider_id))];
    if (providerIds.length === 0) return reply({ error: "No approved payment route for this organization, asset and country" }, 409);

    const providerResponse = await fetch(
      rest("zyntra_payment_providers?select=id&enabled=eq.true&id=in.(" + providerIds.join(",") + ")"),
      { headers: adminHeaders },
    );
    if (!providerResponse.ok) return reply({ error: "Provider status lookup unavailable" }, 503);
    const enabledProviderIds = new Set((await providerResponse.json()).map((provider: any) => provider.id));
    routes = routes.filter((route: any) => enabledProviderIds.has(route.provider_id));
    routes.sort((a: any, b: any) => Number(a.priority ?? 100) - Number(b.priority ?? 100) ||
      String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")) ||
      String(a.id).localeCompare(String(b.id)));
    const amount = BigInt(amountAtoms);
    const eligibleRoute = routes.find((route: any) =>
      amount >= BigInt(String(route.min_amount_atoms_text)) &&
      (route.max_amount_atoms_text === null || amount <= BigInt(String(route.max_amount_atoms_text)))
    );
    if (!eligibleRoute) return reply({ error: "No enabled provider route supports this amount" }, 409);

    const insertResponse = await fetch(rest("zyntra_payment_intents"), {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify({
        organization_id: organizationId,
        created_by: user.id,
        order_reference: orderReference,
        amount_atoms: amountAtoms,
        asset_id: asset.id,
        provider_route_id: eligibleRoute.id,
        idempotency_key: idempotencyKey,
        requested_method: requestedMethod,
        customer_country_code: customerCountryCode,
        status: "created",
      }),
    });
    if (insertResponse.status === 409) {
      const retry = await fetch(
        rest("zyntra_payment_intents?select=id,amount_atoms_text:amount_atoms::text,asset_id,provider_route_id,status,order_reference,requested_method,customer_country_code&organization_id=eq." +
          encodeURIComponent(organizationId) + "&idempotency_key=eq." + encodeURIComponent(idempotencyKey)),
        { headers: adminHeaders },
      );
      if (retry.ok) {
        const duplicate = (await retry.json())?.[0];
        if (duplicate && String(duplicate.amount_atoms_text) === amountAtoms && duplicate.asset_id === asset.id &&
            (duplicate.order_reference ?? null) === orderReference &&
            (duplicate.requested_method ?? null) === requestedMethod &&
            (duplicate.customer_country_code ?? null) === customerCountryCode) {
          return reply({ ok: true, payment_intent: duplicate, reused: true }, 200);
        }
      }
      return reply({ error: "Idempotency key already used with different parameters" }, 409);
    }
    if (!insertResponse.ok) {
      console.error("Payment intent insert failed", insertResponse.status, (await insertResponse.text()).slice(0, 300));
      return reply({ error: "Could not create payment intent" }, 502);
    }
    const created = (await insertResponse.json())?.[0];
    return reply({ ok: true, payment_intent: created, reused: false }, 201);
  } catch (error) {
    console.error("Payment intent error", error);
    return reply({ error: "Unexpected server error" }, 500);
  }
});
