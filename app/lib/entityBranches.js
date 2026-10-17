"use strict";

const TIER_TO_KEY = new Map([
  ...Array.from({ length: 16 }, (_, tier) => [String(tier), `UPGRADES_TIER_${tier}`]),
  ["god", "UPGRADES_TIER_GOD"],
]);
const OVERRIDE_KEYS = new Set(["remove", "removeByTier", "addByTier"]);

function normalizeTierKey(tier) {
  const key = String(tier).toLowerCase();
  if (!TIER_TO_KEY.has(key)) {
    throw new Error(`Invalid branch tier "${tier}"; use 0-15 or "god".`);
  }
  return key;
}

function resolveClass(value, classes, context) {
  const result = typeof value === "string" ? classes[value] : value;
  if (!result || typeof result !== "object" || !Number.isFinite(result.index)) {
    throw new Error(`${context} references unknown class "${typeof value === "string" ? value : "[class object]"}".`);
  }
  return result;
}

function asList(value, context) {
  if (!Array.isArray(value)) throw new TypeError(`${context} must be an array of class names.`);
  return value;
}

function tierMap(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${context} must be an object mapping tiers to class-name arrays.`);
  }
  return value;
}

function getTierLevel(tier, tierLevels) {
  return tierLevels[tier] == null ? (tier === "god" ? tierLevels.god : Number(tier)) : tierLevels[tier];
}

function hasUpgrade(entity, classDef, tier) {
  return entity.upgrades.some((upgrade) => upgrade.class === classDef && upgrade.tier === tier);
}

function addUpgrade(entity, classDef, tier, tierLevels) {
  if (hasUpgrade(entity, classDef, tier)) return false;
  entity.upgrades.push({
    class: classDef,
    tier: tier === "god" ? 15 : Number(tier),
    level: getTierLevel(tier, tierLevels),
    index: classDef.index,
  });
  return true;
}

/**
 * Apply per-definition branch exceptions without mutating the global Class tree.
 * Example:
 * BRANCH_OVERRIDES: {
 *   remove: ["otherFactionTank"],
 *   removeByTier: { "2": ["exclusiveBranch"] },
 *   addByTier: { "god": ["secretClass"] }
 * }
 */
function applyDefinitionBranchOverrides(entity, definition, classes, tierLevels) {
  const rules = definition && definition.BRANCH_OVERRIDES;
  if (rules == null) return entity.upgrades;
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) {
    throw new TypeError("BRANCH_OVERRIDES must be an object.");
  }
  for (const key of Object.keys(rules)) {
    if (!OVERRIDE_KEYS.has(key)) throw new Error(`Unknown BRANCH_OVERRIDES key "${key}".`);
  }
  if (!Array.isArray(entity.upgrades)) entity.upgrades = [];

  if (rules.remove != null) {
    const removals = new Set(asList(rules.remove, "BRANCH_OVERRIDES.remove")
      .map((entry) => resolveClass(entry, classes, "BRANCH_OVERRIDES.remove")));
    entity.upgrades = entity.upgrades.filter((upgrade) => !removals.has(upgrade.class));
  }
  for (const field of ["removeByTier", "addByTier"]) {
    if (rules[field] == null) continue;
    for (const [rawTier, entries] of Object.entries(tierMap(rules[field], `BRANCH_OVERRIDES.${field}`))) {
      const tier = normalizeTierKey(rawTier);
      const classesForTier = asList(entries, `BRANCH_OVERRIDES.${field}.${rawTier}`)
        .map((entry) => resolveClass(entry, classes, `BRANCH_OVERRIDES.${field}.${rawTier}`));
      if (field === "removeByTier") {
        const removals = new Set(classesForTier);
        entity.upgrades = entity.upgrades.filter((upgrade) => !(upgrade.tier === (tier === "god" ? 15 : Number(tier)) && removals.has(upgrade.class)));
      } else {
        for (const classDef of classesForTier) addUpgrade(entity, classDef, tier, tierLevels);
      }
    }
  }
  return entity.upgrades;
}

function validateBranchRule(definition, classes, className) {
  const context = `Class ${className}`;
  if (definition.BRANCH_OVERRIDES != null) {
    const rules = definition.BRANCH_OVERRIDES;
    if (!rules || typeof rules !== "object" || Array.isArray(rules)) throw new TypeError(`${context}: BRANCH_OVERRIDES must be an object.`);
    for (const key of Object.keys(rules)) if (!OVERRIDE_KEYS.has(key)) throw new Error(`${context}: unknown BRANCH_OVERRIDES key "${key}".`);
    if (rules.remove != null) asList(rules.remove, `${context}.BRANCH_OVERRIDES.remove`).forEach((entry) => resolveClass(entry, classes, `${context}.BRANCH_OVERRIDES.remove`));
    for (const field of ["removeByTier", "addByTier"]) {
      if (rules[field] == null) continue;
      for (const [tier, entries] of Object.entries(tierMap(rules[field], `${context}.BRANCH_OVERRIDES.${field}`))) {
        normalizeTierKey(tier);
        asList(entries, `${context}.BRANCH_OVERRIDES.${field}.${tier}`).forEach((entry) => resolveClass(entry, classes, `${context}.BRANCH_OVERRIDES.${field}.${tier}`));
      }
    }
  }

  const unlock = definition.BRANCH_UNLOCK_ON_KILL;
  if (unlock == null) return;
  if (!unlock || typeof unlock !== "object" || Array.isArray(unlock)) {
    throw new TypeError(`${context}: BRANCH_UNLOCK_ON_KILL must be an object.`);
  }
  if (!unlock.tiers || typeof unlock.tiers !== "object" || Array.isArray(unlock.tiers)) {
    throw new TypeError(`${context}: BRANCH_UNLOCK_ON_KILL.tiers must map tiers to class-name arrays.`);
  }
  for (const [tier, entries] of Object.entries(unlock.tiers)) {
    normalizeTierKey(tier);
    asList(entries, `${context}.BRANCH_UNLOCK_ON_KILL.tiers.${tier}`).forEach((entry) => resolveClass(entry, classes, `${context}.BRANCH_UNLOCK_ON_KILL.tiers.${tier}`));
  }
  if (unlock.message != null && typeof unlock.message !== "string") {
    throw new TypeError(`${context}: BRANCH_UNLOCK_ON_KILL.message must be a string.`);
  }
  if (unlock.id != null && typeof unlock.id !== "string") {
    throw new TypeError(`${context}: BRANCH_UNLOCK_ON_KILL.id must be a string.`);
  }
  if (unlock.once != null && typeof unlock.once !== "boolean") {
    throw new TypeError(`${context}: BRANCH_UNLOCK_ON_KILL.once must be a boolean.`);
  }
}

function validateDefinitions(classes) {
  for (const [name, definition] of Object.entries(classes)) {
    if (definition && typeof definition === "object") validateBranchRule(definition, classes, name);
  }
  return true;
}

/** Give a player access to a defeated entity's configured secret branches. */
function grantBranchUnlock(entity, unlock, classes, tierLevels, rewardKey = "secret-branch") {
  if (!entity || !Array.isArray(entity.upgrades) || !unlock || !unlock.tiers) return false;
  if (!(entity._unlockedBranchRewards instanceof Set)) entity._unlockedBranchRewards = new Set();
  const key = `${rewardKey}:${unlock.id || "default"}`;
  const once = unlock.once !== false;
  if (once && entity._unlockedBranchRewards.has(key)) return false;

  let added = 0;
  for (const [rawTier, entries] of Object.entries(unlock.tiers)) {
    const tier = normalizeTierKey(rawTier);
    for (const entry of entries) {
      const classDef = resolveClass(entry, classes, `BRANCH_UNLOCK_ON_KILL.tiers.${rawTier}`);
      if (addUpgrade(entity, classDef, tier, tierLevels)) added++;
    }
  }
  if (added > 0) {
    entity._unlockedBranchRewards.add(key);
    if (typeof entity.sendMessage === "function") {
      entity.sendMessage(unlock.message || "You have unlocked a secret upgrade branch!");
    }
    return true;
  }
  if (once) entity._unlockedBranchRewards.add(key);
  return false;
}

module.exports = {
  applyDefinitionBranchOverrides,
  grantBranchUnlock,
  validateDefinitions,
  normalizeTierKey,
};
