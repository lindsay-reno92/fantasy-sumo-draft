const { getDatabase } = require('../_db');
const { requireAuth, requireAdmin, setCorsHeaders } = require('../_session');

module.exports = (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check authentication
  const sessionData = requireAuth(req, res);
  if (!sessionData) return; // requireAuth already sent the response

  const rikishiId = req.query.id;

  if (req.method === 'GET') {
    // Get individual rikishi details
    const db = getDatabase();
    
    const query = `
      SELECT r.*, 
             ds.user_id as selected_by_user
      FROM rikishi r
      LEFT JOIN draft_selections ds ON r.id = ds.rikishi_id AND ds.user_id = ?
      WHERE r.id = ?
    `;

    db.get(query, [sessionData.userId, rikishiId], (err, rikishi) => {
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

  } else if (req.method === 'PUT') {
    // Update rikishi draft value (admin only)
    if (!requireAdmin(req, res)) return; // requireAdmin already sent the response

    const { draftValue } = req.body;

    if (!draftValue || draftValue < 1 || draftValue > 20) {
      return res.status(400).json({ error: 'Draft value must be between 1 and 20' });
    }

    const db = getDatabase();
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

  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}; 