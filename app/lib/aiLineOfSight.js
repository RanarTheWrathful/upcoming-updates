"use strict";

function isSolidOccluder(entity) {
  if (!entity) return false;
  const label = String(entity.label || "");
  const type = String(entity.type || "");

  // Gates and fort walls do not block projectiles, so they must never occlude
  // target selection. Maze/room walls and solid rocks do.
  if (
    entity.isGate ||
    entity.isFortWall ||
    entity.isFortGate ||
    type === "fortWall" ||
    type === "fortGate" ||
    /^(?:fort|fortress) wall$/i.test(label) ||
    /^(?:fort|fortress) gate$/i.test(label)
  ) return false;

  return Boolean(
    entity.isMazeWall ||
      entity.isWall ||
      type === "wall" ||
      type === "squareWall" ||
      /^(rock|gravel|rubble|boulder|abyssal stonecage)$/i.test(label)
  );
}

/**
 * Determine whether a straight ray from source to target is unobstructed by
 * solid wall/rock entities. getCandidates(midpoint, radius) should return
 * nearby entities from the server's existing spatial index.
 */
function hasClearLineOfSight(source, target, getCandidates) {
  if (
    !source ||
    !target ||
    typeof getCandidates !== "function" ||
    !Number.isFinite(source.x) ||
    !Number.isFinite(source.y) ||
    !Number.isFinite(target.x) ||
    !Number.isFinite(target.y)
  ) {
    return false;
  }
  if (source === target) return true;

  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 1) return true;

  const length = Math.sqrt(lengthSquared);
  const midpoint = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
  // The segment lies inside this midpoint-centred square. The spatial index's
  // AABBs already include each entity's collision radius, so a small margin is
  // sufficient to capture walls/rocks touching the ray.
  const candidates = getCandidates(midpoint, length / 2 + 12) || [];

  for (const obstacle of candidates) {
    if (
      !obstacle ||
      obstacle === source ||
      obstacle === target ||
      !isSolidOccluder(obstacle) ||
      !Number.isFinite(obstacle.x) ||
      !Number.isFinite(obstacle.y)
    ) {
      continue;
    }

    const radiusValue = Number(obstacle.realSize ?? obstacle.size);
    const radius = (Number.isFinite(radiusValue) ? Math.max(0, radiusValue) : 0) + 4;
    if (radius <= 4) continue;

    // Project the obstacle centre onto the finite source-target segment.
    const t =
      ((obstacle.x - source.x) * dx + (obstacle.y - source.y) * dy) /
      lengthSquared;
    if (t <= 0 || t >= 1) continue;

    const closestX = source.x + t * dx;
    const closestY = source.y + t * dy;
    const offsetX = obstacle.x - closestX;
    const offsetY = obstacle.y - closestY;
    if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
      return false;
    }
  }

  return true;
}

hasClearLineOfSight.isSolidOccluder = isSolidOccluder;
module.exports = hasClearLineOfSight;
