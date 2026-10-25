"use strict";
const assert = require("assert");
const policy = require("../lib/minionMovementPolicy");
const intellect = require("../lib/intellect");
function controller(name) { return { constructor: { name: `io_${name}` } }; }

assert.strictEqual(policy.shouldDeferDirectChase({ controllers: [controller("minion")] }), true,
  "minion steering should take precedence over inherited direct-chase movement");
assert.strictEqual(policy.shouldDeferDirectChase({ controllers: [controller("nearestDifferentMaster")] }), false,
  "melee AI without minion steering should preserve direct chase");
assert.strictEqual(policy.shouldDeferDirectChase({ isPlayer: true, controllers: [controller("minion")] }), false,
  "player movement should not be overridden");
assert.strictEqual(policy.shouldDeferDirectChase({ aiSettings: { forceDirectChase: true }, controllers: [controller("minion")] }), false,
  "an explicit force-direct-chase setting should override the safeguard");
assert.strictEqual(policy.isAutonomousRangedCombatant({ isEnemy: true }), true);
assert.strictEqual(policy.isAutonomousRangedCombatant({ isBoss: true }), true);
assert.strictEqual(policy.isAutonomousRangedCombatant({ isPlayer: true, isEnemy: true }), false);
assert.strictEqual(intellect.orbitMultiplier(1), 1, "default intellect should preserve the standard orbit radius");
assert.strictEqual(intellect.orbitMultiplier(100000000), 1, "higher intellect must not change orbit distance");
assert.strictEqual(policy.expandedOrbitDistance(50), 220, "small legacy orbit values should be widened substantially");
assert.strictEqual(policy.expandedOrbitDistance(120), 240, "the default orbit should be about twice as wide");
assert.strictEqual(policy.expandedOrbitDistance(500), 750, "already-large orbits should grow more gradually");
assert.strictEqual(policy.safeStandoffOrbit(120, 20, 30, 30), 120,
  "normal target spacing should keep the configured orbit when it is already safe");
assert.strictEqual(policy.safeStandoffOrbit(60, 80, 100, 30), 215,
  "large combatants should get a collision-safe standoff even if the IQ-scaled orbit is small");

const validTarget = { id: 2, x: 1000, y: 0, health: { amount: 100 }, valid: () => true };
const bodyApproaching = { x: 0, y: 0, facing: 0 };
const stanceA = policy.stableAttackStance(bodyApproaching, validTarget, 300);
assert.strictEqual(stanceA.angle, Math.PI, "new stance should use the current approach side, not a random angle");
assert.strictEqual(stanceA.goal.x, 700, "attack point should maintain the requested distance from the target");
assert.strictEqual(stanceA.radius, 300, "baseline orbit must preserve the requested radius");
const stanceB = policy.stableAttackStance({ x: 100, y: 10, facing: 0 }, validTarget, 300, stanceA, 1);
assert.notStrictEqual(stanceB.angle, stanceA.angle, "the stance must continuously orbit instead of parking at one attack point");
const stanceDelta = Math.atan2(
  Math.sin(stanceB.angle - stanceA.angle),
  Math.cos(stanceB.angle - stanceA.angle)
);
assert.ok(Math.abs(stanceDelta) < 0.03,
  "orbiting should advance smoothly rather than jumping to a new angle");
assert.notStrictEqual(stanceB.goal.x, stanceA.goal.x, "the orbital goal must move around the target every think");
assert.ok(Math.abs(Math.hypot(stanceB.goal.x - validTarget.x, stanceB.goal.y - validTarget.y) - 300) < 1e-6,
  "the continuous orbit must maintain its configured radius");
validTarget.x = 1100;
const stanceC = policy.stableAttackStance({ x: 100, y: 10 }, validTarget, 300, stanceB, 1);
assert.ok(Math.abs(Math.hypot(stanceC.goal.x - validTarget.x, stanceC.goal.y - validTarget.y) - 300) < 1e-6,
  "the orbit should follow target movement while maintaining its radius");
const otherTarget = { id: 3, x: -500, y: 0, health: { amount: 100 } };
const stanceD = policy.stableAttackStance({ x: 100, y: 10 }, otherTarget, 300, stanceC, 1);
assert.notStrictEqual(stanceD.target, stanceC.target, "a new target should start a fresh attack stance");

const lockedController = { constructor: { name: "io_nearestDifferentMaster" }, targetLock: validTarget };
assert.strictEqual(policy.getLockedTarget({ controllers: [lockedController] }), validTarget,
  "movement should use the actual locked target rather than predicted aim coordinates");
assert.ok(policy.standoffControlPower(
  { x: 0, y: 0, size: 10, topSpeed: 20, motionType: "motor", velocity: { x: 20, y: 0 } },
  { velocity: { x: 0, y: 0 } },
  { x: 100, y: 0 }
) < 0, "motor-mode high-speed AI should brake when it is closing too quickly");
assert.strictEqual(policy.standoffControlPower(
  { x: 0, y: 0, size: 10, topSpeed: 20, motionType: "motor", velocity: { x: 0, y: 0 } },
  { velocity: { x: 0, y: 0 } },
  { x: 1000, y: 0 }
), 1, "AI should use full power while the stance point is far away");

const smartBody = { id: 100, x: 0, y: 0, facing: 0 };
const smartTarget = { id: 200, x: 1000, y: 0, health: { amount: 100 } };
const smartStance0 = policy.stableAttackStance(
  smartBody, smartTarget, 420, undefined, 100000000
);
const smartStance1 = policy.stableAttackStance(
  smartBody, smartTarget, 420, smartStance0, 100000000
);
assert.strictEqual(smartStance0.radius, 420, "intellect must not shrink the configured smart attack orbit");
assert.strictEqual(smartStance1.radius, 420, "smart orbital maneuvers should stay on the same-radius ring");
assert.notStrictEqual(smartStance1.angle, smartStance0.angle, "extreme intellect should steadily maneuver around a target");
assert.ok(Math.abs(Math.hypot(smartStance1.goal.x - smartTarget.x, smartStance1.goal.y - smartTarget.y) - 420) < 1e-6,
  "extreme-intellect orbit should not alter the configured radius");
const movingOrbitPower = policy.standoffControlPower(
  { x: 0, y: 0, size: 10, topSpeed: 20, motionType: "motor", velocity: { x: 0, y: 0 } },
  { x: 0, y: 0, velocity: { x: 0, y: 0 } },
  { x: 3, y: 0 },
  { x: 0, y: 4 }
);
assert.ok(movingOrbitPower >= 0.3,
  "the controller must retain steering power while following a moving orbital waypoint");

console.log("minion movement policy tests passed");
