const cookie = require('cookie');
const { verifySession, signSession } = require('../_session-store');
const { supabaseQueries } = require('../../lib/supabase');

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

  if (sessionData.isDraftFinalized) {
    return res.status(400).json({ error: 'Draft is already finalized' });
  }

  try {
    // Get current draft status
    const draftStatus = await supabaseQueries.getDraftStatus(sessionData.userId);

    // Validate draft completeness
    if (draftStatus.selectedCount === 0) {
      return res.status(400).json({ error: 'Cannot finalize empty draft' });
    }

    if (draftStatus.totalSpent > 50) {
      return res.status(400).json({ 
        error: 'Draft exceeds point limit',
        totalSpent: draftStatus.totalSpent,
        limit: 50
      });
    }

    // Finalize the draft in Supabase
    const { data: user, error } = await supabaseQueries.finalizeDraft(sessionData.userId);

    if (error) {
      console.error('Draft finalization error:', error);
      return res.status(500).json({ error: 'Failed to finalize draft' });
    }

    // Update session data
    const updatedSessionData = {
      ...sessionData,
      isDraftFinalized: true
    };

    const newSessionToken = signSession(updatedSessionData);

    // Update session cookie
    res.setHeader('Set-Cookie', cookie.serialize('session', newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/'
    }));

    res.json({
      message: 'Draft finalized successfully',
      finalizedAt: new Date().toISOString(),
      selectedRikishi: draftStatus.selectedRikishi,
      totalSpent: draftStatus.totalSpent,
      remainingPoints: draftStatus.remainingPoints,
      selectedCount: draftStatus.selectedCount
    });

  } catch (error) {
    console.error('Error finalizing draft:', error);
    res.status(500).json({ 
      error: 'Failed to finalize draft',
      details: error.message 
    });
  }
}; 