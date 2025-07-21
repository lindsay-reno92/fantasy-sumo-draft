const cookie = require('cookie');
const { verifySession } = require('../_session-store');
const { supabaseQueries } = require('../../lib/supabase');

// Get the supabase client directly since it's not exported as supabaseServer
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Session helper
function requireAuth(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return verifySession(cookies.session);
}

// Admin check helper
function requireAdmin(sessionData) {
  return sessionData && sessionData.isAdmin;
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check authentication
  const sessionData = requireAuth(req);
  if (!sessionData) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const rikishiId = parseInt(req.query.id);

  if (req.method === 'GET') {
    // Get individual rikishi details
    try {
      const { data: rikishi, error } = await supabase
        .from('rikishi')
        .select(`
          *,
          draft_selections!inner(user_id)
        `)
        .eq('id', rikishiId)
        .eq('draft_selections.user_id', sessionData.userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching rikishi:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!rikishi) {
        // Try to get rikishi without selection info
        const { data: rikishiData, error: rikishiError } = await supabase
          .from('rikishi')
          .select('*')
          .eq('id', rikishiId)
          .single();

        if (rikishiError) {
          return res.status(404).json({ error: 'Rikishi not found' });
        }

        res.json({ ...rikishiData, isSelected: false });
      } else {
        res.json({ ...rikishi, isSelected: true });
      }

    } catch (error) {
      console.error('Error in GET /api/rikishi/[id]:', error);
      res.status(500).json({ error: 'Internal server error' });
    }

  } else if (req.method === 'PUT') {
    // Update rikishi draft value (admin only)
    if (!requireAdmin(sessionData)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { draftValue } = req.body;

    if (!draftValue || draftValue < 1 || draftValue > 20) {
      return res.status(400).json({ error: 'Draft value must be between 1 and 20' });
    }

    try {
      console.log('Admin update attempt:', {
        rikishiId,
        draftValue,
        sessionData: { userId: sessionData.userId, isAdmin: sessionData.isAdmin }
      });

      const { data, error } = await supabase
        .from('rikishi')
        .update({ draft_value: draftValue })
        .eq('id', rikishiId)
        .select();

      if (error) {
        console.error('Supabase update error:', error);
        return res.status(500).json({ 
          error: 'Database update failed',
          details: error.message,
          code: error.code,
          hint: error.hint
        });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Rikishi not found or no changes made' });
      }

      console.log('Update successful:', data[0]);

      res.json({
        message: 'Draft value updated successfully',
        rikishiId: rikishiId,
        newValue: draftValue,
        rikishi: data[0]
      });

    } catch (error) {
      console.error('Error in PUT /api/rikishi/[id]:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error.message
      });
    }

  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}; 