const express = require('express');
const router = express.Router();
const db = require('../database/init');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Middleware to check admin authentication
const requireAdmin = (req, res, next) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get user's current draft status
router.get('/status', requireAuth, (req, res) => {
  const userId = req.session.userId;

  // Get user info
  const userQuery = 'SELECT * FROM users WHERE id = ?';
  db.get(userQuery, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get selected rikishi
    const selectionsQuery = `
      SELECT r.*, ds.selected_at
      FROM draft_selections ds
      JOIN rikishi r ON ds.rikishi_id = r.id
      WHERE ds.user_id = ?
      ORDER BY ds.selected_at ASC
    `;

    db.all(selectionsQuery, [userId], (err, selections) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const totalSpent = selections.reduce((sum, r) => sum + r.draft_value, 0);

      res.json({
        sumoName: user.sumo_name,
        remainingPoints: 50 - totalSpent,
        isDraftFinalized: user.is_draft_finalized,
        selectedRikishi: selections,
        totalSpent
      });
    });
  });
});

// Get all finalized drafts for comparison
router.get('/all-finalized', requireAuth, (req, res) => {
  const query = `
    SELECT 
      u.id as user_id,
      u.sumo_name,
      u.is_draft_finalized,
      r.id as rikishi_id,
      r.name as rikishi_name,
      r.ranking_group,
      r.official_rank,
      r.draft_value,
      ds.selected_at
    FROM users u
    LEFT JOIN draft_selections ds ON u.id = ds.user_id
    LEFT JOIN rikishi r ON ds.rikishi_id = r.id
    WHERE u.is_draft_finalized = 1
    ORDER BY u.sumo_name, ds.selected_at ASC
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Group results by user
    const userDrafts = {};
    
    results.forEach(row => {
      if (!userDrafts[row.user_id]) {
        userDrafts[row.user_id] = {
          userId: row.user_id,
          sumoName: row.sumo_name,
          isDraftFinalized: row.is_draft_finalized,
          rikishi: [],
          totalSpent: 0
        };
      }

      if (row.rikishi_id) {
        userDrafts[row.user_id].rikishi.push({
          id: row.rikishi_id,
          name: row.rikishi_name,
          ranking_group: row.ranking_group,
          official_rank: row.official_rank,
          draft_value: row.draft_value,
          selected_at: row.selected_at
        });
        userDrafts[row.user_id].totalSpent += row.draft_value;
      }
    });

    // Convert to array and add remaining points
    const finalizedDrafts = Object.values(userDrafts).map(draft => ({
      ...draft,
      remainingPoints: 50 - draft.totalSpent,
      rikishiCount: draft.rikishi.length
    }));

    res.json(finalizedDrafts);
  });
});

// Select a rikishi
router.post('/select/:rikishiId', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const rikishiId = req.params.rikishiId;

  // Check if draft is finalized
  const userQuery = 'SELECT is_draft_finalized FROM users WHERE id = ?';
  db.get(userQuery, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (user.is_draft_finalized) {
      return res.status(400).json({ error: 'Draft is already finalized' });
    }

    // Get rikishi info
    const rikishiQuery = 'SELECT * FROM rikishi WHERE id = ?';
    db.get(rikishiQuery, [rikishiId], (err, rikishi) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!rikishi) {
        return res.status(404).json({ error: 'Rikishi not found' });
      }

      // Check if already selected
      const existingQuery = 'SELECT * FROM draft_selections WHERE user_id = ? AND rikishi_id = ?';
      db.get(existingQuery, [userId, rikishiId], (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (existing) {
          return res.status(409).json({ error: 'Rikishi already selected' });
        }

        // Check remaining points
        const pointsQuery = `
          SELECT COALESCE(SUM(r.draft_value), 0) as total_spent
          FROM draft_selections ds
          JOIN rikishi r ON ds.rikishi_id = r.id
          WHERE ds.user_id = ?
        `;

        db.get(pointsQuery, [userId], (err, pointsResult) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          const remainingPoints = 50 - pointsResult.total_spent;

          if (remainingPoints < rikishi.draft_value) {
            return res.status(400).json({ 
              error: `Not enough points. Need ${rikishi.draft_value}, have ${remainingPoints}` 
            });
          }

          // Add to draft
          const insertQuery = 'INSERT INTO draft_selections (user_id, rikishi_id) VALUES (?, ?)';
          db.run(insertQuery, [userId, rikishiId], function(err) {
            if (err) {
              return res.status(500).json({ error: 'Error selecting rikishi' });
            }

            res.json({
              message: `${rikishi.name} added to your draft`,
              rikishi: rikishi,
              remainingPoints: remainingPoints - rikishi.draft_value
            });
          });
        });
      });
    });
  });
});

// Deselect a rikishi
router.delete('/deselect/:rikishiId', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const rikishiId = req.params.rikishiId;

  // Check if draft is finalized
  const userQuery = 'SELECT is_draft_finalized FROM users WHERE id = ?';
  db.get(userQuery, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (user.is_draft_finalized) {
      return res.status(400).json({ error: 'Draft is already finalized' });
    }

    // Get rikishi info for response
    const rikishiQuery = 'SELECT * FROM rikishi WHERE id = ?';
    db.get(rikishiQuery, [rikishiId], (err, rikishi) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Remove from draft
      const deleteQuery = 'DELETE FROM draft_selections WHERE user_id = ? AND rikishi_id = ?';
      db.run(deleteQuery, [userId, rikishiId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error deselecting rikishi' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Rikishi was not selected' });
        }

        // Calculate new remaining points
        const pointsQuery = `
          SELECT COALESCE(SUM(r.draft_value), 0) as total_spent
          FROM draft_selections ds
          JOIN rikishi r ON ds.rikishi_id = r.id
          WHERE ds.user_id = ?
        `;

        db.get(pointsQuery, [userId], (err, pointsResult) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({
            message: `${rikishi ? rikishi.name : 'Rikishi'} removed from your draft`,
            remainingPoints: 50 - pointsResult.total_spent
          });
        });
      });
    });
  });
});

// Finalize draft with requirements validation
router.post('/finalize', requireAuth, (req, res) => {
  const userId = req.session.userId;

  // Check if draft is already finalized
  const userQuery = 'SELECT is_draft_finalized FROM users WHERE id = ?';
  db.get(userQuery, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (user.is_draft_finalized) {
      return res.status(400).json({ error: 'Draft is already finalized' });
    }

    // Get selected rikishi grouped by ranking
    const selectionsQuery = `
      SELECT r.ranking_group, COUNT(*) as count
      FROM draft_selections ds
      JOIN rikishi r ON ds.rikishi_id = r.id
      WHERE ds.user_id = ?
      GROUP BY r.ranking_group
    `;

    db.all(selectionsQuery, [userId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Count rikishi by group
      const counts = {
        'Yellow': 0,
        'Blue': 0,
        'Green': 0,
        'White': 0
      };

      results.forEach(row => {
        counts[row.ranking_group] = row.count;
      });

      // Check requirements
      const requirements = {
        'Yellow': 1,
        'Green': 2,
        'Blue': 2,
        'White': 1
      };

      const missingRequirements = [];
      for (const [group, required] of Object.entries(requirements)) {
        if (counts[group] < required) {
          const needed = required - counts[group];
          missingRequirements.push(`${needed} more ${group} rikishi`);
        }
      }

      if (missingRequirements.length > 0) {
        return res.status(400).json({ 
          error: 'Draft requirements not met',
          missingRequirements: missingRequirements,
          message: `You need: ${missingRequirements.join(', ')}`
        });
      }

      // Finalize the draft
      const updateQuery = 'UPDATE users SET is_draft_finalized = 1 WHERE id = ?';
      db.run(updateQuery, [userId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error finalizing draft' });
        }

        res.json({
          message: 'Draft finalized successfully! No more changes allowed.',
          isDraftFinalized: true
        });
      });
    });
  });
});

// Admin: Reset a user's finalized draft
router.post('/reset/:userId', requireAuth, requireAdmin, (req, res) => {
  const targetUserId = req.params.userId;

  // Get target user info
  const userQuery = 'SELECT * FROM users WHERE id = ?';
  db.get(userQuery, [targetUserId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete all draft selections for the user
    const deleteSelectionsQuery = 'DELETE FROM draft_selections WHERE user_id = ?';
    db.run(deleteSelectionsQuery, [targetUserId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error clearing draft selections' });
      }

      // Reset finalized status
      const updateQuery = 'UPDATE users SET is_draft_finalized = 0 WHERE id = ?';
      db.run(updateQuery, [targetUserId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error resetting draft status' });
        }

        res.json({
          message: `${user.sumo_name}'s draft has been reset. They can now draft again.`,
          resetUser: user.sumo_name
        });
      });
    });
  });
});

module.exports = router; 