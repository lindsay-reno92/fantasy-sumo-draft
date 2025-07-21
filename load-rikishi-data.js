const fs = require('fs');

// Read the JSON data
const rikishiData = JSON.parse(fs.readFileSync('sumo_stats_json.json', 'utf-8'));

console.log('-- Insert rikishi data into Supabase');
console.log('-- Run this in your Supabase SQL Editor\n');

// Generate INSERT statements
rikishiData.forEach(rikishi => {
  const id = rikishi.Rank;
  const name = rikishi.Rikishi?.replace(/'/g, "''") || 'Unknown'; // Escape single quotes
  const ranking_group = rikishi["Ranking Group"];
  const official_rank = rikishi.Rank_1?.replace(/'/g, "''") || 'Unknown';
  const draft_value = rikishi["$ Value"] || 1;
  const wins = rikishi.Wins || 0;
  const losses = rikishi.Losses || 0;
  const absences = rikishi.absences || 0;
  const last_tourney_wins = rikishi["Last Tourney Wins"] || 0;
  const last_tourney_losses = rikishi["Last Tourney Losses"] || 0;
  const weight_lbs = rikishi["Listed Weight (LBs)"] || null;
  const height_inches = rikishi["Listed Height (Inch)"] || null;
  const age = rikishi.Age || null;
  const times_picked = rikishi["Times Picked"] || 0;

  // Skip if missing required fields
  if (!name || !ranking_group || !draft_value) {
    console.log(`-- Skipping ${name}: missing required fields`);
    return;
  }

  // Only include valid ranking groups
  if (!['Yellow', 'Blue', 'Green', 'White'].includes(ranking_group)) {
    console.log(`-- Skipping ${name}: invalid ranking group ${ranking_group}`);
    return;
  }

  const weightValue = weight_lbs ? `${weight_lbs}` : 'NULL';
  const heightValue = height_inches ? `${height_inches}` : 'NULL';
  const ageValue = age ? `${age}` : 'NULL';

  console.log(`INSERT INTO rikishi (id, name, official_rank, ranking_group, draft_value, wins, losses, absences, last_tourney_wins, last_tourney_losses, weight_lbs, height_inches, age, times_picked) VALUES (${id}, '${name}', '${official_rank}', '${ranking_group}', ${draft_value}, ${wins}, ${losses}, ${absences}, ${last_tourney_wins}, ${last_tourney_losses}, ${weightValue}, ${heightValue}, ${ageValue}, ${times_picked});`);
});

console.log('\n-- Data loading complete!'); 