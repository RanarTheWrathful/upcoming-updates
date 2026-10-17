"use strict";

const assert = require("assert");
const definitions = require("../lib/definitions");

// A NaN in a definition silently poisons calculations after inheritance. Infinity
// is allowed for a small set of deliberate game-specific values; NaN is never a
// useful definition value.
const seen = new WeakSet();
const nanPaths = [];
const undefinedParents = [];
const invalidSpecialEffects = [];
function inspect(value, path = "definitions") {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Object.prototype.hasOwnProperty.call(value, "PARENT")) {
    const parents = value.PARENT;
    const entries = Array.isArray(parents) ? parents : [parents];
    entries.forEach((parent, index) => {
      if (parent == null || (typeof parent !== "object" && typeof parent !== "function")) {
        undefinedParents.push(`${path}.PARENT[${index}]`);
      }
    });
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (key === "SPECIAL_EFFECT" && (!Array.isArray(child) || child.some((effect) => typeof effect !== "string"))) {
      invalidSpecialEffects.push(childPath);
    }
    if (typeof child === "number" && Number.isNaN(child)) {
      nanPaths.push(childPath);
    } else if (child && typeof child === "object") {
      inspect(child, childPath);
    }
  }
}
inspect(definitions);
assert.deepStrictEqual(nanPaths, [], `Definition values must not be NaN:\n${nanPaths.join("\n")}`);
assert.deepStrictEqual(
  undefinedParents,
  [],
  `Definitions must not contain missing PARENT entries:\n${undefinedParents.join("\n")}`
);
assert.deepStrictEqual(
  invalidSpecialEffects,
  [],
  `SPECIAL_EFFECT values must be arrays of strings:\n${invalidSpecialEffects.join("\n")}`
);

assert.strictEqual(definitions.assort.BODY.DAMAGE, 2.8);
assert(Math.abs(definitions.assort.BODY.PENETRATION - 1.925) < 1e-9);
assert.strictEqual(definitions.assort.BODY.RELOAD, 1.2);
assert.strictEqual(definitions.autoBasicTurret.BODY?.RELOAD ?? definitions.autoBasicTurret.RELOAD, 0.55);
console.log(`Definition audit passed (${Object.keys(definitions).length} exports checked).`);
