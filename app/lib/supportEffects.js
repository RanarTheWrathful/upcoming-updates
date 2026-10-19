"use strict";

function hasSupportEffect(entity) {
  return Boolean(entity && (entity.healEffect || entity.repairEffect));
}

function getSupportKind(entity) {
  if (!entity) return null;
  // Match the engine's historical precedence when both flags are present.
  if (entity.healEffect) return "heal";
  if (entity.repairEffect) return "repair";
  return null;
}

function isProjectile(entity) {
  return Boolean(entity && (entity.isProjectile === true || entity.type === "bullet"));
}

function isCombatEntity(entity) {
  return Boolean(
    entity &&
    (entity.type === "tank" || entity.isEnemy === true || entity.isBoss === true ||
      entity.isPlayer === true || entity.isBot === true)
  );
}

function isRepairTarget(entity) {
  return Boolean(
    entity &&
    (isProjectile(entity) ||
      entity.type === "food" ||
      entity.isDominator === true ||
      entity.isWall === true ||
      entity.isGate === true ||
      (entity.team === -3 && isCombatEntity(entity)))
  );
}

function isHealTarget(entity) {
  return Boolean(
    entity &&
    (entity.type === "tank" || entity.isPlayer === true || entity.isBot === true)
  );
}

/**
 * Decide how a heal/repair entity interacts with a target.
 *
 * Unlisted targets take no damage, except for enemy combat entities when the
 * effect source itself is a tank/boss/enemy, or when the target combat entity
 * itself carries a heal/repair effect. Those interactions use normal damage.
 * The returned multiplier applies to the normal collision damage amount.
 */
function resolveSupportInteraction(source, target) {
  const kind = getSupportKind(source);
  if (!kind || !target) return { action: "none", kind: null, multiplier: 0 };

  const knownTeams = source.team != null && target.team != null;
  const sameTeam = knownTeams && source.team === target.team;
  const projectile = isProjectile(target);

  if (sameTeam) {
    if (kind === "repair" && isRepairTarget(target)) {
      return { action: "heal", kind, multiplier: 0 };
    }
    if (kind === "heal" && isHealTarget(target)) {
      return { action: "heal", kind, multiplier: 0 };
    }
    return { action: "none", kind, multiplier: 0 };
  }

  let multiplier = 0;
  if (kind === "repair") {
    if (projectile && isCombatEntity(target)) multiplier = 2;
    else if (projectile && !isCombatEntity(target)) multiplier = 0.5;
    else if (target.isDominator === true) multiplier = 10;
    else if (target.isWall === true || target.isGate === true) multiplier = 10;
    else if (target.type === "food") multiplier = 1;
    else if (target.team === -3 && isCombatEntity(target)) multiplier = 2;
    else if (
      isCombatEntity(target) &&
      (isCombatEntity(source) || hasSupportEffect(target))
    ) multiplier = 1;

    // Repair auras should be poor at destroying projectiles, not at repairing
    // allied projectiles. Reduce only hostile damage from atmosphere-style auras.
    if (multiplier > 0 && projectile && source.type === "atmosphere") {
      multiplier *= 0.1;
    }
  } if (kind === "heal") {
    if (projectile) multiplier = 1;
    else if (target.type === "food") multiplier = 1;
    else if (target.team === -4 && isCombatEntity(target)) multiplier = 2;
    else if (
      isCombatEntity(target) &&
      (isCombatEntity(source) || hasSupportEffect(target))
    ) multiplier = 1;
    
    if (multiplier > 0 && projectile && source.type === "atmosphere") {
      multiplier *= 0.01;
    }
  }

  return multiplier > 0
    ? { action: "damage", kind, multiplier }
    : { action: "none", kind, multiplier: 0 };
}

/** Apply a resolved support effect using the game's existing healing rates. */
function applyInteraction(source, target, baseDamage, incomingDamage) {
  const decision = resolveSupportInteraction(source, target);
  if (decision.action === "damage") {
    const damage = Number.isFinite(baseDamage) ? Math.max(0, baseDamage) : 0;
    target.damageRecieved = (Number(target.damageRecieved) || 0) + damage * decision.multiplier;
    return decision;
  }
  if (decision.action !== "heal") return decision;

  if (!target.health || !target.shield) return decision;
  const hasMissingHealth = target.health.amount < target.health.max;
  const hasMissingShield = target.shield.amount < target.shield.max;
  if (!hasMissingHealth && !hasMissingShield) return decision;

  const amount = Number.isFinite(baseDamage) ? Math.max(0, baseDamage) : 0;
  if (decision.kind === "heal") {
    if (hasMissingHealth) {
      const healAmount = amount * (source.isProjectile ? 1 : 0.25);
      target.health.amount = Math.min(target.health.max, target.health.amount + healAmount);
    } else if (hasMissingShield) {
      target.shield.amount = Math.min(target.shield.max, target.shield.amount + healAmount / 5);
    }
  }
  if (decision.kind === "heal") {
   if (hasMissingShield) {
    target.shield.amount = Math.min(target.shield.max, target.shield.amount + repairAmount / 10);
  } else if (hasMissingHealth) {
    const repairAmount = amount * (source.isProjectile ? 5 : 1.25);
    target.health.amount = Math.min(target.health.max, target.health.amount + repairAmount/2);
  }
  }
  if (source.isProjectile && Number.isFinite(incomingDamage)) {
    source.damageRecieved = (Number(source.damageRecieved) || 0) + Math.max(0, incomingDamage);
  }
  return decision;
}

module.exports = {
  hasSupportEffect,
  getSupportKind,
  isProjectile,
  isCombatEntity,
  isRepairTarget,
  isHealTarget,
  resolveSupportInteraction,
  applyInteraction,
};
