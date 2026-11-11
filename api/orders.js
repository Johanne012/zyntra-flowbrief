const crypto = require("node:crypto");

const PACKAGES = new Set([
  "starter_pilot",
  "starter",
  "growth",
  "pro",
  "export",
  "starter_maintenance",
]);

function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const length = Number(req.headers["content-length"] || 0);
  if (length > 12 * 1024) return json(res, 413, { error: "Request too large" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (clean(body.website, 200)) return json(res, 200, { ok: true });

  const customer_name = clean(body.name, 120);
  const contact = clean(body.contact, 180);
  const market = clean(body.market, 80);
  const package_code = clean(body.package, 40);
  const brief = clean(body.brief, 3000);
  const payment_txid = clean(body.txid, 160) || null;

  if (customer_name.length < 2 || contact.length < 3 ||
      market.length < 1 || !PACKAGES.has(package_code) ||
      brief.length < 10 || (payment_txid && payment_txid.length < 8)) {
    return json(res, 400, { error: "يرجى مراجعة الحقول المطلوبة والتأكد من اكتمالها." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return json(res, 503, { error: "استقبال الطلبات غير مهيأ بعد. يرجى المحاولة لاحقًا." });
  }

  const order_number = "ZYN-" + crypto.randomBytes(5).toString("hex").toUpperCase();
  const record = {
    order_number,
    customer_name,
    contact,
    market,
    package_code,
    brief,
    payment_txid,
    payment_status: payment_txid ? "submitted_unverified" : "not_submitted",
    order_status: "received",
    source: "website",
  };

  try {
    const response = await fetch(
      supabaseUrl.replace(/\/$/, "") + "/rest/v1/zyntra_orders",
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: "Bearer " + serviceKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(record),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("ZYNTRA order insert failed:", response.status, detail.slice(0, 500));
      return json(res, 502, { error: "تعذر حفظ الطلب الآن. يرجى المحاولة لاحقًا." });
    }

    if (process.env.RESEND_API_KEY && process.env.ORDER_NOTIFICATION_EMAIL && process.env.EMAIL_FROM) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + process.env.RESEND_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM,
            to: [process.env.ORDER_NOTIFICATION_EMAIL],
            subject: "طلب ZYNTRA جديد: " + order_number,
            text: [
              "رقم الطلب: " + order_number,
              "الاسم: " + customer_name,
              "التواصل: " + contact,
              "السوق: " + market,
              "الباقة: " + package_code,
              "TxID (غير مؤكد): " + (payment_txid || "غير مقدم"),
              "",
              brief,
            ].join("\n"),
          }),
        });
      } catch (emailError) {
        console.error("ZYNTRA notification email failed:", emailError.message);
      }
    }

    return json(res, 201, {
      ok: true,
      order_number,
      payment_status: record.payment_status,
      message: "تم استلام طلبك وحفظه. إرسال TxID لا يعني تأكيد الدفع.",
    });
  } catch (error) {
    console.error("ZYNTRA order intake error:", error.message);
    return json(res, 500, { error: "حدث خطأ غير متوقع أثناء حفظ الطلب." });
  }
};
