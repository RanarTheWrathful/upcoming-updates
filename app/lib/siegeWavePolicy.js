"use strict";

const ALLY_THEME_ID = "spawnAllies";

function isEpicWave(wave) {
  const value = Number(wave);
  return Number.isFinite(value) && value > 0 && value % 10 === 0;
}

/** Ally rosters are disabled on epic encounters, which have their own bosses. */
function availableThemesForWave(themes, wave) {
  const pool = Array.isArray(themes) ? themes : [];
  return isEpicWave(wave)
    ? pool.filter((theme) => theme && theme.id !== ALLY_THEME_ID)
    : pool.slice();
}

function getWaveKind(themes) {
  return (Array.isArray(themes) ? themes : []).some(
    (theme) => theme && theme.id === ALLY_THEME_ID
  ) ? "allies" : "enemies";
}

/** Return only the theme type assigned to this wave; never mix ally/hostile waves. */
function themesForWave(themes, waveKind, alliesAlreadySpawned) {
  const selected = Array.isArray(themes) ? themes : [];
  if (waveKind === "allies") {
    if (alliesAlreadySpawned) return [];
    return selected.filter((theme) => theme && theme.id === ALLY_THEME_ID);
  }
  return selected.filter((theme) => theme && theme.id !== ALLY_THEME_ID);
}

module.exports = {
  ALLY_THEME_ID,
  isEpicWave,
  availableThemesForWave,
  getWaveKind,
  themesForWave,
};
