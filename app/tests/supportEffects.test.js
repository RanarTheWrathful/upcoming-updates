"use strict";

const assert = require("assert");
const support = require("../lib/supportEffects");

const source = (properties = {}) => ({ team: 1, repairEffect: true, ...properties });
const target = (properties = {}) => ({ team: 2, type: "tank", ...properties });
const action = (s, t) => support.resolveSupportInteraction(s, t);

assert.deepStrictEqual(action(source(), target({ isProjectile: true })), {
  action: "damage", kind: "repair", multiplier: 2,
}, "repair effects should deal double damage to enemy projectiles");
assert.strictEqual(action(source(), target({ team: -3, type: "tank" })).multiplier, 2,
  "repair effects should deal double damage to team -3 combat entities");
assert.strictEqual(action(source(), target({ isEnemy: true, team: -3 })).multiplier, 2,
  "the team -3 rule includes enemy entities");
assert.strictEqual(action(source(), target({ isDominator: true })).multiplier, 25,
  "repair effects should deal 25x damage to dominators");
assert.strictEqual(action(source(), target({ isWall: true })).multiplier, 10,
  "repair effects should deal 10x damage to walls");
assert.strictEqual(action(source(), target({ isGate: true })).multiplier, 10,
  "repair effects should deal 10x damage to gates");
assert.strictEqual(action(source(), target({ type: "food" })).multiplier, 1,
  "repair effects should deal normal damage to polygons");
assert.strictEqual(action(source(), target({ type: "trap" })).action, "none",
  "unspecified enemy entities should be immune to repair-effect damage");
assert.strictEqual(action(source(), target({ type: "tank", healEffect: true })).multiplier, 1,
  "enemy combat entities carrying support effects should take normal damage");
assert.strictEqual(action(source({ type: "tank" }), target({ type: "tank" })).multiplier, 1,
  "a combat entity that itself carries a support effect should deal normal damage to ordinary enemy tanks");
assert.strictEqual(action(source({ team: -3 }), target({ team: -3, type: "tank" })).action, "heal",
  "repair effects should heal team -3 allies instead of damaging them");
assert.strictEqual(action(source(), target({ team: 1, type: "tank" })).action, "heal",
  "repair effects should restore allied combat entities as well as structures");
assert.strictEqual(action(source({ team: 1 }), target({ team: 1, isProjectile: true })).action, "heal",
  "repair effects should repair allied projectiles");
assert.strictEqual(action(source({ type: "atmosphere" }), target({ isProjectile: true })).multiplier, 0.2,
  "repair auras should deal only 10% of their usual projectile damage");

const healer = (properties = {}) => ({ team: 1, healEffect: true, ...properties });
assert.strictEqual(action(healer(), target({ isProjectile: true })).multiplier, 1,
  "heal effects should deal normal damage to enemy projectiles");
assert.strictEqual(action(healer(), target({ team: -4, type: "tank" })).multiplier, 2,
  "heal effects should deal double damage to team -4 combat entities");
assert.strictEqual(action(healer(), target({ type: "food" })).multiplier, 1,
  "heal effects should deal normal damage to polygons");
assert.strictEqual(action(healer(), target({ type: "trap" })).action, "none",
  "heal effects should deal no damage to unspecified enemy entities");
assert.strictEqual(action(healer(), target({ team: 1, type: "tank" })).action, "heal",
  "heal effects should heal allied tanks");
assert.strictEqual(action(healer(), target({ team: 1, type: "food" })).action, "none",
  "heal effects should not heal allied polygons");
assert.strictEqual(action(healer({ team: -4 }), target({ team: -4, type: "tank" })).action, "heal",
  "team -4 heal effects should heal their allies rather than damaging them");
assert.strictEqual(action(healer(), target({ type: "tank", repairEffect: true })).multiplier, 1,
  "enemy repair-bearing tanks should take ordinary damage from heal effects");

function makeEntity(properties = {}) {
  return {
    team: 1,
    type: "tank",
    damageRecieved: 0,
    health: { amount: 50, max: 100 },
    shield: { amount: 10, max: 20 },
    ...properties,
  };
}
const repairAura = makeEntity({ type: "atmosphere", repairEffect: true, team: 1 });
const enemyProjectile = makeEntity({ type: "bullet", isProjectile: true, team: 2, health: { amount: 100, max: 100 }, shield: { amount: 0, max: 0 } });
support.applyInteraction(repairAura, enemyProjectile, 10, 0);
assert.strictEqual(enemyProjectile.damageRecieved, 2,
  "repair aura projectile damage should be reduced to 10% of the 2x baseline");

const repairBeam = makeEntity({ type: "bullet", isProjectile: true, repairEffect: true, team: 1, damageRecieved: 0 });
const alliedWall = makeEntity({ team: 1, isWall: true, health: { amount: 50, max: 100 }, shield: { amount: 10, max: 20 } });
support.applyInteraction(repairBeam, alliedWall, 10, 3);
assert.strictEqual(alliedWall.shield.amount, 12,
  "repair should restore allied shields first");
assert.strictEqual(alliedWall.health.amount, 50,
  "repair should not switch to health while shields were missing");
assert.strictEqual(repairBeam.damageRecieved, 3,
  "a successful repair projectile should take the incoming collision damage and be consumed");

const healBeam = makeEntity({ type: "bullet", isProjectile: true, healEffect: true, team: 1, damageRecieved: 0 });
const alliedTank = makeEntity({ team: 1, health: { amount: 50, max: 100 }, shield: { amount: 20, max: 20 } });
support.applyInteraction(healBeam, alliedTank, 10, 2);
assert.strictEqual(alliedTank.health.amount, 60,
  "healing projectiles should heal allied tank health using their collision damage");
assert.strictEqual(healBeam.damageRecieved, 2,
  "a successful heal projectile should be consumed");

const noDamageAura = makeEntity({ type: "atmosphere", healEffect: true, team: 1 });
const enemyTrap = makeEntity({ type: "trap", team: 2 });
support.applyInteraction(noDamageAura, enemyTrap, 50, 0);
assert.strictEqual(enemyTrap.damageRecieved, 0,
  "unsupported target types must receive no heal/repair effect damage");



// Repair effects must restore resources instead of merely returning a heal action.
const repairHealthBeam = makeEntity({
  type: "bullet", isProjectile: true, repairEffect: true, team: 1, damageRecieved: 0,
});
const alliedTankNeedingRepair = makeEntity({
  team: 1, isWall: true, health: { amount: 40, max: 100 }, shield: { amount: 20, max: 20 },
});
support.applyInteraction(repairHealthBeam, alliedTankNeedingRepair, 10, 4);
assert.strictEqual(alliedTankNeedingRepair.health.amount, 45,
  "repair beams should restore allied health when shields are full");
assert.strictEqual(repairHealthBeam.damageRecieved, 4,
  "repair beams should be consumed after restoring health");

const repairedAllyTank = makeEntity({
  team: 1, type: "tank", health: { amount: 30, max: 100 }, shield: { amount: 20, max: 20 },
});
support.applyInteraction(repairHealthBeam, repairedAllyTank, 10, 0);
assert.strictEqual(repairedAllyTank.health.amount, 35,
  "repair beams should restore allied tank health, not only walls and gates");

const dualSupport = makeEntity({
  type: "tank", healEffect: true, repairEffect: true, team: 1,
});
const dualSupportWall = makeEntity({
  type: "tank", team: 1, isWall: true,
  health: { amount: 40, max: 100 }, shield: { amount: 20, max: 20 },
});
assert.strictEqual(support.resolveSupportInteraction(dualSupport, dualSupportWall).kind, "repair",
  "combined heal/repair sources should fall back to repair for structures");
support.applyInteraction(dualSupport, dualSupportWall, 10, 0);
assert.strictEqual(dualSupportWall.health.amount, 42.5,
  "combined heal/repair auras should actually repair friendly structures");

const repairAuraSource = makeEntity({ type: "atmosphere", repairEffect: true, team: 1 });
const alliedTankNeedingAuraRepair = makeEntity({
  team: 1, isWall: true, health: { amount: 40, max: 100 }, shield: { amount: 20, max: 20 },
});
support.applyInteraction(repairAuraSource, alliedTankNeedingAuraRepair, 10, 0);
assert.strictEqual(alliedTankNeedingAuraRepair.health.amount, 42.5,
  "repair auras should restore health at the passive repair rate");

const healShieldBeam = makeEntity({
  type: "bullet", isProjectile: true, healEffect: true, team: 1, damageRecieved: 0,
});
const alliedTankNeedingShieldHeal = makeEntity({
  team: 1, health: { amount: 100, max: 100 }, shield: { amount: 10, max: 20 },
});
support.applyInteraction(healShieldBeam, alliedTankNeedingShieldHeal, 10, 2);
assert.strictEqual(alliedTankNeedingShieldHeal.shield.amount, 12,
  "healing beams should restore shields when health is full");
assert.strictEqual(healShieldBeam.damageRecieved, 2,
  "healing beams should be consumed after restoring shields");

console.log("Support effect tests passed.");
