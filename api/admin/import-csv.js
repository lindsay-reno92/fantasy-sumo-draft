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

    // Load CSV from repo root (prefer newest_sumo_data.csv, fallback to old name)
    const candidateFiles = ['newest_sumo_data.csv', 'Sumo Fantasy Stats - Lindsay.csv'];
    let csvPath = null;
    for (const fname of candidateFiles) {
      const p = path.join(process.cwd(), fname);
      if (fs.existsSync(p)) { csvPath = p; break; }
    }
    if (!csvPath) {
      return res.status(404).json({ error: 'CSV file not found', tried: candidateFiles });
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
    // Fallback: ask DB for the max id directly (more reliable under RLS/filters)
    try {
      const { data: maxRow } = await client
        .from('rikishi')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .single();
      if (maxRow && typeof maxRow.id === 'number') {
        maxId = Math.max(maxId, maxRow.id);
      }
    } catch (_) {}

    const toInsert = [];
    const toUpdate = [];

    for (const cols of rows) {
      const name = nameIdx >= 0 ? toStringVal(cols[nameIdx]) : null;
      if (!name) continue;
      const official_rank_raw = rankTextIdx >= 0 ? toStringVal(cols[rankTextIdx]) : undefined;
      const ranking_group_raw = groupIdx >= 0 ? toStringVal(cols[groupIdx]) : undefined;
      const wins = winsIdx >= 0 ? (toNumber(cols[winsIdx], 0) || 0) : undefined;
      const losses = lossesIdx >= 0 ? (toNumber(cols[lossesIdx], 0) || 0) : undefined;
      const absences = absencesIdx >= 0 ? (toNumber(cols[absencesIdx], 0) || 0) : undefined;
      const weight_lbs_raw = weightIdx >= 0 ? toNumber(cols[weightIdx], null) : undefined;
      const height_inches_raw = heightIdx >= 0 ? toNumber(cols[heightIdx], null) : undefined;
      const age_raw = ageIdx >= 0 ? toNumber(cols[ageIdx], null) : undefined;
      const birthday_raw = birthdayIdx >= 0 ? toStringVal(cols[birthdayIdx]) : undefined;
      const times_picked = timesPickedIdx >= 0 ? (toNumber(cols[timesPickedIdx], 0) || 0) : undefined;

      // Treat nulls as undefined for NOT NULL columns, so we don't write nulls
      const official_rank = official_rank_raw == null ? undefined : official_rank_raw;
      const ranking_group = ranking_group_raw == null ? undefined : ranking_group_raw;
      const weight_lbs = weight_lbs_raw == null ? undefined : weight_lbs_raw;
      const height_inches = height_inches_raw == null ? undefined : height_inches_raw;
      const age = age_raw == null ? undefined : age_raw;
      const birthday = birthday_raw == null ? undefined : birthday_raw;

      const current = existingByName.get(name.toLowerCase());
      if (!current) {
        // Generate a new numeric id sequentially (table requires non-null id)
        maxId += 1;
        // Ensure NOT NULL columns are always provided on insert
        const newRow = { id: maxId, name, draft_value: 1 };
        newRow.official_rank = (official_rank !== undefined ? official_rank : 'Unknown');
        newRow.ranking_group = (ranking_group !== undefined ? ranking_group : 'White');
        newRow.wins = (wins !== undefined ? wins : 0);
        newRow.losses = (losses !== undefined ? losses : 0);
        newRow.absences = (absences !== undefined ? absences : 0);
        if (weight_lbs !== undefined) newRow.weight_lbs = weight_lbs;
        if (height_inches !== undefined) newRow.height_inches = height_inches;
        if (age !== undefined) newRow.age = age;
        if (birthday !== undefined) newRow.birth_date = birthday; // Store as birth_date only
        if (times_picked !== undefined) newRow.times_picked = times_picked;
        toInsert.push(newRow);
      } else {
        // Include required non-null columns to avoid NOT NULL failures during upsert
        const update = { id: current.id, name: current.name };
        if (current.draft_value !== undefined) update.draft_value = current.draft_value;
        let changed = false;
        const assignIfPresentAndDiff = (key, val) => {
          if (val === undefined) return;
          if ((current[key] ?? null) !== (val ?? null)) {
            update[key] = val;
            changed = true;
          }
        };
        assignIfPresentAndDiff('official_rank', official_rank);
        assignIfPresentAndDiff('ranking_group', ranking_group);
        // Do not overwrite draft_value from CSV; leave as is
        assignIfPresentAndDiff('wins', wins);
        assignIfPresentAndDiff('losses', losses);
        assignIfPresentAndDiff('absences', absences);
        assignIfPresentAndDiff('weight_lbs', weight_lbs);
        assignIfPresentAndDiff('height_inches', height_inches);
        assignIfPresentAndDiff('age', age);
        // Write birth_date only; ignore birthday
        assignIfPresentAndDiff('birth_date', birthday);
        assignIfPresentAndDiff('times_picked', times_picked);

        if (changed) {
          // Ensure NOT NULL columns are present even if not changed, to guard against accidental inserts
          if (update.official_rank === undefined) update.official_rank = current.official_rank ?? 'Unknown';
          if (update.ranking_group === undefined) update.ranking_group = current.ranking_group ?? 'White';
          toUpdate.push(update);
        }
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
      // Insert one-by-one to avoid any column inference or RLS surprises
      for (const row of toInsert) {
        const { error: insErr } = await client.from('rikishi').insert(row);
        if (insErr) throw insErr;
        inserted += 1;
      }
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


