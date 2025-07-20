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

// Middleware to check admin
const requireAdmin = (req, res, next) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get all rikishi organized by ranking group
router.get('/', requireAuth, (req, res) => {
  const query = `
    SELECT r.*, 
           ds.user_id as selected_by_user
    FROM rikishi r
    LEFT JOIN draft_selections ds ON r.id = ds.rikishi_id AND ds.user_id = ?
    ORDER BY 
      CASE r.ranking_group
        WHEN 'Yellow' THEN 1
        WHEN 'Blue' THEN 2
        WHEN 'Green' THEN 3
        WHEN 'White' THEN 4
        ELSE 5
      END,
      r.draft_value DESC,
      r.name
  `;

  db.all(query, [req.session.userId], (err, rikishi) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Group by ranking group
    const groupedRikishi = {
      Yellow: [],
      Blue: [],
      Green: [],
      White: []
    };

    rikishi.forEach(r => {
      const rikishiData = {
        ...r,
        isSelected: !!r.selected_by_user
      };
      delete rikishiData.selected_by_user;
      
      if (groupedRikishi[r.ranking_group]) {
        groupedRikishi[r.ranking_group].push(rikishiData);
      }
    });

    res.json(groupedRikishi);
  });
});

// Get individual rikishi details
router.get('/:id', requireAuth, (req, res) => {
  const rikishiId = req.params.id;

  const query = `
    SELECT r.*, 
           ds.user_id as selected_by_user
    FROM rikishi r
    LEFT JOIN draft_selections ds ON r.id = ds.rikishi_id AND ds.user_id = ?
    WHERE r.id = ?
  `;

  db.get(query, [req.session.userId, rikishiId], (err, rikishi) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!rikishi) {
      return res.status(404).json({ error: 'Rikishi not found' });
    }

    const result = {
      ...rikishi,
      isSelected: !!rikishi.selected_by_user
    };
    delete result.selected_by_user;

    res.json(result);
  });
});

// Update rikishi draft value (admin only)
router.put('/:id/value', requireAuth, requireAdmin, (req, res) => {
  const rikishiId = req.params.id;
  const { draftValue } = req.body;

  if (!draftValue || draftValue < 1 || draftValue > 20) {
    return res.status(400).json({ error: 'Draft value must be between 1 and 20' });
  }

  const query = 'UPDATE rikishi SET draft_value = ? WHERE id = ?';
  db.run(query, [draftValue, rikishiId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Rikishi not found' });
    }

    res.json({ 
      message: 'Draft value updated successfully',
      rikishiId: parseInt(rikishiId),
      newValue: draftValue
    });
  });
});

module.exports = router; 