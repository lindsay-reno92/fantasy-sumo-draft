const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable auth since we're using custom session management
    persistSession: false,
    autoRefreshToken: false
  }
});

// Helper functions for database operations
const supabaseQueries = {
  // Get all rikishi with selection status for a user
  async getRikishiWithSelections(userId) {
    const { data: rikishi, error: rikishiError } = await supabase
      .from('rikishi')
      .select('*')
      .order('draft_value', { ascending: false });

    if (rikishiError) throw rikishiError;

    // Get user's selections
    const { data: selections, error: selectionsError } = await supabase
      .from('draft_selections')
      .select('rikishi_id')
      .eq('user_id', userId);

    if (selectionsError) throw selectionsError;

    const selectedIds = selections.map(s => s.rikishi_id);

    // Group by ranking and add selection status
    const grouped = {
      Yellow: [],
      Blue: [],
      Green: [],
      White: []
    };

    rikishi.forEach(r => {
      if (grouped[r.ranking_group]) {
        grouped[r.ranking_group].push({
          ...r,
          isSelected: selectedIds.includes(r.id)
        });
      }
    });

    return grouped;
  },

  // Get user by sumo name
  async getUser(sumoName) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('sumo_name', sumoName)
      .single();

    return { data, error };
  },

  // Get single rikishi by ID
  async getRikishi(rikishiId) {
    const { data, error } = await supabase
      .from('rikishi')
      .select('*')
      .eq('id', rikishiId)
      .single();

    return { data, error };
  },

  // Create or get user
  async createUser(sumoName) {
    console.log('Creating/finding user:', sumoName);
    
    // First try to get existing user
    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('*')
      .eq('sumo_name', sumoName)
      .single();

    console.log('Existing user lookup:', { found: !!existing, error: existingError?.message });

    if (existing) return { data: existing, error: null };

    // Create new user
    console.log('Creating new user:', sumoName);
    const { data, error } = await supabase
      .from('users')
      .insert({ sumo_name: sumoName })
      .select()
      .single();

    console.log('User creation result:', { 
      success: !!data, 
      userId: data?.id,
      error: error?.message,
      errorDetails: error
    });

    return { data, error };
  },

  // Get draft status for user
  async getDraftStatus(userId) {
    // Get regular draft selections
    const { data: selections, error } = await supabase
      .from('draft_selections')
      .select(`
        *,
        rikishi:rikishi_id (
          id,
          name,
          draft_value,
          ranking_group,
          official_rank
        )
      `)
      .eq('user_id', userId)
      .order('selected_at', { ascending: true });

    if (error) throw error;

    // Get hater pick
    const { data: haterPickData, error: haterError } = await supabase
      .from('hater_picks')
      .select(`
        hater_cost,
        rikishi:rikishi_id (
          id,
          name,
          draft_value,
          ranking_group,
          official_rank
        )
      `)
      .eq('user_id', userId)
      .single();

    // haterError is expected if no hater pick exists
    const haterPick = haterPickData?.rikishi || null;
    const haterPickCost = haterPickData?.hater_cost || 0;

    const selectedRikishi = selections.map(s => s.rikishi);
    const regularDraftSpent = selectedRikishi.reduce((sum, r) => sum + r.draft_value, 0);
    const totalSpent = regularDraftSpent + haterPickCost;
    
    return {
      selectedRikishi,
      totalSpent: totalSpent, // Include both regular draft and hater pick costs
      remainingPoints: 50 - totalSpent, // Total including hater pick
      selectedCount: selectedRikishi.length,
      haterPick: haterPick,
      haterPickCost: haterPickCost
    };
  },

  // Add selection
  async addSelection(userId, rikishiId) {
    const { data, error } = await supabase
      .from('draft_selections')
      .insert({ user_id: userId, rikishi_id: rikishiId })
      .select()
      .single();

    return { data, error };
  },

  // Remove selection
  async removeSelection(userId, rikishiId) {
    const { error } = await supabase
      .from('draft_selections')
      .delete()
      .eq('user_id', userId)
      .eq('rikishi_id', rikishiId);

    return { error };
  },

  // Finalize draft
  async finalizeDraft(userId) {
    const { data, error } = await supabase
      .from('users')
      .update({ is_draft_finalized: true })
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  },

  // Add hater pick for user
  async addHaterPick(userId, rikishiId, haterCost) {
    const { error } = await supabase
      .from('hater_picks')
      .upsert({
        user_id: userId,
        rikishi_id: rikishiId,
        hater_cost: haterCost,
        selected_at: new Date().toISOString()
      });
    
    if (error) throw error;
  },

  // Remove hater pick for user
  async removeHaterPick(userId) {
    const { error } = await supabase
      .from('hater_picks')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
  },

  // Get hater pick for user
  async getHaterPick(userId) {
    const { data, error } = await supabase
      .from('hater_picks')
      .select(`
        hater_cost,
        rikishi:rikishi_id (
          id,
          name,
          draft_value,
          ranking_group,
          official_rank
        )
      `)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }

    return data || null;
  },

  // Add hater pick
  async addHaterPick(userId, rikishiId, haterCost) {
    const { data, error } = await supabase
      .from('hater_picks')
      .upsert(
        { 
          user_id: userId, 
          rikishi_id: rikishiId,
          hater_cost: haterCost
        },
        { 
          onConflict: 'user_id'
        }
      )
      .select()
      .single();

    return { data, error };
  },

  // Remove hater pick
  async removeHaterPick(userId) {
    const { data, error } = await supabase
      .from('hater_picks')
      .delete()
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  },

  // Get hater pick
  async getHaterPick(userId) {
    const { data, error } = await supabase
      .from('hater_picks')
      .select(`
        hater_cost,
        rikishi:rikishi_id (
          id,
          name,
          draft_value,
          ranking_group,
          official_rank
        )
      `)
      .eq('user_id', userId)
      .single();

    return { data, error };
  },

  // Get all finalized drafts
  async getAllFinalizedDrafts() {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        draft_selections (
          rikishi:rikishi_id (
            id,
            name,
            draft_value,
            ranking_group,
            official_rank,
            wins,
            losses
          )
        )
      `)
      .eq('is_draft_finalized', true)
      .order('sumo_name');

    if (error) throw error;

    return data.map(user => ({
      userId: user.id,
      sumoName: user.sumo_name,
      isDraftFinalized: user.is_draft_finalized,
      rikishi: user.draft_selections.map(s => s.rikishi),
      totalSpent: user.draft_selections.reduce((sum, s) => sum + s.rikishi.draft_value, 0),
      remainingPoints: 50 - user.draft_selections.reduce((sum, s) => sum + s.rikishi.draft_value, 0),
      rikishiCount: user.draft_selections.length
    }));
  }
};

module.exports = { supabase, supabaseQueries }; 