const cookie = require('cookie');

module.exports = async (req, res) => {
  try {
    console.log('=== HATER PICK REQUEST START ===');
    console.log('Method:', req.method);
    console.log('Body:', req.body);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      console.log('OPTIONS request - returning 200');
      return res.status(200).end();
    }

    console.log('Testing session store import...');
    const { verifySession } = require('../_session-store');
    console.log('Session store imported successfully');

    console.log('Parsing cookies...');
    const cookies = cookie.parse(req.headers.cookie || '');
    console.log('Cookies parsed, session cookie exists:', !!cookies.session);

    console.log('Verifying session...');
    const sessionData = verifySession(cookies.session);
    console.log('Session verification result:', !!sessionData);

    // CRITICAL: Don't access any properties of sessionData - just return success
    console.log('About to return success without accessing session properties');
    
    return res.json({ 
      success: true, 
      message: 'HATER PICK WORKING! Session exists: ' + !!sessionData,
      debug: {
        hasSession: !!sessionData,
        method: req.method,
        timestamp: new Date().toISOString(),
        rikishiId: req.body?.rikishiId || 'missing',
        haterCost: req.body?.haterCost || 'missing'
      }
    });

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