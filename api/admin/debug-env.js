const cookie = require('cookie');
const { verifySession } = require('../_session-store');

// Session helper - require admin auth
function requireAdmin(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const sessionData = verifySession(cookies.session);
  
  if (!sessionData || !sessionData.isAdmin) {
    return null;
  }
  
  return sessionData;
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check admin authentication
  const sessionData = requireAdmin(req);
  if (!sessionData) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  // Get all environment variables that start with SUPABASE
  const supabaseEnvVars = {};
  Object.keys(process.env).forEach(key => {
    if (key.includes('SUPABASE')) {
      supabaseEnvVars[key] = process.env[key] ? 
        process.env[key].substring(0, 15) + '...' : 'NOT_SET';
    }
  });

  // Debug environment variables (safely)
  const debug = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
      process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...' : 'NOT_SET',
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    platform: process.env.VERCEL ? 'Vercel' : 'Local',
    allSupabaseVars: supabaseEnvVars,
    timestamp: new Date().toISOString()
  };

  res.json({
    message: 'Environment debug info (detailed)',
    debug
  });
}; 