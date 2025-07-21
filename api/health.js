module.exports = async (req, res) => {
  // Basic health check with debug info
  const debugInfo = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    envVars: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
    }
  };

  // Try to load Supabase client
  let supabaseStatus = 'NOT_TESTED';
  try {
    const { supabase } = require('../lib/supabase');
    supabaseStatus = 'LOADED';
    
    // Try a simple query
    const { data, error } = await supabase.from('users').select('count').limit(1);
    supabaseStatus = error ? `ERROR: ${error.message}` : 'WORKING';
  } catch (err) {
    supabaseStatus = `LOAD_ERROR: ${err.message}`;
  }

  debugInfo.supabaseStatus = supabaseStatus;

  res.json({
    status: 'ok',
    debug: debugInfo
  });
}; 