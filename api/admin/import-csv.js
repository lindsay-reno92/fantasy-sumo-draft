const fs = require('fs');
const path = require('path');
const cookie = require('cookie');
const { verifySession } = require('../_session-store');
const { supabase, supabaseAdmin } = require('../../lib/supabase');

function requireAdmin(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const sessionData = verifySession(cookies.session);
  if (!sessionData || !sessionData.isAdmin) return null;
  return sessionData;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    // Simple CSV split (no embedded commas in provided file). Trim quotes.
    return line.split(',').map(cell => {
      const trimmed = cell.trim();
      return trimmed.startsWith('"') && trimmed.endsWith('"')
        ? trimmed.slice(1, -1)
        : trimmed;
    });
  });
  return { headers, rows };
}

function indexOfSecond(headers, name) {
  const idxs = headers
    .map((h, i) => ({ h, i }))
    .filter(x => x.h === name)
    .map(x => x.i);
  return idxs.length > 1 ? idxs[1] : idxs[0] ?? -1;
}

function toNumber(v, fallback = null) {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim();
  if (s === '' || s === '#REF!') return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function toStringVal(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === '' || s === '#REF!') return null;
  return s;
}

module.exports = async (req, res) => {
  try {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Auth
    const sessionData = requireAdmin(req);
    if (!sessionData) return res.status(401).json({ error: 'Admin authentication required' });

    // Load CSV from repo root
    const csvPath = path.join(process.cwd(), 'Sumo Fantasy Stats - Lindsay.csv');
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'CSV file not found', path: csvPath });
    }
    const content = fs.readFileSync(csvPath, 'utf8');
    const { headers, rows } = parseCsv(content);
    if (headers.length === 0) return res.status(400).json({ error: 'CSV empty or unreadable' });

    // Map header indices
    const nameIdx = headers.indexOf('Rikishi');
    const rankTextIdx = indexOfSecond(headers, 'Rank'); // textual rank column
    const winsIdx = headers.indexOf('Last Basho Wins');
    const lossesIdx = headers.indexOf('Last Basho Losses');
    const absencesIdx = headers.indexOf('Last Basho Absences');
    const weightIdx = headers.indexOf('Listed Weight (LBs)');
    const heightIdx = headers.indexOf('Listed Height (Inch)');
    const ageIdx = headers.indexOf('Age');
    const birthdayIdx = headers.indexOf('Birthday');
    const timesPickedIdx = headers.indexOf('Times Picked last tourney');
    const groupIdx = headers.indexOf('Ranking Group');

    // Fetch existing rikishi
    const client = supabaseAdmin || supabase;
    const { data: existing, error: fetchErr } = await client
      .from('rikishi')
      .select('*');
    if (fetchErr) throw fetchErr;
    const existingByName = new Map(
      (existing || []).map(r => [r.name.toLowerCase(), r])
    );
    let maxId = (existing || []).reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);

    const toInsert = [];
    const toUpdate = [];

    for (const cols of rows) {
      const name = toStringVal(cols[nameIdx]);
      if (!name) continue;
      const official_rank = toStringVal(cols[rankTextIdx]);
      const ranking_group = toStringVal(cols[groupIdx]);
      const wins = toNumber(cols[winsIdx], 0) || 0;
      const losses = toNumber(cols[lossesIdx], 0) || 0;
      const absences = toNumber(cols[absencesIdx], 0) || 0;
      const weight_lbs = toNumber(cols[weightIdx], null);
      const height_inches = toNumber(cols[heightIdx], null);
      const age = toNumber(cols[ageIdx], null);
      const birthday = toStringVal(cols[birthdayIdx]);
      const times_picked = toNumber(cols[timesPickedIdx], 0) || 0;

      const current = existingByName.get(name.toLowerCase());
      if (!current) {
        // Generate a new numeric id sequentially (table requires non-null id)
        maxId += 1;
        toInsert.push({
          id: maxId,
          name,
          official_rank,
          ranking_group,
          draft_value: 1, // ignore CSV Value column, default to 1 for new rikishi
          wins,
          losses,
          absences,
          weight_lbs,
          height_inches,
          age,
          // Store as birth_date only; ignore birthday column if not in schema
          birth_date: birthday,
          times_picked
        });
      } else {
        const update = { id: current.id };
        let changed = false;
        const assignIfDiff = (key, val) => {
          if ((current[key] ?? null) !== (val ?? null)) {
            update[key] = val;
            changed = true;
          }
        };
        assignIfDiff('official_rank', official_rank);
        assignIfDiff('ranking_group', ranking_group);
        // Do not overwrite draft_value from CSV; leave as is
        assignIfDiff('wins', wins);
        assignIfDiff('losses', losses);
        assignIfDiff('absences', absences);
        assignIfDiff('weight_lbs', weight_lbs);
        assignIfDiff('height_inches', height_inches);
        assignIfDiff('age', age);
        // Write birth_date only; ignore birthday
        assignIfDiff('birth_date', birthday);
        assignIfDiff('times_picked', times_picked);

        if (changed) toUpdate.push(update);
      }
    }

    const dryRun = req.method === 'GET' || (req.method === 'POST' && req.query?.dryRun === 'true');

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        counts: { existing: existing?.length || 0, toInsert: toInsert.length, toUpdate: toUpdate.length },
        sampleInsert: toInsert.slice(0, 3),
        sampleUpdate: toUpdate.slice(0, 3)
      });
    }

    // Apply changes
    let inserted = 0, updated = 0;
    if (toInsert.length > 0) {
      const { error: insErr } = await client.from('rikishi').insert(toInsert);
      if (insErr) throw insErr;
      inserted = toInsert.length;
    }
    for (const chunkStart of Array.from({ length: toUpdate.length }, (_, i) => i).filter(i => i % 500 === 0)) {
      const chunk = toUpdate.slice(chunkStart, chunkStart + 500);
      if (chunk.length === 0) continue;
      const { error: updErr } = await client.from('rikishi').upsert(chunk, { onConflict: 'id' });
      if (updErr) throw updErr;
      updated += chunk.length;
    }

    return res.json({ success: true, dryRun: false, inserted, updated });
  } catch (error) {
    console.error('CSV import error:', error);
    return res.status(500).json({ error: 'CSV import failed', details: error.message });
  }
};


