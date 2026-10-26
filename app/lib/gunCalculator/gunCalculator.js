"use strict";

// Keep these IDs in sync with gunCalcNames in lib/definitions.js.
const CALCULATOR_NAMES = Object.freeze([
  "default",      // 0
  "bullet",       // 1
  "drone",        // 2
  "swarm",        // 3
  "fixed reload", // 4
  "thruster",     // 5
  "sustained",    // 6
  "necro",        // 7
  "trap",         // 8
]);

function normalizeCalculator(value) {
  if (value == null) return "default";
  if (typeof value === "number") {
    return Number.isInteger(value) && CALCULATOR_NAMES[value] != null
      ? CALCULATOR_NAMES[value]
      : "default";
  }
  if (typeof value !== "string" || value.trim() === "") return "default";

  const name = value.trim();
  if (name === "fixedReload" || name === "fixed_reload") return "fixed reload";
  return name;
}

/**
 * STAT_NAMES value used by definitions.statnames.necro. The client labels the
 * Reload slot as "Max Drone Count" for this variant; the raw investment in
 * skill slot 0 is therefore capacity investment, not a reload multiplier.
 */
const MAX_DRONE_COUNT_STAT_NAMES = 3;

function getMaxDroneCountMultiplier(skill) {
  const raw = Number(skill && Array.isArray(skill.raw) ? skill.raw[0] : NaN);
  const configuredCap = Number(skill && Array.isArray(skill.caps) ? skill.caps[0] : NaN);
  const cap = Number.isFinite(configuredCap) && configuredCap > 0 ? configuredCap : 10;
  if (!Number.isFinite(raw)) return 1;

  // Scale linearly from 1x at zero points to 2x at the slot's current cap.
  const investment = Math.max(0, Math.min(1, raw / cap));
  return 1 + investment;
}

function scaleChildLimit(limit, multiplier) {
  const value = Number(limit);
  if (!Number.isFinite(value) || value <= 0) return 0;
  // Child counts are integers. Rounding gives partial investments a gradual,
  // useful effect while ensuring the fully-upgraded limit is exactly doubled.
  return Math.max(1, Math.round(value * multiplier));
}

/**
 * Return whether a gun may spawn another child under its configured cap.
 * Classes using the Max Drone Count stat variant scale drone/minion capacity
 * from the points actually invested in the former Reload slot. That rule is
 * independent of STAT_CALCULATOR, and both local and tank-wide limits apply.
 * The legacy necro calculator behavior remains for older definitions that do
 * not use the stat-name variant.
 */
function hasChildCapacity({
  calculator,
  skill,
  gunLimit,
  gunChildren = 0,
  bodyLimit,
  bodyChildren = 0,
  maxDroneCountVariant = false,
  producesDrones = false,
}) {
  if (maxDroneCountVariant && producesDrones) {
    const multiplier = getMaxDroneCountMultiplier(skill);
    const effectiveGunLimit = scaleChildLimit(gunLimit, multiplier);
    const effectiveBodyLimit = scaleChildLimit(bodyLimit, multiplier);

    if (effectiveGunLimit > 0 && gunChildren >= effectiveGunLimit) return false;
    if (effectiveBodyLimit > 0 && bodyChildren >= effectiveBodyLimit) return false;
    return true;
  }

  // Compatibility path for old necro-calculator definitions. Reload's
  // multiplier falls from 1 to 0.5, which historically doubled their cap.
  const childCountMultiplier =
    calculator === "necro" && skill && Number.isFinite(skill.rld)
      ? skill.rld
      : 1;

  if (gunLimit) return gunLimit > gunChildren * childCountMultiplier;
  if (bodyLimit) return bodyLimit > bodyChildren * childCountMultiplier;
  return true;
}

module.exports = {
  MAX_DRONE_COUNT_STAT_NAMES,
  normalizeCalculator,
  getMaxDroneCountMultiplier,
  hasChildCapacity,
};
