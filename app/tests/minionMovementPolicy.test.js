"use strict";
const assert = require("assert");
const policy = require("../lib/minionMovementPolicy/minionMovementPolicy");
const intellect = require("../lib/intellect/intellect");

function controller(name) { return { constructor: { name: `io_${name}` } }; }

assert.strictEqual(policy.shouldDeferDirectChase({ controllers: [controller("minion")] }), true,
  "minion steering should take precedence over inherited direct-chase movement");
assert.strictEqual(policy.shouldDeferDirectChase({ controllers: [controller("nearestDifferentMaster")] }), false,
  "melee AI without minion steering should preserve direct chase");
assert.strictEqual(policy.shouldDeferDirectChase({ isPlayer: true, controllers: [controller("minion")] }), false,
  "player movement should not be overridden");
assert.strictEqual(policy.shouldDeferDirectChase({ aiSettings: { forceDirectChase: true }, controllers: [controller("minion")] }), false,
  "an explicit force-direct-chase setting should override the safeguard");

assert.strictEqual(policy.expandedOrbitDistance(50), 220,
  "the previously requested wider spacing should remain for positive configured orbits");
assert.strictEqual(policy.expandedOrbitDistance(120), 240);
assert.strictEqual(policy.expandedOrbitDistance(500), 750);

// These are the original controller's relative-target calculations, rather
// than a newly integrated world-space orbit angle or a fixed attack stance.
const body = { x: 100, y: 200, size: 20 };
const target = { x: 300, y: 400, length: 500, direction: Math.atan2(400, 300) };
const orbit = 250;
const classic = policy.classicMinionOrbitGoal(body, target, orbit, 1);
const dir = target.direction + 0.01;
assert.deepStrictEqual(classic.goal, {
  x: body.x + target.x - orbit * Math.cos(dir),
  y: body.y + target.y - orbit * Math.sin(dir),
}, "default minion orbit must preserve the original target-relative formula");
assert.strictEqual(classic.power, 1);

const nearOrbit = policy.classicMinionOrbitGoal(
  body,
  { x: 10, y: 0, length: 10, direction: 0 },
  20,
  1
);
assert.strictEqual(nearOrbit.power, 0.7,
  "the original near-orbit movement-power reduction should remain");
const reversed = policy.classicMinionOrbitGoal(body, target, orbit, -1);
assert.notDeepStrictEqual(reversed.goal, classic.goal,
  "reverse direction should retain the original turnwise behavior");

assert.strictEqual(intellect.orbitMultiplier(100000000), 1,
  "INTELLECT must not alter the configured orbit radius");

const dodgeController = {
  _intellectFrame: 10,
  _intellectDodgeState: { direction: { x: 0, y: 1 }, until: 15 },
};
assert.strictEqual(policy.hasActiveIntellectDodge({ controllers: [dodgeController] }), true,
  "active intellect dodges should be allowed to override minion orbit temporarily");
dodgeController._intellectFrame = 15;
assert.strictEqual(policy.hasActiveIntellectDodge({ controllers: [dodgeController] }), false,
  "expired dodge plans should not permanently suppress orbit behavior");

console.log("classic minion movement policy tests passed");
