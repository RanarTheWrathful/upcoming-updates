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
assert.ok(server.includes("const recoverStuck = value >= 512 && this.stuckChecks >= 5"),
  "pathfinder should only skip ahead after repeated stuck evidence at the specified threshold");
console.log("INTELLECT controller-integration checks passed.");
