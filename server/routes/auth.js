const express = require('express');
const router = express.Router();
const db = require('../database/init');

// Simple login with just sumo name
router.post('/login', (req, res) => {
  const { sumoName } = req.body;

  if (!sumoName || !sumoName.trim()) {
    return res.status(400).json({ error: 'Sumo name is required' });
  }

  const cleanSumoName = sumoName.trim();

  // Find or create user
  const query = 'SELECT * FROM users WHERE sumo_name = ?';
  db.get(query, [cleanSumoName], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (user) {
      // User exists, log them in
      req.session.userId = user.id;
      req.session.sumoName = user.sumo_name;

      res.json({
        id: user.id,
        sumoName: user.sumo_name,
        remainingPoints: user.remaining_points,
        isDraftFinalized: user.is_draft_finalized,
        message: 'Welcome back!'
      });
    } else {
      // Create new user
      const insertQuery = 'INSERT INTO users (sumo_name) VALUES (?)';
      db.run(insertQuery, [cleanSumoName], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error creating user' });
        }

        // Store user session
        req.session.userId = this.lastID;
        req.session.sumoName = cleanSumoName;

        res.status(201).json({
          id: this.lastID,
          sumoName: cleanSumoName,
          remainingPoints: 100,
          isDraftFinalized: false,
          message: 'Welcome to Fantasy Sumo Draft!'
        });
      });
    }
  });
});

// Logout user
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error logging out' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Check if user is authenticated
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const query = 'SELECT id, sumo_name, remaining_points, is_draft_finalized FROM users WHERE id = ?';
  db.get(query, [req.session.userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      sumoName: user.sumo_name,
      remainingPoints: user.remaining_points,
      isDraftFinalized: user.is_draft_finalized
    });
  });
});

// Admin login
router.post('/admin', (req, res) => {
  const { password } = req.body;

  if (password !== 'admin') {
    return res.status(401).json({ error: 'Invalid admin password' });
  }

  req.session.isAdmin = true;
  res.json({ message: 'Admin mode activated', isAdmin: true });
});

module.exports = router; 