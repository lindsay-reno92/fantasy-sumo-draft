const cookie = require('cookie');
const { verifySession } = require('../_session-store');
const { supabaseQueries } = require('../../lib/supabase');

// Session helper
function requireAuth(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return verifySession(cookies.session);
}

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
  const sessionData = requireAuth(req);
  if (!sessionData) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Get draft status from Supabase
    const draftStatus = await supabaseQueries.getDraftStatus(sessionData.userId);

    res.json({
      sumoName: sessionData.sumoName,
      selectedRikishi: draftStatus.selectedRikishi,
      totalSpent: draftStatus.totalSpent,
      remainingPoints: draftStatus.remainingPoints,
      selectedCount: draftStatus.selectedCount,
      isDraftFinalized: sessionData.isDraftFinalized || false
    });

  } catch (error) {
    console.error('Error getting draft status:', error);
    res.status(500).json({ 
      error: 'Failed to get draft status',
      details: error.message 
    });
  }
}; 