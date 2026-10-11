"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const definitionsPath = path.join(__dirname, "..", "lib", "definitions.js");
const source = fs.readFileSync(definitionsPath, "utf8");
const definitions = require(definitionsPath);

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function walkAndFindInvalidValues(root, rootName) {
  const visited = new WeakSet();
  const errors = [];
  function visit(value, location) {
    if (value === undefined) {
      errors.push(`${location} is undefined`);
      return;
    }
    if (typeof value === "number" && Number.isNaN(value)) {
      errors.push(`${location} is NaN`);
      return;
    }
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    for (const [key, child] of Object.entries(value)) visit(child, `${location}.${key}`);
  }
  visit(root, rootName);
  return errors;
}

function run() {
  assert(Object.keys(definitions).length > 2000, "expected a complete definitions export table");

  // Verify every export reference in executable source has a declaration and no class is referenced too early.
  const code = stripComments(source);
  const declarations = new Map();
  const declarationPattern = /exports\.\s*([A-Za-z_$][\w$]*)\s*=/g;
  let match;
  while ((match = declarationPattern.exec(code))) {
    if (!declarations.has(match[1])) declarations.set(match[1], match.index);
  }
  const referencePattern = /exports\.\s*([A-Za-z_$][\w$]*)/g;
  while ((match = referencePattern.exec(code))) {
    const name = match[1];
    assert(Object.prototype.hasOwnProperty.call(definitions, name), `undefined export reference: ${name}`);
    const declaredAt = declarations.get(name);
    assert(Number.isInteger(declaredAt), `no declaration found for export ${name}`);
    assert(declaredAt <= match.index, `export ${name} is referenced before its declaration`);
  }

  const invalidValues = [];
  for (const [name, definition] of Object.entries(definitions)) {
    invalidValues.push(...walkAndFindInvalidValues(definition, name));
    if (definition && typeof definition === "object" && Object.prototype.hasOwnProperty.call(definition, "DANGER")) {
      assert(!(typeof definition.DANGER === "number" && Number.isNaN(definition.DANGER)), `${name}.DANGER must not be NaN`);
    }
  }
  assert.deepStrictEqual(invalidValues, [], `definition graph contains invalid values:\n${invalidValues.slice(0, 25).join("\n")}`);

  const badTerms = ["PARET:", "SHEILD:", "base.ACCELERATION", "CONTROLERS:"];
  for (const term of badTerms) assert(!code.includes(term), `definitions.js still contains typo or invalid base field ${term}`);

  assert.strictEqual(definitions.Vbaltyla.GUNS[2].PROPERTIES.TYPE, definitions.nulltype, "Vbaltyla's third gun must resolve the nulltype class");
  assert(
    Array.isArray(definitions.zombieRifle.CONTROLLERS) && definitions.zombieRifle.CONTROLLERS.includes("nearestDifferentMaster"),
    "zombie variants must use the engine-recognized CONTROLLERS property"
  );
  assert(definitions.legionaryNesterHelperBody.TURRETS.every((turret) => Array.isArray(turret.TYPE) && turret.TYPE[0]), "Legionary Nester turret classes must resolve");
  assert(Number.isFinite(definitions.roguestrapnelgunTurret2.GUNS[3].PROPERTIES.SHOOT_SETTINGS.reload), "rogue shrapnel turret's stats must be finite");
  for (const name of ["autobasic", "autoPolyFear", "ragnaroksmashbullet", "eggAutoSentry", "trianglePounderSentry", "triangleTrapperSentry", "shinyTriangleBarricadeSentry", "shinyTriangleArtillerySentry"]) {
    assert(Number.isFinite(definitions[name].DANGER), `${name}.DANGER must be finite`);
  }
  for (const name of ["boomerang", "missile", "autoBullet", "twisterMissile", "conductminion", "swarmeggsenti1minion"]) {
    assert(definitions[name], `expected definition ${name}`);
  }

  console.log(`Definitions audit passed (${Object.keys(definitions).length} exported definitions checked).`);
}

run();
