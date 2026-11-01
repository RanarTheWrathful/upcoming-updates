"use strict";

const assert = require("assert");
const { hasSpecialEffect, hasAnySpecialEffect } = require("../lib/specialEffects/specialEffects");

assert.strictEqual(hasSpecialEffect({ specialEffect: "push" }, "push"), true);
assert.strictEqual(hasSpecialEffect({ specialEffect: ["none", "push"] }, "push"), true);
assert.strictEqual(hasSpecialEffect({ specialEffect: ["none", "push"] }, "none"), false);
assert.strictEqual(hasSpecialEffect({ specialEffect: ["none"] }, "push"), false);
assert.strictEqual(hasSpecialEffect({ specialEffect: "none" }, "none"), true);
assert.strictEqual(hasSpecialEffect(null, "push"), false);
assert.strictEqual(hasAnySpecialEffect({ specialEffect: "none" }), false);
assert.strictEqual(hasAnySpecialEffect({ specialEffect: ["none", "none"] }), false);
assert.strictEqual(hasAnySpecialEffect({ specialEffect: ["none", "push"] }), true);
assert.strictEqual(hasAnySpecialEffect({ specialEffect: "push" }), true);
assert.strictEqual(hasAnySpecialEffect({}), false);

console.log("Special-effect fast-path tests passed.");
