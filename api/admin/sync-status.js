const cookie = require('cookie');
const { verifySession } = require('../_session-store');
const { supabase } = require('../../lib/supabase');

// Session helper - require admin auth
function requireAdmin(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const sessionData = verifySession(cookies.session);
  
  if (!sessionData || !sessionData.isAdmin) {
    return null;
  }
  
  return sessionData;
}

// Helper to get next cron run times
function getNextCronTimes() {
  const now = new Date();
  const today = new Date(now);
  
  // Full sync times: 6 AM, 12 PM, 6 PM daily
  const fullSyncTimes = [6, 12, 18];
  
  // Find next full sync time today
  let nextFullSync = null;
  for (const hour of fullSyncTimes) {
    const syncTime = new Date(today);
    syncTime.setHours(hour, 0, 0, 0);
    
    if (syncTime > now) {
      nextFullSync = syncTime;
      break;
    }
  }
  
  // If no more syncs today, get first sync tomorrow
  if (!nextFullSync) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(6, 0, 0, 0);
    nextFullSync = tomorrow;
  }
  
  // Rikishi-only sync: Sundays at midnight
  const nextSunday = new Date(today);
  const daysUntilSunday = (7 - today.getDay()) % 7;
  if (daysUntilSunday === 0 && today.getHours() >= 0) {
    // If it's Sunday but past midnight, get next Sunday
    nextSunday.setDate(nextSunday.getDate() + 7);
  } else {
    nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
  }
  nextSunday.setHours(0, 0, 0, 0);
  
  return {
    nextFullSync: nextFullSync.toISOString(),
    nextRikishiSync: nextSunday.toISOString()
  };
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

  // Check admin auth
  const sessionData = requireAdmin(req);
  if (!sessionData) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  try {
    // Get recent rikishi updates (indicates sync activity)
    const { data: recentUpdates, error: updateError } = await supabase
      .from('rikishi')
      .select('name, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5);
    
    if (updateError) throw updateError;
    
    // Get tournament info
    const { data: currentBasho, error: bashoError } = await supabase
      .from('basho')
      .select('*')
      .eq('is_active', true)
      .single();
    
    // Get match count (indicates match sync activity)
    const { count: matchCount, error: matchError } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true });
    
    const nextCronTimes = getNextCronTimes();
    
    // Calculate last sync time based on most recent rikishi update
    const lastSyncTime = recentUpdates?.[0]?.updated_at || null;
    
    res.json({
      success: true,
      syncStatus: {
        lastSyncTime,
        lastSyncHuman: lastSyncTime ? 
          new Date(lastSyncTime).toLocaleString() : 
          'Never',
        recentUpdates: recentUpdates?.length || 0,
        totalMatches: matchCount || 0,
        currentTournament: currentBasho ? {
          id: currentBasho.id,
          location: currentBasho.location,
          startDate: currentBasho.start_date,
          endDate: currentBasho.end_date,
          isActive: currentBasho.is_active
        } : null
      },
      scheduledSyncs: {
        fullSyncSchedule: "Every day at 6 AM, 12 PM, and 6 PM UTC",
        rikishiSyncSchedule: "Every Sunday at midnight UTC",
        nextFullSync: nextCronTimes.nextFullSync,
        nextRikishiSync: nextCronTimes.nextRikishiSync,
        nextFullSyncHuman: new Date(nextCronTimes.nextFullSync).toLocaleString(),
        nextRikishiSyncHuman: new Date(nextCronTimes.nextRikishiSync).toLocaleString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ 
      error: 'Failed to get sync status',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 