"use strict";

const DEFAULT_SCORE_PER_WAVE = 20000;
const MIN_BOT_SCORE = 26263;
const MAX_BOT_SCORE_SPREAD = 1250000;

/**
 * Resolve the score value that Entity.define() will apply. Definitions are
 * processed parent-first, left-to-right, with the child applied last.
 */
function getDefinitionScore(definition) {
  let score = null;
  const activePath = new Set();

  function visit(node) {
    if (!node || typeof node !== "object" || activePath.has(node)) return;
    activePath.add(node);
    const parents = Array.isArray(node.PARENT) ? node.PARENT : [];
    for (const parent of parents) visit(parent);
    activePath.delete(node);

    if (node.VALUE != null) {
      const value = Number(node.VALUE);
      if (Number.isFinite(value)) score = value;
    }
  }

  visit(definition);
  return score;
}

/** Match the current Siege bot score roll, so the reserved cost is exact. */
function rollBotScore(random = Math.random) {
  const first = Math.round(Math.max(0, Math.min(1, Number(random()) || 0)) * MAX_BOT_SCORE_SPREAD);
  const second = Math.round(Math.max(0, Math.min(1, Number(random()) || 0)) * MAX_BOT_SCORE_SPREAD);
  return Math.max(MIN_BOT_SCORE, first - second + MIN_BOT_SCORE);
}

function isLiveEntity(entity) {
  if (!entity) return false;
  if (typeof entity.valid === "function") {
    try { if (!entity.valid()) return false; } catch (_) { return false; }
  }
  if (typeof entity.isDead === "function") {
    try { if (entity.isDead()) return false; } catch (_) { return false; }
  }
  return true;
}

/**
 * Sum each qualifying root entity once: all players, allied/guardian bots, and
 * bosses. Child turrets and projectiles aren't separate score contributors.
 */
function sumBudgetContributorScores(entities) {
  let total = 0;
  const seen = new Set();
  for (const entity of entities || []) {
    if (!isLiveEntity(entity)) continue;
    if (entity.master && entity.master !== entity) continue;
    if (entity.isProjectile === true || entity.type === "food") continue;

    const qualifies = entity.isPlayer === true ||
      (entity.isBot === true && entity.team === -1) ||
      entity.isBoss === true;
    if (!qualifies || seen.has(entity)) continue;
    seen.add(entity);

    const score = Number(entity.skill && entity.skill.score);
    if (Number.isFinite(score) && score > 0) total += score;
  }
  return Number.isFinite(total) ? total : Number.MAX_SAFE_INTEGER;
}

function calculateWaveBudget(options = {}) {
  const wave = Math.max(0, Math.floor(Number(options.wave) || 0));
  const perWave = Number(options.scorePerWave);
  const scorePerWave = Number.isFinite(perWave) && perWave >= 0
    ? perWave
    : DEFAULT_SCORE_PER_WAVE;
  const carryover = Number(options.carryover);
  const leftover = Number.isFinite(carryover) && carryover > 0 ? carryover : 0;
  const contributors = sumBudgetContributorScores(options.entities);
  const total = scorePerWave * wave + contributors + leftover;
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.floor(Math.min(total, Number.MAX_SAFE_INTEGER));
}

module.exports = {
  DEFAULT_SCORE_PER_WAVE,
  MIN_BOT_SCORE,
  getDefinitionScore,
  rollBotScore,
  sumBudgetContributorScores,
  calculateWaveBudget,
};
