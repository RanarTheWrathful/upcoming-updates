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

/**
 * Remove selected upgrade options from a particular source tank for one mode.
 *
 * Input shape:
 * TANK_BRANCH_EXCEPTIONS: {
 *   fallenLegendaryClasses: {
 *     "1": ["exclusiveFactionTank"],
 *     "all": ["unavailableTank"]
 *   }
 * }
 * Tier keys accept 0-15, "god", or "all". Class trees are copied before
 * editing so this function only mutates the selected mode's loaded definitions.
 */
function applyModeBranchExceptions(classes, exceptions, modeName = "selected mode") {
  if (exceptions == null) return classes;
  if (!exceptions || typeof exceptions !== "object" || Array.isArray(exceptions)) {
    throw new TypeError(`${modeName}: TANK_BRANCH_EXCEPTIONS must be an object keyed by source tank name.`);
  }

  for (const [sourceName, tierMap] of Object.entries(exceptions)) {
    const source = classes[sourceName];
    if (!source || typeof source !== "object") {
      throw new Error(`${modeName}: TANK_BRANCH_EXCEPTIONS references unknown source tank "${sourceName}".`);
    }
    if (!tierMap || typeof tierMap !== "object" || Array.isArray(tierMap)) {
      throw new TypeError(`${modeName}: TANK_BRANCH_EXCEPTIONS.${sourceName} must map tiers to arrays of tank names.`);
    }

    for (const [tierKey, tankNames] of Object.entries(tierMap)) {
      if (!Array.isArray(tankNames)) {
        throw new TypeError(`${modeName}: TANK_BRANCH_EXCEPTIONS.${sourceName}.${tierKey} must be an array of tank names.`);
      }
      const normalizedTier = String(tierKey).toLowerCase();
      if (normalizedTier !== "all" && !UPGRADE_TIERS.has(normalizedTier)) {
        throw new Error(
          `${modeName}: TANK_BRANCH_EXCEPTIONS.${sourceName} has invalid tier "${tierKey}"; use 0-15, "god", or "all".`
        );
      }
      const excluded = new Set(tankNames.map((tankName) => {
        if (typeof tankName !== "string" || !classes[tankName] || typeof classes[tankName] !== "object") {
          throw new Error(
            `${modeName}: TANK_BRANCH_EXCEPTIONS.${sourceName}.${tierKey} references unknown tank "${tankName}".`
          );
        }
        return classes[tankName];
      }));

      const keys = normalizedTier === "all"
        ? [...UPGRADE_TIERS.values()]
        : [UPGRADE_TIERS.get(normalizedTier)];
      for (const key of new Set(keys)) {
        if (!Array.isArray(source[key])) continue;
        source[key] = source[key].filter((tank) => !excluded.has(tank));
      }
    }
  }
  return classes;
}

module.exports = { applyModeBranches, applyModeBranchExceptions, UPGRADE_TIERS };
