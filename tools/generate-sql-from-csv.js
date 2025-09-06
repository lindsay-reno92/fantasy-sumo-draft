const fs = require('fs');
const path = require('path');

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    return line.split(',').map(cell => {
      const trimmed = cell.trim();
      return trimmed.startsWith('"') && trimmed.endsWith('"')
        ? trimmed.slice(1, -1)
        : trimmed;
    });
  });
  return { headers, rows };
}

function sqlLiteral(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  if (typeof val === 'number') return String(val);
  if (/^[-+]?[0-9]*\.?[0-9]+$/.test(String(val))) return String(Number(val));
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
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

function buildUpsertSql(csvPath, outputPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const { headers, rows } = parseCsv(content);
  if (headers.length === 0) throw new Error('Empty CSV');

  const nameIdx = headers.indexOf('Rikishi');
  const rankTextIdx = (() => {
    const idxs = headers.map((h, i) => ({ h, i })).filter(x => x.h === 'Rank').map(x => x.i);
    return idxs.length > 1 ? idxs[1] : idxs[0] ?? -1;
  })();
  const winsIdx = headers.indexOf('Last Basho Wins');
  const lossesIdx = headers.indexOf('Last Basho Losses');
  const absencesIdx = headers.indexOf('Last Basho Absences');
  const weightIdx = headers.indexOf('Listed Weight (LBs)');
  const heightIdx = headers.indexOf('Listed Height (Inch)');
  const ageIdx = headers.indexOf('Age');
  const timesPickedIdx = headers.indexOf('Times Picked last tourney');
  const groupIdx = headers.indexOf('Ranking Group');

  const lines = [];
  lines.push('-- Upsert rikishi from CSV (key: name)');
  lines.push('-- Run in Supabase SQL editor');
  lines.push('');

  // Create a temporary table of incoming data
  lines.push('create temporary table _incoming_rikishi ('+
    'name text primary key,'+
    'official_rank text,'+
    'ranking_group text,'+
    'wins integer,'+
    'losses integer,'+
    'absences integer,'+
    'weight_lbs decimal,'+
    'height_inches decimal,'+
    'age decimal,'+
    'times_picked integer'+
  ');');
  lines.push('');

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
    const times_picked = toNumber(cols[timesPickedIdx], 0) || 0;

    lines.push(
      'insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('+
      [sqlLiteral(name), sqlLiteral(official_rank), sqlLiteral(ranking_group), sqlLiteral(wins), sqlLiteral(losses), sqlLiteral(absences), sqlLiteral(weight_lbs), sqlLiteral(height_inches), sqlLiteral(age), sqlLiteral(times_picked)].join(', ') +
      ');'
    );
  }

  lines.push('');
  // Upsert existing rikishi by name; do not touch draft_value
  lines.push('update rikishi r set '+
    'official_rank = i.official_rank,'+
    'ranking_group = i.ranking_group,'+
    'wins = i.wins,'+
    'losses = i.losses,'+
    'absences = i.absences,'+
    'weight_lbs = i.weight_lbs,'+
    'height_inches = i.height_inches,'+
    'age = i.age,'+
    'times_picked = i.times_picked '+
    'from _incoming_rikishi i where lower(i.name) = lower(r.name);');

  lines.push('');
  // Insert new rikishi not present, with default draft_value = 1
  lines.push('insert into rikishi (id, name, official_rank, ranking_group, draft_value, wins, losses, absences, weight_lbs, height_inches, age, times_picked) '+
    "select (select coalesce(max(id), 0) + row_number() over () from rikishi), i.name, i.official_rank, i.ranking_group, 1, i.wins, i.losses, i.absences, i.weight_lbs, i.height_inches, i.age, i.times_picked "+
    'from _incoming_rikishi i '+
    'left join rikishi r on lower(i.name) = lower(r.name) '+
    'where r.id is null;');

  lines.push('');
  lines.push('drop table _incoming_rikishi;');

  fs.writeFileSync(outputPath, lines.join('\n'));
}

function main() {
  const csvPath = process.argv[2] || path.join(process.cwd(), 'Sumo Fantasy Stats - Lindsay.csv');
  const outputPath = process.argv[3] || path.join(process.cwd(), 'rikishi-upsert-from-csv.sql');
  buildUpsertSql(csvPath, outputPath);
  console.log('Wrote SQL to', outputPath);
}

if (require.main === module) {
  main();
}

module.exports = { buildUpsertSql };


