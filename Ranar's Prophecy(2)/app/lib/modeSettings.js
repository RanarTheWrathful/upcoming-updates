"use strict";

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Merge config and mode overrides recursively. Arrays are deliberate overrides
 * (especially ROOM_SETUP) rather than lists to concatenate.
 */
function mergeModeSettings(...sources) {
  const merge = (base, override) => {
    if (!isRecord(base) || !isRecord(override)) return override;
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
      result[key] =
        isRecord(result[key]) && isRecord(value)
          ? merge(result[key], value)
          : value;
    }
    return result;
  };

  return sources.reduce((merged, source) => {
    if (source == null) return merged;
    if (!isRecord(source)) {
      throw new TypeError("Mode settings sources must be plain objects.");
    }
    return merge(merged, source);
  }, {});
}

/** Fail at startup with an actionable message instead of a cryptic map crash. */
function validateModeSettings(settings, modeName = "selected mode") {
  if (!isRecord(settings)) {
    throw new TypeError(`Settings for ${modeName} must be an object.`);
  }

  for (const key of ["WIDTH", "HEIGHT"]) {
    if (!Number.isFinite(settings[key]) || settings[key] <= 0) {
      throw new Error(`${modeName}: ${key} must be a positive finite number.`);
    }
  }

  const map = settings.ROOM_SETUP;
  if (!Array.isArray(map) || map.length === 0) {
    throw new Error(`${modeName}: ROOM_SETUP must be a non-empty array of rows.`);
  }

  let expectedWidth;
  for (let y = 0; y < map.length; y++) {
    const row = map[y];
    if (!Array.isArray(row) || row.length === 0) {
      throw new Error(`${modeName}: ROOM_SETUP row ${y} is missing or empty.`);
    }
    if (expectedWidth === undefined) expectedWidth = row.length;
    if (row.length !== expectedWidth) {
      throw new Error(
        `${modeName}: ROOM_SETUP row ${y} has ${row.length} cells; expected ${expectedWidth}.`
      );
    }
    for (let x = 0; x < row.length; x++) {
      if (typeof row[x] !== "string" || row[x].length === 0) {
        throw new Error(
          `${modeName}: ROOM_SETUP cell (${x}, ${y}) must be a non-empty tile name.`
        );
      }
    }
  }

  for (const key of ["FOOD_AMOUNT", "BOTS"]) {
    if (settings[key] !== undefined && (!Number.isFinite(settings[key]) || settings[key] < 0)) {
      throw new Error(`${modeName}: ${key} must be a finite, non-negative number.`);
    }
  }

  for (const groupName of ["ENEMY_INTENSITY", "BOSS_LIMIT"]) {
    const group = settings[groupName];
    if (group === undefined) continue;
    if (!isRecord(group)) {
      throw new Error(`${modeName}: ${groupName} must be an object.`);
    }
    for (const [key, value] of Object.entries(group)) {
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(
          `${modeName}: ${groupName}.${key} must be a finite, non-negative number.`
        );
      }
    }
  }

  return settings;
}

module.exports = { mergeModeSettings, validateModeSettings };
