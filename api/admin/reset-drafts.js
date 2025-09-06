const cookie = require('cookie');
const { verifySession } = require('../_session-store');
const { supabase, supabaseAdmin } = require('../../lib/supabase');

function requireAdmin(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const sessionData = verifySession(cookies.session);
  if (!sessionData || !sessionData.isAdmin) return null;
  return sessionData;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionData = requireAdmin(req);
  if (!sessionData) return res.status(401).json({ error: 'Admin authentication required' });

  const client = supabaseAdmin || supabase;

  try {
    // Delete all draft selections
    const { error: delSelectionsErr } = await client.from('draft_selections').delete().neq('id', 0);
    if (delSelectionsErr) throw delSelectionsErr;

    // Delete all hater picks (if table exists)
    try {
      const { error: delHaterErr } = await client.from('hater_picks').delete().neq('id', 0);
      if (delHaterErr && delHaterErr.code !== '42P01') throw delHaterErr;
    } catch (_) {}

    // Reset all users' finalized flag and remaining points
    const { error: resetUsersErr } = await client
      .from('users')
      .update({ is_draft_finalized: false, remaining_points: 50 })
      .gt('id', 0); // Supabase requires a WHERE clause; this targets all rows
    if (resetUsersErr) throw resetUsersErr;

    return res.json({ success: true, message: 'All drafts reset' });
  } catch (error) {
    console.error('Admin reset error:', error);
    return res.status(500).json({ error: 'Failed to reset drafts', details: error.message });
  }
};


