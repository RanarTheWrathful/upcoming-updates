"use strict";

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

  // A collision may be caused by the tank itself, a bullet, a trap, or a drone.
  // Resolve its controlling tank as well as checking the colliding entity so
  // every weapon can trigger the same shape-matched infection rule.
  const candidates = [];
  const seenEntities = new Set();
  const addCandidate = (candidate) => {
    if (candidate && typeof candidate === "object" && !seenEntities.has(candidate)) {
      seenEntities.add(candidate);
      candidates.push(candidate);
    }
  };
  addCandidate(entity);
  addCandidate(getTankOwner(entity));

  // Some independent/turret-created projectiles have no direct tank in their
  // master chain, but retain the firing body as source. Check that path too.
  addCandidate(entity.source);
  addCandidate(getTankOwner(entity.source));
  addCandidate(entity.master);
  addCandidate(getTankOwner(entity.master));

  const seenGuns = new Set();
  for (const candidate of candidates) {
    for (const gun of getAllGuns(candidate)) {
      if (seenGuns.has(gun)) continue;
      seenGuns.add(gun);
      const shape = Object.prototype.hasOwnProperty.call(gun, "infectiousShape")
        ? gun.infectiousShape
        : getInfectiousShape(gun.bulletTypes);
      // Infection is always shape-matched. The gun selected here is the one
      // that produces the matching infected type, even if another weapon hit.
      if (Number.isFinite(shape) && shape === target.shape) return gun;
    }
  }
  return null;
}

/**
 * Unregister a destroyed entity from every ownership set that can track it.
 * Entities may be tracked simultaneously as master, source, and/or parent;
 * ordinary reassignment preserves overlapping relationships, but destruction
 * ends all of them. Without this cleanup dead drones remain in possiblyChildren
 * and can permanently consume the owner's tank-wide drone/infection capacity.
 */
function detachOwnedEntity(entity) {
  if (!entity || typeof entity !== "object") return;
  const owners = new Set([entity.master, entity.source, entity.parent]);
  for (const owner of owners) {
    if (owner && owner.possiblyChildren && typeof owner.possiblyChildren.delete === "function") {
      owner.possiblyChildren.delete(entity);
    }
  }
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
 * Prefer the tank's explicit MAX_CHILDREN. Legacy entities that set it to 0
 * rely on their guns' individual child caps, so use the sum of configured
 * drone/minion gun caps as a tank-wide fallback for infections only.
 */
function getTankDroneLimit(owner) {
  if (!owner) return 0;
  const bodyLimit = Number(owner.maxChildren);
  if (Number.isFinite(bodyLimit) && bodyLimit > 0) return bodyLimit;

  let fallbackLimit = 0;
  for (const gun of getAllGuns(owner)) {
    const cap = Number(gun.countsOwnKids);
    if (!Number.isFinite(cap) || cap <= 0) continue;
    const projectileType = Object.prototype.hasOwnProperty.call(gun, "spawnedEntityType")
      ? gun.spawnedEntityType
      : getSpawnedEntityType(gun.bulletTypes);
    if (projectileType === "drone" || projectileType === "minion") {
      fallbackLimit += cap;
    }
  }
  return fallbackLimit;
}

function hasDroneCapacity(owner) {
  const limit = getTankDroneLimit(owner);
  // A legacy entity with no declared body or gun cap retains the engine's
  // existing unlimited-child behavior.
  return limit <= 0 || countOwnedDrones(owner) < limit;
}

module.exports = {
  mergeDefinitions,
  getInfectiousShape,
  getSpawnedEntityType,
  getTankOwner,
  getAllGuns,
  findInfectingGun,
  detachOwnedEntity,
  countOwnedDrones,
  getTankDroneLimit,
  hasDroneCapacity,
};
