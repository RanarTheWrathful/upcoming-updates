"use strict";

const DEFAULT_HOLD_MS = 30_000;
const DEFAULT_DAMAGE_PER_SECOND = 0.10;

function clearState(entity) {
  if (!entity) return;
  delete entity._siegeNeutralZoneEnteredAt;
  delete entity._siegeNeutralZoneLastDamageAt;
}

function isEligibleNeutralCombatEntity(entity) {
  if (!entity || entity.team !== -100) return false;
  if (typeof entity.valid === "function" && !entity.valid()) return false;
  if (typeof entity.isDead === "function" && entity.isDead()) return false;
  if (entity.trulyDead || entity.isProjectile || entity.type === "bullet" ||
      entity.type === "food" || entity.isFood || entity.isPolygon ||
      entity.type === "wall" || entity.type === "squareWall" || entity.isWall ||
      entity.isMazeWall || entity.isGate || entity.structure || entity.isDominator) {
    return false;
  }
  return Boolean(entity.health && Number.isFinite(Number(entity.health.max)) && Number(entity.health.max) > 0);
}

function isPenaltyZone(entity, room) {
  if (!entity || !room) return false;
  const inNest = typeof room.isIn === "function" && room.isIn("nest", entity);
  const onSpawnBorder = typeof room.isIn === "function" && room.isIn("spw0", entity);
  const onEdgeTile = typeof room.isIn === "function" && room.isIn("edge", entity);
  const outOfBounds = typeof room.isInRoom === "function" && !room.isInRoom(entity);
  return Boolean(inNest || onSpawnBorder || onEdgeTile || outOfBounds);
}

/**
 * Apply the Siege neutral-area stay penalty.
 * An eligible neutral combat entity may remain in the central nest or outside
 * border tiles for 30 seconds. After that grace period it loses 10% of its
 * maximum health per second until it leaves the area or dies.
 */
function update(entity, options = {}) {
  const mode = options.mode;
  const room = options.room;
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const holdMs = Number.isFinite(Number(options.holdMs)) ? Math.max(0, Number(options.holdMs)) : DEFAULT_HOLD_MS;
  const damagePerSecond = Number.isFinite(Number(options.damagePerSecond))
    ? Math.max(0, Number(options.damagePerSecond)) : DEFAULT_DAMAGE_PER_SECOND;

  if (mode !== "siege" || !isEligibleNeutralCombatEntity(entity)) {
    clearState(entity);
    return { inZone: false, damage: 0, elapsedMs: 0 };
  }

  if (!isPenaltyZone(entity, room)) {
    clearState(entity);
    return { inZone: false, damage: 0, elapsedMs: 0 };
  }

  if (!Number.isFinite(entity._siegeNeutralZoneEnteredAt)) {
    entity._siegeNeutralZoneEnteredAt = now;
    entity._siegeNeutralZoneLastDamageAt = now;
    return { inZone: true, damage: 0, elapsedMs: 0 };
  }

  const enteredAt = entity._siegeNeutralZoneEnteredAt;
  const elapsedMs = Math.max(0, now - enteredAt);
  if (elapsedMs <= holdMs) return { inZone: true, damage: 0, elapsedMs };

  const lastDamageAt = Number.isFinite(entity._siegeNeutralZoneLastDamageAt)
    ? entity._siegeNeutralZoneLastDamageAt : enteredAt;
  const damageStart = Math.max(lastDamageAt, enteredAt + holdMs);
  const damageElapsedMs = Math.max(0, now - damageStart);
  entity._siegeNeutralZoneLastDamageAt = now;

  const maxHealth = Number(entity.health.max);
  const requestedDamage = maxHealth * damagePerSecond * damageElapsedMs / 1000;
  const healthBefore = Number(entity.health.amount);
  if (Number.isFinite(healthBefore) && requestedDamage > 0) {
    entity.health.amount = Math.max(0, healthBefore - requestedDamage);
  }

  return {
    inZone: true,
    damage: requestedDamage,
    elapsedMs,
  };
}

module.exports = {
  DEFAULT_HOLD_MS,
  DEFAULT_DAMAGE_PER_SECOND,
  isEligibleNeutralCombatEntity,
  isPenaltyZone,
  update,
};
