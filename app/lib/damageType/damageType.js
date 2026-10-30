"use strict";

const DAMAGE_TYPES = Object.freeze({
  VELOCITY: "velocity",
  COLLISION: "collision",
  COLLISION_MASTER: "collisionMaster",
  IMPACT: "impact",
  VELOCITY_MASTER: "velocityMaster",
});

const VALID_TYPES = new Set(Object.values(DAMAGE_TYPES));
// Static damage modes are calibrated to the velocity-mode result at its
// nominal speed (actual movement speed == maxSpeed), where the legacy
// velocity multiplier is exactly 1. This preserves normal-speed damage while
// removing fast/slow movement as a source of damage variation.
const STATIC_DAMAGE_BASELINE = 1;

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
  // Match the original velocity formula: below-normal speed is reduced and
  // above-normal speed is amplified, up to the existing 2x cap.
  const nonNegativeSpeed = Math.max(0, speed);
  return Math.min(2, Math.max(nonNegativeSpeed, 1) * nonNegativeSpeed);
}

function usesVelocityDamageEffects(entityOrType) {
  const value = typeof entityOrType === "string"
    ? entityOrType
    : entityOrType && entityOrType.damageType;
  const type = normalizeDamageType(value);
  return type === DAMAGE_TYPES.VELOCITY || type === DAMAGE_TYPES.VELOCITY_MASTER;
}

function isSpeedIndependentDamage(entityOrType) {
  return !usesVelocityDamageEffects(entityOrType);
}

function resolveDamage(entity, speedFactor = 1, options = {}) {
  const type = normalizeDamageType(entity && entity.damageType);
  const baseDamage = resolveDamageSource(entity, type);
  const useVelocity = usesVelocityDamageEffects(type);
  const applyVelocity = options.applyVelocity !== false;
  const multiplier = useVelocity && applyVelocity
    ? velocityMultiplier(speedFactor)
    : STATIC_DAMAGE_BASELINE;
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
// movement per tick. Only velocity-based modes retain that kinetic modifier.
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

// Tracks damage contacts for one physics collision pass at a time. All
// speed-independent modes are limited to one damage application per entity
// pair per pass, even if the pair reaches advancedcollide through more than
// one collision branch. Impact pairs additionally retain a consecutive-pass
// counter; a missing pair in a complete pass resets that counter.
class ContactDamageTracker {
  constructor() {
    this.previousImpactContacts = new Map();
    this.currentImpactContacts = new Map();
    this.processedPairs = new Set();
  }

  beginIteration() {
    this.currentImpactContacts.clear();
    this.processedPairs.clear();
  }

  hasProcessed(pairKey) {
    return pairKey != null && this.processedPairs.has(pairKey);
  }

  getImpactCount(pairKey) {
    return pairKey == null ? 0 : (this.previousImpactContacts.get(pairKey) || 0);
  }

  record(pairKey, isImpactPair) {
    if (pairKey == null) return;
    this.processedPairs.add(pairKey);
    if (isImpactPair) {
      this.currentImpactContacts.set(pairKey, this.getImpactCount(pairKey) + 1);
    }
  }

  endIteration() {
    const oldPreviousContacts = this.previousImpactContacts;
    this.previousImpactContacts = this.currentImpactContacts;
    this.currentImpactContacts = oldPreviousContacts;
    this.currentImpactContacts.clear();
    this.processedPairs.clear();
  }
}

module.exports = {
  DAMAGE_TYPES,
  STATIC_DAMAGE_BASELINE,
  normalizeDamageType,
  resolveDamageSource,
  velocityMultiplier,
  resolveDamage,
  isImpactDamage,
  usesVelocityDamageEffects,
  isSpeedIndependentDamage,
  impactDamageMultiplier,
  collisionPairKey,
  ContactDamageTracker,
};
