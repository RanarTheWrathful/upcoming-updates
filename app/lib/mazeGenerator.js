"use strict";

const MAZE_TILE_TYPES = new Set(["norm", "wall"]);

function isPlainGrid(grid) {
  return Array.isArray(grid) && grid.length > 0 && grid.every(
    (row) => Array.isArray(row) && row.length === grid[0].length && row.length > 0
  );
}

function shouldRandomizeMaze({ serverType, modeName, settings } = {}) {
  if (serverType === "lore" || !settings) return false;
  return settings.MAZE_GENERATION === true ||
    settings.RANDOMIZE_MAZE === true ||
    settings.HAS_MAZE === true ||
    /maze/i.test(String(modeName || settings.MODE || ""));
}


// Remove hand-authored maze-wall placements while keeping the map topology and
// all named gameplay tiles. randomizeMaze() will then create a fresh randomized
// wall layout instead of using the old wall pattern to determine its density.
function clearAuthoredWalls(roomSetup) {
  if (!isPlainGrid(roomSetup)) throw new TypeError("Maze generation requires a rectangular ROOM_SETUP grid.");
  return roomSetup.map((row) => row.map((tile) => tile === "wall" ? "norm" : tile));
}

function floodFill(grid, startX, startY) {
  const height = grid.length;
  const width = grid[0].length;
  const reached = new Set();
  if (grid[startY]?.[startX] === "wall") return reached;
  const queue = [[startX, startY]];
  reached.add(startY * width + startX);
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || grid[ny][nx] === "wall") continue;
      const key = ny * width + nx;
      if (reached.has(key)) continue;
      reached.add(key);
      queue.push([nx, ny]);
    }
  }
  return reached;
}

// Carve the shortest wall-crossing path from a disconnected open area to the
// component rooted at the center. Special map tiles are traversable and kept
// unchanged; only actual maze-wall cells are converted to floor.
function connectOpenAreas(grid, startX, startY) {
  const height = grid.length;
  const width = grid[0].length;
  let reached = floodFill(grid, startX, startY);
  const passableCount = () => grid.reduce(
    (count, row) => count + row.filter((tile) => tile !== "wall").length, 0
  );
  let safety = height * width;

  while (reached.size < passableCount() && safety-- > 0) {
    let isolated;
    for (let y = 0; y < height && !isolated; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x] !== "wall" && !reached.has(y * width + x)) {
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

    // Reconstruct the route back to the isolated cell. Only wall tiles are
    // carved; all named gameplay tiles (bases, nests, objectives, etc.) survive.
    let cursor = goal;
    while (cursor !== -1) {
      const x = cursor % width;
      const y = Math.floor(cursor / width);
      if (grid[y][x] === "wall") grid[y][x] = "norm";
      cursor = previous.get(cursor);
    }
    reached = floodFill(grid, startX, startY);
  }
  return reached.size === passableCount();
}

/**
 * Generates a fresh randomized wall/norm layout without replacing mode-specific
 * tiles. Call clearAuthoredWalls() first when the old wall pattern should be
 * discarded. The open floor is connected after randomization, borders are
 * clear, and a 3x3-to-5x5 center pocket is kept open.
 */
function randomizeMaze(roomSetup, { random = Math.random } = {}) {
  if (!isPlainGrid(roomSetup)) throw new TypeError("Maze generation requires a rectangular ROOM_SETUP grid.");
  if (typeof random !== "function") throw new TypeError("Maze random source must be a function.");

  const grid = roomSetup.map((row) => row.slice());
  const height = grid.length;
  const width = grid[0].length;
  const candidates = [];
  let oldWalls = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!MAZE_TILE_TYPES.has(grid[y][x])) continue;
      candidates.push([x, y]);
      if (grid[y][x] === "wall" && x > 0 && y > 0 && x < width - 1 && y < height - 1) oldWalls++;
    }
  }
  if (candidates.length === 0) return grid;

  // Match the original map's broad obstacle density when possible; use a
  // conservative default for a custom map that starts with no maze walls.
  const interiorCandidates = candidates.filter(([x, y]) => x > 0 && y > 0 && x < width - 1 && y < height - 1).length;
  const originalDensity = interiorCandidates ? oldWalls / interiorCandidates : 0;
  const wallChance = originalDensity < 0.05 ? 0.22 : Math.max(0.14, Math.min(0.38, originalDensity));

  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const centerRadiusX = Math.max(1, Math.floor(width * 0.08));
  const centerRadiusY = Math.max(1, Math.floor(height * 0.08));

  // The outermost ring is never a maze barrier. This is intentional even for
  // old hand-authored grids that included border wall cells.
  for (let x = 0; x < width; x++) {
    if (grid[0][x] === "wall") grid[0][x] = "norm";
    if (grid[height - 1][x] === "wall") grid[height - 1][x] = "norm";
  }
  for (let y = 0; y < height; y++) {
    if (grid[y][0] === "wall") grid[y][0] = "norm";
    if (grid[y][width - 1] === "wall") grid[y][width - 1] = "norm";
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (!MAZE_TILE_TYPES.has(grid[y][x])) continue;
      if (Math.abs(x - centerX) <= centerRadiusX && Math.abs(y - centerY) <= centerRadiusY) {
        grid[y][x] = "norm";
      } else {
        grid[y][x] = random() < wallChance ? "wall" : "norm";
      }
    }
  }

  // Ensure the seed cell is open even when the exact center is a special tile.
  if (grid[centerY][centerX] === "wall") grid[centerY][centerX] = "norm";
  const connected = connectOpenAreas(grid, centerX, centerY);
  if (!connected) {
    // The grid is rectangular and all non-wall cells are traversable. This
    // conservative fallback avoids accidental sealed regions in unusual maps.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x] === "wall" && (x === 0 || y === 0 || x === width - 1 || y === height - 1)) {
          grid[y][x] = "norm";
        }
      }
    }
  }
  return grid;
}

module.exports = { shouldRandomizeMaze, clearAuthoredWalls, randomizeMaze, floodFill, connectOpenAreas };
