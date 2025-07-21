const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cookie = require('cookie');
const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || 'fantasy-sumo-draft-secret';

// Database helper
function getDatabase() {
  const dbPath = process.env.VERCEL ? '/tmp' : path.join(__dirname, '../../database');
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  const db = new sqlite3.Database(path.join(dbPath, 'fantasy_sumo_draft.db'));
  
  // Initialize tables if needed
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS rikishi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sumo_name TEXT UNIQUE NOT NULL,
      remaining_points INTEGER DEFAULT 50,
      is_draft_finalized BOOLEAN DEFAULT FALSE
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS draft_selections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      rikishi_id INTEGER,
      selected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (rikishi_id) REFERENCES rikishi (id),
      UNIQUE (user_id, rikishi_id)
    )`);
  });

  return db;
}

// Session helper
function verifySession(sessionCookie) {
  if (!sessionCookie) return null;
  
  try {
    const [payload, signature] = sessionCookie.split('.');
    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64');
    
    if (signature !== expectedSignature) return null;
    
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch {
    return null;
  }
}

function requireAuth(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return verifySession(cookies.session);
}

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  const sessionData = requireAuth(req);
  if (!sessionData) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDatabase();

  // Get all finalized drafts
  const query = `
    SELECT 
      u.sumo_name,
      u.id as user_id,
      COUNT(ds.id) as selected_count,
      COALESCE(SUM(r.draft_value), 0) as total_spent
    FROM users u
    LEFT JOIN draft_selections ds ON u.id = ds.user_id
    LEFT JOIN rikishi r ON ds.rikishi_id = r.id
    WHERE u.is_draft_finalized = 1
    GROUP BY u.id, u.sumo_name
    ORDER BY u.sumo_name
  `;

  db.all(query, [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get detailed selections for each user
    const userPromises = users.map(user => {
      return new Promise((resolve, reject) => {
        const selectionsQuery = `
          SELECT r.*
          FROM draft_selections ds
          JOIN rikishi r ON ds.rikishi_id = r.id
          WHERE ds.user_id = ?
          ORDER BY r.ranking_group, r.draft_value DESC
        `;
        
        db.all(selectionsQuery, [user.user_id], (err, selections) => {
          if (err) return reject(err);
          
          resolve({
            sumoName: user.sumo_name,
            selectedCount: user.selected_count,
            totalSpent: user.total_spent,
            remainingPoints: 50 - user.total_spent,
            selectedRikishi: selections
          });
        });
      });
    });

    Promise.all(userPromises)
      .then(finalizedDrafts => {
        res.json({
          finalizedDrafts: finalizedDrafts,
          totalUsers: finalizedDrafts.length
        });
      })
      .catch(() => {
        res.status(500).json({ error: 'Error retrieving draft data' });
      });
  });
}; 