export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (slug) {
    // Load single artist
    const response = await fetch(`${url}/get/dripping26_${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await response.json();
    const data = json.result ? JSON.parse(json.result) : null;
    return res.status(200).json({ data });
  } else {
    // Load all — fetch all keys matching dripping26_*
    const keysResp = await fetch(`${url}/keys/dripping26_*`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const keysJson = await keysResp.json();
    const keys = keysJson.result || [];

    if (keys.length === 0) return res.status(200).json({ data: {} });

    // Fetch all values in one mget call
    const mgetResp = await fetch(`${url}/mget/${keys.join('/')}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const mgetJson = await mgetResp.json();
    const values = mgetJson.result || [];

    const data = {};
    keys.forEach((key, i) => {
      const slug = key.replace('dripping26_', '');
      try { data[slug] = values[i] ? JSON.parse(values[i]) : null; } catch (e) {}
    });

    return res.status(200).json({ data });
  }
}
