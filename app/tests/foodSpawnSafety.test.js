"use strict";

const assert = require("assert");
const { tryWithLimit, clampProbability } = require("../lib/foodSpawnSafety");

// Failed placement attempts cannot spin forever when anti-lag refuses spawns.
{
  let attempts = 0;
  const result = tryWithLimit(() => {
    attempts++;
    return null;
  }, 7);
  assert.strictEqual(result, null);
  assert.strictEqual(attempts, 7);
}

// An anti-lag rejection should stop immediately rather than retrying candidate locations.
{
  let attempts = 0;
  const result = tryWithLimit(() => {
    attempts++;
    return false;
  }, 24);
  assert.strictEqual(result, null);
  assert.strictEqual(attempts, 1);
}

// Successful placement returns its entity immediately.
{
  let attempts = 0;
  const entity = { id: 42 };
  assert.strictEqual(tryWithLimit(() => {
    attempts++;
    return attempts === 3 ? entity : null;
  }, 24), entity);
  assert.strictEqual(attempts, 3);
}

// Invalid, negative, and oversized probabilities are safe for chance APIs.
assert.strictEqual(clampProbability(-1), 0);
assert.strictEqual(clampProbability(0.5), 0.5);
assert.strictEqual(clampProbability(2), 1);
assert.strictEqual(clampProbability(NaN), 0);
assert.strictEqual(clampProbability(Infinity), 0);
assert.throws(() => tryWithLimit(null), TypeError);

console.log("Food spawn safety tests passed");
