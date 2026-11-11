const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });

const apiBase = () => Deno.env.get("CHARGILY_MODE") === "live"
  ? "https://pay.chargily.net/api/v2"
  : "https://pay.chargily.net/test/api/v2";

const getAdmin = () => {
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const key = keys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!key || !url) throw new Error("Supabase admin credentials are missing");
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) headers.Authorization = "Bearer " + key;
  return { url: url.replace(/\/$/, ""), headers };
};

const isAllowedOrigin = (origin: string) => {
  try {
    const u = new URL(origin);
    return u.protocol === "https:" &&
      (u.hostname === "zyntra-flowbrief.vercel.app" ||
       (u.hostname.startsWith("zyntra-flowbrief-") && u.hostname.endsWith(".vercel.app")));
  } catch { return false; }
};

const hmacSha256Hex = async (secret: string, payload: string) => {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

async function createCheckout(req: Request, cors: HeadersInit) {
  const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
  const expected = keys.default ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!expected || req.headers.get("apikey") !== expected) return json({ error: "Unauthorized" }, 401, cors);

  const secret = Deno.env.get("CHARGILY_API_SECRET_KEY");
  if (!secret) return json({ error: "بوابة الدفع لم تُفعّل بعد. يرجى التواصل معنا." }, 503, cors);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400, cors); }
  const orderNumber = typeof body.order_number === "string" ? body.order_number.trim() : "";
  if (!/^ZYN-[A-F0-9]{10}$/.test(orderNumber)) return json({ error: "رقم الطلب غير صالح." }, 400, cors);

  const { url, headers } = getAdmin();
  const found = await fetch(
    url + "/rest/v1/zyntra_orders?select=id,order_number,customer_name,contact,package_code,order_status,payment_status,payment_amount_dzd,chargily_checkout_id,checkout_request_started_at&order_number=eq." + encodeURIComponent(orderNumber) + "&limit=1",
    { headers },
  );
  if (!found.ok) return json({ error: "تعذر التحقق من الطلب." }, 502, cors);
  const rows = await found.json();
  const order = rows[0];
  if (!order) return json({ error: "الطلب غير موجود." }, 404, cors);
  if (order.order_status !== "awaiting_payment" || !Number.isSafeInteger(order.payment_amount_dzd) || order.payment_amount_dzd <= 0) {
    return json({ error: "لم يتم اعتماد مبلغ هذا الطلب بعد. انتظر تأكيد السعر من فريق ZYNTRA." }, 409, cors);
  }
  if (order.payment_status === "verified") return json({ error: "هذا الطلب مدفوع بالفعل." }, 409, cors);
  if (order.chargily_checkout_id) return json({ error: "تم إنشاء رابط دفع لهذا الطلب بالفعل. تواصل معنا إذا انتهت صلاحيته." }, 409, cors);
  if (order.checkout_request_started_at && Date.now() - Date.parse(order.checkout_request_started_at) < 10 * 60 * 1000) {
    return json({ error: "يجري تجهيز رابط الدفع لهذا الطلب. حاول بعد قليل." }, 409, cors);
  }

  // Atomic compare-and-set prevents concurrent duplicate checkouts.
  const claim = await fetch(
    url + "/rest/v1/zyntra_orders?id=eq." + encodeURIComponent(order.id) + "&chargily_checkout_id=is.null&checkout_request_started_at=is.null",
    { method: "PATCH", headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ checkout_request_started_at: new Date().toISOString(), payment_provider: "chargily" }) },
  );
  if (!claim.ok) return json({ error: "تعذر حجز عملية الدفع." }, 502, cors);
  const claimed = await claim.json();
  if (!claimed.length) return json({ error: "هناك طلب دفع قيد المعالجة بالفعل." }, 409, cors);

  const site = Deno.env.get("ZYNTRA_PUBLIC_URL") ?? "https://zyntra-flowbrief.vercel.app";
  const mode = Deno.env.get("CHARGILY_MODE") === "live" ? "live" : "test";
  try {
    const response = await fetch(apiBase() + "/checkouts", {
      method: "POST",
      headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: order.payment_amount_dzd,
        currency: "dzd",
        success_url: site + "/payment-result.html?status=return&order=" + encodeURIComponent(orderNumber),
        failure_url: site + "/payment-result.html?status=failed&order=" + encodeURIComponent(orderNumber),
        locale: "ar",
        metadata: { order_number: orderNumber, order_id: order.id, provider: "zyntra" },
      }),
    });
    const checkout = await response.json();
    if (!response.ok || typeof checkout.checkout_url !== "string" || typeof checkout.id !== "string") {
      console.error("Chargily checkout creation failed:", response.status, JSON.stringify(checkout).slice(0, 500));
      await fetch(url + "/rest/v1/zyntra_orders?id=eq." + encodeURIComponent(order.id), {
        method: "PATCH", headers, body: JSON.stringify({ checkout_request_started_at: null }),
      });
      return json({ error: "تعذر إنشاء رابط الدفع. حاول لاحقًا أو تواصل معنا." }, 502, cors);
    }
    const saved = await fetch(url + "/rest/v1/zyntra_orders?id=eq." + encodeURIComponent(order.id), {
      method: "PATCH", headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ chargily_checkout_id: checkout.id }),
    });
    if (!saved.ok) {
      console.error("Could not save Chargily checkout id:", saved.status, (await saved.text()).slice(0, 300));
      return json({ error: "تم إنشاء جلسة دفع لكن تعذر ربطها بالطلب. يرجى التواصل مع الدعم قبل إعادة المحاولة." }, 502, cors);
    }
    return json({ ok: true, checkout_url: checkout.checkout_url, mode }, 200, cors);
  } catch (error) {
    console.error("Chargily checkout error:", error);
    return json({ error: "حدث خطأ أثناء تجهيز الدفع." }, 502, cors);
  }
}

async function handleWebhook(req: Request) {
  const secret = Deno.env.get("CHARGILY_API_SECRET_KEY");
  if (!secret) return json({ error: "Webhook secret is not configured" }, 503);
  const signature = req.headers.get("signature") ?? "";
  const raw = await req.text();
  if (!signature || raw.length > 64 * 1024) return json({ error: "Invalid webhook" }, 400);
  const expected = await hmacSha256Hex(secret, raw);
  if (!safeEqual(signature.toLowerCase(), expected)) return json({ error: "Invalid signature" }, 403);

  let event: Record<string, unknown>;
  try { event = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (event.type !== "checkout.paid") return json({ received: true }, 200);

  const checkout = event.data as Record<string, unknown> | undefined;
  const metadata = checkout?.metadata as Record<string, unknown> | null | undefined;
  const orderNumber = typeof metadata?.order_number === "string" ? metadata.order_number : "";
  const checkoutId = typeof checkout?.id === "string" ? checkout.id : "";
  const amount = checkout?.amount;
  const currency = checkout?.currency;
  const paid = checkout?.status === "paid";
  const live = event.livemode === true || event.livemode === "true";
  const expectedLive = Deno.env.get("CHARGILY_MODE") === "live";
  if (!orderNumber || !checkoutId || !paid || currency !== "dzd" || live !== expectedLive) {
    console.error("Chargily webhook rejected due to checkout state/mode mismatch");
    return json({ error: "Checkout mismatch" }, 400);
  }

  const { url, headers } = getAdmin();
  const lookup = await fetch(
    url + "/rest/v1/zyntra_orders?select=id,payment_amount_dzd,payment_status,order_status&order_number=eq." +
      encodeURIComponent(orderNumber) + "&chargily_checkout_id=eq." + encodeURIComponent(checkoutId) + "&limit=1",
    { headers },
  );
  if (!lookup.ok) return json({ error: "Order lookup failed" }, 502);
  const rows = await lookup.json();
  const order = rows[0];
  if (!order) return json({ error: "Order not found" }, 404);
  if (Number(order.payment_amount_dzd) !== Number(amount)) {
    console.error("Chargily amount mismatch for order", orderNumber);
    return json({ error: "Amount mismatch" }, 400);
  }
  if (order.payment_status === "verified") return json({ received: true, duplicate: true }, 200);

  const update = await fetch(
    url + "/rest/v1/zyntra_orders?id=eq." + encodeURIComponent(order.id) +
      "&chargily_checkout_id=eq." + encodeURIComponent(checkoutId),
    { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ payment_status: "verified", order_status: "paid" }) },
  );
  if (!update.ok) {
    console.error("Chargily paid webhook DB update failed:", update.status, (await update.text()).slice(0, 300));
    return json({ error: "Could not update order" }, 502);
  }
  return json({ received: true }, 200);
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/webhook")) {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    return await handleWebhook(req);
  }
  const origin = req.headers.get("origin") ?? "";
  if (origin && !isAllowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403);
  const cors: HeadersInit = origin ? {
    "Access-Control-Allow-Origin": origin, "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey",
  } : {};
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);
  if (Number(req.headers.get("content-length") ?? "0") > 8 * 1024) return json({ error: "Request too large" }, 413, cors);
  return await createCheckout(req, cors);
});
