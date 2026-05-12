export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { slug, data } = req.body;
    if (!slug || !data) return res.status(400).json({ error: 'Missing slug or data' });

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) return res.status(500).json({ error: 'Missing Upstash env vars' });

    const response = await fetch(`${url}/set/dripping26_${slug}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: JSON.stringify(data) }),
    });

    const result = await response.json();
    return res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('Save error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
