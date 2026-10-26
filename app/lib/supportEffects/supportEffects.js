"use strict";

function hasSupportEffect(entity) {
  return Boolean(entity && (entity.healEffect || entity.repairEffect));
}

function getSupportKind(entity) {
  if (!entity) return null;
  // Preserve the engine's historical precedence when both flags are present.
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
      isCombatEntity(entity))
  );
}

function isHealTarget(entity) {
  return Boolean(
    entity &&
    (entity.type === "tank" || entity.isPlayer === true || entity.isBot === true)
  );
}

/** Decide how a heal/repair entity interacts with a target. */
function resolveSupportInteraction(source, target) {
  const kind = getSupportKind(source);
  if (!kind || !target) return { action: "none", kind: null, multiplier: 0 };

  const knownTeams = source.team != null && target.team != null;
  const sameTeam = knownTeams && source.team === target.team;
  const projectile = isProjectile(target);

  if (sameTeam) {
    // A source can carry both effects (for example, Supportsphere). Prefer its
    // normal heal behavior for tanks, but fall back to repair for structures,
    // gates, dominators, food, and allied projectiles instead of silently
    // doing nothing because HEAL_EFFECT took precedence over REPAIR_EFFECT.
    const structureNeedsRepair = Boolean(
      isProjectile(target) || target.type === "food" || target.isDominator === true ||
      target.isWall === true || target.isGate === true
    );
    if (source.repairEffect && structureNeedsRepair && isRepairTarget(target)) {
      return { action: "heal", kind: "repair", multiplier: 0 };
    }
    if (source.healEffect && isHealTarget(target)) {
      return { action: "heal", kind: "heal", multiplier: 0 };
    }
    if (source.repairEffect && isRepairTarget(target)) {
      return { action: "heal", kind: "repair", multiplier: 0 };
    }
    return { action: "none", kind, multiplier: 0 };
  }

  let multiplier = 0;
  if (kind === "repair") {
    if (projectile) multiplier = 2;
    else if (target.isDominator === true) multiplier = 25;
    else if (target.isWall === true || target.isGate === true) multiplier = 10;
    else if (target.type === "food") multiplier = 1;
    else if (target.team === -3 && isCombatEntity(target)) multiplier = 2;
    else if (
      isCombatEntity(target) &&
      (isCombatEntity(source) || hasSupportEffect(target))
    ) multiplier = 1;

    // Repair auras are weak against projectiles, but this never affects repairs
    // delivered to friendly projectiles (handled by the same-team branch).
    if (multiplier > 0 && projectile && source.type === "atmosphere") {
      multiplier *= 0.1;
    }
  } else if (kind === "heal") {
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

function restoreResource(resource, amount) {
  if (!resource || !Number.isFinite(Number(resource.amount)) ||
      !Number.isFinite(Number(resource.max))) return 0;
  const current = Math.max(0, Number(resource.amount));
  const maximum = Math.max(0, Number(resource.max));
  const addition = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const next = Math.min(maximum, current + addition);
  resource.amount = next;
  return Math.max(0, next - current);
}

/** Apply a resolved support effect using the game's collision damage as its base. */
function applyInteraction(source, target, baseDamage, incomingDamage) {
  const decision = resolveSupportInteraction(source, target);
  if (decision.action === "damage") {
    const damage = Number.isFinite(baseDamage) ? Math.max(0, baseDamage) : 0;
    target.damageRecieved = (Number(target.damageRecieved) || 0) + damage * decision.multiplier;
    return decision;
  }
  if (decision.action !== "heal" || !target.health || !target.shield) return decision;

  const amount = Number.isFinite(baseDamage) ? Math.max(0, baseDamage) : 0;
  const healthMissing = Number(target.health.amount) < Number(target.health.max);
  const shieldMissing = Number(target.shield.amount) < Number(target.shield.max);
  if (!healthMissing && !shieldMissing) return decision;

  const projectileSource = isProjectile(source);
  let restored = 0;

  if (decision.kind === "repair") {
    // Repairs prioritize shields. The 20% projectile rate matches the intended
    // repair-beam behavior; passive/aura repairs are deliberately more modest.
    if (shieldMissing) {
      restored = restoreResource(target.shield, amount * (projectileSource ? 0.2 : 0.1));
    } else if (healthMissing) {
      restored = restoreResource(target.health, amount * (projectileSource ? 0.5 : 0.25));
    }
  } else if (decision.kind === "heal") {
    // Healing prioritizes health, then restores shields at one-fifth of that rate.
    const healAmount = amount * (projectileSource ? 1 : 0.25);
    if (healthMissing) {
      restored = restoreResource(target.health, healAmount);
    } else if (shieldMissing) {
      restored = restoreResource(target.shield, healAmount / 5);
    }
  }

  // A support projectile is consumed by a successful restoration, taking the
  // normal incoming collision damage just as it did before the regression.
  if (restored > 0 && projectileSource && Number.isFinite(incomingDamage)) {
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
