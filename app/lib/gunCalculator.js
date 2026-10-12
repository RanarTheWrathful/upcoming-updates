"use strict";

// Keep in sync with gunCalcNames in lib/definitions.js. Definitions store these
// as numeric IDs, while the server's calculation switches use readable names.
const CALCULATOR_NAMES = Object.freeze([
  "default",
  "bullet",
  "drone",
  "swarm",
  "fixed reload",
  "thruster",
  "sustained",
  "necro",
  "trap",
]);

function normalizeStatCalculator(value) {
  if (Number.isInteger(value) && value >= 0 && value < CALCULATOR_NAMES.length) {
    return CALCULATOR_NAMES[value];
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim().toLowerCase();
  }
  return "default";
}

function isNecroCalculator(value) {
  return normalizeStatCalculator(value) === "necro";
}

module.exports = { CALCULATOR_NAMES, normalizeStatCalculator, isNecroCalculator };
