const { supabase } = require('../lib/supabase');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('Environment variables:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
    });

    // Test simple query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    console.log('Supabase test query result:', { success: !error, error: error?.message });

    res.json({
      envVars: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
      },
      supabaseTest: {
        success: !error,
        error: error?.message
      }
    });

  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ 
      error: 'Debug failed', 
      details: err.message 
    });
  }
}; 