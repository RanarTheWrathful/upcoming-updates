"use strict";

const DEFAULT_MAX_ATTEMPTS = 24;
const HARD_MAX_ATTEMPTS = 100;

/**
 * Run a potentially rejected spawn attempt a bounded number of times.
 * Return a created value, or null when attempts are exhausted. An explicit
 * false return stops immediately (for example, when anti-lag rejects spawning).
 */
function tryWithLimit(attempt, maxAttempts = DEFAULT_MAX_ATTEMPTS) {
  if (typeof attempt !== "function") {
    throw new TypeError("Food spawn attempt must be a function");
  }
  const requested = Number(maxAttempts);
  const limit = Number.isFinite(requested)
    ? Math.min(HARD_MAX_ATTEMPTS, Math.max(1, Math.floor(requested)))
    : DEFAULT_MAX_ATTEMPTS;

  for (let index = 0; index < limit; index++) {
    const result = attempt(index);
    if (result === false) return null;
    if (result !== null && result !== undefined) return result;
  }
  return null;
}

function clampProbability(value) {
  const probability = Number(value);
  if (!Number.isFinite(probability)) return 0;
  return Math.max(0, Math.min(1, probability));
}

module.exports = { tryWithLimit, clampProbability };
