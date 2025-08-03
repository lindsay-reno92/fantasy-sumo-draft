const { supabase, supabaseAdmin } = require('./supabase');

class SumoApiService {
  constructor() {
    this.apiBase = 'https://sumo-api.com/api';
  }

  // Fetch only active Makuuchi rikishi from the API
  async fetchMakuuchiRikishi() {
    try {
      const response = await fetch(`${this.apiBase}/rikishis?limit=1000`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`API Error: ${data.error || response.statusText}`);
      }
      
      // Filter to only active Makuuchi division rikishi
      const makuuchiRikishi = data.records.filter(rikishi => {
        return this.isMakuuchiRikishi(rikishi.currentRank);
      });
      
      console.log(`Filtered to ${makuuchiRikishi.length} Makuuchi rikishi from ${data.records.length} total`);
      return makuuchiRikishi;
    } catch (error) {
      console.error('Error fetching rikishi from API:', error);
      throw error;
    }
  }

  // Check if a rikishi is in Makuuchi division
  isMakuuchiRikishi(currentRank) {
    if (!currentRank) return false;
    
    const rank = currentRank.toLowerCase();
    
    // Makuuchi division ranks
    return rank.includes('yokozuna') || 
           rank.includes('ozeki') || 
           rank.includes('sekiwake') || 
           rank.includes('komusubi') || 
           (rank.includes('maegashira') && !rank.includes('juryo'));
  }

  // Sync a single rikishi with our database
  async syncRikishi(apiRikishi) {
    try {
      // Use admin client if available, fallback to regular client
      const client = supabaseAdmin || supabase;
      
      const rikishiData = {
        sumo_api_id: apiRikishi.id,
        name: apiRikishi.shikonaEn,
        current_rank: apiRikishi.currentRank,
        heya: apiRikishi.heya,
        shusshin: apiRikishi.shusshin,
        birth_date: apiRikishi.birthDate ? new Date(apiRikishi.birthDate).toISOString().split('T')[0] : null,
        height_inches: apiRikishi.height ? (apiRikishi.height / 2.54) : null, // Convert cm to inches
        weight_lbs: apiRikishi.weight ? (apiRikishi.weight * 2.205) : null, // Convert kg to lbs
        debut: apiRikishi.debut,
        updated_at: new Date().toISOString()
      };

      // Try to update existing record first
      const { data: existingRikishi } = await client
        .from('rikishi')
        .select('id')
        .or(`sumo_api_id.eq.${apiRikishi.id},name.eq.${apiRikishi.shikonaEn}`)
        .single();

      if (existingRikishi) {
        // Update existing rikishi (keep existing draft_value, don't overwrite)
        const { error } = await client
          .from('rikishi')
          .update(rikishiData)
          .eq('id', existingRikishi.id);

        if (error) throw error;
        return { action: 'updated', rikishiId: existingRikishi.id };
      } else {
        // Create new rikishi - use ranking group logic but default draft value
        const rankingGroup = this.determineRankingGroup(apiRikishi.currentRank);
        const defaultDraftValue = 8; // Admin can adjust later if needed

        const newRikishiData = {
          ...rikishiData,
          ranking_group: rankingGroup,
          draft_value: defaultDraftValue,
          official_rank: apiRikishi.currentRank,
          wins: 0,
          losses: 0,
          absences: 0,
          times_picked: 0
        };

        const { data: newRikishi, error } = await client
          .from('rikishi')
          .insert(newRikishiData)
          .select('id')
          .single();

        if (error) throw error;
        return { action: 'created', rikishiId: newRikishi.id };
      }
    } catch (error) {
      console.error(`Error syncing rikishi ${apiRikishi.shikonaEn}:`, error);
      throw error;
    }
  }

  // Determine ranking group based on current rank (Makuuchi-focused)
  determineRankingGroup(currentRank) {
    if (!currentRank) return 'White';
    
    const rank = currentRank.toLowerCase();
    
    // Yellow tier: Yokozuna only
    if (rank.includes('yokozuna')) return 'Yellow';
    
    // Blue tier: Ozeki, Sekiwake, Komusubi, top Maegashira
    if (rank.includes('ozeki') || rank.includes('sekiwake') || rank.includes('komusubi')) return 'Blue';
    
    if (rank.includes('maegashira')) {
      // Split Maegashira into Blue (1-8) and Green (9+)
      const match = rank.match(/maegashira (\d+)/);
      if (match) {
        const number = parseInt(match[1]);
        return number <= 8 ? 'Blue' : 'Green';
      }
      return 'Green'; // Default for unclear Maegashira ranks
    }
    
    // Since we're only syncing Makuuchi, anything else should be White
    return 'White';
  }

  // Calculate draft value based on rank (Makuuchi-focused)
  calculateDraftValue(currentRank) {
    if (!currentRank) return 1;
    
    const rank = currentRank.toLowerCase();
    
    if (rank.includes('yokozuna')) return 10;
    if (rank.includes('ozeki')) return 8;
    if (rank.includes('sekiwake')) return 7;
    if (rank.includes('komusubi')) return 6;
    
    if (rank.includes('maegashira')) {
      const match = rank.match(/maegashira (\d+)/);
      if (match) {
        const number = parseInt(match[1]);
        // More nuanced scoring for Maegashira ranks
        if (number <= 3) return 6;      // M1-3: 6 points
        if (number <= 6) return 5;      // M4-6: 5 points  
        if (number <= 10) return 4;     // M7-10: 4 points
        return 3;                       // M11+: 3 points
      }
      return 4; // Default for unclear Maegashira ranks
    }
    
    return 2; // Fallback for any edge cases
  }

  // Fetch current tournament (basho) data
  async fetchCurrentBasho() {
    try {
      // Get current date and determine likely current basho
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      
      // Sumo tournaments are typically in Jan, Mar, May, Jul, Sep, Nov
      const bashoMonths = [1, 3, 5, 7, 9, 11];
      let currentBashoMonth = bashoMonths.reduce((prev, curr) => 
        Math.abs(curr - month) < Math.abs(prev - month) ? curr : prev
      );
      
      const bashoId = `${year}${currentBashoMonth.toString().padStart(2, '0')}`;
      
      const response = await fetch(`${this.apiBase}/basho/${bashoId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Basho API Error: ${data.error || response.statusText}`);
      }
      
      return {
        id: bashoId,
        startDate: data.startDate,
        endDate: data.endDate,
        location: this.getBashoLocation(currentBashoMonth),
        isActive: this.isBashoActive(data.startDate, data.endDate)
      };
    } catch (error) {
      console.error('Error fetching current basho:', error);
      throw error;
    }
  }

  // Determine basho location based on month
  getBashoLocation(month) {
    const locations = {
      1: 'Tokyo (Hatsu)',
      3: 'Osaka (Haru)', 
      5: 'Tokyo (Natsu)',
      7: 'Nagoya (Nagoya)',
      9: 'Tokyo (Aki)',
      11: 'Kyushu (Kyushu)'
    };
    return locations[month] || 'Unknown';
  }

  // Check if basho is currently active
  isBashoActive(startDate, endDate) {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
  }

  // Fetch matches for a specific rikishi in current tournament
  async fetchRikishiMatches(rikishiApiId, bashoId) {
    try {
      const response = await fetch(`${this.apiBase}/rikishi/${rikishiApiId}/matches?basho=${bashoId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Matches API Error: ${data.error || response.statusText}`);
      }
      
      return data.records || [];
    } catch (error) {
      console.error(`Error fetching matches for rikishi ${rikishiApiId}:`, error);
      throw error;
    }
  }

  // Sync tournament data to database
  async syncBashoToDatabase(bashoData) {
    try {
      // Use admin client if available, fallback to regular client
      const client = supabaseAdmin || supabase;
      
      const { error } = await client
        .from('basho')
        .upsert({
          id: bashoData.id,
          start_date: bashoData.startDate,
          end_date: bashoData.endDate,
          location: bashoData.location,
          is_active: bashoData.isActive
        });

      if (error) throw error;
      console.log(`Synced basho ${bashoData.id} to database`);
      return bashoData.id;
    } catch (error) {
      console.error('Error syncing basho to database:', error);
      throw error;
    }
  }

  // Full sync operation - sync only Makuuchi rikishi data
  async performFullSync() {
    try {
      console.log('Starting Makuuchi rikishi sync...');
      
      const apiRikishi = await this.fetchMakuuchiRikishi();
      let updated = 0, created = 0, errors = 0;
      
      for (const rikishi of apiRikishi) {
        try {
          const result = await this.syncRikishi(rikishi);
          if (result.action === 'updated') updated++;
          else if (result.action === 'created') created++;
        } catch (error) {
          errors++;
          console.error(`Failed to sync ${rikishi.shikonaEn}:`, error.message);
        }
      }
      
      console.log(`Makuuchi sync completed: ${created} created, ${updated} updated, ${errors} errors`);
      
      // Also sync current basho
      const bashoData = await this.fetchCurrentBasho();
      await this.syncBashoToDatabase(bashoData);
      
      return { created, updated, errors, bashoId: bashoData.id, totalRikishi: apiRikishi.length };
    } catch (error) {
      console.error('Makuuchi sync failed:', error);
      throw error;
    }
  }
}

module.exports = { SumoApiService }; 