"use strict";

function isReadyToRejoin({
  recovering,
  wave,
  healthAmount,
  maxHealth,
  minWave = 6,
}) {
  const health = Number(healthAmount);
  const max = Number(maxHealth);
  if (!recovering || Number(wave) < minWave) return false;
  if (!Number.isFinite(health) || !Number.isFinite(max) || max <= 0) return false;
  // Allow tiny floating-point discrepancies while still requiring effectively
  // full health before the boss returns to the battle.
  return health >= max - Math.max(1e-6, max * 1e-6);
}

module.exports = { isReadyToRejoin };
