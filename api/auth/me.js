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
    console.log('Session verification failed - no session data');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  console.log('Session data found:', { 
    userId: sessionData.userId, 
    sumoName: sessionData.sumoName,
    sessionKeys: Object.keys(sessionData)
  });

  try {
    // Get fresh user data from Supabase
    let { data: user, error } = await supabaseQueries.getUser(sessionData.sumoName);

    console.log('User lookup result:', { 
      found: !!user, 
      error: error?.message,
      searchedFor: sessionData.sumoName 
    });

    // If user doesn't exist in database but has valid session, 
    // create the user (this handles the case where session exists but DB user creation failed)
    if (!user && !error) {
      console.log('User not found in DB, attempting to create:', sessionData.sumoName);
      const { data: newUser, error: createError } = await supabaseQueries.createUser(sessionData.sumoName);
      
      if (createError) {
        console.error('Failed to create missing user:', createError);
        return res.status(500).json({ error: 'User creation failed' });
      }
      
      // Use the newly created user
      user = newUser;
    }

    if (error || !user) {
      console.error('User lookup error:', error);
      return res.status(404).json({ error: 'User not found' });
    }

    // Get current draft status
    const draftStatus = await supabaseQueries.getDraftStatus(user.id);

    res.json({
      id: user.id,
      sumoName: user.sumo_name,
      isAdmin: user.is_admin || false,
      isDraftFinalized: user.is_draft_finalized || false,
      totalSpent: draftStatus.totalSpent,
      remainingPoints: draftStatus.remainingPoints,
      selectedCount: draftStatus.selectedCount,
      selectedRikishi: draftStatus.selectedRikishi
    });

  } catch (error) {
    console.error('Error getting user data:', error);
    res.status(500).json({ 
      error: 'Failed to get user data',
      details: error.message 
    });
  }
}; 