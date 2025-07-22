const cookie = require('cookie');

module.exports = async (req, res) => {
  try {
    console.log('=== HATER PICK REQUEST START ===');
    console.log('Method:', req.method);
    console.log('Body:', req.body);
    console.log('Headers cookie:', req.headers.cookie ? 'exists' : 'missing');

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      console.log('OPTIONS request - returning 200');
      return res.status(200).end();
    }

    // Test imports - step by step
    console.log('Testing session store import...');
    const { verifySession } = require('../_session-store');
    console.log('Session store imported successfully');

    // Test session
    console.log('Parsing cookies...');
    const cookies = cookie.parse(req.headers.cookie || '');
    console.log('Cookies parsed, session cookie exists:', !!cookies.session);

    console.log('Verifying session...');
    const sessionData = verifySession(cookies.session);
    console.log('Session verification result:', !!sessionData);
    console.log('Session data keys:', sessionData ? Object.keys(sessionData) : 'null');
    console.log('Session userId:', sessionData ? sessionData.userId : 'undefined');

    // Just return success for now - no validation
    console.log('Returning test success response');
    return res.json({ 
      success: true, 
      message: 'MINIMAL TEST - Hater pick endpoint working!',
      debug: {
        sessionExists: !!sessionData,
        userId: sessionData ? sessionData.userId : null,
        method: req.method,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('=== HATER PICK ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      debug: 'Check Vercel logs for details'
    });
  }
}; 