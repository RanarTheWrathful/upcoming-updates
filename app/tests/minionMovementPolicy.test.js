"use strict";
const assert = require("assert");
const policy = require("../lib/minionMovementPolicy");
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
assert.strictEqual(policy.safeStandoffOrbit(120, 20, 30, 30), 120,
  "normal target spacing should keep the configured orbit when it is already safe");
assert.strictEqual(policy.safeStandoffOrbit(60, 80, 100, 30), 215,
  "large combatants should get a collision-safe standoff even if the IQ-scaled orbit is small");
console.log("minion movement policy tests passed");
