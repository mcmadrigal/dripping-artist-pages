import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { slug, data } = req.body;
    if (!slug || !data) return res.status(400).json({ error: 'Missing slug or data' });

    await redis.set(`dripping26_${slug}`, JSON.stringify(data));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Save error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
