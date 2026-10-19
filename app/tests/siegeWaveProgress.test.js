"use strict";

const assert = require("assert");
const { shouldAdvanceSiegeWave } = require("../lib/siegeWaveProgress");
const wave = {
  mode: "siege",
  currentWave: 3,
  expectedWave: 3,
  budget: 0,
  liveHostileCount: 0,
  lastAdvancedWave: undefined,
};

assert.strictEqual(shouldAdvanceSiegeWave(wave), true,
  "an empty wave with no budget or hostiles should advance");
assert.strictEqual(shouldAdvanceSiegeWave({ ...wave, mode: "ffa" }), false,
  "non-Siege modes must not use Siege progression");
assert.strictEqual(shouldAdvanceSiegeWave({ ...wave, currentWave: 4 }), false,
  "a stale timer must not advance a different wave");
assert.strictEqual(shouldAdvanceSiegeWave({ ...wave, budget: 1 }), false,
  "a wave with unspent budget must not advance");
assert.strictEqual(shouldAdvanceSiegeWave({ ...wave, liveHostileCount: 1 }), false,
  "a wave with live hostiles must not advance");
assert.strictEqual(shouldAdvanceSiegeWave({ ...wave, pendingAllyCount: 1 }), false,
  "an ally-only wave must not advance before its scheduled reinforcements spawn or time out");
assert.strictEqual(shouldAdvanceSiegeWave({ ...wave, lastAdvancedWave: 3 }), false,
  "the same wave must not advance twice");
assert.strictEqual(shouldAdvanceSiegeWave({ ...wave, budget: NaN }), false,
  "invalid budget must not accidentally advance a wave");

console.log("Siege wave progression tests passed.");
