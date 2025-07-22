const cookie = require('cookie');
const { verifySession } = require('../_session-store');

module.exports = async (req, res) => {
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
  const cookies = cookie.parse(req.headers.cookie || '');
  const sessionData = verifySession(cookies.session);
  
  if (!sessionData || !sessionData.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Return basic session data without complex Supabase queries
  res.json({
    id: sessionData.userId,
    sumoName: sessionData.sumoName,
    isAdmin: sessionData.isAdmin || false,
    isDraftFinalized: sessionData.isDraftFinalized || false,
    remainingPoints: sessionData.remainingPoints || 50,
    totalSpent: sessionData.totalSpent || 0
  });
}; 