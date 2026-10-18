"use strict";

const assert = require("assert");
const { normalizeSpecialEffects, hasSpecialEffect, addSpecialEffect, removeSpecialEffect } = require("../lib/specialEffects");

assert.deepStrictEqual(normalizeSpecialEffects("push"), ["push"]);
assert.deepStrictEqual(normalizeSpecialEffects(["none", "push", "push", "heal"]), ["push", "heal"]);
assert.deepStrictEqual(normalizeSpecialEffects(null), []);
const entity = { specialEffect: ["push", "heal"] };
assert.strictEqual(hasSpecialEffect(entity, "push"), true);
assert.strictEqual(hasSpecialEffect(entity, "dieWall"), false);
assert.deepStrictEqual(addSpecialEffect(entity, "dieWall"), ["push", "heal", "dieWall"]);
assert.deepStrictEqual(addSpecialEffect(entity, "push"), ["push", "heal", "dieWall"]);
assert.deepStrictEqual(removeSpecialEffect(entity, "push"), ["heal", "dieWall"]);
assert.deepStrictEqual(removeSpecialEffect(entity, "heal"), ["dieWall"]);
assert.deepStrictEqual(removeSpecialEffect(entity, "dieWall"), ["none"]);
console.log("Special effect array tests passed.");
