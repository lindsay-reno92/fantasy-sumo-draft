// Central feature flags and draft settings
// NO_POINTS_MODE: when true, UI should hide point values and budget is relaxed
// DRAFT_BUDGET: the total draft budget to enforce server-side

const parseBoolean = (value) => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
  }
  return Boolean(value);
};

const NO_POINTS_MODE = (() => {
  // New points system is now live - show points by default
  const raw = process.env.NO_POINTS_MODE;
  return raw === undefined ? false : parseBoolean(raw);
})();

const NEW_BUDGET = 140; // New budget for 6 rikishi system
const FALLBACK_BUDGET = 50; // Legacy
const RELAXED_BUDGET = 1000; // For testing
const DRAFT_BUDGET = (() => {
  // Allow override via env DRAFT_BUDGET; otherwise use new budget
  const raw = process.env.DRAFT_BUDGET;
  if (raw && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return NO_POINTS_MODE ? RELAXED_BUDGET : NEW_BUDGET;
})();

const MAX_RIKISHI_SELECTIONS = 6; // Users must pick exactly 6 rikishi

module.exports = {
  NO_POINTS_MODE,
  DRAFT_BUDGET,
  MAX_RIKISHI_SELECTIONS,
};


