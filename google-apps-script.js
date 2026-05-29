// ─────────────────────────────────────────────────────────────
//  Dripping 2026 — Artist Pages Sync
//  Paste this entire file into Extensions → Apps Script in the
//  Google Sheet, then follow the setup steps below.
//
//  SETUP (one-time):
//  1. In the Apps Script editor, click ⚙ Project Settings
//  2. Scroll to "Script Properties" and click "Add script property"
//  3. Name: SYNC_SECRET  Value: 00a765a66356e4c28bcbd47af8925b2a18efdaf63d621a33de26f69d4c39cf53
//  4. Save. Then close Project Settings.
//  5. Back in the editor, click Run → onOpen once to authorize the script.
//  6. You'll see a "Dripping Admin" menu appear in your spreadsheet.
// ─────────────────────────────────────────────────────────────

const VERCEL_URL = 'https://dripping-artist-pages.vercel.app/api/sync';

function publishToVercel() {
  const SECRET = PropertiesService.getScriptProperties().getProperty('SYNC_SECRET');

  if (!SECRET) {
    SpreadsheetApp.getUi().alert(
      '⚠ SYNC_SECRET not set.\n\nGo to Extensions → Apps Script → ⚙ Project Settings → Script Properties and add:\nName: SYNC_SECRET\nValue: (the secret from your Vercel env vars)'
    );
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Artists ──
  const artistSheet = ss.getSheetByName('Artists');
  const artistData = artistSheet.getDataRange().getValues();
  const headers = artistData[0];

  // Build a stable key for each column. Headers are normalised to
  // lowercase_with_underscores, and DUPLICATE headers are auto-numbered so
  // they never collide: e.g. two "setday" columns become "setday" + "setday2".
  // This lets artists with two sets keep a second setday/settime/stage trio,
  // and makes the sync resilient to extra or reordered columns.
  const keys = [];
  const seen = {};
  headers.forEach(header => {
    let key = String(header).trim().toLowerCase().replace(/\s+/g, '_');
    if (!key) { keys.push(''); return; }
    seen[key] = (seen[key] || 0) + 1;
    keys.push(seen[key] === 1 ? key : key + seen[key]);
  });

  const artists = [];
  for (let i = 1; i < artistData.length; i++) {
    const row = artistData[i];
    if (!row[0]) continue; // skip rows with no slug

    const obj = {};
    keys.forEach((key, j) => {
      if (!key) return;
      let val = row[j];

      if (val instanceof Date) {
        // Google Sheets stores time-only values with a base year of 1899
        if (val.getFullYear() <= 1900) {
          const h = val.getHours();
          const m = val.getMinutes();
          const ampm = h >= 12 ? 'PM' : 'AM';
          const display = `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
          val = display;
        } else {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
      }

      obj[key] = (val === '' || val === null) ? null : val;
    });

    artists.push(obj);
  }

  // ── Settings ──
  const settingsSheet = ss.getSheetByName('Settings');
  const settingsRows = settingsSheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < settingsRows.length; i++) {
    const key = settingsRows[i][0];
    const val = settingsRows[i][1];
    if (key) settings[key] = val;
  }

  // ── POST to Vercel ──
  const payload = JSON.stringify({ artists, settings });
  const options = {
    method: 'POST',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${SECRET}` },
    payload,
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(VERCEL_URL, options);
    const code = response.getResponseCode();
    const json = JSON.parse(response.getContentText());

    if (code === 200 && json.ok) {
      SpreadsheetApp.getUi().alert(`✅ Published! ${json.count} artists synced to artist pages.`);
    } else {
      SpreadsheetApp.getUi().alert(`❌ Error ${code}:\n${response.getContentText()}`);
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert(`❌ Network error: ${e.message}`);
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dripping Admin')
    .addItem('🚀 Publish to artist pages', 'publishToVercel')
    .addToUi();
}
