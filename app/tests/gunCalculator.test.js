"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const droneInfection = require("../lib/droneInfection");
const gunCalculator = require("../lib/gunCalculator");
const {
  MAX_DRONE_COUNT_STAT_NAMES,
  normalizeCalculator,
  getMaxDroneCountMultiplier,
  hasChildCapacity,
} = gunCalculator;
const definitions = require("../lib/definitions");

assert.strictEqual(normalizeCalculator(7), "necro", "numeric Necro ID must normalize to the name consumed by runtime checks");
assert.strictEqual(normalizeCalculator(4), "fixed reload", "numeric fixed-reload ID must normalize correctly");
assert.strictEqual(normalizeCalculator(2), "drone", "numeric drone ID must normalize correctly");
assert.strictEqual(normalizeCalculator(undefined), "default", "missing calculators must retain default behavior");
assert.strictEqual(normalizeCalculator("fixedReload"), "fixed reload", "legacy string alias should remain supported");

const necroProperties = definitions.necromancer.GUNS[0].PROPERTIES;
assert.strictEqual(definitions.necromancer.STAT_NAMES, MAX_DRONE_COUNT_STAT_NAMES,
  "Necromancer must use the Max Drone Count stat-name variant");
assert.strictEqual(necroProperties.STAT_CALCULATOR, 7, "Necromancer's definition uses the numeric Necro calculator ID");
assert.strictEqual(normalizeCalculator(necroProperties.STAT_CALCULATOR), "necro");

// With the Reload-slot variant maxed, Skill.rld is 0.5. A local cap of five
// must therefore permit ten children, not stop at the unscaled count of five.
assert.strictEqual(hasChildCapacity({
  calculator: "necro", skill: { rld: 0.5 }, gunLimit: 5, gunChildren: 9,
}), true, "Necro guns should retain capacity until the scaled cap is reached");
assert.strictEqual(hasChildCapacity({
  calculator: "necro", skill: { rld: 0.5 }, gunLimit: 5, gunChildren: 10,
}), false, "Necro guns should stop exactly at the expanded cap");
assert.strictEqual(hasChildCapacity({
  calculator: "necro", skill: { rld: 1 }, gunLimit: 5, gunChildren: 5,
}), false, "unupgraded Necro guns should retain their base cap");
assert.strictEqual(hasChildCapacity({
  calculator: "drone", skill: { rld: 0.5 }, gunLimit: 5, gunChildren: 5,
}), false, "other calculator types must not receive Necro's cap bonus");
assert.strictEqual(hasChildCapacity({
  calculator: "necro", skill: { rld: 0.5 }, bodyLimit: 40, bodyChildren: 79,
}), true, "body-wide cap should receive the same Necro multiplier");
assert.strictEqual(hasChildCapacity({
  calculator: "necro", skill: { rld: 0.5 }, bodyLimit: 40, bodyChildren: 80,
}), false, "body-wide cap should stop at its expanded boundary");


// The actual Max Drone Count class variant (STAT_NAMES === 3) must work
// regardless of the gun's STAT_CALCULATOR ID.
const maxedDroneCountSkill = {
  raw: [10, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  caps: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  rld: 0.5,
};
assert.strictEqual(getMaxDroneCountMultiplier({
  raw: [0], caps: [10],
}), 1, "zero Max Drone Count points should retain the base capacity");
assert.strictEqual(getMaxDroneCountMultiplier({
  raw: [5], caps: [10],
}), 1.5, "half-investment should increase the limit proportionally");
assert.strictEqual(getMaxDroneCountMultiplier(maxedDroneCountSkill), 2,
  "maxing the variant should double the configured limit");
assert.strictEqual(hasChildCapacity({
  calculator: "drone",
  skill: maxedDroneCountSkill,
  gunLimit: 5,
  gunChildren: 9,
  bodyLimit: 40,
  bodyChildren: 9,
  maxDroneCountVariant: true,
  producesDrones: true,
}), true, "the stat variant must raise local cap even if the gun calculator is not necro");
assert.strictEqual(hasChildCapacity({
  calculator: "drone",
  skill: maxedDroneCountSkill,
  gunLimit: 5,
  gunChildren: 10,
  bodyLimit: 40,
  bodyChildren: 10,
  maxDroneCountVariant: true,
  producesDrones: true,
}), false, "maxed local cap should stop at exactly twice the base limit");
assert.strictEqual(hasChildCapacity({
  calculator: "drone",
  skill: maxedDroneCountSkill,
  gunLimit: 50,
  gunChildren: 2,
  bodyLimit: 10,
  bodyChildren: 20,
  maxDroneCountVariant: true,
  producesDrones: true,
}), false, "tank-wide drone cap must still apply when a gun has its own cap");
assert.strictEqual(hasChildCapacity({
  calculator: "drone",
  skill: maxedDroneCountSkill,
  gunLimit: 5,
  gunChildren: 5,
  bodyLimit: 40,
  bodyChildren: 5,
  maxDroneCountVariant: false,
  producesDrones: true,
}), false, "ordinary Reload stat must not boost a non-variant drone gun's cap");
assert.strictEqual(hasChildCapacity({
  calculator: "drone",
  skill: maxedDroneCountSkill,
  gunLimit: 5,
  gunChildren: 5,
  maxDroneCountVariant: true,
  producesDrones: false,
}), false, "Max Drone Count must not increase non-drone projectile caps");



// Load the real Gun class without booting the entire game server. This verifies
// that runtime capacity checks use the tank's STAT_NAMES variant rather than
// depending solely on a gun's STAT_CALCULATOR.
const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const gunStart = serverSource.indexOf("class Gun {");
const gunEnd = serverSource.indexOf("\nclass KeyManager {", gunStart);
assert(gunStart !== -1 && gunEnd > gunStart, "Gun class source should be available");
const gunContext = {
  module: { exports: {} },
  exports: {},
  droneInfection,
  gunCalculator,
  util: { remove: (array, index) => array.splice(index, 1) },
};
vm.runInNewContext(
  serverSource.slice(gunStart, gunEnd) + "\nmodule.exports = { Gun };\n",
  gunContext,
  { filename: path.join(__dirname, "..", "server.js") }
);
const { Gun } = gunContext.module.exports;

// Exercise the runtime method to verify it detects STAT_NAMES on the owning
// tank and counts all owned drones for the shared tank-wide limit.
const runtimeOwner = {
  type: "tank", maxChildren: 40,
  settings: { skillNames: MAX_DRONE_COUNT_STAT_NAMES },
  master: null, source: null,
  guns: [], turrets: [], children: [],
  possiblyChildren: new Set(),
};
runtimeOwner.master = runtimeOwner;
runtimeOwner.source = runtimeOwner;
for (let i = 0; i < 9; i++) runtimeOwner.possiblyChildren.add({ type: "drone" });
const runtimeGun = Object.create(Gun.prototype);
Object.assign(runtimeGun, {
  body: runtimeOwner,
  calculator: "drone", // Should still work because the tank uses STAT_NAMES 3.
  spawnedEntityType: "drone",
  countsOwnKids: 5,
  children: Array.from({ length: 9 }, () => ({ type: "drone" })),
});
assert.strictEqual(runtimeGun.hasChildCapacity(maxedDroneCountSkill), true,
  "real Gun method should permit the expanded cap from the tank's stat variant");
runtimeGun.children.push({ type: "drone" });
runtimeOwner.possiblyChildren.add({ type: "drone" });
assert.strictEqual(runtimeGun.hasChildCapacity(maxedDroneCountSkill), false,
  "real Gun method should reject a gun at its expanded local limit");
runtimeGun.children = [{ type: "drone" }];
runtimeOwner.maxChildren = 10;
for (let i = 0; i < 11; i++) runtimeOwner.possiblyChildren.add({ type: "minion" });
assert.strictEqual(runtimeGun.hasChildCapacity(maxedDroneCountSkill), false,
  "real Gun method must enforce tank-wide drone/minion limit even when local capacity remains");

console.log("Gun calculator tests passed");
