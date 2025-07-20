const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../database');

// Create database directory if it doesn't exist
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

const db = new sqlite3.Database(path.join(dbPath, 'fantasy_sumo_draft.db'));

// Initialize database tables
db.serialize(() => {
  // Simple users table - just sumo name
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sumo_name TEXT UNIQUE NOT NULL,
    remaining_points INTEGER DEFAULT 100,
    is_draft_finalized BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Rikishi table with all the CSV data
  db.run(`CREATE TABLE IF NOT EXISTS rikishi (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    ranking_group TEXT NOT NULL,
    official_rank TEXT,
    draft_value INTEGER NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    absences INTEGER DEFAULT 0,
    last_tourney_wins INTEGER DEFAULT 0,
    last_tourney_losses INTEGER DEFAULT 0,
    weight_lbs REAL,
    height_inches REAL,
    age REAL,
    birthday TEXT,
    times_picked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Draft selections table
  db.run(`CREATE TABLE IF NOT EXISTS draft_selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    rikishi_id INTEGER NOT NULL,
    selected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (rikishi_id) REFERENCES rikishi (id),
    UNIQUE(user_id, rikishi_id)
  )`);

  // Load rikishi data from CSV
  loadRikishiData();
});

function loadRikishiData() {
  // Check if data already exists
  db.get("SELECT COUNT(*) as count FROM rikishi", (err, row) => {
    if (err) {
      console.error('Error checking rikishi data:', err);
      return;
    }

    if (row.count === 0) {
      const csvPath = path.join(__dirname, '../../rikishi_data.csv');
      
      if (fs.existsSync(csvPath)) {
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',');
        
        // Find column indices
        const nameIdx = headers.indexOf('Rikishi');
        const rankingGroupIdx = headers.indexOf('Ranking Group');
        const officialRankIdx = headers.findIndex((h, idx) => h.trim() === 'Rank' && idx > 0); // Second "Rank" column
        const draftValueIdx = headers.indexOf('$ Value');
        const winsIdx = headers.indexOf('Wins');
        const lossesIdx = headers.indexOf('Losses');
        const absencesIdx = headers.indexOf('absences');
        const lastTourneyWinsIdx = headers.indexOf('Last Tourney Wins');
        const lastTourneyLossesIdx = headers.indexOf('Last Tourney Losses');
        const weightIdx = headers.indexOf('Listed Weight (LBs)');
        const heightIdx = headers.indexOf('Listed Height (Inch)');
        const ageIdx = headers.indexOf('Age');
        const birthdayIdx = headers.indexOf('Birthday');
        const timesPickedIdx = headers.indexOf('Times Picked');
        const idIdx = headers.indexOf('id');

        const stmt = db.prepare(`INSERT INTO rikishi (
          id, name, ranking_group, official_rank, draft_value,
          wins, losses, absences, last_tourney_wins, last_tourney_losses,
          weight_lbs, height_inches, age, birthday, times_picked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        let insertedCount = 0;
        for (let i = 1; i < lines.length; i++) { // Skip header row
          const line = lines[i].trim();
          if (!line) continue;
          
          const cols = line.split(',');
          
          const cleanValue = (val) => {
            if (!val || val.trim() === '' || val === '#VALUE!' || val === 'Non-Participant' || val === 'NA') return null;
            const trimmed = val.trim();
            const num = parseFloat(trimmed);
            return isNaN(num) ? trimmed : num;
          };

          const cleanStringValue = (val) => {
            if (!val || val.trim() === '' || val === '#VALUE!' || val === 'Non-Participant' || val === 'NA') return null;
            return val.trim();
          };

          try {
            const rikishiId = cleanValue(cols[idIdx]);
            const rikishiName = cleanStringValue(cols[nameIdx]);
            const rankingGroup = cleanStringValue(cols[rankingGroupIdx]);
            const officialRank = cleanStringValue(cols[officialRankIdx]) || 'Unknown';
            const draftValue = cleanValue(cols[draftValueIdx]);

            if (!rikishiId || !rikishiName || !rankingGroup || !draftValue) {
              console.log(`Skipping row ${i}: missing required data`);
              continue;
            }

            stmt.run([
              rikishiId,
              rikishiName,
              rankingGroup,
              officialRank,
              draftValue,
              cleanValue(cols[winsIdx]) || 0,
              cleanValue(cols[lossesIdx]) || 0,
              cleanValue(cols[absencesIdx]) || 0,
              cleanValue(cols[lastTourneyWinsIdx]) || 0,
              cleanValue(cols[lastTourneyLossesIdx]) || 0,
              cleanValue(cols[weightIdx]),
              cleanValue(cols[heightIdx]),
              cleanValue(cols[ageIdx]),
              cleanStringValue(cols[birthdayIdx]),
              cleanValue(cols[timesPickedIdx]) || 0
            ]);
            insertedCount++;
          } catch (error) {
            console.error(`Error inserting row ${i}:`, error);
          }
        }

        stmt.finalize((err) => {
          if (err) {
            console.error('Error finalizing statement:', err);
          } else {
            console.log(`✅ ${insertedCount} rikishi loaded from CSV`);
          }
        });
      } else {
        console.log('⚠️ CSV file not found, using sample data');
        // Insert some sample data if CSV not found
        const sampleRikishi = [
          [19, 'Hoshoryu', 'Yellow', 'Yokozuna 1 East', 10, 1, 0, 0, 3, 2, 288.7, 73.2, 26.2, '5/22/1999', 8],
          [8850, 'Onosato', 'Yellow', 'Yokozuna 1 West', 7, 1, 0, 0, 5, 0, 390.1, 75.6, 25.1, '6/7/2000', 7],
          [20, 'Kotozakura', 'Yellow', 'Ozeki 1 East', 6, 0, 1, 0, 3, 2, 365.9, 74.0, 27.7, '11/19/1997', 2]
        ];

        const sampleStmt = db.prepare(`INSERT INTO rikishi (
          id, name, ranking_group, official_rank, draft_value,
          wins, losses, absences, last_tourney_wins, last_tourney_losses,
          weight_lbs, height_inches, age, birthday, times_picked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        sampleRikishi.forEach(rikishi => {
          sampleStmt.run(rikishi);
        });

        sampleStmt.finalize(() => {
          console.log('✅ Sample rikishi data inserted');
        });
      }
    }
  });
}

console.log('📊 Fantasy Sumo Draft database initialized');

module.exports = db; 