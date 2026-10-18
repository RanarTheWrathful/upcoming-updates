"use strict";

const DEFAULTS = Object.freeze({
  // The generated grid is based on the existing in-game ROOM_SETUP grid,
  // generally splitting each room tile into roughly two maze cells. The
  // limits keep the wall count bounded on very fine/coarse maps.
  targetCellsAcrossShortSide: 28,
  minCellSize: 115,
  maxCellSize: 230,
  wallDensity: 0.35,
  maxWallSizeScale: 0.76,
  borderMarginRatio: 0.035,
  centerClearRatio: 0.055,
  positionJitterRatio: 0.055,
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

  if (roll < 0.16) {
    // Frequent single blocks keep gaps and alternate routes throughout the map.
    cells.push([0, 0]);
  } else if (roll < 0.40) {
    // Mostly small/medium rectangular islands, with occasional larger chunks.
    const width = intBetween(1, unit() < 0.82 ? 3 : 4);
    const height = intBetween(1, unit() < 0.82 ? 3 : 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) cells.push([x, y]);
    }
  } else if (roll < 0.65) {
    // Short corridors form readable runs without creating too many huge slabs.
    const length = intBetween(2, 5);
    const thickness = unit() < 0.22 ? 2 : 1;
    const horizontal = unit() < 0.5;
    for (let i = 0; i < length; i++) {
      for (let t = 0; t < thickness; t++) {
        cells.push(horizontal ? [i, t] : [t, i]);
      }
    }
  } else if (roll < 0.84) {
    // Short L-shaped chunks introduce turns and small sheltered pockets.
    const horizontalLength = intBetween(2, 4);
    const verticalLength = intBetween(2, 4);
    for (let x = 0; x < horizontalLength; x++) cells.push([x, 0]);
    for (let y = 1; y < verticalLength; y++) cells.push([horizontalLength - 1, y]);
    if (unit() < 0.3 && horizontalLength > 2) cells.push([horizontalLength - 2, 1]);
  } else if (roll < 0.95) {
    // Staggered clusters create uneven but traversable maze-like patterns.
    const length = intBetween(3, 5);
    for (let x = 0; x < length; x++) {
      const y = Math.floor(x / 2);
      cells.push([x, y]);
      if (unit() < 0.36) cells.push([x, y + 1]);
    }
  } else {
    // Rare large formations provide landmarks without dominating the map.
    const horizontal = unit() < 0.5;
    const length = intBetween(4, 7);
    const thickness = unit() < 0.35 ? 2 : 1;
    for (let i = 0; i < length; i++) {
      for (let t = 0; t < thickness; t++) {
        cells.push(horizontal ? [i, t] : [t, i]);
      }
    }
  }

  // Rotate and mirror each formation so the patterns are not all axis-aligned
  // in the same direction. Normalize offsets so the chosen anchor is stable.
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
  const hasRoomGrid = isPlainGrid(roomSetup);
  const roomTileSide = hasRoomGrid
    ? Math.min(width / roomSetup[0].length, height / roomSetup.length)
    : minDimension / DEFAULTS.targetCellsAcrossShortSide;
  const gridReferencedCellSize = Math.max(
    DEFAULTS.minCellSize,
    Math.min(DEFAULTS.maxCellSize, roomTileSide / 2)
  );
  const targetCellSize = Number.isFinite(Number(cellSize)) && Number(cellSize) > 0
    ? Number(cellSize)
    : gridReferencedCellSize;

  // The grid resolution derives from world dimensions, not the ROOM_SETUP row
  // and column count. This creates a finer, consistent-scale layout across maps.
  const columns = Math.max(12, Math.round(width / targetCellSize));
  const rows = Math.max(12, Math.round(height / targetCellSize));
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const shortCellSide = Math.min(cellWidth, cellHeight);
  // SIZE is the wall's radius in world units. Reserve space using the largest
  // allowed size, not an average size, so even oversized blocks stay in bounds.
  const maxWallRadius = shortCellSide * DEFAULTS.maxWallSizeScale;
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
    ? Math.max(0, Math.min(0.45, requestedDensity))
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
    // Mix tiny, standard, chunky, and oversized blocks. Scale is relative to
    // the world-grid cell, whose size is itself derived from ROOM_SETUP, so
    // wall dimensions remain meaningful as map dimensions/grid counts change.
    const sizeRoll = unit();
    let minScale;
    let maxScale;
    if (sizeRoll < 0.18) {
      [minScale, maxScale] = [0.25, 0.35];
    } else if (sizeRoll < 0.46) {
      [minScale, maxScale] = [0.35, 0.46];
    } else if (sizeRoll < 0.79) {
      [minScale, maxScale] = [0.46, 0.61];
    } else {
      [minScale, maxScale] = [0.61, DEFAULTS.maxWallSizeScale];
    }
    const size = shortCellSide * (minScale + unit() * (maxScale - minScale));
    walls.push({
      x: Math.max(0, Math.min(width, (gridX + 0.5) * cellWidth + jitterX)),
      y: Math.max(0, Math.min(height, (gridY + 0.5) * cellHeight + jitterY)),
      size,
      gridX,
      gridY,
    });
    return true;
  };

  while (walls.length < targetWalls && attempts++ < maxAttempts) {
    const openCandidates = candidates.filter(([x, y]) => !occupied[y][x]);
    if (!openCandidates.length) break;

    // Sample several free cells and prefer the one with fewer nearby walls.
    // This spreads formations around the map while still letting each chosen
    // pattern create local corridors and clusters.
    let anchor = openCandidates[Math.floor(unit() * openCandidates.length)];
    let bestNearbyWalls = Infinity;
    const sampleCount = Math.min(12, openCandidates.length);
    for (let sample = 0; sample < sampleCount; sample++) {
      const candidate = openCandidates[Math.floor(unit() * openCandidates.length)];
      let nearbyWalls = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = candidate[0] + dx;
          const ny = candidate[1] + dy;
          if (nx >= 0 && ny >= 0 && nx < columns && ny < rows && occupied[ny][nx]) nearbyWalls++;
        }
      }
      if (nearbyWalls < bestNearbyWalls || (nearbyWalls === bestNearbyWalls && unit() < 0.35)) {
        anchor = candidate;
        bestNearbyWalls = nearbyWalls;
      }
    }
    const [anchorX, anchorY] = anchor;
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
