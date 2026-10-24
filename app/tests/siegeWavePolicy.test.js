"use strict";

const assert = require("assert");
const policy = require("../lib/siegeWavePolicy");
const planner = require("../lib/siegeWavePlanner");

const hostile = { id: "spellcasters", enemies: [{ name: "summoner" }] };
const allies = { id: policy.ALLY_THEME_ID, enemies: [{ name: "backup" }] };
const crashers = { id: "crashers", enemies: [{ name: "crasher" }] };

assert.strictEqual(policy.isEpicWave(0), false);
assert.strictEqual(policy.isEpicWave(9), false);
assert.strictEqual(policy.isEpicWave(10), true);
assert.strictEqual(policy.isEpicWave(99), false);
assert.strictEqual(policy.isEpicWave(101), false);
assert.strictEqual(policy.shouldSpawnEpicEncounter(101), true);
assert.strictEqual(policy.isEpicWave(110), true);
assert.strictEqual(policy.shouldSpawnEpicEncounter(110), true);
assert.strictEqual(policy.isEpicOnlyWave(10), true);
assert.strictEqual(policy.isEpicOnlyWave(40), true);
assert.strictEqual(policy.isEpicOnlyWave(50), false);
assert.strictEqual(policy.isEpicOnlyWave(100), true);
assert.strictEqual(policy.shouldSpawnNormalWave(10), false);
assert.strictEqual(policy.shouldSpawnNormalWave(50), true);
assert.strictEqual(policy.shouldSpawnNormalWave(100), false);
assert.strictEqual(policy.shouldSpawnNormalWave(101), true);
assert.deepStrictEqual(policy.availableThemesForWave([hostile, allies, crashers], 10), [hostile, crashers]);
assert.deepStrictEqual(policy.availableThemesForWave([hostile, allies, crashers], 11), [hostile, allies, crashers]);
assert.strictEqual(policy.getWaveKind([allies]), "allies");
assert.strictEqual(policy.getWaveKind([hostile, crashers]), "enemies");
assert.deepStrictEqual(policy.themesForWave([allies], "allies", false), [allies]);
assert.deepStrictEqual(policy.themesForWave([allies], "allies", true), []);
assert.deepStrictEqual(policy.themesForWave([hostile, allies], "enemies", false), [hostile]);
// Reinforcement themes are exclusive even when the random subset initially
// includes ordinary themes too.
const selectedAll = planner.chooseRandomThemes([hostile, allies, crashers], () => 0.999999);
assert.deepStrictEqual(selectedAll, [allies]);
console.log("Siege wave policy tests passed.");
