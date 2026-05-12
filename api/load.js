export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return res.status(500).json({ error: 'Missing Upstash env vars' });

  const headers = { Authorization: `Bearer ${token}` };

  try {
    const { slug } = req.query;

    if (slug) {
      const response = await fetch(`${url}/get/dripping26_${slug}`, { headers });
      const json = await response.json();
      const data = json.result ? JSON.parse(json.result) : null;
      return res.status(200).json({ data });
    } else {
      const keysResp = await fetch(`${url}/keys/dripping26_*`, { headers });
      const keysJson = await keysResp.json();
      const keys = keysJson.result || [];

      if (keys.length === 0) return res.status(200).json({ data: {} });

      const mgetResp = await fetch(`${url}/mget`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(keys),
      });
      const mgetJson = await mgetResp.json();
      const values = mgetJson.result || [];

      const data = {};
      keys.forEach((key, i) => {
        const s = key.replace('dripping26_', '');
        try { data[s] = values[i] ? JSON.parse(values[i]) : null; } catch (e) {}
      });

      return res.status(200).json({ data });
    }
  } catch (err) {
    console.error('Load error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
