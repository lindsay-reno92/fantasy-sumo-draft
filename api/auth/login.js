const cookie = require('cookie');
const { signSession } = require('../_session-store');
const { supabaseQueries } = require('../../lib/supabase');

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

  const { sumoName } = req.body;

  if (!sumoName || sumoName.trim().length === 0) {
    return res.status(400).json({ error: 'Sumo name is required' });
  }

  const trimmedName = sumoName.trim();

  try {
    // Create or get user from Supabase
    const { data: user, error } = await supabaseQueries.createUser(trimmedName);

    if (error) {
      console.error('User creation error:', error);
      return res.status(500).json({ error: 'Failed to create or get user' });
    }

    // Create session data
    const sessionData = {
      userId: user.id,
      sumoName: user.sumo_name,
      isAdmin: user.is_admin || false,
      isDraftFinalized: user.is_draft_finalized || false,
      loginTime: Date.now()
    };

    // Sign the session
    const sessionToken = signSession(sessionData);

    // Set session cookie
    res.setHeader('Set-Cookie', cookie.serialize('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    }));

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        sumoName: user.sumo_name,
        isAdmin: user.is_admin || false,
        isDraftFinalized: user.is_draft_finalized || false
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed', 
      details: error.message 
    });
  }
}; 