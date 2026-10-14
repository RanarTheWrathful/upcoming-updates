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
 * Return whether a gun may spawn another child under its configured cap.
 * Necromancer-style calculators use the Reload skill as a count multiplier:
 * because Skill.rld decreases as that stat increases, the effective child cap
 * rises while all other calculator types retain their configured cap.
 */
function hasChildCapacity({
  calculator,
  skill,
  gunLimit,
  gunChildren = 0,
  bodyLimit,
  bodyChildren = 0,
}) {
  const childCountMultiplier =
    calculator === "necro" && skill && Number.isFinite(skill.rld)
      ? skill.rld
      : 1;

  if (gunLimit) return gunLimit > gunChildren * childCountMultiplier;
  if (bodyLimit) return bodyLimit > bodyChildren * childCountMultiplier;
  return true;
}

module.exports = { normalizeCalculator, hasChildCapacity };
