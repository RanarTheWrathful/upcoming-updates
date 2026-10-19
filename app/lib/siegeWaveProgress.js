"use strict";

function shouldAdvanceSiegeWave({
  mode,
  currentWave,
  expectedWave,
  budget,
  liveHostileCount,
  lastAdvancedWave,
}) {
  const wave = Number(currentWave);
  const expected = Number(expectedWave);
  const remaining = Number(budget);
  const hostiles = Number(liveHostileCount);
  return mode === "siege" &&
    Number.isFinite(wave) &&
    Number.isFinite(expected) &&
    wave === expected &&
    Number.isFinite(remaining) && remaining <= 0 &&
    Number.isFinite(hostiles) && hostiles <= 0 &&
    Number(lastAdvancedWave) !== expected;
}

module.exports = { shouldAdvanceSiegeWave };
