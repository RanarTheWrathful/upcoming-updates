"use strict";

const DEFAULT_SPAWN_FLAGS = {
  SPAWN_FOOD: false,
  SPAWN_NEUTRAL_BOSSES: false,
  SPAWN_CRASHER: false,
  SPAWN_SENTINEL: false,
  SPAWN_PENTAGON_SENTINELS: false,
  SPAWN_GUARDIAN_BOSSES: false,
  SPAWN_FALLEN_BOSSES: false,
  SPAWN_FALLEN_ENEMIES: false,
  SPAWN_VOIDLORD_ENEMIES: false,
  SPAWN_VOIDLORD_BOSSES_AND_ENEMIES: false,
  SPAWN_DESCENDED_ENEMIES: false,
  SPAWN_SPARKS: false,
  SPAWN_SPECIAL_BOSSES: false,
  SPAWN_SPECIAL_ENEMIES: false,
  SPAWN_REAPER: false,
  SPAWN_THRASHERS: false,
};

const INTENSITY_DEFAULTS = {
  CRASHERS: 25,
  THRASHERS: 15,
  SENTINELS: 5,
};

const BOSS_LIMIT_DEFAULTS = {
  GUARDIANS: 3,
  FALLEN: 3,
  HIGHLORDS: 3,
  VOIDLORDS: 3,
  NEUTRAL_ALLIANCE: 3,
};

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isPlainObject(value)) return deepMerge({}, value);
  return value;
}

/** Merge objects recursively; arrays and primitive mode settings replace defaults. */
function deepMerge(base, override) {
  const result = {};
  for (const [key, value] of Object.entries(base || {})) result[key] = cloneValue(value);
  for (const [key, value] of Object.entries(override || {})) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = cloneValue(value);
    }
  }
  return result;
}

function numericSetting(config, key, { min = -Infinity, fallback } = {}) {
  const value = Number(config[key]);
  if (!Number.isFinite(value) || value < min) {
    if (fallback !== undefined) {
      config[key] = fallback;
      return;
    }
    throw new TypeError(`${key} must be a finite number greater than or equal to ${min}.`);
  }
  config[key] = value;
}

function normalizeBoolean(config, key) {
  const value = config[key];
  if (typeof value === "boolean") return;
  if (value === 0 || value === 1) {
    config[key] = Boolean(value);
    return;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") config[key] = true;
    else if (normalized === "false") config[key] = false;
    else throw new TypeError(`${key} must be true or false, not ${JSON.stringify(value)}.`);
    return;
  }
  throw new TypeError(`${key} must be a boolean.`);
}

function validateRoomSetup(config, modeName) {
  const grid = config.ROOM_SETUP;
  if (!Array.isArray(grid) || grid.length === 0) {
    throw new TypeError(`${modeName}: ROOM_SETUP must be a non-empty array of rows.`);
  }
  if (!Array.isArray(grid[0]) || grid[0].length === 0) {
    throw new TypeError(`${modeName}: ROOM_SETUP row 1 must contain at least one cell.`);
  }

  const width = grid[0].length;
  grid.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== width) {
      throw new TypeError(
        `${modeName}: ROOM_SETUP row ${rowIndex + 1} has ${Array.isArray(row) ? row.length : "no valid row"} cells; expected ${width}.`
      );
    }
    row.forEach((cell, columnIndex) => {
      if (typeof cell !== "string" || cell.trim() === "") {
        throw new TypeError(
          `${modeName}: ROOM_SETUP cell [${rowIndex + 1}, ${columnIndex + 1}] must be a non-empty string.`
        );
      }
    });
  });
}

function validateNumericArray(config, key) {
  if (config[key] === undefined) return;

  // "color" is a supported sentinel in legacy modes that use a single shared color team.
  if (typeof config[key] === "string" && config[key].trim().toLowerCase() === "color") {
    config[key] = "color";
    return;
  }

  if (!Array.isArray(config[key]) || config[key].some((value) => !Number.isFinite(Number(value)))) {
    throw new TypeError(`${key} must be "color" or an array containing only finite numbers.`);
  }
  config[key] = config[key].map(Number);
}

/** Combine shared config with a mode's overrides, then validate critical settings. */
function resolveModeConfig(baseConfig, modeConfig, modeName = "Unknown mode") {
  if (!isPlainObject(baseConfig) || !isPlainObject(modeConfig)) {
    throw new TypeError("Shared and mode configurations must be plain objects.");
  }

  const config = deepMerge(baseConfig, modeConfig);
  config.MODE = String(config.MODE || "").trim();
  if (!config.MODE) throw new TypeError(`${modeName}: MODE must be a non-empty string.`);

  numericSetting(config, "WIDTH", { min: 1 });
  numericSetting(config, "HEIGHT", { min: 1 });
  numericSetting(config, "gameSpeed", { min: Number.EPSILON });
  numericSetting(config, "FOOD_AMOUNT", { min: 0 });
  numericSetting(config, "BOTS", { min: 0 });
  validateRoomSetup(config, modeName);

  for (const key of ["TEAMS", "BOT_TEAMS"]) validateNumericArray(config, key);

  config.ENEMY_INTENSITY = deepMerge(INTENSITY_DEFAULTS, config.ENEMY_INTENSITY || {});
  for (const [key, value] of Object.entries(config.ENEMY_INTENSITY)) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      throw new TypeError(`${modeName}: ENEMY_INTENSITY.${key} must be a non-negative finite number.`);
    }
    config.ENEMY_INTENSITY[key] = numericValue;
  }

  config.BOSS_LIMIT = deepMerge(BOSS_LIMIT_DEFAULTS, config.BOSS_LIMIT || {});
  for (const [key, value] of Object.entries(config.BOSS_LIMIT)) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      throw new TypeError(`${modeName}: BOSS_LIMIT.${key} must be a non-negative finite number.`);
    }
    config.BOSS_LIMIT[key] = numericValue;
  }

  for (const [key, defaultValue] of Object.entries(DEFAULT_SPAWN_FLAGS)) {
    if (config[key] === undefined) config[key] = defaultValue;
    normalizeBoolean(config, key);
  }

  return config;
}

module.exports = resolveModeConfig;
module.exports.deepMerge = deepMerge;
module.exports.validateRoomSetup = validateRoomSetup;
