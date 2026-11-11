const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const allowedOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    return url.protocol === "https:" &&
      (url.hostname === "zyntra-flowbrief.vercel.app" ||
       (url.hostname.startsWith("zyntra-flowbrief-") && url.hostname.endsWith(".vercel.app")));
  } catch {
    return false;
  }
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (origin && !allowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403);

  const corsHeaders: HeadersInit = origin
    ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, apikey" }
    : {};

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 12 * 1024) return json({ error: "Request too large" }, 413, corsHeaders);

  const publishable = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
  const expectedPublicKey = publishable.default ?? Deno.env.get("SUPABASE_ANON_KEY");
  const providedKey = req.headers.get("apikey");
  if (!expectedPublicKey || providedKey !== expectedPublicKey) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, corsHeaders);
  }

  if (clean(body.website, 200)) return json({ ok: true }, 200, corsHeaders);

  const customer_name = clean(body.name, 120);
  const contact = clean(body.contact, 180);
  const market = clean(body.market, 80);
  const package_code = clean(body.package, 40);
  const brief = clean(body.brief, 3000);
  const payment_txid = clean(body.txid, 160) || null;
  const allowedPackages = new Set(["starter_pilot", "starter", "growth", "pro", "export", "starter_maintenance"]);

  if (customer_name.length < 2 || contact.length < 3 || !market ||
      !allowedPackages.has(package_code) || brief.length < 10 ||
      (payment_txid && payment_txid.length < 8)) {
    return json({ error: "يرجى مراجعة الحقول المطلوبة والتأكد من اكتمالها." }, 400, corsHeaders);
  }

  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const adminKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!adminKey || !supabaseUrl) return json({ error: "الخدمة غير مهيأة بعد." }, 503, corsHeaders);

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientIp = req.headers.get("cf-connecting-ip") ?? forwarded ?? "unknown";
  const clientHash = await sha256(clientIp);
  const apiBase = supabaseUrl.replace(/\/$/, "");
  const adminHeaders: Record<string, string> = { apikey: adminKey, "Content-Type": "application/json" };
  if (!adminKey.startsWith("sb_secret_")) adminHeaders.Authorization = "Bearer " + adminKey;

  try {
    const limitResponse = await fetch(apiBase + "/rest/v1/rpc/check_zyntra_order_rate_limit", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ p_client_hash: clientHash }),
    });
    if (!limitResponse.ok) {
      console.error("Rate limit check failed:", limitResponse.status, (await limitResponse.text()).slice(0, 300));
      return json({ error: "تعذر التحقق من الطلب. حاول لاحقًا." }, 503, corsHeaders);
    }
    if (await limitResponse.json() !== true) return json({ error: "تم تجاوز عدد المحاولات. حاول بعد 15 دقيقة." }, 429, corsHeaders);

    const order_number = "ZYN-" + crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
    const record = {
      order_number, customer_name, contact, market, package_code, brief, payment_txid,
      payment_status: payment_txid ? "submitted_unverified" : "not_submitted",
      order_status: "received", source: "website",
    };
    const insertResponse = await fetch(apiBase + "/rest/v1/zyntra_orders", {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify(record),
    });
    if (!insertResponse.ok) {
      console.error("Order insert failed:", insertResponse.status, (await insertResponse.text()).slice(0, 500));
      return json({ error: "تعذر حفظ الطلب الآن. يرجى المحاولة لاحقًا." }, 502, corsHeaders);
    }

    if (Deno.env.get("RESEND_API_KEY") && Deno.env.get("ORDER_NOTIFICATION_EMAIL") && Deno.env.get("EMAIL_FROM")) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": "Bearer " + Deno.env.get("RESEND_API_KEY"), "Content-Type": "application/json" },
          body: JSON.stringify({
            from: Deno.env.get("EMAIL_FROM"),
            to: [Deno.env.get("ORDER_NOTIFICATION_EMAIL")],
            subject: "طلب ZYNTRA جديد: " + order_number,
            text: ["رقم الطلب: " + order_number, "الاسم: " + customer_name, "التواصل: " + contact,
              "السوق: " + market, "الباقة: " + package_code,
              "TxID (غير مؤكد): " + (payment_txid ?? "غير مقدم"), "", brief].join("\n"),
          }),
        });
      } catch (error) {
        console.error("Notification failed:", error);
      }
    }

    return json({
      ok: true, order_number, payment_status: record.payment_status,
      message: "تم استلام طلبك وحفظه. إرسال TxID لا يعني تأكيد الدفع.",
    }, 201, corsHeaders);
  } catch (error) {
    console.error("Order intake failed:", error);
    return json({ error: "حدث خطأ غير متوقع أثناء حفظ الطلب." }, 500, corsHeaders);
  }
});
