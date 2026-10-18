"use strict";
const assert = require("assert");
const { mergeModeSettings, validateModeSettings } = require("../lib/modeSettings");

const defaults = {
  MODE: "test",
  WIDTH: 100,
  HEIGHT: 200,
  FOOD_AMOUNT: 2,
  ENEMY_INTENSITY: { CRASHERS: 4, SENTINELS: 3 },
  BOSS_LIMIT: { GUARDIANS: 2, FALLEN: 1 },
  ROOM_SETUP: [["norm"]],
};
const mode = {
  ENEMY_INTENSITY: { CRASHERS: 9 },
  BOSS_LIMIT: { FALLEN: 0 },
  ROOM_SETUP: [["wall", "norm"]],
};
const merged = mergeModeSettings(defaults, mode);
assert.deepStrictEqual(merged.ENEMY_INTENSITY, { CRASHERS: 9, SENTINELS: 3 });
assert.deepStrictEqual(merged.BOSS_LIMIT, { GUARDIANS: 2, FALLEN: 0 });
assert.deepStrictEqual(merged.ROOM_SETUP, [["wall", "norm"]]);
assert.strictEqual(validateModeSettings(merged, "test"), merged);
assert.throws(
  () => validateModeSettings({ ...merged, ROOM_SETUP: [["norm"], ["wall", "norm"]] }, "bad-map"),
  /ROOM_SETUP row 1 has 2 cells; expected 1/
);
assert.throws(
  () => validateModeSettings({ ...merged, ENEMY_INTENSITY: { CRASHERS: NaN } }, "bad-mode"),
  /ENEMY_INTENSITY\.CRASHERS/
);
console.log("Mode settings tests passed.");
