const fs = require('fs');
const path = require('path');

// File paths for persistent data
const USERS_FILE = '/tmp/users.json';
const SELECTIONS_FILE = '/tmp/selections.json';

// Load or create users data
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return {};
}

// Save users data
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving users:', error);
    return false;
  }
}

// Load or create selections data
function loadSelections() {
  try {
    if (fs.existsSync(SELECTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SELECTIONS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading selections:', error);
  }
  return {};
}

// Save selections data
function saveSelections(selections) {
  try {
    fs.writeFileSync(SELECTIONS_FILE, JSON.stringify(selections, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving selections:', error);
    return false;
  }
}

// Get user by sumo name
function getUser(sumoName) {
  const users = loadUsers();
  return Object.values(users).find(user => user.sumoName === sumoName);
}

// Create or update user
function createUser(sumoName) {
  const users = loadUsers();
  
  // Check if user already exists
  const existingUser = Object.values(users).find(user => user.sumoName === sumoName);
  if (existingUser) {
    return existingUser;
  }
  
  // Create new user
  const userId = Object.keys(users).length + 1;
  const newUser = {
    id: userId,
    sumoName: sumoName,
    remainingPoints: 50,
    isDraftFinalized: false
  };
  
  users[userId] = newUser;
  saveUsers(users);
  
  return newUser;
}

// Get user by ID
function getUserById(userId) {
  const users = loadUsers();
  return users[userId];
}

// Get user's selections
function getUserSelections(userId) {
  const selections = loadSelections();
  return selections[userId] || [];
}

// Add selection for user
function addSelection(userId, rikishiId) {
  const selections = loadSelections();
  if (!selections[userId]) {
    selections[userId] = [];
  }
  
  // Check if already selected
  if (selections[userId].includes(rikishiId)) {
    return false; // Already selected
  }
  
  selections[userId].push(rikishiId);
  saveSelections(selections);
  return true;
}

// Remove selection for user
function removeSelection(userId, rikishiId) {
  const selections = loadSelections();
  if (!selections[userId]) {
    return false;
  }
  
  const index = selections[userId].indexOf(rikishiId);
  if (index === -1) {
    return false; // Not selected
  }
  
  selections[userId].splice(index, 1);
  saveSelections(selections);
  return true;
}

// Finalize user's draft
function finalizeDraft(userId) {
  const users = loadUsers();
  if (users[userId]) {
    users[userId].isDraftFinalized = true;
    saveUsers(users);
    return true;
  }
  return false;
}

module.exports = {
  loadUsers,
  getUser,
  createUser,
  getUserById,
  getUserSelections,
  addSelection,
  removeSelection,
  finalizeDraft
}; 