export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const payload = JSON.stringify(req.body);

  try {
    const response = await fetch(
      "https://1fuckurmotherhahahahahahaha.eth2-stiffness640.workers.dev/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed forwarding request', details: err.message });
  }
}
