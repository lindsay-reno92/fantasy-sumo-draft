const { getDatabase } = require('../../_db');
const { requireAuth, requireAdmin, setCorsHeaders } = require('../../_session');

module.exports = (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  const sessionData = requireAuth(req, res);
  if (!sessionData) return;

  // Check admin permissions
  if (!requireAdmin(req, res)) return;

  const targetUserId = req.query.userId;
  const db = getDatabase();

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
}; 