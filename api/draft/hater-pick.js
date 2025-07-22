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

    // Test basic functionality
    console.log('Function started, method:', req.method);

    // Test imports - step by step
    console.log('Testing session store import...');
    const { verifySession } = require('../_session-store');
    console.log('Session store imported successfully');

    console.log('Testing supabase import...');
    const { supabaseQueries } = require('../../lib/supabase');
    console.log('Supabase queries imported successfully');

    // Test session
    console.log('Parsing cookies...');
    const cookies = cookie.parse(req.headers.cookie || '');
    console.log('Cookies parsed, session cookie exists:', !!cookies.session);

    console.log('Verifying session...');
    const sessionData = verifySession(cookies.session);
    console.log('Session verification result:', !!sessionData);

    if (!sessionData || !sessionData.userId) {
      console.log('Auth failed - no valid session');
      console.log('Session data:', sessionData);
      return res.status(401).json({ error: 'Not authenticated', debug: 'No valid session' });
    }

    console.log('User authenticated:', sessionData.userId);

    if (req.method === 'POST') {
      const { rikishiId, haterCost } = req.body;
      console.log('POST data:', { rikishiId, haterCost });

      if (!rikishiId || !haterCost) {
        console.log('Missing required fields');
        return res.status(400).json({ error: 'Missing rikishiId or haterCost' });
      }

      console.log('All validations passed - returning success');
      // Test simple response first
      return res.json({ 
        success: true, 
        message: 'Hater pick test successful!',
        debug: {
          userId: sessionData.userId,
          rikishiId,
          haterCost,
          timestamp: new Date().toISOString()
        }
      });

    } else if (req.method === 'DELETE') {
      console.log('DELETE request');
      return res.json({ 
        success: true, 
        message: 'DELETE test successful',
        debug: { userId: sessionData.userId }
      });
    } else {
      console.log('Invalid method:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

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