"use strict";

const intellect = require("./intellect");

function controllerName(controller) {
  if (!controller) return "";
  if (typeof controller.controllerName === "string") return controller.controllerName.toLowerCase();
  if (controller.constructor && typeof controller.constructor.name === "string") {
    return controller.constructor.name.replace(/^io_/, "").toLowerCase();
  }
  return typeof controller.name === "string" ? controller.name.toLowerCase() : "";
}

function hasController(body, expectedName) {
  const controllers = body && Array.isArray(body.controllers) ? body.controllers : [];
  const expected = String(expectedName || "").replace(/^io_/, "").toLowerCase();
  return controllers.some((controller) => controllerName(controller) === expected);
}

// When an entity explicitly has minion steering, do not allow an inherited
// mapTargetToGoal controller to overwrite its standoff/orbit goal with a direct
// collision course. Player-controlled bodies can still direct their own movement.
function shouldDeferDirectChase(body) {
  if (!body || body.isPlayer || (body.aiSettings && body.aiSettings.forceDirectChase === true)) {
    return false;
  }
  return hasController(body, "minion");
}

function isAutonomousRangedCombatant(body) {
  if (!body || body.isPlayer) return false;
  if (body.isEnemy === true || body.isBoss === true || /boss$/i.test(String(body.type || ""))) {
    return true;
  }
  const excludedTypes = new Set(["food", "bullet", "drone", "swarm", "minion", "trap", "wall", "tile"]);
  return body.master === body && body.source === body &&
    !excludedTypes.has(String(body.type || "").toLowerCase()) &&
    hasController(body, "nearestDifferentMaster") && hasController(body, "minion");
}


// Give legacy class-defined ORBIT_DISTANCE values a wider formation radius.
// Small values (often 50–120) were creating overlapping minions, so they get a
// substantial minimum increase while already-large boss radii scale more gently.
function expandedOrbitDistance(configuredOrbit) {
  const value = Number(configuredOrbit);
  const base = Number.isFinite(value) ? Math.max(0, value) : 120;
  return Math.max(220, base * 1.5, base + 120);
}


function isUsableTarget(target) {
  if (!target) return false;
  if (typeof target.valid === "function" && !target.valid()) return false;
  if (typeof target.isDead === "function" && target.isDead()) return false;
  if (target.health && Number.isFinite(Number(target.health.amount)) && Number(target.health.amount) <= 0) return false;
  return Number.isFinite(Number(target.x)) && Number.isFinite(Number(target.y));
}

// Prefer the actual locked entity for locomotion. The target vector consumed by
// the firing controller may be lead-compensated and can jump as velocity is
// re-estimated; using that point for movement makes fast AI lunge past targets.
function getLockedTarget(body, excludedController) {
  const controllers = body && Array.isArray(body.controllers) ? body.controllers : [];
  const nearest = controllers.find((controller) =>
    controller && controller !== excludedController &&
    controllerName(controller) === "nearestdifferentmaster" &&
    isUsableTarget(controller.targetLock)
  );
  if (nearest) return nearest.targetLock;
  const fallback = controllers.find((controller) =>
    controller && controller !== excludedController && isUsableTarget(controller.targetLock)
  );
  return fallback ? fallback.targetLock : undefined;
}

// Keep one attack lane for the duration of a target lock. Reusing the same
// target preserves the side/angle; only acquiring a different target selects a
// new angle, based on the entity's actual position rather than randomness.
function stableAttackStance(body, target, orbitDistance, previous, intellectValue = 1) {
  if (!body || !isUsableTarget(target)) return undefined;
  const sameTarget = previous && previous.target === target && Number.isFinite(previous.angle);
  const age = sameTarget ? (Number(previous.age) || 0) + 1 : 0;
  const maneuver = intellect.orbitManeuver(intellectValue, body.id, target.id, age);
  let angle;
  if (sameTarget) {
    // Move around the same radial ring with a smooth, persistent maneuver.
    // Wobble changes angle only; radius is never multiplied by INTELLECT.
    angle = previous.angle + maneuver.direction * maneuver.angularSpeed * maneuver.speedMultiplier;
    angle += maneuver.wobbleOffset - (Number(previous.wobbleOffset) || 0);
  } else {
    const dx = (Number(body.x) || 0) - Number(target.x);
    const dy = (Number(body.y) || 0) - Number(target.y);
    angle = Math.hypot(dx, dy) > 1e-6
      ? Math.atan2(dy, dx)
      : (Number(body.facing) || 0) + Math.PI;
    angle += maneuver.phaseOffset + maneuver.wobbleOffset;
  }
  angle = Math.atan2(Math.sin(angle), Math.cos(angle));
  const radius = Math.max(0, Number(orbitDistance) || 0);
  return {
    target,
    angle,
    radius,
    age,
    style: maneuver.style,
    wobbleOffset: maneuver.wobbleOffset,
    goal: {
      x: Number(target.x) + Math.cos(angle) * radius,
      y: Number(target.y) + Math.sin(angle) * radius,
    },
  };
}

// Distance/velocity-aware arrival control for high-speed autonomous ranged AI.
// A negative power applies acceleration away from the goal vector to brake when
// it is closing too quickly, preventing repeated overshoot-and-turn oscillation.
function standoffControlPower(body, target, goal) {
  if (!body || !goal) return 1;
  const dx = Number(goal.x) - (Number(body.x) || 0);
  const dy = Number(goal.y) - (Number(body.y) || 0);
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return 0;
  const ux = dx / distance;
  const uy = dy / distance;
  const velocity = body.velocity || { x: 0, y: 0 };
  const targetVelocity = target && target.velocity ? target.velocity : { x: 0, y: 0 };
  const vx = (Number(velocity.x) || 0) - (Number(targetVelocity.x) || 0);
  const vy = (Number(velocity.y) || 0) - (Number(targetVelocity.y) || 0);
  const relativeVelocityTowardGoal = vx * ux + vy * uy;
  const currentSpeed = Math.hypot(Number(velocity.x) || 0, Number(velocity.y) || 0);
  const topSpeed = Math.max(1, Number(body.topSpeed) || currentSpeed || 1);
  const brakingDistance = Math.min(450, Math.max(40, (Number(body.size) || 0) * 3, topSpeed * 10));
  const positionalDemand = distance / brakingDistance;

  if (String(body.motionType || "").toLowerCase() === "motor") {
    return Math.max(-0.8, Math.min(1, positionalDemand - (relativeVelocityTowardGoal / topSpeed) * 0.9));
  }
  // Other movement modes do not all interpret signed power as acceleration;
  // reduce thrust near the stance point without reversing their control signal.
  return Math.max(0.12, Math.min(1, positionalDemand));
}

function safeStandoffOrbit(baseOrbit, bodySize, targetSize, minimumGap = 30) {
  const orbit = Math.max(0, Number(baseOrbit) || 0);
  const ownSize = Math.max(0, Number(bodySize) || 0);
  const foeSize = Math.max(0, Number(targetSize) || 0);
  const gap = Math.max(0, Number(minimumGap) || 0, Math.max(ownSize, foeSize) * 0.35);
  return Math.max(orbit, ownSize + foeSize + gap);
}

module.exports = {
  controllerName,
  hasController,
  shouldDeferDirectChase,
  isAutonomousRangedCombatant,
  expandedOrbitDistance,
  safeStandoffOrbit,
  isUsableTarget,
  getLockedTarget,
  stableAttackStance,
  standoffControlPower,
};
