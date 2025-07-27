const cookie = require('cookie');
const { verifySession } = require('../_session-store');
const { supabase } = require('../../lib/supabase');

// Session helper
function requireAuth(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const sessionData = verifySession(cookies.session);
  
  if (!sessionData) {
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

  // Check authentication
  const sessionData = requireAuth(req);
  if (!sessionData) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Get current active basho
    const { data: currentBasho, error: bashoError } = await supabase
      .from('basho')
      .select('*')
      .eq('is_active', true)
      .single();

    let bashoId = null;
    
    if (bashoError && bashoError.code === 'PGRST116') {
      // No active basho, try to get the most recent one
      const { data: recentBasho, error: recentError } = await supabase
        .from('basho')
        .select('*')
        .order('start_date', { ascending: false })
        .limit(1)
        .single();
        
      if (recentError) {
        return res.status(404).json({ 
          error: 'No tournament data available',
          details: 'Please sync tournament data first'
        });
      }
      
      bashoId = recentBasho.id;
    } else if (bashoError) {
      throw bashoError;
    } else {
      bashoId = currentBasho.id;
    }

    // Get league standings for this basho
    const { data: standings, error: standingsError } = await supabase
      .from('league_standings')
      .select(`
        *,
        user:users!league_standings_user_id_fkey (
          id,
          sumo_name,
          is_draft_finalized
        )
      `)
      .eq('basho_id', bashoId)
      .order('total_fantasy_points', { ascending: false });

    if (standingsError) throw standingsError;

    // Get tournament performance for all users' rikishi
    const { data: userDraftSelections, error: draftError } = await supabase
      .from('draft_selections')
      .select(`
        user_id,
        rikishi:rikishi!draft_selections_rikishi_id_fkey (
          id,
          name,
          sumo_api_id,
          current_rank,
          official_rank
        )
      `);

    if (draftError) throw draftError;

    // Group draft selections by user
    const userRikishiMap = {};
    userDraftSelections.forEach(selection => {
      if (!userRikishiMap[selection.user_id]) {
        userRikishiMap[selection.user_id] = [];
      }
      userRikishiMap[selection.user_id].push(selection.rikishi);
    });

    // Get tournament performance for each rikishi
    const allRikishiIds = userDraftSelections.map(s => s.rikishi.id);
    const { data: tournamentPerf, error: perfError } = await supabase
      .from('tournament_performance')
      .select('*')
      .eq('basho_id', bashoId)
      .in('rikishi_id', allRikishiIds);

    if (perfError) throw perfError;

    // Create performance lookup
    const perfLookup = {};
    tournamentPerf.forEach(perf => {
      perfLookup[perf.rikishi_id] = perf;
    });

    // Calculate live standings
    const liveStandings = standings.map(standing => {
      const userRikishi = userRikishiMap[standing.user_id] || [];
      let totalWins = 0;
      let totalLosses = 0;
      let activeRikishi = 0;

      const rikishiPerformance = userRikishi.map(rikishi => {
        const perf = perfLookup[rikishi.id] || { wins: 0, losses: 0, absences: 0 };
        totalWins += perf.wins;
        totalLosses += perf.losses;
        if (perf.wins > 0 || perf.losses > 0) activeRikishi++;

        return {
          ...rikishi,
          performance: perf
        };
      });

      return {
        userId: standing.user_id,
        sumoName: standing.user.sumo_name,
        isDraftFinalized: standing.user.is_draft_finalized,
        totalWins,
        totalLosses,
        activeRikishi,
        totalFantasyPoints: standing.total_fantasy_points,
        bonusPoints: standing.bonus_points,
        rankPosition: standing.rank_position,
        rikishi: rikishiPerformance
      };
    });

    // Get recent scoring events for activity feed
    const { data: recentEvents, error: eventsError } = await supabase
      .from('scoring_events')
      .select(`
        *,
        user:users!scoring_events_user_id_fkey (sumo_name),
        rikishi:rikishi!scoring_events_rikishi_id_fkey (name),
        rule:scoring_rules!scoring_events_rule_id_fkey (description)
      `)
      .eq('basho_id', bashoId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (eventsError) throw eventsError;

    // Get basho info
    const bashoInfo = currentBasho || await supabase
      .from('basho')
      .select('*')
      .eq('id', bashoId)
      .single()
      .then(({ data }) => data);

    res.json({
      basho: bashoInfo,
      standings: liveStandings,
      recentEvents: recentEvents || [],
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching live standings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch live standings',
      details: error.message
    });
  }
}; 