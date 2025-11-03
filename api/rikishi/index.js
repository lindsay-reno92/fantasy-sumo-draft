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
    console.log('Fetching rikishi data for user:', sessionData.userId, 'isAdmin:', sessionData.isAdmin);
    
    let rikishiData;
    
    // For admin users, get all rikishi with pick counts
    // For regular users, get rikishi with their selection status
    if (sessionData.isAdmin) {
      console.log('Fetching admin view with pick counts...');
      
      // Get all rikishi
      const { data: rikishi, error: rikishiError } = await supabase
        .from('rikishi')
        .select('*')
        .order('draft_value', { ascending: false });
      
      if (rikishiError) throw rikishiError;
      
      // Get pick counts for each rikishi
      const { data: pickCounts, error: pickError } = await supabase
        .from('draft_selections')
        .select('rikishi_id');
      
      if (pickError) throw pickError;
      
      // Count how many times each rikishi has been picked
      const pickCountMap = {};
      pickCounts.forEach(pick => {
        pickCountMap[pick.rikishi_id] = (pickCountMap[pick.rikishi_id] || 0) + 1;
      });
      
      // Add pick counts to rikishi data
      rikishiData = rikishi.map(r => ({
        ...r,
        times_picked: pickCountMap[r.id] || 0,
        isSelected: false,
        isHaterPick: false
      }));
      
    } else {
      // Regular user view
      rikishiData = await supabaseQueries.getRikishiWithSelections(sessionData.userId);
    }

    console.log('Successfully loaded rikishi data:', Array.isArray(rikishiData) ? rikishiData.length : 'unknown', 'rikishi');
    res.json(rikishiData);
    
  } catch (error) {
    console.error('Error loading rikishi data:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to load rikishi data',
      details: error.message,
      code: error.code,
      hint: error.hint
    });
  }
}; 