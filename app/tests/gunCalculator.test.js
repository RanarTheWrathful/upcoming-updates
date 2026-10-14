"use strict";

const assert = require("assert");
const { normalizeCalculator, hasChildCapacity } = require("../lib/gunCalculator");
const definitions = require("../lib/definitions");

assert.strictEqual(normalizeCalculator(7), "necro", "numeric Necro ID must normalize to the name consumed by runtime checks");
assert.strictEqual(normalizeCalculator(4), "fixed reload", "numeric fixed-reload ID must normalize correctly");
assert.strictEqual(normalizeCalculator(2), "drone", "numeric drone ID must normalize correctly");
assert.strictEqual(normalizeCalculator(undefined), "default", "missing calculators must retain default behavior");
assert.strictEqual(normalizeCalculator("fixedReload"), "fixed reload", "legacy string alias should remain supported");

const necroProperties = definitions.necromancer.GUNS[0].PROPERTIES;
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

console.log("Gun calculator tests passed");
