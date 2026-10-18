"use strict";

const assert = require("assert");
const planner = require("../lib/siegeWavePlanner");
const definitions = require("../lib/definitions");

const costTiers = [
  { cost: 1, enemies: ["eggCrasher", "thrasher"] },
  { cost: 3, enemies: ["glitch"] },
  { cost: 5, enemies: ["anomaly"] },
];
const sampleThemes = [
  { id: "crashers", label: "Crashers", enemies: ["eggCrasher", "glitch"] },
  { id: "anomalies", label: "Anomalies", enemies: ["thrasher", "anomaly"] },
  { id: "empty", label: "Empty", enemies: ["notARealSiegeClass"] },
];
const catalog = planner.createEnemyCatalog(costTiers, sampleThemes);
assert.strictEqual(catalog.length, 2, "themes without costed enemies are omitted");
assert.strictEqual(catalog[0].enemies.find((enemy) => enemy.name === "glitch").cost, 3);
assert.strictEqual(catalog[1].enemies.find((enemy) => enemy.name === "anomaly").cost, 5);

// The random theme count includes both endpoints: one theme and all themes.
{
  let calls = 0;
  const oneTheme = planner.chooseRandomThemes(catalog, () => calls++ === 0 ? 0 : 0.5);
  assert.strictEqual(oneTheme.length, 1);
}
{
  let calls = 0;
  const allThemes = planner.chooseRandomThemes(catalog, () => calls++ === 0 ? 0.999 : 0.5);
  assert.strictEqual(allThemes.length, catalog.length);
}

// A theme selection is always between one and all themes, with no repeats.
for (const initialRandom of [0, 0.01, 0.25, 0.5, 0.75, 0.99]) {
  let calls = 0;
  const selected = planner.chooseRandomThemes(catalog, () => {
    // Keep the first value for the count; use a stable value for shuffling.
    return calls++ === 0 ? initialRandom : 0.37;
  });
  assert.ok(selected.length >= 1 && selected.length <= catalog.length);
  assert.strictEqual(new Set(selected.map((theme) => theme.id)).size, selected.length);
}

// Spawns must fit the remaining budget; duplicated enemies across themes are de-duped.
const duplicateThemes = [
  { id: "a", enemies: [{ name: "eggCrasher", cost: 1 }, { name: "glitch", cost: 3 }] },
  { id: "b", enemies: [{ name: "eggCrasher", cost: 1 }, { name: "anomaly", cost: 5 }] },
];
const chosen = planner.chooseEnemy(duplicateThemes, 3, () => 0.999);
assert.ok(chosen);
assert.ok(chosen.cost <= 3);
assert.strictEqual(chosen.name, "glitch");
assert.strictEqual(planner.chooseEnemy(duplicateThemes, 0.5, () => 0), null);
assert.strictEqual(
  planner.chooseEnemy(duplicateThemes, 5, () => 0, (enemy) => enemy.name === "anomaly").name,
  "anomaly"
);

// Every named class in the configured themes exists in the project's definitions.
for (const theme of planner.THEME_DEFINITIONS) {
  for (const name of theme.enemies) {
    assert.ok(
      definitions[name] && typeof definitions[name] === "object",
      `Missing class definition referenced by theme ${theme.id}: ${name}`
    );
  }
}

console.log("siegeWavePlanner tests passed");
