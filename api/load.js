import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { slug } = req.query;

    if (slug) {
      const raw = await redis.get(`dripping26_${slug}`);
      const data = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
      return res.status(200).json({ data });
    } else {
      const keys = await redis.keys('dripping26_*');
      if (!keys || keys.length === 0) return res.status(200).json({ data: {} });

      const values = await redis.mget(...keys);
      const data = {};
      keys.forEach((key, i) => {
        const s = key.replace('dripping26_', '');
        try { data[s] = values[i] ? (typeof values[i] === 'string' ? JSON.parse(values[i]) : values[i]) : null; } catch (e) {}
      });
      return res.status(200).json({ data });
    }
  } catch (err) {
    console.error('Load error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
