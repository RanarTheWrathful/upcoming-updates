"use strict";

const assert = require("assert");
const { normalizeStatCalculator, isNecroCalculator } = require("../lib/gunCalculator");

assert.strictEqual(normalizeStatCalculator(0), "default");
assert.strictEqual(normalizeStatCalculator(2), "drone");
assert.strictEqual(normalizeStatCalculator(4), "fixed reload");
assert.strictEqual(normalizeStatCalculator(7), "necro");
assert.strictEqual(normalizeStatCalculator("necro"), "necro");
assert.strictEqual(normalizeStatCalculator("fixed reload"), "fixed reload");
assert.strictEqual(isNecroCalculator(7), true);
assert.strictEqual(isNecroCalculator("necro"), true);
assert.strictEqual(isNecroCalculator(2), false);

console.log("Gun calculator normalization tests passed");
