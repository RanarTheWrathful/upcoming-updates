"use strict";

const { isNecroCalculator } = require("./gunCalculator");

/**
 * Resolve definition inheritance in the same order used by Entity.define():
 * parents first, then the definition itself. TYPE arrays can contain a class
 * plus small override objects, so they must be merged in their original order.
 */
function mergeDefinitions(definitions) {
  const result = {};
  const active = new Set();

  function apply(definition) {
    if (!definition || typeof definition !== "object" || active.has(definition)) {
      return;
    }
    active.add(definition);

    const parents = definition.PARENT == null
      ? []
      : Array.isArray(definition.PARENT)
      ? definition.PARENT
      : [definition.PARENT];
    for (const parent of parents) apply(parent);

    for (const [key, value] of Object.entries(definition)) {
      if (key !== "PARENT") result[key] = value;
    }
    active.delete(definition);
  }

  const entries = Array.isArray(definitions)
    ? definitions
    : definitions == null
    ? []
    : [definitions];
  for (const definition of entries) apply(definition);
  return result;
}

function getInfectiousShape(bulletTypes) {
  const definition = mergeDefinitions(bulletTypes);
  return definition.NECRO === true && Number.isFinite(definition.SHAPE)
    ? definition.SHAPE
    : undefined;
}

function getSpawnedEntityType(bulletTypes) {
  return mergeDefinitions(bulletTypes).TYPE;
}

function getTankOwner(entity) {
  if (!entity || typeof entity !== "object") return entity;
  let current = entity;
  let lastTank = entity.type === "tank" ? entity : null;
  const visited = new Set();

  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    if (current.type === "tank") lastTank = current;

    const master = current.master;
    const source = current.source;
    const next = master && master !== current
      ? master
      : source && source !== current
      ? source
      : null;
    if (!next || typeof next !== "object") break;
    current = next;
  }

  return lastTank || entity;
}

function getAllGuns(entity) {
  const guns = [];
  const visited = new Set();
  function visit(current) {
    if (!current || typeof current !== "object" || visited.has(current)) return;
    visited.add(current);
    if (Array.isArray(current.guns)) {
      for (const gun of current.guns) if (gun) guns.push(gun);
    }
    if (Array.isArray(current.turrets)) {
      for (const turret of current.turrets) visit(turret);
    }
  }
  visit(entity);
  return guns;
}

function findInfectingGun(entity, target) {
  if (!entity || !target || target.type !== "food" || !Number.isFinite(target.shape)) {
    return null;
  }

  const owner = getTankOwner(entity);
  const necroTyrantOverride =
    owner && owner.label === "Necro Tyrant" && Number(target.foodLevel) < 4;

  for (const gun of getAllGuns(entity)) {
    const shape = Object.prototype.hasOwnProperty.call(gun, "infectiousShape")
      ? gun.infectiousShape
      : getInfectiousShape(gun.bulletTypes);
    if (Number.isFinite(shape) && (shape === target.shape || necroTyrantOverride)) {
      return gun;
    }
  }
  return null;
}

function countOwnedDrones(owner) {
  if (!owner || !owner.possiblyChildren || typeof owner.possiblyChildren[Symbol.iterator] !== "function") {
    return 0;
  }
  let count = 0;
  for (const child of owner.possiblyChildren) {
    if (child && child !== owner && (child.type === "drone" || child.type === "minion")) {
      count++;
    }
  }
  return count;
}

/**
 * Necro-calculated guns use the reload stat as the Max Drone Limit stat.
 * Include both normal drone guns and converted food in one tank-wide budget.
 */
function usesMaxDroneLimitStat(owner) {
  if (!owner) return false;
  if (Number(owner.settings && owner.settings.skillNames) === 3) return true;
  return getAllGuns(owner).some((gun) => isNecroCalculator(gun.calculator));
}

function isDroneProducingGun(gun) {
  if (!gun) return false;
  const type = Object.prototype.hasOwnProperty.call(gun, "spawnedEntityType")
    ? gun.spawnedEntityType
    : getSpawnedEntityType(gun.bulletTypes);
  return type === "drone" || type === "minion";
}

function getReloadLimitScale(owner) {
  const value = Number(owner && owner.skill && owner.skill.rld);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

/**
 * Use the same strict child-cap math as Gun.live(): a necro gun with a cap of
 * N can own ceil(N / skill.rld) drones. When per-gun caps exist, aggregate those
 * caps and respect a positive tank MAX_CHILDREN ceiling. If no per-gun caps exist,
 * scale the body cap itself, matching guns that rely on body.maxChildren.
 */
function getTankDroneLimit(owner) {
  if (!owner) return 0;
  const bodyLimit = Number(owner.maxChildren);
  const hasBodyLimit = Number.isFinite(bodyLimit) && bodyLimit > 0;
  const maxDroneVariant = usesMaxDroneLimitStat(owner);
  const allGuns = getAllGuns(owner);
  const reloadScale = maxDroneVariant ? getReloadLimitScale(owner) : 1;

  let gunLimit = 0;
  let hasConfiguredDroneGunCap = false;
  for (const gun of allGuns) {
    if (!isDroneProducingGun(gun)) continue;
    const cap = Number(gun.countsOwnKids);
    if (!Number.isFinite(cap) || cap <= 0) continue;

    hasConfiguredDroneGunCap = true;
    const perGunScale = maxDroneVariant && isNecroCalculator(gun.calculator)
      ? reloadScale
      : 1;
    gunLimit += Math.ceil(cap / perGunScale);
  }

  if (maxDroneVariant) {
    if (hasConfiguredDroneGunCap) {
      return hasBodyLimit ? Math.min(bodyLimit, gunLimit) : gunLimit;
    }
    if (hasBodyLimit) return Math.ceil(bodyLimit / reloadScale);
  }

  // Preserve the previous behavior for ordinary drone classes.
  if (hasBodyLimit) return bodyLimit;
  if (gunLimit > 0) return gunLimit;
  return 0;
}

function hasDroneCapacity(owner) {
  const limit = getTankDroneLimit(owner);
  // A legacy entity with no declared body or gun cap retains the engine's
  // existing unlimited-child behavior.
  return limit <= 0 || countOwnedDrones(owner) < limit;
}

function canGunSpawnDrone(owner, gun) {
  return (
    !usesMaxDroneLimitStat(owner) ||
    !isDroneProducingGun(gun) ||
    hasDroneCapacity(owner)
  );
}

module.exports = {
  mergeDefinitions,
  getInfectiousShape,
  getSpawnedEntityType,
  getTankOwner,
  getAllGuns,
  findInfectingGun,
  countOwnedDrones,
  usesMaxDroneLimitStat,
  isDroneProducingGun,
  getTankDroneLimit,
  hasDroneCapacity,
  canGunSpawnDrone,
};
