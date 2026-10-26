"use strict";

// Bot choices intentionally use a uniform distribution. Keep the policy pure
// so every outcome (including doing nothing) can be verified independently.
const SKILL_STATS = Object.freeze([
  "atk", "hlt", "spd", "str", "pen", "dam", "rld", "mob", "rgn", "shi",
]);
const BOT_ARCHETYPE_COUNT = 8;

function randomUnit(random = Math.random) {
  const value = Number(typeof random === "function" ? random() : 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(0.9999999999999999, value));
}

function randomIndex(count, random = Math.random) {
  const size = Math.floor(Number(count));
  if (!Number.isFinite(size) || size <= 0) return -1;
  return Math.floor(randomUnit(random) * size);
}

function selectBotArchetype(random = Math.random) {
  return `bot${randomIndex(BOT_ARCHETYPE_COUNT, random)}`;
}

function selectSkillStat(random = Math.random) {
  return SKILL_STATS[randomIndex(SKILL_STATS.length, random)];
}

/**
 * Returns an upgrade-list index, null for an explicit no-upgrade choice, or
 * undefined when there are no currently eligible class options. Every
 * eligible class and the skip result occupy one equally-sized random bucket.
 */
function selectUpgradeIndex(upgrades, skillLevel, random = Math.random) {
  if (!Array.isArray(upgrades)) return undefined;
  const level = Number(skillLevel);
  const eligible = [];
  for (let index = 0; index < upgrades.length; index++) {
    const option = upgrades[index];
    if (!option || !option.class) continue;
    const requiredLevel = option.level == null ? 0 : Number(option.level);
    if (Number.isFinite(level) && Number.isFinite(requiredLevel) && level >= requiredLevel) {
      eligible.push(index);
    }
  }
  if (!eligible.length) return undefined;
  const choice = randomIndex(eligible.length + 1, random);
  return choice === eligible.length ? null : eligible[choice];
}

function getRequiredLevel(option) {
  const level = option && option.level == null ? 0 : Number(option && option.level);
  return Number.isFinite(level) ? level : null;
}

function ensureDecisionMap(entity) {
  if (!entity._botUpgradeDecisions || typeof entity._botUpgradeDecisions !== "object") {
    entity._botUpgradeDecisions = Object.create(null);
  }
  return entity._botUpgradeDecisions;
}

function getTierDecisionKey(entity, tierLevel) {
  const classId = entity && entity.index != null
    ? String(entity.index)
    : entity && entity.label
      ? String(entity.label)
      : "unknown-class";
  return `tier:${classId}:${tierLevel}`;
}

/**
 * Choose one bot class-upgrade decision from options that have just become
 * available. Every candidate class and the skip action get one equal bucket.
 * Tier upgrades are considered once per class/tier pair; score unlocks and
 * legendary branches are considered once per unlock. Returns undefined when
 * there is no new
 * decision to make, otherwise { index: number|null, keys: string[] }.
 */
function selectNextUpgradeDecision(entity, skillLevel, random = Math.random) {
  if (!entity || !Array.isArray(entity.upgrades)) return undefined;
  const level = Number(skillLevel);
  if (!Number.isFinite(level)) return undefined;
  const decisions = ensureDecisionMap(entity);
  const options = entity.upgrades;
  const pendingKeys = new Set();
  const candidateIndices = new Set();

  // Score-based upgrades are supplied by autoUpgradeRules; legendary unlocks
  // are supplied by legendaryBranches and the legendary-class-list helper.
  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    if (!option || !option.class) continue;
    const requiredLevel = getRequiredLevel(option);
    if (requiredLevel == null || requiredLevel > level) continue;

    const ruleIds = Array.isArray(option.autoUpgradeRuleIds)
      ? option.autoUpgradeRuleIds
      : option.autoUpgradeRuleId ? [option.autoUpgradeRuleId] : [];
    for (const id of ruleIds) {
      if (typeof id !== "string" || !id) continue;
      const key = `auto:${id}`;
      if (decisions[key]) continue;
      pendingKeys.add(key);
      candidateIndices.add(index);
    }
    if (option.legendaryBranchKey) {
      const key = `legendary:${option.legendaryBranchKey}`;
      if (!decisions[key]) {
        pendingKeys.add(key);
        candidateIndices.add(index);
      }
    }
    if (option.legendaryClassListUnlock && !decisions["legendary-class-list"]) {
      pendingKeys.add("legendary-class-list");
      candidateIndices.add(index);
    }
  }

  // Level-zero choices are used by menu/page definitions as well as ordinary
  // classes; let bots traverse those menus uniformly, once per class. Positive
  // tier decisions are class-specific too: after a bot takes a class upgrade,
  // the new class must still receive its own eligible choices at that tier.
  // The class-specific key prevents one class's decision from suppressing all
  // later class upgrades, while each class/tier pair is considered only once.
  const zeroTierKey = getTierDecisionKey(entity, 0);
  const hasLevelZeroChoices = options.some((option) =>
    option && option.class && getRequiredLevel(option) === 0
  );
  if (hasLevelZeroChoices && !decisions[zeroTierKey]) {
    pendingKeys.add(zeroTierKey);
    for (let index = 0; index < options.length; index++) {
      const option = options[index];
      if (option && option.class && getRequiredLevel(option) === 0) candidateIndices.add(index);
    }
  }
  const availableTierLevels = [...new Set(options
    .filter((option) => option && option.class)
    .map(getRequiredLevel)
    .filter((requiredLevel) => requiredLevel != null && requiredLevel > 0 && requiredLevel <= level)
    .sort((a, b) => a - b))];
  const nextTierLevel = availableTierLevels.find((tierLevel) => !decisions[getTierDecisionKey(entity, tierLevel)]);
  if (nextTierLevel !== undefined) {
    pendingKeys.add(getTierDecisionKey(entity, nextTierLevel));
    for (let index = 0; index < options.length; index++) {
      const option = options[index];
      const requiredLevel = getRequiredLevel(option);
      if (option && option.class && requiredLevel != null && requiredLevel <= level) {
        candidateIndices.add(index);
      }
    }
  }

  const eligible = [...candidateIndices].filter((index) => {
    const option = options[index];
    const requiredLevel = getRequiredLevel(option);
    return option && option.class && requiredLevel != null && requiredLevel <= level;
  }).sort((a, b) => a - b);
  if (!pendingKeys.size || !eligible.length) return undefined;

  const choice = randomIndex(eligible.length + 1, random);
  for (const key of pendingKeys) decisions[key] = true;
  return {
    index: choice === eligible.length ? null : eligible[choice],
    keys: [...pendingKeys],
    tierLevel: nextTierLevel,
  };
}

module.exports = {
  SKILL_STATS,
  BOT_ARCHETYPE_COUNT,
  randomIndex,
  selectBotArchetype,
  selectSkillStat,
  selectUpgradeIndex,
  selectNextUpgradeDecision,
};
