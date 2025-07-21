const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use consistent database path across all functions
const DB_PATH = '/tmp/fantasy_sumo_draft.db';

let dbInstance = null;

function getDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure database directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new sqlite3.Database(DB_PATH);
  
  // Initialize tables synchronously
  dbInstance.serialize(() => {
    dbInstance.run(`CREATE TABLE IF NOT EXISTS rikishi (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      official_rank TEXT,
      ranking_group TEXT,
      draft_value INTEGER DEFAULT 5,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      absences INTEGER DEFAULT 0,
      last_tourney_wins INTEGER DEFAULT 0,
      last_tourney_losses INTEGER DEFAULT 0,
      weight_lbs REAL,
      height_inches REAL,
      age REAL,
      times_picked INTEGER DEFAULT 0
    )`);
    
    dbInstance.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sumo_name TEXT UNIQUE NOT NULL,
      remaining_points INTEGER DEFAULT 50,
      is_draft_finalized BOOLEAN DEFAULT FALSE
    )`);
    
    dbInstance.run(`CREATE TABLE IF NOT EXISTS draft_selections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      rikishi_id INTEGER,
      selected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (rikishi_id) REFERENCES rikishi (id),
      UNIQUE (user_id, rikishi_id)
    )`);
    
    // Load rikishi data if empty
    initializeRikishiData();
  });

  return dbInstance;
}

function initializeRikishiData() {
  if (!dbInstance) return;
  
  dbInstance.get("SELECT COUNT(*) as count FROM rikishi", (err, result) => {
    if (!err && result && result.count === 0) {
      // Load from JSON file
      const jsonPaths = [
        path.join(process.cwd(), 'sumo_stats_json.json'),
        path.join(__dirname, '../sumo_stats_json.json'),
        '/tmp/sumo_stats_json.json'
      ];
      
      let jsonPath = null;
      for (const p of jsonPaths) {
        if (fs.existsSync(p)) {
          jsonPath = p;
          break;
        }
      }
      
      if (jsonPath) {
        try {
          const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
          const rikishiData = JSON.parse(jsonContent);
          
          const stmt = dbInstance.prepare(`INSERT OR REPLACE INTO rikishi (id, name, official_rank, ranking_group, draft_value, wins, losses, absences, last_tourney_wins, last_tourney_losses, weight_lbs, height_inches, age, times_picked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
          
          rikishiData.forEach((rikishi, index) => {
            const name = rikishi.Rikishi;
            const rankingGroup = rikishi["Ranking Group"];
            const officialRank = rikishi.Rank_1 || 'Unknown';
            const draftValue = rikishi["$ Value"];
            const wins = rikishi.Wins || 0;
            const losses = rikishi.Losses || 0;
            const absences = rikishi.absences || 0;
            const lastTourneyWins = rikishi["Last Tourney Wins"] || 0;
            const lastTourneyLosses = rikishi["Last Tourney Losses"] || 0;
            const weightLbs = rikishi["Listed Weight (LBs)"] || 0;
            const heightInches = rikishi["Listed Height (Inch)"] || 0;
            const age = rikishi.Age || 0;
            const timesPicked = rikishi["Times Picked"] || 0;
            
            if (name && rankingGroup && draftValue) {
              const id = rikishi.Rank || (index + 1);
              
              stmt.run([
                id, name, officialRank, rankingGroup, draftValue,
                wins, losses, absences, lastTourneyWins, lastTourneyLosses,
                weightLbs, heightInches, age, timesPicked
              ]);
            }
          });
          
          stmt.finalize();
          console.log('Rikishi data loaded successfully');
        } catch (error) {
          console.error('Error loading rikishi data:', error);
        }
      }
    }
  });
}

module.exports = { getDatabase }; 