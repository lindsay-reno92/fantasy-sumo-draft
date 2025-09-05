const cookie = require('cookie');
const { verifySession } = require('../_session-store');
const { supabaseQueries } = require('../../lib/supabase');
const { DRAFT_BUDGET } = require('../../lib/config');

// Get the supabase client directly
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Session helper
function requireAuth(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return verifySession(cookies.session);
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

  // Check authentication
  const sessionData = requireAuth(req);
  if (!sessionData) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    console.log('Fetching all finalized drafts...');

    // Get all finalized users
    const { data: finalizedUsers, error: usersError } = await supabase
      .from('users')
      .select('id, sumo_name, remaining_points')
      .eq('is_draft_finalized', true)
      .order('sumo_name');

    if (usersError) {
      console.error('Error fetching finalized users:', usersError);
      return res.status(500).json({ error: 'Failed to fetch finalized users' });
    }

    console.log(`Found ${finalizedUsers.length} finalized users`);

    if (finalizedUsers.length === 0) {
      return res.json([]);
    }

    // Get detailed selections for each finalized user
    const allDrafts = [];
    
    for (const user of finalizedUsers) {
      try {
        // Get user's selected rikishi with full details
        const { data: userSelections, error: selectionsError } = await supabase
          .from('draft_selections')
          .select(`
            rikishi (
              id,
              name,
              official_rank,
              ranking_group,
              draft_value,
              wins,
              losses,
              absences,
              last_tourney_wins,
              last_tourney_losses,
              weight_lbs,
              height_inches,
              age,
              times_picked
            )
          `)
          .eq('user_id', user.id);

        if (selectionsError) {
          console.error(`Error fetching selections for user ${user.id}:`, selectionsError);
          continue; // Skip this user but continue with others
        }

        // Get user's hater pick if exists
        const { data: haterPickData, error: haterError } = await supabase
          .from('hater_picks')
          .select(`
            hater_cost,
            rikishi (
              id,
              name,
              official_rank,
              ranking_group,
              draft_value
            )
          `)
          .eq('user_id', user.id)
          .single();

        // haterError is expected if no hater pick exists
        const haterPick = haterPickData?.rikishi || null;
        const haterPickCost = haterPickData?.hater_cost || 0;

        // Extract rikishi data and calculate totals
        const rikishi = userSelections.map(selection => selection.rikishi);
        const regularDraftSpent = rikishi.reduce((sum, r) => sum + r.draft_value, 0);
        const totalSpent = regularDraftSpent + haterPickCost;

        const userDraft = {
          userId: user.id,
          sumoName: user.sumo_name,
          isDraftFinalized: true,
          rikishi: rikishi.sort((a, b) => {
            // Sort by ranking group first, then by draft value
            const groupOrder = { 'Yellow': 1, 'Blue': 2, 'Green': 3, 'White': 4 };
            const aOrder = groupOrder[a.ranking_group] || 5;
            const bOrder = groupOrder[b.ranking_group] || 5;
            
            if (aOrder !== bOrder) return aOrder - bOrder;
            return b.draft_value - a.draft_value;
          }),
          totalSpent,
          remainingPoints: DRAFT_BUDGET - totalSpent,
          rikishiCount: rikishi.length,
          haterPick: haterPick,
          haterPickCost: haterPickCost
        };

        allDrafts.push(userDraft);

      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        continue; // Skip this user but continue with others
      }
    }

    console.log(`Successfully processed ${allDrafts.length} finalized drafts`);

    // Sort drafts by sumo name for consistent ordering
    allDrafts.sort((a, b) => a.sumoName.localeCompare(b.sumoName));

    res.json(allDrafts);

  } catch (error) {
    console.error('Error in all-finalized endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to load finalized drafts',
      details: error.message
    });
  }
}; 