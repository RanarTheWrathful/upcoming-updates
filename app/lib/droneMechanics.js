"use strict";

const MAX_DRONE_STAT_NAMES = 3;

function definitionInheritsDrone(definition, droneDefinition, visited = new Set()) {
  if (!definition || typeof definition !== "object" || visited.has(definition)) {
    return false;
  }
  visited.add(definition);
  if (definition.TYPE === "drone" || definition === droneDefinition) return true;
  const parents = Array.isArray(definition.PARENT)
    ? definition.PARENT
    : definition.PARENT
    ? [definition.PARENT]
    : [];
  return parents.some((parent) =>
    definitionInheritsDrone(parent, droneDefinition, visited)
  );
}

function getDefinitionShape(definition, visited = new Set()) {
  if (!definition || typeof definition !== "object" || visited.has(definition)) {
    return null;
  }
  visited.add(definition);
  if (Object.prototype.hasOwnProperty.call(definition, "SHAPE")) {
    return typeof definition.SHAPE === "number" && Number.isFinite(definition.SHAPE)
      ? definition.SHAPE
      : null;
  }
  const parents = Array.isArray(definition.PARENT)
    ? definition.PARENT
    : definition.PARENT
    ? [definition.PARENT]
    : [];
  for (const parent of parents) {
    const shape = getDefinitionShape(parent, visited);
    if (shape !== null) return shape;
  }
  return null;
}

function getDroneShapesFromTypes(types, droneDefinition) {
  if (!Array.isArray(types)) return [];
  const shapeOverrides = types.filter(
    (type) =>
      type &&
      typeof type === "object" &&
      !definitionInheritsDrone(type, droneDefinition) &&
      typeof type.SHAPE === "number" &&
      Number.isFinite(type.SHAPE)
  );
  const overrideShape = shapeOverrides.length
    ? shapeOverrides[shapeOverrides.length - 1].SHAPE
    : null;
  const shapes = new Set();
  for (const type of types) {
    if (!definitionInheritsDrone(type, droneDefinition)) continue;
    const shape = overrideShape === null ? getDefinitionShape(type) : overrideShape;
    if (typeof shape === "number" && Number.isFinite(shape)) shapes.add(shape);
  }
  return Array.from(shapes);
}

function countLiveChildren(children, predicate = () => true) {
  if (!Array.isArray(children)) return 0;
  const unique = new Set(children);
  let count = 0;
  for (const child of unique) {
    if (!child || (child.health && Number(child.health.amount) <= 0)) continue;
    if (child.health && !Number.isFinite(Number(child.health.amount))) continue;
    if (predicate(child)) count++;
  }
  return count;
}

function effectiveChildLimit(baseLimit, usesMaxDroneStat, droneStatValue = 1) {
  const limit = Number(baseLimit);
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  const modifier = Number(droneStatValue);
  const scale = usesMaxDroneStat && Number.isFinite(modifier) && modifier > 0
    ? 1 / modifier
    : 1;
  return Math.max(1, Math.ceil(limit * scale));
}

function canCreateChild({
  globalLimit = 0,
  globalChildren = [],
  localLimit = 0,
  localChildren = [],
  sharedDroneCap = false,
  usesMaxDroneStat = false,
  droneStatValue = 1,
  childPredicate = () => true,
}) {
  const sharedLimit = Number(globalLimit);

  // Drone tanks with a shared MAX_CHILDREN cap use one total limit across all
  // eligible drone guns. A per-gun cap must not block a drone if the shared cap
  // still has room.
  if (sharedDroneCap && Number.isFinite(sharedLimit) && sharedLimit > 0) {
    const cap = effectiveChildLimit(
      sharedLimit,
      usesMaxDroneStat,
      droneStatValue
    );
    return countLiveChildren(globalChildren, childPredicate) < cap;
  }

  const ownLimit = Number(localLimit);
  if (Number.isFinite(ownLimit) && ownLimit > 0) {
    const cap = effectiveChildLimit(
      ownLimit,
      usesMaxDroneStat,
      droneStatValue
    );
    return countLiveChildren(localChildren, childPredicate) < cap;
  }

  if (Number.isFinite(sharedLimit) && sharedLimit > 0) {
    const cap = effectiveChildLimit(sharedLimit, false, 1);
    return countLiveChildren(globalChildren) < cap;
  }

  // A zero MAX_CHILDREN means that this entity has no body-wide cap; legacy
  // definitions may instead have per-gun limits (or intentionally no limit).
  return true;
}

function findAvailableDroneGun(candidates, targetShape) {
  if (!Array.isArray(candidates)) return null;
  for (const candidate of candidates) {
    const gun = candidate && candidate.gun ? candidate.gun : candidate;
    if (!gun || gun.canShoot === false) continue;
    if (typeof gun.getDroneShapes !== "function") continue;
    if (!gun.getDroneShapes().includes(targetShape)) continue;
    if (typeof gun.hasChildCapacity !== "function" || !gun.hasChildCapacity()) continue;
    return candidate;
  }
  return null;
}

module.exports = {
  MAX_DRONE_STAT_NAMES,
  definitionInheritsDrone,
  getDefinitionShape,
  getDroneShapesFromTypes,
  countLiveChildren,
  effectiveChildLimit,
  canCreateChild,
  findAvailableDroneGun,
};
