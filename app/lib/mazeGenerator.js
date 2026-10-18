"use strict";

function isPlainGrid(grid) {
  return Array.isArray(grid) && grid.length > 0 && grid.every(
    (row) => Array.isArray(row) && row.length === grid[0].length && row.length > 0
  );
}

function isWallTile(tile) {
  return typeof tile === "string" && tile.toLowerCase() === "wall";
}

function shouldRandomizeMaze({ serverType, modeName, settings } = {}) {
  if (serverType === "lore" || !settings) return false;
  return settings.MAZE_GENERATION === true ||
    settings.RANDOMIZE_MAZE === true ||
    settings.HAS_MAZE === true ||
    /maze/i.test(String(modeName || settings.MODE || ""));
}

// Replace authored wall placements while keeping the rectangular room grid and
// every named gameplay tile intact. The generator creates a new wall layout.
function clearAuthoredWalls(roomSetup) {
  if (!isPlainGrid(roomSetup)) throw new TypeError("Maze generation requires a rectangular ROOM_SETUP grid.");
  return roomSetup.map((row) => row.map((tile) => isWallTile(tile) ? "norm" : tile));
}

function floodFill(grid, startX, startY) {
  const height = grid.length;
  const width = grid[0].length;
  const reached = new Set();
  if (isWallTile(grid[startY]?.[startX])) return reached;
  const queue = [[startX, startY]];
  reached.add(startY * width + startX);
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || isWallTile(grid[ny][nx])) continue;
      const key = ny * width + nx;
      if (reached.has(key)) continue;
      reached.add(key);
      queue.push([nx, ny]);
    }
  }
  return reached;
}

// Carve the shortest wall-crossing path from each disconnected open region to
// the component rooted at the center. Only maze wall tiles are removed.
function connectOpenAreas(grid, startX, startY) {
  const height = grid.length;
  const width = grid[0].length;
  let reached = floodFill(grid, startX, startY);
  const passableCount = () => grid.reduce(
    (count, row) => count + row.filter((tile) => !isWallTile(tile)).length, 0
  );
  let safety = height * width;

  while (reached.size < passableCount() && safety-- > 0) {
    let isolated;
    for (let y = 0; y < height && !isolated; y++) {
      for (let x = 0; x < width; x++) {
        if (!isWallTile(grid[y][x]) && !reached.has(y * width + x)) {
          isolated = [x, y];
          break;
        }
      }
    }
    if (!isolated) break;

    const queue = [isolated];
    const previous = new Map([[isolated[1] * width + isolated[0], -1]]);
    let goal = -1;
    for (let head = 0; head < queue.length && goal === -1; head++) {
      const [x, y] = queue[head];
      const key = y * width + x;
      if (reached.has(key)) {
        goal = key;
        break;
      }
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nextKey = ny * width + nx;
        if (previous.has(nextKey)) continue;
        previous.set(nextKey, key);
        queue.push([nx, ny]);
      }
    }
    if (goal === -1) break;

    let cursor = goal;
    while (cursor !== -1) {
      const x = cursor % width;
      const y = Math.floor(cursor / width);
      if (isWallTile(grid[y][x])) grid[y][x] = "norm";
      cursor = previous.get(cursor);
    }
    reached = floodFill(grid, startX, startY);
  }
  return reached.size === passableCount();
}

function randomizeMaze(roomSetup, { random = Math.random } = {}) {
  if (!isPlainGrid(roomSetup)) throw new TypeError("Maze generation requires a rectangular ROOM_SETUP grid.");
  if (typeof random !== "function") throw new TypeError("Maze random source must be a function.");

  const unit = () => {
    const value = Number(random());
    return Number.isFinite(value) ? Math.max(0, Math.min(0.999999999, value)) : Math.random();
  };
  const intBetween = (min, max) => min + Math.floor(unit() * (max - min + 1));
  const grid = roomSetup.map((row) => row.map((tile) => isWallTile(tile) ? "wall" : tile));
  const height = grid.length;
  const width = grid[0].length;
  let oldWalls = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (isWallTile(grid[y][x])) oldWalls++;
    }
  }

  // Clear all previous wall tiles before generating a fresh arrangement.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isWallTile(grid[y][x])) grid[y][x] = "norm";
    }
  }

  const interiorCandidates = grid.reduce((count, row, y) => count + row.reduce(
    (rowCount, tile, x) => rowCount + (x > 0 && y > 0 && x < width - 1 && y < height - 1 && tile === "norm" ? 1 : 0), 0
  ), 0);
  const originalDensity = interiorCandidates ? oldWalls / interiorCandidates : 0;
  const wallChance = originalDensity < 0.05 ? 0.22 : Math.max(0.14, Math.min(0.38, originalDensity));

  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const centerRadiusX = Math.max(1, Math.floor(width * 0.08));
  const centerRadiusY = Math.max(1, Math.floor(height * 0.08));

  // The outer border is always clear. A central pocket is also kept open for
  // safe initial movement and to reduce random spawn congestion.
  for (let x = 0; x < width; x++) {
    if (grid[0][x] === "wall") grid[0][x] = "norm";
    if (grid[height - 1][x] === "wall") grid[height - 1][x] = "norm";
  }
  for (let y = 0; y < height; y++) {
    if (grid[y][0] === "wall") grid[y][0] = "norm";
    if (grid[y][width - 1] === "wall") grid[y][width - 1] = "norm";
  }

  const eligible = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (grid[y][x] !== "norm") continue;
      if (Math.abs(x - centerX) <= centerRadiusX && Math.abs(y - centerY) <= centerRadiusY) continue;
      eligible.push([x, y]);
    }
  }

  const eligibleKeys = new Set(eligible.map(([x, y]) => y * width + x));
  const targetWalls = Math.min(eligible.length, Math.round(eligible.length * wallChance));
  let placed = 0;

  // Use randomly sized rectangular clusters rather than isolated coin-flip
  // cells. Small chunks are common, medium chunks frequent, and large chunks
  // occasional, producing varied wall silhouettes between matches.
  function clusterSize() {
    const roll = unit();
    let w;
    let h;
    if (roll < 0.16) {
      w = 1; h = 1;
    } else if (roll < 0.36) {
      w = intBetween(2, 3); h = 1;
    } else if (roll < 0.62) {
      w = intBetween(2, 3); h = intBetween(2, 3);
    } else if (roll < 0.86) {
      w = intBetween(3, 4); h = intBetween(1, 2);
    } else {
      w = intBetween(3, 5); h = intBetween(2, 4);
    }
    if (unit() < 0.5) [w, h] = [h, w];
    return [w, h];
  }

  let attempts = 0;
  const maxAttempts = Math.max(eligible.length * 3, targetWalls * 4);
  while (placed < targetWalls && attempts++ < maxAttempts) {
    const available = eligible.filter(([x, y]) => grid[y][x] === "norm");
    if (!available.length) break;
    const [seedX, seedY] = available[Math.floor(unit() * available.length)];
    const [clusterWidth, clusterHeight] = clusterSize();
    const left = seedX - Math.floor(unit() * clusterWidth);
    const top = seedY - Math.floor(unit() * clusterHeight);
    const before = placed;

    for (let y = top; y < top + clusterHeight && placed < targetWalls; y++) {
      for (let x = left; x < left + clusterWidth && placed < targetWalls; x++) {
        if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) continue;
        const key = y * width + x;
        if (!eligibleKeys.has(key) || grid[y][x] !== "norm") continue;
        grid[y][x] = "wall";
        placed++;
      }
    }

    // A cluster can land against a protected base/nest/objective. Still make
    // progress by placing a single wall at its seed if the rectangle fit none.
    if (placed === before && grid[seedY][seedX] === "norm") {
      grid[seedY][seedX] = "wall";
      placed++;
    }
  }

  // Seal a few conspicuous one-cell pockets left inside/between clusters. A
  // pinched gap needs opposing walls plus at least two diagonal wall neighbors;
  // ordinary one-cell corridors are preserved. Add no more than a couple of
  // filler cells above the main density target.
  const fillerLimit = Math.min(eligible.length, targetWalls + Math.max(2, Math.floor(targetWalls * 0.08)));
  const fillers = [];
  for (const [x, y] of eligible) {
    if (grid[y][x] !== "norm") continue;
    const north = isWallTile(grid[y - 1][x]);
    const south = isWallTile(grid[y + 1][x]);
    const west = isWallTile(grid[y][x - 1]);
    const east = isWallTile(grid[y][x + 1]);
    const adjacentWalls = [north, south, west, east].filter(Boolean).length;
    const diagonalWalls = [
      grid[y - 1][x - 1], grid[y - 1][x + 1],
      grid[y + 1][x - 1], grid[y + 1][x + 1]
    ].filter(isWallTile).length;
    const pinchedGap = ((north && south) || (west && east)) && diagonalWalls >= 2;
    if ((adjacentWalls >= 3 && unit() < 0.7) || (pinchedGap && unit() < 0.45)) fillers.push([x, y]);
  }
  for (const [x, y] of fillers) {
    if (placed >= fillerLimit) break;
    if (grid[y][x] === "norm") {
      grid[y][x] = "wall";
      placed++;
    }
  }

  // Always keep the center open, then carve through maze walls if necessary so
  // every walkable tile and special gameplay tile remains connected.
  for (let y = Math.max(0, centerY - centerRadiusY); y <= Math.min(height - 1, centerY + centerRadiusY); y++) {
    for (let x = Math.max(0, centerX - centerRadiusX); x <= Math.min(width - 1, centerX + centerRadiusX); x++) {
      if (grid[y][x] === "wall") grid[y][x] = "norm";
    }
  }
  connectOpenAreas(grid, centerX, centerY);
  return grid;
}

module.exports = { shouldRandomizeMaze, clearAuthoredWalls, randomizeMaze, floodFill, connectOpenAreas };
