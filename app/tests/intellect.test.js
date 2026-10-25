"use strict";
const assert = require("assert");
const intellect = require("../lib/intellect");

assert.strictEqual(intellect.normalize(undefined), 1);
assert.strictEqual(intellect.normalize(100000000), 100000000);
assert.strictEqual(intellect.normalize(-2), 0);
assert.strictEqual(intellect.has(32, 32), true);
assert.strictEqual(intellect.has(31.99, 32), false);

assert.strictEqual(intellect.scaleRange(100, 1), 100);
assert.ok(intellect.scaleRange(100, 0.1) < 100);
assert.ok(intellect.scaleRange(100, 100000000) > intellect.scaleRange(100, 1));
assert.ok(intellect.scaleRange(100, 100000000) <= 225);
assert.strictEqual(intellect.scaleInterval(15, 1), 15);
assert.ok(intellect.scaleInterval(15, 0.1) > 15);
assert.ok(intellect.scaleInterval(15, 100000000) >= 4);
assert.ok(intellect.scalePauseInterval(90, 100000000) >= 8);

assert.strictEqual(intellect.waypointCandidateCount(1), 1);
assert.ok(intellect.waypointCandidateCount(100000000) > intellect.waypointCandidateCount(1));
assert.strictEqual(intellect.pathStep(100000000, 0), 1, "high intellect should not skip route points without evidence of a blockage");
assert.strictEqual(intellect.pathStep(100000000, 4), 1, "recovery requires repeated stuck samples");
assert.ok(intellect.pathStep(512, 5) >= 2);
assert.ok(intellect.pathStep(100000000, 5) > intellect.pathStep(512, 5));
assert.strictEqual(intellect.arrivalRadius(50, 1), 50);
assert.ok(intellect.arrivalRadius(50, 100000000) <= 70);

assert.ok(intellect.fleeThreshold(0.3, 0.1) < intellect.fleeThreshold(0.3, 1));
assert.strictEqual(intellect.fleeThreshold(0.3, 1), 0.3);
assert.ok(intellect.fleeThreshold(0.3, 100000000) < 0.34, "high intellect must not cause panic fleeing at almost full health");
assert.strictEqual(intellect.orbitMultiplier(1), 1);
assert.strictEqual(intellect.orbitMultiplier(0.1), 1, "low intellect must not change the configured orbit radius");
assert.strictEqual(intellect.orbitMultiplier(100000000), 1, "high intellect must not change the configured orbit radius");
assert.strictEqual(intellect.orbitDecisionInterval(1), 30, "baseline near-master goal interval remains unchanged");
assert.ok(intellect.orbitDecisionInterval(100000000) > intellect.orbitDecisionInterval(1),
  "higher intellect should retain chosen orbit goals longer instead of jittering between them");

const standardOrbit = intellect.orbitManeuver(1, 10, 20, 500);
assert.strictEqual(standardOrbit.style, "standard", "INTELLECT 1 should use the normal minion orbit method");
assert.strictEqual(standardOrbit.phaseOffset, 0);
assert.ok(standardOrbit.angularSpeed > 0, "INTELLECT 1 should continuously orbit rather than stop at a fixed offset");
assert.strictEqual(standardOrbit.wobbleAmplitude, 0);
const variedOrbit = intellect.orbitManeuver(8, 10, 20, 500);
assert.strictEqual(variedOrbit.style, "slow-orbit");
assert.ok(variedOrbit.phaseOffset >= 0 && variedOrbit.phaseOffset < Math.PI * 2);
assert.ok(variedOrbit.angularSpeed > 0);
const weavingOrbit = intellect.orbitManeuver(32, 10, 20, 500);
assert.strictEqual(weavingOrbit.style, "weaving-orbit");
assert.ok(weavingOrbit.wobbleAmplitude > 0);
const adaptiveOrbit = intellect.orbitManeuver(512, 10, 20, 500);
assert.strictEqual(adaptiveOrbit.style, "adaptive-weave");
assert.ok([0.55, 0.8, 1, 1.25, 1.45].includes(adaptiveOrbit.speedMultiplier));
assert.deepStrictEqual(
  intellect.orbitManeuver(512, 10, 20, 500), adaptiveOrbit,
  "the same entity/target/time should produce the same planned maneuver"
);
assert.notStrictEqual(
  intellect.orbitManeuver(8, 10, 20, 500).phaseOffset,
  intellect.orbitManeuver(8, 11, 20, 500).phaseOffset,
  "different minions should occupy different stable lanes"
);

const body = { x: 0, y: 0, fov: 2000, topSpeed: 10, velocity: { x: 0, y: 0 }, aiTarget: "general" };
const near = { x: 100, y: 0, dangerValue: 1, health: { amount: 100, max: 100 }, velocity: { x: 0, y: 0 } };
const farWeak = { x: 900, y: 0, dangerValue: 10, health: { amount: 20, max: 100 }, velocity: { x: -1, y: 0 } };
const farEqualThreat = { x: 900, y: 0, dangerValue: 1, health: { amount: 100, max: 100 }, velocity: { x: 0, y: 0 } };
assert.strictEqual(intellect.chooseTarget([near, farWeak], body, 1), near);
assert.strictEqual(intellect.chooseTarget([near, farWeak], body, 100000000), farWeak, "very high intellect should weigh threat and vulnerability, not just distance");
assert.strictEqual(intellect.chooseTarget([near, farEqualThreat], body, 100000000), near, "equal-danger targets must not be biased by array order");
assert.strictEqual(intellect.chooseTarget([near, farEqualThreat], body, 100000000, near), near, "a comparable current target should remain locked");

const intercept = intellect.predictIntercept(
  { x: 100, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 0 },
  10,
  4
);
assert.ok(Number.isFinite(intercept.x) && Number.isFinite(intercept.y));
assert.ok(intercept.y > 0, "intercept should lead a moving target");
const linear = intellect.predictIntercept(
  { x: 100, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 0 },
  10,
  4
);
const curved = intellect.predictIntercept(
  { x: 100, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 0.1 },
  10,
  100000000
);
assert.ok(curved.y > linear.y, "extreme intellect should account for target acceleration");
assert.ok(Number.isFinite(intellect.solveInterceptTime({ x: 100, y: 0 }, { x: 10, y: 0 }, 10)));

const targetWithIntent = {
  x: 0,
  y: 0,
  size: 10,
  topSpeed: 10,
  control: { goal: { x: 100, y: 0 } },
  velocity: { x: 0, y: 0 },
};
assert.strictEqual(intellect.targetIntentVelocity(targetWithIntent, { x: 0, y: 0 }, 8).x, 0);
assert.ok(intellect.targetIntentVelocity(targetWithIntent, { x: 0, y: 0 }, 100000000).x > 0);
assert.strictEqual(intellect.targetIntentVelocity({ ...targetWithIntent, isPlayer: true }, { x: 0, y: 0 }, 100000000).x, 0, "intent inference should not override player movement");

const dodgingBody = { x: 0, y: 0, size: 10, topSpeed: 5, velocity: { x: 0, y: 0 }, id: 3 };
const incomingProjectile = { x: 100, y: 0, size: 5, velocity: { x: -10, y: 0 } };
const dodge = intellect.chooseDodgeDirection(dodgingBody, [incomingProjectile], 32, 30);
assert.ok(dodge && Number.isFinite(dodge.x) && Number.isFinite(dodge.y));
assert.ok(Math.abs(dodge.x) < 0.8, "dodge should not run directly into a head-on projectile");
assert.strictEqual(intellect.chooseDodgeDirection(dodgingBody, [{ x: 100, y: 0, size: 5, velocity: { x: 10, y: 0 } }], 32, 30), undefined, "projectiles already moving away should not trigger evasive movement");
assert.ok(intellect.dodgeHorizon(100000000) > intellect.dodgeHorizon(32));
assert.ok(intellect.dodgeDuration(100000000) >= intellect.dodgeDuration(32));
assert.strictEqual(intellect.dodgeScanInterval(100000000), 1);

const wanderChoices = [
  { x: 900, y: 0 },
  { x: 500, y: 0 },
  { x: 0, y: 700 },
];
const selected = intellect.chooseWanderSpot(wanderChoices, body, [{ x: 500, y: 0 }], 100000000);
assert.ok(wanderChoices.includes(selected));
console.log("INTELLECT decision, prediction, evasion, and stability tests passed.");
