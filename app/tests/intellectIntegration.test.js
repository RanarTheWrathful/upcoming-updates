"use strict";
const assert = require("assert");
const fs = require("fs");
const server = fs.readFileSync(require("path").join(__dirname, "..", "server.js"), "utf8");

assert.ok(server.includes("keepTarget = Boolean(this.targetLock && out.indexOf(this.targetLock) !== -1)"),
  "nearestDifferentMaster should preserve a still-valid target lock across list refreshes");
assert.ok(server.includes("this.targetLock = this.selectIntellectTarget(this.validTargets, this.targetLock)"),
  "advanced intellect should reconsider a significantly better target with hysteresis");
assert.ok(server.includes("this.predictIntellectTargetAim("),
  "targeting controllers should use the intellect-aware predictive aiming path");
assert.ok(server.includes("this.getIntellectDodgeGoal()"),
  "targeting controllers should consult predictive projectile evasion");
assert.ok(server.includes("intellect.chooseWanderSpot("),
  "wander controller should use novelty-aware stable destinations");
assert.ok(server.includes("this.repositionCooldown <= 0"),
  "formation controller should keep randomized goals stable between reposition decisions");
const minionControllerSource = server.slice(
  server.indexOf("class io_minion extends IO {"),
  server.indexOf("class io_wanderAroundMap extends IO {")
);
assert.ok(minionControllerSource.includes("minionMovementPolicy.classicMinionOrbitGoal("),
  "the minion controller should use the original target-relative orbit formula");
assert.ok(!minionControllerSource.includes("stableAttackStance"),
  "the custom persistent attack stance should not replace the original minion orbit");
assert.ok(!minionControllerSource.includes("_orbitPhase"),
  "the restored minion controller should not integrate a custom world-space orbit angle");
assert.ok(minionControllerSource.includes("minionMovementPolicy.hasActiveIntellectDodge(this.body)"),
  "active intellect-based evasion should temporarily take priority over ordinary orbit movement");
assert.ok(server.includes("minionMovementPolicy.expandedOrbitDistance(body.orbitDistance)"),
  "the previously requested wider configured orbit spacing should remain independent of orbit steering");
assert.ok(server.includes("minionMovementPolicy.shouldDeferDirectChase(this.body)"),
  "direct chase must not overwrite minion movement and cause ramming");
assert.ok(!server.includes("orbit * sizeFactor * autonomyScale"),
  "minion orbit radius must not be scaled by intellect");
assert.ok(!server.includes("configuredOrbit * sizeFactor * rangedScale"),
  "ranged combat orbit radius must not be scaled by intellect");
assert.ok(server.includes("intellect.orbitDecisionInterval(intellectValue)"),
  "near-master controllers should keep higher-intellect destinations stable for longer");
assert.ok(server.includes("const recoverStuck = value >= 512 && this.stuckChecks >= 5"),
  "pathfinder should only skip ahead after repeated stuck evidence at the specified threshold");
console.log("INTELLECT controller-integration checks passed.");
