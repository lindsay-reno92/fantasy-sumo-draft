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
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
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
    
    // Check if rikishi is actually selected
    const selectedRikishi = draftStatus.selectedRikishi.find(r => r.id === rikishiIdNum);
    if (!selectedRikishi) {
      return res.status(400).json({ error: 'Rikishi not currently selected' });
    }

    // Remove the selection from Supabase
    const { error: deselectionError } = await supabaseQueries.removeSelection(sessionData.userId, rikishiIdNum);
    
    if (deselectionError) {
      console.error('Deselection error:', deselectionError);
      return res.status(500).json({ error: 'Failed to remove selection' });
    }

    // Get updated draft status
    const updatedStatus = await supabaseQueries.getDraftStatus(sessionData.userId);

    res.json({
      success: true,
      message: `${selectedRikishi.name} removed from your draft`,
      rikishi: selectedRikishi,
      totalSpent: updatedStatus.totalSpent,
      remainingPoints: updatedStatus.remainingPoints,
      selectedCount: updatedStatus.selectedCount
    });

  } catch (error) {
    console.error('Error deselecting rikishi:', error);
    res.status(500).json({ 
      error: 'Failed to deselect rikishi',
      details: error.message
    });
  }
}; 