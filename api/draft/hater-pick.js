const cookie = require('cookie');
const { verifySession } = require('../_session-store');
const { supabaseQueries } = require('../../lib/supabase');

// Session helper
function requireAuth(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const sessionData = verifySession(cookies.session);
  
  if (!sessionData) {
    return null;
  }
  
  return sessionData;
}

module.exports = async (req, res) => {
  try {
    console.log('=== HATER PICK REQUEST ===');
    console.log('Method:', req.method);
    console.log('Body:', req.body);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Check authentication
    const sessionData = requireAuth(req);
    if (!sessionData) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.method === 'POST') {
      // Add/select hater pick
      const { rikishiId, haterCost } = req.body;

      if (!rikishiId || !haterCost) {
        return res.status(400).json({ error: 'Missing rikishiId or haterCost' });
      }

      // Get current draft status to check constraints
      const draftStatus = await supabaseQueries.getDraftStatus(sessionData.userId);
      
      // Check if user already has white tier rikishi selected
      const hasWhiteTier = draftStatus.selectedRikishi.some(r => r.ranking_group === 'White');
      if (hasWhiteTier) {
        const whiteTierRikishi = draftStatus.selectedRikishi.find(r => r.ranking_group === 'White');
        return res.status(400).json({
          error: `Cannot select hater pick when you have White tier rikishi! You have ${whiteTierRikishi.name} selected. Remove them first if you want to choose a hater pick instead.`
        });
      }

      // Check if user has enough points for hater pick
      const newTotal = draftStatus.totalSpent + haterCost;
      if (newTotal > 50) {
        return res.status(400).json({
          error: 'Not enough points for hater pick',
          currentSpent: draftStatus.totalSpent,
          haterCost: haterCost,
          wouldSpend: newTotal
        });
      }

      // Get rikishi info for response
      const { data: rikishi, error: rikishiError } = await supabaseQueries.getRikishi(rikishiId);

      if (rikishiError || !rikishi) {
        return res.status(404).json({ error: 'Rikishi not found' });
      }

      // Add hater pick
      const { error: haterError } = await supabaseQueries.addHaterPick(sessionData.userId, rikishiId, haterCost);
      
      if (haterError) {
        console.error('Hater pick error:', haterError);
        return res.status(500).json({ error: 'Failed to add hater pick' });
      }

      console.log('Hater pick added successfully');

      return res.status(200).json({
        success: true,
        message: `${rikishi.name} selected as your hater pick!`,
        haterPick: rikishi,
        haterCost: haterCost
      });

    } else if (req.method === 'DELETE') {
      // Remove hater pick
      const { error: removeError } = await supabaseQueries.removeHaterPick(sessionData.userId);
      
      if (removeError) {
        console.error('Remove hater pick error:', removeError);
        return res.status(500).json({ error: 'Failed to remove hater pick' });
      }

      console.log('Hater pick removed successfully');

      return res.status(200).json({
        success: true,
        message: 'Hater pick removed successfully'
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('=== HATER PICK ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}; 