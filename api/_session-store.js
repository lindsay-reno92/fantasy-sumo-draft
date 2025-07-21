const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || 'fantasy-sumo-draft-secret';

// Create signed session data
function createSession(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64');
  return `${payload}.${signature}`;
}

// Verify and decode session data
function verifySession(sessionCookie) {
  if (!sessionCookie) return null;
  
  try {
    const [payload, signature] = sessionCookie.split('.');
    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64');
    
    if (signature !== expectedSignature) return null;
    
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch {
    return null;
  }
}

// Update session with new data
function updateSession(currentSession, updates) {
  const sessionData = verifySession(currentSession);
  if (!sessionData) return null;
  
  const updatedData = { ...sessionData, ...updates };
  return createSession(updatedData);
}

// Add selection to session
function addSelectionToSession(sessionCookie, rikishiId, rikishiData) {
  const sessionData = verifySession(sessionCookie);
  if (!sessionData) return null;
  
  if (!sessionData.selections) sessionData.selections = [];
  if (!sessionData.totalSpent) sessionData.totalSpent = 0;
  
  // Check if already selected
  if (sessionData.selections.find(s => s.id === rikishiId)) {
    return { error: 'Rikishi already selected', sessionData };
  }
  
  // Check points
  const cost = rikishiData.draft_value || 0;
  if (sessionData.totalSpent + cost > 50) {
    return { error: `Not enough points. Need ${cost}, have ${50 - sessionData.totalSpent}`, sessionData };
  }
  
  // Add selection
  sessionData.selections.push({
    id: rikishiId,
    name: rikishiData.name,
    cost: cost,
    ranking_group: rikishiData.ranking_group,
    selectedAt: new Date().toISOString()
  });
  sessionData.totalSpent += cost;
  
  return { sessionData, newSession: createSession(sessionData) };
}

// Remove selection from session
function removeSelectionFromSession(sessionCookie, rikishiId) {
  const sessionData = verifySession(sessionCookie);
  if (!sessionData) return null;
  
  if (!sessionData.selections) sessionData.selections = [];
  
  const selectionIndex = sessionData.selections.findIndex(s => s.id === rikishiId);
  if (selectionIndex === -1) {
    return { error: 'Rikishi not selected', sessionData };
  }
  
  // Remove selection
  const removedSelection = sessionData.selections.splice(selectionIndex, 1)[0];
  sessionData.totalSpent -= removedSelection.cost;
  
  return { sessionData, newSession: createSession(sessionData) };
}

module.exports = {
  createSession,
  verifySession,
  updateSession,
  addSelectionToSession,
  removeSelectionFromSession
}; 