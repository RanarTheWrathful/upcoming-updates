"use strict";

const DEFAULTS = Object.freeze({
  targetCellsAcrossShortSide: 28,
  minCellSize: 130,
  maxCellSize: 260,
  wallDensity: 0.23,
  borderMarginRatio: 0.035,
  centerClearRatio: 0.055,
  positionJitterRatio: 0.07,
});

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

// Remove hand-authored wall cells when a mode opts into generated walls.
// The other room types remain untouched, and none of them dictates where a
// generated wall is placed; they are only used as a clearance mask later.
function clearAuthoredWalls(roomSetup) {
  if (!isPlainGrid(roomSetup)) {
    throw new TypeError("Maze generation requires a rectangular ROOM_SETUP grid.");
  }
  return roomSetup.map((row) => row.map((tile) => isWallTile(tile) ? "norm" : tile));
}

function makeRandomTools(random) {
  if (typeof random !== "function") throw new TypeError("Maze random source must be a function.");
  const unit = () => {
    const value = Number(random());
    return Number.isFinite(value) ? Math.max(0, Math.min(0.999999999, value)) : Math.random();
  };
  return {
    unit,
    intBetween(min, max) {
      return min + Math.floor(unit() * (max - min + 1));
    },
    choose(values) {
      return values[Math.floor(unit() * values.length)];
    },
  };
}

function isSpecialRoomTile(tile) {
  if (typeof tile !== "string") return true;
  const normalized = tile.toLowerCase();
  return normalized !== "norm" && normalized !== "wall";
}

function getSpecialRoomBounds(roomSetup, width, height) {
  if (!roomSetup) return [];
  if (!isPlainGrid(roomSetup)) {
    throw new TypeError("Maze generation roomSetup must be a rectangular grid when provided.");
  }
  const rows = roomSetup.length;
  const columns = roomSetup[0].length;
  const bounds = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      if (!isSpecialRoomTile(roomSetup[y][x])) continue;
      const normalizedTile = String(roomSetup[y][x]).toLowerCase();
      // Resource tiles still keep their footprint clear, but shouldn't create
      // the same broad no-wall halo as bases, nests, or objectives.
      const resourceTile = normalizedTile === "rock" || normalizedTile === "roid";
      bounds.push({
        left: (x * width) / columns,
        right: ((x + 1) * width) / columns,
        top: (y * height) / rows,
        bottom: ((y + 1) * height) / rows,
        resourceTile,
      });
    }
  }
  return bounds;
}

function makePattern(tools) {
  const { unit, intBetween } = tools;
  const roll = unit();
  const cells = [];

  if (roll < 0.24) {
    // Chunky rectangular islands.
    const width = intBetween(1, 3);
    const height = intBetween(1, 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) cells.push([x, y]);
    }
  } else if (roll < 0.53) {
    // Straight runs with occasional double-width sections.
    const length = intBetween(2, 6);
    const thickness = unit() < 0.3 ? 2 : 1;
    const horizontal = unit() < 0.5;
    for (let i = 0; i < length; i++) {
      for (let t = 0; t < thickness; t++) {
        cells.push(horizontal ? [i, t] : [t, i]);
      }
    }
  } else if (roll < 0.76) {
    // L-shaped chunks make the maze less like a field of isolated blocks.
    const horizontalLength = intBetween(2, 5);
    const verticalLength = intBetween(2, 4);
    for (let x = 0; x < horizontalLength; x++) cells.push([x, 0]);
    for (let y = 1; y < verticalLength; y++) cells.push([horizontalLength - 1, y]);
    if (unit() < 0.35) {
      cells.push([horizontalLength - 2, 1]);
    }
  } else if (roll < 0.91) {
    // Staggered runs: short zigzags that create pockets and alternate routes.
    const length = intBetween(3, 6);
    for (let x = 0; x < length; x++) {
      const y = Math.floor(x / 2);
      cells.push([x, y]);
      if (unit() < 0.42) cells.push([x, y + 1]);
    }
  } else {
    // A few single blocks keep larger formations from looking too uniform.
    cells.push([0, 0]);
  }

  // Rotate and mirror each formation so the same few basic shapes create many
  // orientations. The final offset normalization lets the caller anchor them.
  const turns = intBetween(0, 3);
  const mirrorX = unit() < 0.5;
  const transformed = cells.map(([originalX, originalY]) => {
    let x = mirrorX ? -originalX : originalX;
    let y = originalY;
    for (let i = 0; i < turns; i++) [x, y] = [-y, x];
    return [x, y];
  });
  const minX = Math.min(...transformed.map(([x]) => x));
  const minY = Math.min(...transformed.map(([, y]) => y));
  return transformed.map(([x, y]) => [x - minX, y - minY]);
}

/**
 * Create a randomized maze on a world-space grid unrelated to ROOM_SETUP's
 * dimensions. ROOM_SETUP is consulted only to keep walls clear of named map
 * areas such as bases, nests, rocks, objectives, and gates.
 *
 * The output contains one wall entity position per occupied world-grid cell.
 * Coordinates are gently jittered off cell centers, while their grid indices
 * preserve the chunky, connected layouts that give the walls a maze-like feel.
 */
function generateWorldMaze({
  width,
  height,
  roomSetup,
  random = Math.random,
  cellSize,
  density = DEFAULTS.wallDensity,
} = {}) {
  width = Number(width);
  height = Number(height);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new TypeError("World maze generation requires positive finite world width and height.");
  }

  const tools = makeRandomTools(random);
  const { unit, intBetween } = tools;
  const minDimension = Math.min(width, height);
  const targetCellSize = Number.isFinite(Number(cellSize)) && Number(cellSize) > 0
    ? Number(cellSize)
    : Math.max(
        DEFAULTS.minCellSize,
        Math.min(DEFAULTS.maxCellSize, minDimension / DEFAULTS.targetCellsAcrossShortSide)
      );

  // The grid resolution derives from world dimensions, not the ROOM_SETUP row
  // and column count. This creates a finer, consistent-scale layout across maps.
  const columns = Math.max(12, Math.round(width / targetCellSize));
  const rows = Math.max(12, Math.round(height / targetCellSize));
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const shortCellSide = Math.min(cellWidth, cellHeight);
  const maxWallRadius = shortCellSide * 0.54;
  const maxJitterX = cellWidth * DEFAULTS.positionJitterRatio;
  const maxJitterY = cellHeight * DEFAULTS.positionJitterRatio;
  const borderMargin = Math.max(minDimension * DEFAULTS.borderMarginRatio, shortCellSide * 0.9);
  const centerClearX = width * DEFAULTS.centerClearRatio + maxWallRadius + maxJitterX;
  const centerClearY = height * DEFAULTS.centerClearRatio + maxWallRadius + maxJitterY;
  const clearanceX = maxWallRadius + maxJitterX + cellWidth * 0.22;
  const clearanceY = maxWallRadius + maxJitterY + cellHeight * 0.22;
  const specialBounds = getSpecialRoomBounds(roomSetup, width, height);
  const allowed = Array.from({ length: rows }, () => Array(columns).fill(false));
  const candidates = [];

  for (let gridY = 0; gridY < rows; gridY++) {
    for (let gridX = 0; gridX < columns; gridX++) {
      const x = (gridX + 0.5) * cellWidth;
      const y = (gridY + 0.5) * cellHeight;
      if (
        x < borderMargin + maxWallRadius + maxJitterX ||
        x > width - borderMargin - maxWallRadius - maxJitterX ||
        y < borderMargin + maxWallRadius + maxJitterY ||
        y > height - borderMargin - maxWallRadius - maxJitterY
      ) continue;

      // Deliberately reserve a generous middle pocket, not just one room tile.
      if (Math.abs(x - width / 2) < centerClearX && Math.abs(y - height / 2) < centerClearY) continue;

      // Keep named gameplay areas clear, with a smaller halo for ordinary
      // resource rooms so rocks/roids don't make the whole map feel empty.
      let nearSpecialRoom = false;
      for (const bounds of specialBounds) {
        const padX = bounds.resourceTile
          ? Math.max(cellWidth * 0.12, maxWallRadius + maxJitterX - cellWidth * 0.5 + cellWidth * 0.03)
          : clearanceX;
        const padY = bounds.resourceTile
          ? Math.max(cellHeight * 0.12, maxWallRadius + maxJitterY - cellHeight * 0.5 + cellHeight * 0.03)
          : clearanceY;
        if (
          x >= bounds.left - padX && x <= bounds.right + padX &&
          y >= bounds.top - padY && y <= bounds.bottom + padY
        ) {
          nearSpecialRoom = true;
          break;
        }
      }
      if (nearSpecialRoom) continue;

      allowed[gridY][gridX] = true;
      candidates.push([gridX, gridY]);
    }
  }

  const requestedDensity = Number(density);
  const wallDensity = Number.isFinite(requestedDensity)
    ? Math.max(0.08, Math.min(0.24, requestedDensity))
    : DEFAULTS.wallDensity;
  const targetWalls = Math.floor(candidates.length * wallDensity);
  const occupied = Array.from({ length: rows }, () => Array(columns).fill(false));
  const walls = [];
  const maxAttempts = Math.max(100, candidates.length * 8);
  let attempts = 0;

  const addWall = (gridX, gridY) => {
    if (
      gridX < 0 || gridY < 0 || gridX >= columns || gridY >= rows ||
      !allowed[gridY][gridX] || occupied[gridY][gridX]
    ) return false;

    occupied[gridY][gridX] = true;
    const jitterX = (unit() * 2 - 1) * maxJitterX;
    const jitterY = (unit() * 2 - 1) * maxJitterY;
    walls.push({
      x: Math.max(0, Math.min(width, (gridX + 0.5) * cellWidth + jitterX)),
      y: Math.max(0, Math.min(height, (gridY + 0.5) * cellHeight + jitterY)),
      size: shortCellSide * (0.49 + unit() * 0.05),
      gridX,
      gridY,
    });
    return true;
  };

  while (walls.length < targetWalls && attempts++ < maxAttempts) {
    const openCandidates = candidates.filter(([x, y]) => !occupied[y][x]);
    if (!openCandidates.length) break;
    const [anchorX, anchorY] = openCandidates[Math.floor(unit() * openCandidates.length)];
    const pattern = makePattern(tools);
    const before = walls.length;
    for (const [offsetX, offsetY] of pattern) {
      if (walls.length >= targetWalls) break;
      addWall(anchorX + offsetX, anchorY + offsetY);
    }
    // Patterns can be entirely masked at their far end. Always make progress
    // with their empty anchor to keep generation bounded and predictable.
    if (walls.length === before) addWall(anchorX, anchorY);
  }

  return {
    columns,
    rows,
    cellWidth,
    cellHeight,
    candidateCells: candidates.length,
    targetWalls,
    walls,
  };
}

module.exports = {
  shouldRandomizeMaze,
  clearAuthoredWalls,
  generateWorldMaze,
};
