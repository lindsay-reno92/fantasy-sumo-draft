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
  // Default to true for current test; flip via env NO_POINTS_MODE=false to restore points
  const raw = process.env.NO_POINTS_MODE;
  return raw === undefined ? true : parseBoolean(raw);
})();

const FALLBACK_BUDGET = 50;
const RELAXED_BUDGET = 1000;
const DRAFT_BUDGET = (() => {
  // Allow override via env DRAFT_BUDGET; otherwise choose by mode
  const raw = process.env.DRAFT_BUDGET;
  if (raw && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return NO_POINTS_MODE ? RELAXED_BUDGET : FALLBACK_BUDGET;
})();

module.exports = {
  NO_POINTS_MODE,
  DRAFT_BUDGET,
};


