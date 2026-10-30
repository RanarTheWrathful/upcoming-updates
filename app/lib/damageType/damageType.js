"use strict";

const DAMAGE_TYPES = Object.freeze({
  VELOCITY: "velocity",
  COLLISION: "collision",
  COLLISION_MASTER: "collisionMaster",
  IMPACT: "impact",
  VELOCITY_MASTER: "velocityMaster",
});

const VALID_TYPES = new Set(Object.values(DAMAGE_TYPES));

function normalizeDamageType(value) {
  if (typeof value !== "string") return DAMAGE_TYPES.VELOCITY;
  const normalized = value.trim();
  return VALID_TYPES.has(normalized) ? normalized : DAMAGE_TYPES.VELOCITY;
}

function resolveDamageSource(entity, damageType = normalizeDamageType(entity && entity.damageType)) {
  if (damageType === DAMAGE_TYPES.COLLISION_MASTER || damageType === DAMAGE_TYPES.VELOCITY_MASTER) {
    const master = entity && (entity.master || entity.source);
    const masterDamage = Number(master && master.damage);
    if (Number.isFinite(masterDamage)) return masterDamage;
  }
  const damage = Number(entity && entity.damage);
  return Number.isFinite(damage) ? damage : 0;
}

function velocityMultiplier(speedFactor) {
  const speed = Number(speedFactor);
  if (!Number.isFinite(speed)) return 1;
  // Match the existing collision formula exactly: a stationary entity has a
  // zero velocity multiplier, moving entities below normal speed are reduced,
  // and high-speed collisions are capped at 2x damage.
  const nonNegativeSpeed = Math.max(0, speed);
  return Math.min(2, Math.max(nonNegativeSpeed, 1) * nonNegativeSpeed);
}

function resolveDamage(entity, speedFactor = 1, options = {}) {
  const type = normalizeDamageType(entity && entity.damageType);
  const baseDamage = resolveDamageSource(entity, type);
  const useVelocity = type === DAMAGE_TYPES.VELOCITY || type === DAMAGE_TYPES.VELOCITY_MASTER;
  const applyVelocity = options.applyVelocity !== false;
  const multiplier = useVelocity && applyVelocity ? velocityMultiplier(speedFactor) : 1;
  return {
    type,
    baseDamage,
    multiplier,
    damage: baseDamage * multiplier,
    impact: type === DAMAGE_TYPES.IMPACT,
  };
}

function isImpactDamage(entityOrType) {
  const value = typeof entityOrType === "string"
    ? entityOrType
    : entityOrType && entityOrType.damageType;
  return normalizeDamageType(value) === DAMAGE_TYPES.IMPACT;
}

// The original DAMAGE_EFFECTS collision modifier also depends on relative
// movement per tick (through accelerationFactor), so bypassing only the
// explicit speedMultiplier is insufficient for speed-independent damage.
// Keep those kinetic modifiers for the velocity modes only.
function usesVelocityDamageEffects(entityOrType) {
  const value = typeof entityOrType === "string"
    ? entityOrType
    : entityOrType && entityOrType.damageType;
  const type = normalizeDamageType(value);
  return type === DAMAGE_TYPES.VELOCITY || type === DAMAGE_TYPES.VELOCITY_MASTER;
}

// Impact damage uses diminishing returns while a pair remains in contact.
// The first collision deals full damage; each subsequent collision iteration
// halves it. Duplicate collision processing for the same pair in one physics
// iteration is suppressed so broad-phase ordering cannot multiply damage.
function impactDamageMultiplier(entityOrType, consecutiveContactCount = 0, alreadyProcessedThisIteration = false) {
  if (!isImpactDamage(entityOrType)) return 1;
  if (alreadyProcessedThisIteration) return 0;
  const count = Number.isFinite(Number(consecutiveContactCount))
    ? Math.max(0, Math.floor(Number(consecutiveContactCount)))
    : 0;
  return Math.pow(0.5, count);
}

function collisionPairKey(first, second) {
  const firstId = Number(first && first.id);
  const secondId = Number(second && second.id);
  if (!Number.isFinite(firstId) || !Number.isFinite(secondId)) return null;
  return firstId < secondId ? `${firstId}:${secondId}` : `${secondId}:${firstId}`;
}

module.exports = {
  DAMAGE_TYPES,
  normalizeDamageType,
  resolveDamageSource,
  velocityMultiplier,
  resolveDamage,
  isImpactDamage,
  usesVelocityDamageEffects,
  impactDamageMultiplier,
  collisionPairKey,
};
