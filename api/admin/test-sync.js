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
    console.log('Testing API sync functionality...');
    
    // Test 1: Can we fetch from sumo-api.com?
    const sumoApiTest = await fetch('https://sumo-api.com/api/rikishis?limit=5');
    const apiData = await sumoApiTest.json();
    
    console.log('✅ Sumo API fetch successful:', apiData.records?.length || 0, 'records');
    
    // Test 2: Can we read from our database?
    const { supabase } = require('../../lib/supabase');
    const { data: existingRikishi, error: readError } = await supabase
      .from('rikishi')
      .select('id, name, draft_value')
      .limit(5);
    
    console.log('Database read test:', readError ? 'FAILED' : 'SUCCESS', existingRikishi?.length || 0, 'records');
    
    // Test 3: Can we write to database? (this will fail due to RLS)
    let writeTest = 'NOT_ATTEMPTED';
    try {
      const testWrite = await supabase
        .from('rikishi')
        .select('id')
        .limit(1)
        .single();
      
      if (testWrite.data) {
        const updateTest = await supabase
          .from('rikishi')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', testWrite.data.id);
        
        writeTest = updateTest.error ? `FAILED: ${updateTest.error.message}` : 'SUCCESS';
      }
    } catch (error) {
      writeTest = `FAILED: ${error.message}`;
    }
    
    const results = {
      apiConnection: {
        status: sumoApiTest.ok ? 'SUCCESS' : 'FAILED',
        recordCount: apiData.records?.length || 0,
        sampleData: apiData.records?.[0] || null
      },
      databaseRead: {
        status: readError ? 'FAILED' : 'SUCCESS',
        error: readError?.message || null,
        recordCount: existingRikishi?.length || 0
      },
      databaseWrite: {
        status: writeTest.includes('SUCCESS') ? 'SUCCESS' : 'FAILED',
        details: writeTest
      },
      serviceKeyAvailable: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      recommendations: []
    };
    
    // Provide specific recommendations
    if (!results.serviceKeyAvailable) {
      results.recommendations.push('Add SUPABASE_SERVICE_ROLE_KEY environment variable to enable full sync');
    }
    
    if (results.databaseWrite.status === 'FAILED') {
      results.recommendations.push('Database write blocked by RLS - service key needed for admin operations');
    }
    
    if (results.apiConnection.status === 'SUCCESS' && results.databaseRead.status === 'SUCCESS') {
      results.recommendations.push('Core sync infrastructure is working - only permissions need fixing');
    }

    res.json({
      success: true,
      message: 'Sync functionality test completed',
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test sync failed:', error);
    res.status(500).json({ 
      error: 'Test sync failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 