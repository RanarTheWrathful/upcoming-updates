"use strict";

const assert = require("assert");
const policy = require("../lib/siegeWavePolicy");

const hostile = { id: "spellcasters", enemies: [{ name: "summoner" }] };
const allies = { id: policy.ALLY_THEME_ID, enemies: [{ name: "backup" }] };
const crashers = { id: "crashers", enemies: [{ name: "crasher" }] };

assert.strictEqual(policy.isEpicWave(0), false);
assert.strictEqual(policy.isEpicWave(9), false);
assert.strictEqual(policy.isEpicWave(10), true);
assert.deepStrictEqual(policy.availableThemesForWave([hostile, allies, crashers], 10), [hostile, crashers]);
assert.deepStrictEqual(policy.availableThemesForWave([hostile, allies, crashers], 11), [hostile, allies, crashers]);
assert.strictEqual(policy.getWaveKind([allies]), "allies");
assert.strictEqual(policy.getWaveKind([hostile, crashers]), "enemies");
assert.deepStrictEqual(policy.themesForWave([allies], "allies", false), [allies]);
assert.deepStrictEqual(policy.themesForWave([allies], "allies", true), []);
assert.deepStrictEqual(policy.themesForWave([hostile, allies], "enemies", false), [hostile]);
console.log("Siege wave policy tests passed.");
