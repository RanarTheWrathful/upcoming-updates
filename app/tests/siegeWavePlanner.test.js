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
      name === "bot" || definitions[name] && typeof definitions[name] === "object",
      `Missing class definition referenced by theme ${theme.id}: ${name}`
    );
  }
}


// Spawn-allies is ignored about half the time when selected; the other selected
// themes remain active, or a regular theme is picked as a fallback.
{
  const normal = { id: "normal", enemies: [{ name: "eggCrasher", cost: 1 }] };
  const ally = { id: "spawnAllies", enemies: [{ name: "RogueLibor", cost: 30 }, { name: "bot", cost: 30 }] };
  const sequence = (values) => {
    let i = 0;
    return () => values[i++] === undefined ? 0 : values[i - 1];
  };
  const ignored = planner.chooseRandomThemes([normal, ally], sequence([0, 0, 0]));
  assert(ignored.length >= 1 && ignored.every((theme) => theme.id !== "spawnAllies"),
    "the 50% ignore outcome falls back to normal wave themes");
  const triggered = planner.chooseRandomThemes([normal, ally], sequence([0, 0, 0.999]));
  assert.strictEqual(triggered.length, 1);
  assert.strictEqual(triggered[0].id, "spawnAllies", "the other half still produces an ally event");
}

// A reinforcement roster can contain one unique boss and several bots without
// spending beyond its budget or repeating multiple uniquely named bosses.
{
  const theme = { id: "spawnAllies", enemies: [
    { name: "RogueLibor", cost: 30 },
    { name: "twilight", cost: 35 },
    { name: "bot", cost: 30 },
    { name: "RogueLibor", cost: 30 },
  ] };
  const roster = planner.planAllyRoster(theme, 50, () => 0, () => true);
  assert.strictEqual(roster.filter((enemy) => enemy.name !== "bot").length, 1,
    "at most one named boss can be chosen for an ally wave");
  assert.strictEqual(roster.filter((enemy) => enemy.name === "bot").length, 2,
    "remaining budget can purchase bots alongside a boss");
  assert(roster.reduce((total, enemy) => total + enemy.cost, 0) <= 50,
    "the combined boss and bot roster must fit the budget");
  const noBoss = planner.planAllyRoster(theme, 20, () => 0.999, () => true);
  assert(noBoss.every((enemy) => enemy.name === "bot"), "budgets can also produce bots without a boss");
  const lateWave = planner.planAllyRoster(theme, 500, () => 0, () => true);
  assert(lateWave.filter((enemy) => enemy.name === "bot").length <= 3,
    "large late-wave budgets must not turn into an unlimited reinforcement-bot flood");
}

console.log("siegeWavePlanner tests passed");

// Reinforcement waves are exclusive and cannot mix allies with hostile themes.
{
  const allyTheme = { id: "spawnAllies", label: "Backup Allies", enemies: ["RogueLibor", "bot"] };
  const selected = planner.chooseRandomThemes([...catalog, allyTheme], () => 0.999);
  if (selected.some((theme) => theme.id === "spawnAllies")) {
    assert.strictEqual(selected.length, 1, "spawnAllies excludes every other theme for the wave");
  }
}
assert.strictEqual(
  new Set(planner.THEME_DEFINITIONS.map((theme) => theme.id)).size,
  planner.THEME_DEFINITIONS.length,
  "theme ids must be unique"
);
const arenaTheme = planner.THEME_DEFINITIONS.find((theme) => theme.id === "closers");
assert(arenaTheme && arenaTheme.enemies.includes("bot"),
  "the Arena Bosses theme should support explicit Siege bot spawns");
const polygonTheme = planner.THEME_DEFINITIONS.find((theme) => theme.id === "polygons");
assert(polygonTheme, "the normal polygon theme must be defined");
for (const name of Object.keys(planner.POLYGON_SPAWN_COUNTS)) {
  assert(polygonTheme.enemies.includes(name), `the polygon theme is missing ${name}`);
  assert(definitions[name] && typeof definitions[name] === "object", `missing normal polygon definition ${name}`);
  assert(planner.POLYGON_SPAWN_COUNTS[name] > 1, `${name} should retain its multi-polygon spawn count`);
}
const onePointPolygonCatalog = planner.createEnemyCatalog(
  [{ cost: 1, enemies: Object.keys(planner.POLYGON_SPAWN_COUNTS) }],
  [polygonTheme]
);
assert(onePointPolygonCatalog[0].enemies.every((enemy) => enemy.cost === 1),
  "each generic polygon type should cost one point regardless of the spawned swarm size");
const backupTheme = planner.THEME_DEFINITIONS.find((theme) => theme.id === "spawnAllies");
assert(backupTheme, "the ally theme must be defined");
for (const name of [
  "roguepalisade", "roguarmada", "RogueLibor", "roguemothership", "castaway", "twilight", "bot",
]) {
  assert(backupTheme.enemies.includes(name), `the ally theme is missing guardian spawn ${name}`);
}
const actualAllySelection = planner.chooseRandomThemes(planner.THEME_DEFINITIONS, () => 0.999);
if (actualAllySelection.some((theme) => theme.id === "spawnAllies")) {
  assert.strictEqual(actualAllySelection.length, 1, "real spawnAllies selection must exclude hostile themes");
  assert.strictEqual(actualAllySelection[0].id, "spawnAllies");
}

console.log("siegeWavePlanner extended tests passed");
