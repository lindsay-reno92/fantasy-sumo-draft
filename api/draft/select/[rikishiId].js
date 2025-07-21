const cookie = require('cookie');
const { verifySession } = require('../../_session-store');
const { supabaseQueries } = require('../../../lib/supabase');

// Session helper
function requireAuth(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return verifySession(cookies.session);
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  const sessionData = requireAuth(req);
  if (!sessionData) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { rikishiId } = req.query;
  const rikishiIdNum = parseInt(rikishiId);

  if (!rikishiIdNum || rikishiIdNum <= 0) {
    return res.status(400).json({ error: 'Invalid rikishi ID' });
  }

  try {
    // Check current draft status
    const draftStatus = await supabaseQueries.getDraftStatus(sessionData.userId);
    
    // Check if already selected
    const alreadySelected = draftStatus.selectedRikishi.some(r => r.id === rikishiIdNum);
    if (alreadySelected) {
      return res.status(400).json({ error: 'Rikishi already selected' });
    }

    // Get the rikishi to check its value
    const { supabase } = require('../../../lib/supabase');
    const { data: rikishi, error: rikishiError } = await supabase
      .from('rikishi')
      .select('*')
      .eq('id', rikishiIdNum)
      .single();

    if (rikishiError || !rikishi) {
      return res.status(404).json({ error: 'Rikishi not found' });
    }

    // Check if user has enough points
    const newTotal = draftStatus.totalSpent + rikishi.draft_value;
    if (newTotal > 50) {
      return res.status(400).json({ 
        error: 'Not enough points',
        currentSpent: draftStatus.totalSpent,
        rikishiValue: rikishi.draft_value,
        wouldSpend: newTotal
      });
    }

    // Add the selection to Supabase
    const { error: selectionError } = await supabaseQueries.addSelection(sessionData.userId, rikishiIdNum);
    
    if (selectionError) {
      console.error('Selection error:', selectionError);
      return res.status(500).json({ error: 'Failed to add selection' });
    }

    // Get updated draft status
    const updatedStatus = await supabaseQueries.getDraftStatus(sessionData.userId);

    res.json({
      success: true,
      message: `${rikishi.name} selected successfully`,
      rikishi: rikishi,
      totalSpent: updatedStatus.totalSpent,
      remainingPoints: updatedStatus.remainingPoints,
      selectedCount: updatedStatus.selectedCount
    });

  } catch (error) {
    console.error('Error selecting rikishi:', error);
    res.status(500).json({ 
      error: 'Failed to select rikishi',
      details: error.message
    });
  }
}; 