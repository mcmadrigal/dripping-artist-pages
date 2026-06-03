import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const SYNC_SECRET = process.env.SYNC_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers['authorization'];
  if (!SYNC_SECRET || auth !== `Bearer ${SYNC_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { artists, settings } = req.body;
  if (!Array.isArray(artists)) return res.status(400).json({ error: 'artists must be an array' });

  try {
    let count = 0;
    for (const row of artists) {
      const slug = (row.slug || '').trim().toLowerCase();
      if (!slug) continue;

      const langs = row.langs
        ? row.langs.split(',').map(l => l.trim().toLowerCase()).filter(Boolean)
        : ['en'];
      if (!langs.includes('en')) langs.unshift('en');

      const normStage = s => (s || '').replace(/\b(?:the\s+)?(?:lakeside(?:\s+amphitheat(?:re|er))?|lake\s+amphitheat(?:re|er))\b/gi, 'Lakeside Amphitheater');

      const data = {
        name:         row.name         || '',
        setday:       row.setday        || '',
        settime:      row.settime       || '',
        stage:        normStage(row.stage),
        setday2:      row.setday2       || '',
        settime2:     row.settime2      || '',
        stage2:       normStage(row.stage2),
        rainStage:    normStage(row.rain_stage),
        rainNote:     row.rain_note     || '',
        checkday:     row.checkday      || '',
        checktime:    row.checktime     || '',
        checkstage:   normStage(row.checkstage),
        innkeeper:              row.innkeeper                   || '',
        driver:                 row.driver                      || '',
        stagemgr:               row.stagemgr                   || '',
        photographer:           row.photographer               || '',
        photographerName:       row.photographer_name          || '',
        photographerPhone:      row.photographer_phone         || '',
        photographerMeetingPlace: row.photographer_meeting_place || '',
        photographerMeetingDay:   row.portrait_day              || '',
        photographerTime:       row.photographer_time          || '',
        arrDay:                 row.arr_day                    || '',
        arrTime:                row.arr_time                   || '',
        arrTransport:           row.arr_transport              || '',
        parkingInfo:            row.parking_info               || '',
        depDay:                 row.dep_day                    || '',
        depTime:                row.dep_time                   || '',
        depTransport:           row.dep_transport              || '',
        tokens:                 row.tokens                     || '',
        mealTokens:             row.meal_tokens                || '',
        lodging:                row.lodging                    || 'hotel',
        hotelRoom:              row.hotel_room                 || '',
        cabin:                  row.cabin                      || '',
        infoLink:               row.info_link                  || '',
        langs,
        defaultLang:  row.default_lang  || 'en',
        notes:        row.notes         || '',
        artistCareNotes: row.artist_care_notes || row['Artist care notes'] || '',
        _savedAt:     new Date().toISOString(),
      };

      await redis.set(`dripping26_${slug}`, JSON.stringify(data));
      count++;
    }

    if (settings) {
      const active = String(settings.rain_plan_active).toUpperCase() === 'TRUE';
      await redis.set('dripping26___rain_plan__', JSON.stringify({ active }));
    }

    return res.status(200).json({ ok: true, count });
  } catch (err) {
    console.error('Sync error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
