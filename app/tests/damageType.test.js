"use strict";
const assert = require("assert");
const damageType = require("../lib/damageType/damageType");
const Class = require("../lib/definitions");
const fs = require("fs");
const path = require("path");
const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

const owner = { damage: 9.5 };
const source = { damage: 2, master: owner, damageType: "velocity" };

assert.strictEqual(damageType.normalizeDamageType(undefined), "velocity");
assert.strictEqual(damageType.normalizeDamageType("unknown-mode"), "velocity");
assert.strictEqual(damageType.velocityMultiplier(0), 0,
  "stationary velocity-mode entities should retain the original zero-speed multiplier");
assert.strictEqual(damageType.velocityMultiplier(0.5), 0.5,
  "slow velocity-mode entities should retain the original reduced multiplier");
assert.strictEqual(damageType.velocityMultiplier(2), 2,
  "fast velocity-mode entities should retain the original 2x cap");
assert.strictEqual(damageType.resolveDamage(source, 2).damage, 4,
  "velocity mode should preserve the existing speed multiplier");
for (const speed of [0, 0.1, 0.5, 1, 2, 10]) {
  assert.strictEqual(damageType.resolveDamage({ ...source, damageType: "collision" }, speed).damage, 2,
    `collision mode must remain constant at speed factor ${speed}`);
  assert.strictEqual(damageType.resolveDamage({ ...source, damageType: "impact" }, speed).damage, 2,
    `impact mode must remain constant at speed factor ${speed}`);
  assert.strictEqual(damageType.resolveDamage({ ...source, damageType: "collisionMaster" }, speed).damage, 9.5,
    `collisionMaster mode must remain constant at speed factor ${speed}`);
}
assert.strictEqual(damageType.resolveDamage({ ...source, damageType: "collisionMaster" }, 2).damage, 9.5,
  "collisionMaster should use the master's body damage without speed scaling");
assert.strictEqual(damageType.resolveDamage({ ...source, damageType: "velocityMaster" }, 2).damage, 19,
  "velocityMaster should use master body damage and retain velocity scaling");
assert.strictEqual(damageType.resolveDamage({ ...source, damageType: "impact" }, 2).damage, 2,
  "impact should use collision-style damage without speed scaling");
assert.strictEqual(damageType.impactDamageMultiplier({ damageType: "impact" }, 0), 1,
  "impact should deal full damage on the first collision iteration");
assert.strictEqual(damageType.impactDamageMultiplier({ damageType: "impact" }, 1), 0.5,
  "impact should deal half damage on the second consecutive collision iteration");
assert.strictEqual(damageType.impactDamageMultiplier({ damageType: "impact" }, 2), 0.25,
  "impact should halve again on the third consecutive collision iteration");
assert.strictEqual(damageType.impactDamageMultiplier({ damageType: "impact" }, 3), 0.125,
  "impact should continue diminishing while contact persists");
assert.strictEqual(damageType.impactDamageMultiplier({ damageType: "impact" }, 8, true), 0,
  "duplicate processing in one collision iteration should not deal impact damage twice");
assert.strictEqual(damageType.isImpactDamage({ damageType: "impact" }), true);
assert.strictEqual(damageType.isImpactDamage({ damageType: "collision" }), false);
assert.strictEqual(damageType.usesVelocityDamageEffects("velocity"), true,
  "default velocity damage should retain the existing kinetic collision effects");
assert.strictEqual(damageType.usesVelocityDamageEffects("velocityMaster"), true,
  "velocityMaster should retain the existing kinetic collision effects");
for (const type of ["collision", "collisionMaster", "impact"]) {
  assert.strictEqual(damageType.usesVelocityDamageEffects(type), false,
    `${type} must bypass every velocity-dependent damage effect, not only the speed multiplier`);
}
assert.strictEqual(damageType.impactDamageMultiplier({ damageType: "collision" }, 8), 1,
  "collision mode should continue dealing normal damage while contact persists");
assert.strictEqual(damageType.collisionPairKey({ id: 5 }, { id: 2 }), "2:5");
assert.strictEqual(Class.genericEntity.DAMAGE_TYPE, "velocity");
assert.strictEqual(Class.trap.DAMAGE_TYPE, "collision");
assert.match(server, /set\.DAMAGE_TYPE != null/);
assert.match(server, /contactDamageTracker\.getImpactCount\(damagePairKey\)/);
assert.match(server, /contactDamageTracker\.record\(/);
assert.match(server, /contactDamageTracker\.beginIteration\(\)/);
assert.match(server, /contactDamageTracker\.endIteration\(\)/);
assert.match(server, /!damagePairAlreadyProcessed/);
assert.match(server, /impactDamageMultiplier\(/);
assert.match(server, /usesVelocityDamageEffects\(my\)/);
assert.match(server, /usesVelocityDamageEffects\(n\)/);
assert.match(server, /!my\.invuln && !n\.invuln/);
assert.match(server, /resolvedMyDamage\s*=\s*damageType\.resolveDamage\(my, speedFactor\._me/);
// Contact tracking must produce full, half, quarter, etc. while a pair stays
// in contact, then reset to full damage after a complete pass without contact.
const tracker = new damageType.ContactDamageTracker();
const pairKey = damageType.collisionPairKey({ id: 11 }, { id: 29 });
function impactTick(contact) {
  tracker.beginIteration();
  let multiplier = null;
  if (contact && !tracker.hasProcessed(pairKey)) {
    const priorCount = tracker.getImpactCount(pairKey);
    multiplier = damageType.impactDamageMultiplier("impact", priorCount);
    tracker.record(pairKey, true);
    assert.strictEqual(tracker.hasProcessed(pairKey), true,
      "the same pair must be marked processed after its first damage pass");
  }
  tracker.endIteration();
  return multiplier;
}
assert.strictEqual(impactTick(true), 1, "first continuous-contact hit should be full strength");
assert.strictEqual(impactTick(true), 0.5, "second continuous-contact hit should be half strength");
assert.strictEqual(impactTick(true), 0.25, "third continuous-contact hit should be quarter strength");
assert.strictEqual(impactTick(true), 0.125, "fourth continuous-contact hit should be one eighth strength");
assert.strictEqual(impactTick(false), null, "a missing pair should clear its contact history");
assert.strictEqual(impactTick(true), 1, "recontact after separation should restart at full strength");

// Speed-independent modes are calibrated to the velocity mode at nominal
// speed (speedFactor 1), not to the current speed of the collision.
for (const type of ["collision", "collisionMaster", "impact"]) {
  const staticResult = damageType.resolveDamage({ ...source, damageType: type }, 1);
  const nominalVelocityResult = damageType.resolveDamage({ ...source, damageType: type === "collisionMaster" ? "velocityMaster" : "velocity" }, 1);
  assert.strictEqual(staticResult.multiplier, damageType.STATIC_DAMAGE_BASELINE);
  assert.strictEqual(staticResult.damage, nominalVelocityResult.damage,
    `${type} should retain nominal-speed velocity damage as its fixed baseline`);
}

// A custom-mode pair is guarded once per collision iteration, independently
// of either entity's movement speed or the number of duplicate resolution paths.
tracker.beginIteration();
assert.strictEqual(tracker.hasProcessed(pairKey), false);
tracker.record(pairKey, false);
assert.strictEqual(tracker.hasProcessed(pairKey), true);
tracker.record(pairKey, false);
assert.strictEqual(tracker.hasProcessed(pairKey), true,
  "duplicate processing must remain blocked for the rest of the iteration");
tracker.endIteration();
tracker.beginIteration();
assert.strictEqual(tracker.hasProcessed(pairKey), false,
  "the pair may collide again on the next physics iteration");
tracker.endIteration();

assert.strictEqual(damageType.isSpeedIndependentDamage("collision"), true);
assert.strictEqual(damageType.isSpeedIndependentDamage("collisionMaster"), true);
assert.strictEqual(damageType.isSpeedIndependentDamage("impact"), true);
assert.strictEqual(damageType.isSpeedIndependentDamage("velocity"), false);

console.log("Damage type behavior tests passed.");
