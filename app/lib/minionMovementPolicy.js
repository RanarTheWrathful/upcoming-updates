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

// Keep the same side of the target lock while the entity continuously orbits.
// Only acquiring a different target reinitializes from the actual current side.
function orbitAngularVelocity(body, radius, requestedAngularVelocity) {
  const desired = Number(requestedAngularVelocity) || 0;
  const orbitRadius = Math.max(1, Number(radius) || 1);
  const velocity = body && body.velocity ? body.velocity : { x: 0, y: 0 };
  const availableSpeed = Math.max(
    1,
    Number(body && body.topSpeed) || 0,
    Math.hypot(Number(velocity.x) || 0, Number(velocity.y) || 0)
  );
  // Keep the moving waypoint reachable for slow entities and large configured
  // rings. The intellect changes the pattern, but should not demand impossible
  // tangential speeds that collapse into a straight-line charge.
  const maxAngularVelocity = Math.max(0.001, (availableSpeed / orbitRadius) * 0.4);
  return Math.max(-maxAngularVelocity, Math.min(maxAngularVelocity, desired));
}

// Keep one side of the target lock while continuously traversing its orbit.
// The orbit advances from the entity's current radial angle, then uses
// persistent intellect maneuvers; it never selects a random point and parks.
function stableAttackStance(body, target, orbitDistance, previous, intellectValue = 1) {
  if (!body || !isUsableTarget(target)) return undefined;
  const sameTarget = previous && previous.target === target && Number.isFinite(previous.angle);
  const age = sameTarget ? (Number(previous.age) || 0) + 1 : 0;
  const maneuver = intellect.orbitManeuver(intellectValue, body.id, target.id, age);
  const radius = Math.max(0, Number(orbitDistance) || 0);
  let angularVelocity = orbitAngularVelocity(
    body,
    radius,
    maneuver.direction * maneuver.angularSpeed * maneuver.speedMultiplier
  );
  let angle;
  if (sameTarget) {
    // Integrate orbit angle continuously. Wobble contributes only its delta, so
    // a new maneuver can't teleport the goal to a different side of the ring.
    const wobbleDelta = maneuver.wobbleOffset - (Number(previous.wobbleOffset) || 0);
    angularVelocity = orbitAngularVelocity(body, radius, angularVelocity + wobbleDelta);
    angle = previous.angle + angularVelocity;
  } else {
    const dx = (Number(body.x) || 0) - Number(target.x);
    const dy = (Number(body.y) || 0) - Number(target.y);
    angle = Math.hypot(dx, dy) > 1e-6
      ? Math.atan2(dy, dx)
      : (Number(body.facing) || 0) + Math.PI;
  }
  angle = Math.atan2(Math.sin(angle), Math.cos(angle));
  const goal = {
    x: Number(target.x) + Math.cos(angle) * radius,
    y: Number(target.y) + Math.sin(angle) * radius,
  };
  // Velocity of the moving waypoint around the target. Braking must account for
  // this tangential motion rather than treating the waypoint as stationary.
  const tangentialVelocity = {
    x: -Math.sin(angle) * radius * angularVelocity,
    y: Math.cos(angle) * radius * angularVelocity,
  };
  return {
    target,
    angle,
    radius,
    age,
    style: maneuver.style,
    angularVelocity,
    wobbleOffset: maneuver.wobbleOffset,
    goal,
    tangentialVelocity,
  };
}

// Distance/velocity-aware arrival control for high-speed autonomous ranged AI.
// A negative power applies acceleration away from the goal vector to brake when
// it is closing too quickly, preventing repeated overshoot-and-turn oscillation.
function standoffControlPower(body, target, goal, orbitVelocity) {
  if (!body || !goal) return 1;
  const movingOrbitGoal = orbitVelocity &&
    Number.isFinite(Number(orbitVelocity.x)) && Number.isFinite(Number(orbitVelocity.y)) &&
    Math.hypot(Number(orbitVelocity.x), Number(orbitVelocity.y)) > 1e-6;
  const dx = Number(goal.x) - (Number(body.x) || 0);
  const dy = Number(goal.y) - (Number(body.y) || 0);
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return movingOrbitGoal ? 0.3 : 0;
  const ux = dx / distance;
  const uy = dy / distance;
  const velocity = body.velocity || { x: 0, y: 0 };
  const targetVelocity = target && target.velocity ? target.velocity : { x: 0, y: 0 };
  const vx = (Number(velocity.x) || 0) - (Number(targetVelocity.x) || 0) -
    (movingOrbitGoal ? Number(orbitVelocity.x) || 0 : 0);
  const vy = (Number(velocity.y) || 0) - (Number(targetVelocity.y) || 0) -
    (movingOrbitGoal ? Number(orbitVelocity.y) || 0 : 0);
  const relativeVelocityTowardGoal = vx * ux + vy * uy;
  const currentSpeed = Math.hypot(Number(velocity.x) || 0, Number(velocity.y) || 0);
  const topSpeed = Math.max(1, Number(body.topSpeed) || currentSpeed || 1);
  const brakingDistance = Math.min(450, Math.max(40, (Number(body.size) || 0) * 3, topSpeed * 10));
  const positionalDemand = distance / brakingDistance;

  if (String(body.motionType || "").toLowerCase() === "motor") {
    const rawPower = Math.max(-0.8, Math.min(1,
      positionalDemand - (relativeVelocityTowardGoal / topSpeed) * 0.9));
    // Preserve real braking when the entity is closing too quickly, but don't
    // let a moving orbital waypoint make the AI stop at one point on the ring.
    if (movingOrbitGoal && rawPower >= 0) return Math.max(0.3, rawPower);
    return rawPower;
  }
  // Other movement modes cannot all reverse safely. A moving orbit needs enough
  // steering power to follow the waypoint as it travels around the target.
  return movingOrbitGoal
    ? Math.max(0.3, Math.min(1, positionalDemand))
    : Math.max(0.12, Math.min(1, positionalDemand));
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
  orbitAngularVelocity,
  standoffControlPower,
};
