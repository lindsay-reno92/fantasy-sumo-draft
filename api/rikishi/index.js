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
    // Get rikishi data with selections from Supabase
    const groupedRikishi = await supabaseQueries.getRikishiWithSelections(sessionData.userId);

    res.json(groupedRikishi);
    
  } catch (error) {
    console.error('Error loading rikishi data:', error);
    res.status(500).json({ 
      error: 'Failed to load rikishi data',
      details: error.message
    });
  }
}; 