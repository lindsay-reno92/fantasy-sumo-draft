const { SumoApiService } = require('../../lib/sumo-api-service');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify this is a legitimate cron request
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'auto-sync-secret';
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.log('Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🕒 Starting scheduled data sync...');

  try {
    const sumoApi = new SumoApiService();
    
    // Get sync type from query params or default to full
    const syncType = req.query.type || 'full-with-matches';
    
    let result = {};
    
    // Perform the appropriate sync based on type
    if (syncType === 'full' || syncType === 'full-with-matches' || syncType === 'rikishi-only') {
      console.log('🔄 Syncing rikishi data...');
      const rikishiSync = await sumoApi.performFullSync();
      result.rikishi = rikishiSync;
    }
    
    if (syncType === 'full-with-matches' || syncType === 'matches-only') {
      console.log('⚔️ Syncing match data...');
      
      // Get current basho ID for match sync
      let bashoId = null;
      if (result.rikishi?.bashoId) {
        bashoId = result.rikishi.bashoId;
      } else {
        // Fetch current basho if we don't have it
        const bashoData = await sumoApi.fetchCurrentBasho();
        bashoId = bashoData.id;
      }
      
      if (bashoId) {
        const matchSync = await sumoApi.syncMatchesToDatabase(bashoId);
        result.matches = matchSync;
      } else {
        result.matches = { error: 'No active basho found' };
      }
    }

    const totalTime = Date.now();
    console.log(`✅ Scheduled sync completed successfully in ${totalTime}ms`);

    // Return success response
    res.json({
      success: true,
      message: 'Scheduled sync completed successfully',
      syncType,
      result,
      timestamp: new Date().toISOString(),
      scheduledSync: true
    });
    
  } catch (error) {
    console.error('❌ Scheduled sync failed:', error);
    res.status(500).json({ 
      error: 'Scheduled sync failed',
      details: error.message,
      timestamp: new Date().toISOString(),
      scheduledSync: true
    });
  }
}; 