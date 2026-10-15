"use strict";

const UPGRADE_TIERS = new Map([
  ...Array.from({ length: 16 }, (_, tier) => [String(tier), `UPGRADES_TIER_${tier}`]),
  ["god", "UPGRADES_TIER_GOD"],
]);

/**
 * Append game-mode-specific upgrades to the existing class trees.
 *
 * Input shape (in a mode's exported settings object):
 * TANK_BRANCHES: {
 *   basic: { "1": ["twin", "sniper"], "2": ["machineGun"] },
 *   someTank: { god: ["godTank"] }
 * }
 *
 * Tier arrays are appended, existing upgrades are preserved, and duplicate
 * entries are ignored. Unknown classes/tiers fail fast with a useful message.
 */
function applyModeBranches(classes, branches, modeName = "selected mode") {
  if (branches == null) return classes;
  if (!branches || typeof branches !== "object" || Array.isArray(branches)) {
    throw new TypeError(`${modeName}: TANK_BRANCHES must be an object keyed by source tank name.`);
  }

  for (const [sourceName, tierMap] of Object.entries(branches)) {
    const source = classes[sourceName];
    if (!source || typeof source !== "object") {
      throw new Error(`${modeName}: TANK_BRANCHES references unknown source tank "${sourceName}".`);
    }
    if (!tierMap || typeof tierMap !== "object" || Array.isArray(tierMap)) {
      throw new TypeError(`${modeName}: TANK_BRANCHES.${sourceName} must map tiers to arrays of tank names.`);
    }

    for (const [tierKey, tankNames] of Object.entries(tierMap)) {
      const normalizedTier = String(tierKey).toLowerCase();
      const upgradeKey = UPGRADE_TIERS.get(normalizedTier);
      if (!upgradeKey) {
        throw new Error(
          `${modeName}: TANK_BRANCHES.${sourceName} has invalid tier "${tierKey}"; use 0-15 or "god".`
        );
      }
      if (!Array.isArray(tankNames)) {
        throw new TypeError(`${modeName}: TANK_BRANCHES.${sourceName}.${tierKey} must be an array of tank names.`);
      }

      const existing = Array.isArray(source[upgradeKey]) ? source[upgradeKey] : [];
      const combined = existing.slice();
      const known = new Set(combined);
      for (const tankName of tankNames) {
        if (typeof tankName !== "string" || !classes[tankName] || typeof classes[tankName] !== "object") {
          throw new Error(
            `${modeName}: TANK_BRANCHES.${sourceName}.${tierKey} references unknown tank "${tankName}".`
          );
        }
        const tank = classes[tankName];
        if (!known.has(tank)) {
          combined.push(tank);
          known.add(tank);
        }
      }
      source[upgradeKey] = combined;
    }
  }

  return classes;
}

module.exports = { applyModeBranches, UPGRADE_TIERS };
