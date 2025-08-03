const cookie = require('cookie');
const { verifySession } = require('../_session-store');
const { SumoApiService } = require('../../lib/sumo-api-service');

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check admin authentication
  const sessionData = requireAdmin(req);
  if (!sessionData) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  try {
    console.log('Admin sync requested by:', sessionData.userId);
    
    const sumoApi = new SumoApiService();
    const syncType = req.body.syncType || 'full'; // 'full', 'rikishi-only', 'basho-only'
    
    let result = {};
    
    if (syncType === 'full' || syncType === 'rikishi-only') {
      console.log('Starting rikishi data sync...');
      const rikishiSync = await sumoApi.performFullSync();
      result.rikishi = rikishiSync;
    }
    
    if (syncType === 'full' || syncType === 'basho-only') {
      console.log('Starting basho data sync...');
      const bashoData = await sumoApi.fetchCurrentBasho();
      const bashoId = await sumoApi.syncBashoToDatabase(bashoData);
      result.basho = {
        id: bashoId,
        location: bashoData.location,
        isActive: bashoData.isActive,
        startDate: bashoData.startDate,
        endDate: bashoData.endDate
      };
    }
    
    console.log('Sync operation completed successfully');
    
    // Determine overall success
    const hasResults = result.rikishi || result.basho;
    const hasWarnings = result.warnings && result.warnings.length > 0;
    
    res.json({
      success: true,
      message: hasWarnings ? 
        'Sumo data sync completed with limitations' : 
        'Sumo data sync completed successfully',
      syncType,
      result,
      warnings: hasWarnings ? result.warnings : undefined,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Sync operation failed:', error);
    res.status(500).json({ 
      error: 'Sync operation failed',
      details: error.message,
      helpText: error.message.includes('row-level security') ? 
        'Database permissions issue - contact admin to configure service role key' : 
        'Check server logs for details',
      timestamp: new Date().toISOString()
    });
  }
}; 