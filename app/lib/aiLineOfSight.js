"use strict";

const ROCK_LABELS = /^(rock|gravel|rubble|boulder|abyssal stonecage)$/i;

function isGateOrFortWall(entity) {
  if (!entity) return false;
  const type = String(entity.type || "").toLowerCase();
  const label = String(entity.label || "").toLowerCase();
  return Boolean(
    entity.isGate ||
      entity.isFortGate ||
      entity.isFortWall ||
      type === "fortgate" ||
      type === "fortwall" ||
      label === "fort gate" ||
      label === "fort wall"
  );
}

function isWallOccluder(entity) {
  if (!entity || isGateOrFortWall(entity)) return false;
  const type = String(entity.type || "").toLowerCase();
  const label = String(entity.label || "");
  // Maze walls block projectiles. Do not use isWall by itself: fort walls
  // also carry that runtime flag, but projectiles can pass through them.
  return Boolean(
    entity.isMazeWall ||
      type === "squarewall" ||
      type === "wall" ||
      /^maze wall$/i.test(label)
  );
}

function isRockOccluder(entity) {
  if (!entity || isGateOrFortWall(entity)) return false;
  return ROCK_LABELS.test(String(entity.label || ""));
}

function isSolidOccluder(entity) {
  return isWallOccluder(entity) || isRockOccluder(entity);
}

function canIgnoreWallOcclusion(source) {
  if (!source) return false;
  const effect = String(source.specialEffect || "").toLowerCase();
  return Boolean(
    source.ignoreCollision === true ||
      source.canDestroyWalls === true ||
      source.wallDestroyer === true ||
      effect === "diewall" ||
      effect === "crusherfortwall"
  );
}

/**
 * Determine whether a straight ray from source to target is unobstructed.
 * Maze walls and rocks block ordinary AI. Wall-breaking or wall-phasing AI
 * can see through maze walls, but rocks still block line of sight. Gates and
 * fort walls never occlude the ray because projectiles pass through them.
 * getCandidates(midpoint, radius) should query the server's spatial index.
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
  const candidates = getCandidates(midpoint, length / 2 + 12) || [];
  const ignoresWalls = canIgnoreWallOcclusion(source);

  for (const obstacle of candidates) {
    if (
      !obstacle ||
      obstacle === source ||
      obstacle === target ||
      !Number.isFinite(obstacle.x) ||
      !Number.isFinite(obstacle.y) ||
      isGateOrFortWall(obstacle)
    ) {
      continue;
    }

    const isWall = isWallOccluder(obstacle);
    const isRock = isRockOccluder(obstacle);
    if ((!isWall && !isRock) || (isWall && ignoresWalls)) continue;

    const radiusValue = Number(obstacle.realSize ?? obstacle.size);
    const radius = (Number.isFinite(radiusValue) ? Math.max(0, radiusValue) : 0) + 4;
    if (radius <= 4) continue;

    const t =
      ((obstacle.x - source.x) * dx + (obstacle.y - source.y) * dy) /
      lengthSquared;
    if (t <= 0 || t >= 1) continue;

    const closestX = source.x + t * dx;
    const closestY = source.y + t * dy;
    const offsetX = obstacle.x - closestX;
    const offsetY = obstacle.y - closestY;
    if (offsetX * offsetX + offsetY * offsetY <= radius * radius) return false;
  }

  return true;
}

hasClearLineOfSight.isSolidOccluder = isSolidOccluder;
hasClearLineOfSight.isWallOccluder = isWallOccluder;
hasClearLineOfSight.isRockOccluder = isRockOccluder;
hasClearLineOfSight.canIgnoreWallOcclusion = canIgnoreWallOcclusion;
module.exports = hasClearLineOfSight;
