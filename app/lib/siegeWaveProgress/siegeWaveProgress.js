"use strict";

function shouldAdvanceSiegeWave({
  mode,
  currentWave,
  expectedWave,
  budget,
  liveHostileCount,
  pendingAllyCount = 0,
  lastAdvancedWave,
}) {
  const wave = Number(currentWave);
  const expected = Number(expectedWave);
  const remaining = Number(budget);
  const hostiles = Number(liveHostileCount);
  const pendingAllies = Number(pendingAllyCount);
  return mode === "siege" &&
    Number.isFinite(wave) &&
    Number.isFinite(expected) &&
    wave === expected &&
    Number.isFinite(remaining) && remaining <= 0 &&
    Number.isFinite(hostiles) && hostiles <= 0 &&
    Number.isFinite(pendingAllies) && pendingAllies <= 0 &&
    Number(lastAdvancedWave) !== expected;
}

module.exports = { shouldAdvanceSiegeWave };
