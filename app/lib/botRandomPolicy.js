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

module.exports = {
  SKILL_STATS,
  BOT_ARCHETYPE_COUNT,
  randomIndex,
  selectBotArchetype,
  selectSkillStat,
  selectUpgradeIndex,
};
