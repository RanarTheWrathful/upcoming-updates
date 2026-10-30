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
assert.strictEqual(damageType.resolveDamage({ ...source, damageType: "collision" }, 2).damage, 2,
  "collision mode should ignore projectile speed");
assert.strictEqual(damageType.resolveDamage({ ...source, damageType: "collisionMaster" }, 2).damage, 9.5,
  "collisionMaster should use the master's body damage without speed scaling");
assert.strictEqual(damageType.resolveDamage({ ...source, damageType: "velocityMaster" }, 2).damage, 19,
  "velocityMaster should use master body damage and retain velocity scaling");
assert.strictEqual(damageType.resolveDamage({ ...source, damageType: "impact" }, 2).damage, 2,
  "impact should use collision-style damage without speed scaling");
assert.strictEqual(damageType.shouldApplyDamage({ damageType: "impact" }, false), true);
assert.strictEqual(damageType.shouldApplyDamage({ damageType: "impact" }, true), false,
  "impact damage should only be applied on contact entry");
assert.strictEqual(damageType.isImpactDamage({ damageType: "impact" }), true);
assert.strictEqual(damageType.isImpactDamage({ damageType: "collision" }), false);
assert.strictEqual(damageType.shouldApplyDamage({ damageType: "collision" }, true), true,
  "collision mode should continue dealing damage while contact persists");
assert.strictEqual(damageType.collisionPairKey({ id: 5 }, { id: 2 }), "2:5");
assert.strictEqual(Class.genericEntity.DAMAGE_TYPE, "velocity");
assert.strictEqual(Class.trap.DAMAGE_TYPE, "collision");
assert.match(server, /set\.DAMAGE_TYPE != null/);
assert.match(server, /previousImpactContacts\.has\(impactPairKey\)/);
assert.match(server, /!my\.invuln && !n\.invuln/);
assert.match(server, /resolvedMyDamage\s*=\s*damageType\.resolveDamage\(my, speedFactor\._me/);
console.log("Damage type behavior tests passed.");
