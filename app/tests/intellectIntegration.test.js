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
assert.ok(server.includes("this.getIntellectProjectileIntercept(tracking)"),
  "high-intellect targeting controllers should sometimes shoot down incoming hostile projectiles");
assert.ok(server.includes("intellect.wallAwareWaypoint("),
  "movement controllers should be able to route around walls at higher intellect");
assert.ok(server.includes("intellect.adaptControllerOutput("),
  "controller outputs should pass through the shared intellect behavior layer");
assert.ok(server.includes('Number(my.intellect) < 0'),
  "negative intellect should invert the combined controller intent once instead of double-inverting stacked controllers");
assert.ok(server.includes("this.getIntellectProjectileIntercept(tracking)"),
  "combat controllers should be able to prioritize shooting down imminent hostile projectiles");
assert.ok(server.includes("intellect.strategyProfile("),
  "target selection should use stable strategy profiles at high intellect");
assert.ok(server.includes("this._lastRepelTarget"),
  "the repel controller should anticipate target movement at higher intellect");
assert.ok(server.includes("const returnThreshold = value > 1"),
  "boomerang controllers should adapt their return timing at higher intellect");
assert.ok(server.includes("const weight = 0.15 + 0.8 * intellect.progression(value, 8, 4096)"),
  "motion turrets should predict changes in their mount's movement at higher intellect");
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
