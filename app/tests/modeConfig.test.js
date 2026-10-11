"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const baseConfig = require("../config.js");
const resolveModeConfig = require("../lib/modeConfig");

function run() {
  const base = {
    MODE: "base",
    WIDTH: 100,
    HEIGHT: 100,
    gameSpeed: 1,
    FOOD_AMOUNT: 1,
    BOTS: 0,
    ENEMY_INTENSITY: { CRASHERS: 10, THRASHERS: 5, SENTINELS: 2 },
    BOSS_LIMIT: { GUARDIANS: 2, FALLEN: 1 },
    ROOM_SETUP: [["norm"]],
    TEAMS: [1, 2],
    BOT_TEAMS: [1, 2],
    SPAWN_FOOD: true,
  };
  const mode = {
    MODE: "testMode",
    ENEMY_INTENSITY: { THRASHERS: 25 },
    BOSS_LIMIT: { FALLEN: 4 },
    ROOM_SETUP: [["bas", "norm"]],
    TEAMS: "color",
    BOT_TEAMS: "color",
  };
  const merged = resolveModeConfig(base, mode, "Test Mode");
  assert.deepStrictEqual(merged.ENEMY_INTENSITY, {
    CRASHERS: 10,
    THRASHERS: 25,
    SENTINELS: 2,
  });
  assert.deepStrictEqual(merged.BOSS_LIMIT, {
    GUARDIANS: 2,
    FALLEN: 4,
    HIGHLORDS: 3,
    VOIDLORDS: 3,
    NEUTRAL_ALLIANCE: 3,
  });
  assert.deepStrictEqual(merged.ROOM_SETUP, [["bas", "norm"]], "arrays should replace, not merge");
  assert.strictEqual(merged.TEAMS, "color");
  assert.strictEqual(merged.BOT_TEAMS, "color");
  assert.strictEqual(merged.SPAWN_FOOD, true);
  assert.strictEqual(merged.SPAWN_REAPER, false, "missing spawn flags should be safely defaulted");
  assert.deepStrictEqual(base.ENEMY_INTENSITY, { CRASHERS: 10, THRASHERS: 5, SENTINELS: 2 }, "merge must not mutate the base config");

  assert.throws(
    () => resolveModeConfig(base, { ...mode, ROOM_SETUP: [["norm"], ["norm", "wall"]] }, "Bad Grid"),
    /ROOM_SETUP row 2/
  );
  assert.throws(
    () => resolveModeConfig(base, { ...mode, ENEMY_INTENSITY: { CRASHERS: -1 } }, "Bad Intensity"),
    /ENEMY_INTENSITY\.CRASHERS/
  );
  assert.throws(
    () => resolveModeConfig(base, { ...mode, FOOD_AMOUNT: "not-a-number" }, "Bad Food"),
    /FOOD_AMOUNT/
  );

  const modesDirectory = path.join(__dirname, "..", "Game Modes");
  const modeFiles = fs.readdirSync(modesDirectory)
    .filter((file) => file.endsWith(".js") && file !== "serverStateManager.js");
  assert(modeFiles.length >= 30, "expected all game mode files to be present");
  for (const file of modeFiles) {
    const name = path.basename(file, ".js");
    const modeConfig = require(path.join(modesDirectory, file));
    const resolved = resolveModeConfig(baseConfig, modeConfig, name);
    assert.strictEqual(resolved.MODE, String(modeConfig.MODE).trim(), `${name}: resolved mode name`);
    assert(resolved.ROOM_SETUP.length > 0, `${name}: room setup should not be empty`);
  }

  const expanse = resolveModeConfig(baseConfig, require("../Game Modes/The Expanse.js"), "The Expanse");
  assert.deepStrictEqual(expanse.ENEMY_INTENSITY, { CRASHERS: 25, THRASHERS: 250, SENTINELS: 5 });

  const divided = resolveModeConfig(
    baseConfig,
    require("../Game Modes/The Cubed Crusades P1(The Divided).js"),
    "The Cubed Crusades P1(The Divided)"
  );
  const rowWidth = divided.ROOM_SETUP[0].length;
  assert(divided.ROOM_SETUP.every((row) => Array.isArray(row) && row.length === rowWidth), "The Divided map should be rectangular");
  console.log(`Mode config tests passed (${modeFiles.length} modes validated).`);
}

run();
