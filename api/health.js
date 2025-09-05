module.exports = async (req, res) => {
  // noop: trigger redeploy
  // Basic health check with debug info
  const debugInfo = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    envVars: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'MISSING'
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
    debug: debugInfo,
    flags: (() => {
      try {
        const { NO_POINTS_MODE, DRAFT_BUDGET } = require('../lib/config');
        return { NO_POINTS_MODE, DRAFT_BUDGET };
      } catch {
        return { NO_POINTS_MODE: undefined, DRAFT_BUDGET: undefined };
      }
    })()
  });
}; 