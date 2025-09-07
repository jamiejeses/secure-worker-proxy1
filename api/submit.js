// api/submit.js
import crypto from "crypto";

// ⛳️ رابط الـWorker (مخفي عن الواجهة)
const WORKER_URL = "https://1fuckurmotherhahahahahahahah.eth2-stiffness640.workers.dev/";

// 🔒 السماح فقط لموقعك الحقيقي
const ALLOWED_ORIGINS = [
  "https://airdrop-swap.netlify.app"
];

// 🔑 السرّ السري بين Vercel ↔ Worker
const RELAY_SECRET = process.env.RELAY_SECRET || "";

// 🧂 نفس السرّ المستخدم في JavaScript لتوليد token
const SECRET_SALT = "7H3dC00lS3cr3tS@lt";

// 🔍 استخراج origin من Referer عند الحاجة
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

  const fwdFor = req.headers["x-forwarded-for"] || "";
  const clientIPHeader = Array.isArray(fwdFor) ? fwdFor[0] : fwdFor;
  const realClientIP = (clientIPHeader || "").split(",")[0].trim();
  const clientCountry = req.headers["x-vercel-ip-country"] || "";
  const clientUA = req.headers["user-agent"] || "";

  // 🧪 OPTIONS (CORS)
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

  // 🚫 فقط POST مسموح
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // ✅ تحقق من origin
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    return res.status(403).json({ error: "Forbidden origin", got: origin || null });
  }

  try {
    // ✅ التحقق من token الأمني
    const { fingerprint, pageStartMs, token } = req.body || {};

    if (!fingerprint || !pageStartMs || !token) {
      return res.status(400).json({ error: "Missing token fields" });
    }

    const expectedToken = crypto
      .createHash("sha256")
      .update(fingerprint + pageStartMs + SECRET_SALT)
      .digest("hex");

    if (token !== expectedToken) {
      return res.status(403).json({ error: "Invalid token – unauthorized request" });
    }

    // 🔁 تمرير الطلب إلى الـWorker
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": origin,
        "X-Relay-Secret": RELAY_SECRET,
        "X-Client-IP": realClientIP || "",
        "X-Client-Country": clientCountry,
        "X-Client-UA": clientUA
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
