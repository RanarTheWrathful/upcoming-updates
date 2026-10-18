"use strict";

const DEFAULTS = Object.freeze({
  // The generated grid is based on the existing in-game ROOM_SETUP grid,
  // generally splitting each room tile into roughly two maze cells. The
  // limits keep the wall count bounded on very fine/coarse maps.
  targetCellsAcrossShortSide: 28,
  minCellSize: 115,
  maxCellSize: 230,
  wallDensity: 0.35,
  maxWallSizeScale: 0.48,
  // Bias density away from the exact centre and outer edge, but never forbid
  // either region. Smooth falloffs avoid obvious empty bands.
  centerFadeRatio: 0.15,
  centerDensityFloor: 0.22,
  borderFadeRatio: 0.14,
  borderDensityFloor: 0.18,
  // Real positional variance prevents the layout from reading as a rigid grid.
  positionJitterRatio: 0.20,
  // Narrow clearances are closed up; wider clearances remain useful passages.
  minimumOpeningRatio: 0.42,
  touchingGapRatio: 0.025,
  maxGapResolvePasses: 128,
  specialClearanceBufferRatio: 0.06,
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
// All area markers remain intact: nest/rock/roid tiles are eligible wall zones,
// while bases and other special markers act as clearance zones.
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

// Maze walls may occupy normal terrain, nests, and obstacle/resource tiles.
// Bases, objectives, portals, gates, and other named special tiles remain protected.
function isSpecialRoomTile(tile) {
  if (typeof tile !== "string") return true;
  return !["norm", "wall", "nest", "rock", "roid"].includes(tile.toLowerCase());
}

function getRoomTileAtPoint(roomSetup, x, y, width, height) {
  if (!isPlainGrid(roomSetup)) return null;
  const row = Math.min(roomSetup.length - 1, Math.max(0, Math.floor((y / height) * roomSetup.length)));
  const column = Math.min(roomSetup[0].length - 1, Math.max(0, Math.floor((x / width) * roomSetup[0].length)));
  return roomSetup[row][column];
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
      bounds.push({
        left: (x * width) / columns,
        right: ((x + 1) * width) / columns,
        top: (y * height) / rows,
        bottom: ((y + 1) * height) / rows,
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

  // Rotate and mirror each formation around its anchor. Keeping negative
  // offsets allows shapes to grow in every direction instead of always down-right.
  const turns = intBetween(0, 3);
  const mirrorX = unit() < 0.5;
  const transformed = cells.map(([originalX, originalY]) => {
    let x = mirrorX ? -originalX : originalX;
    let y = originalY;
    for (let i = 0; i < turns; i++) [x, y] = [-y, x];
    return [x, y];
  });
  return transformed;
}

function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

// Centre and border cells remain legal but receive less selection weight.
// The gradual falloff prevents a hard empty ring or a perfectly empty centre.
function getPlacementWeight(x, y, width, height, minDimension) {
  const edgeDistance = Math.min(x, width - x, y, height - y);
  const edgeProgress = edgeDistance / (minDimension * DEFAULTS.borderFadeRatio);
  const borderWeight = DEFAULTS.borderDensityFloor +
    (1 - DEFAULTS.borderDensityFloor) * smoothstep(edgeProgress);

  const centerDistance = Math.hypot(x - width / 2, y - height / 2);
  const centerProgress = centerDistance / (minDimension * DEFAULTS.centerFadeRatio);
  const centerWeight = DEFAULTS.centerDensityFloor +
    (1 - DEFAULTS.centerDensityFloor) * smoothstep(centerProgress);

  return Math.max(0.01, borderWeight * centerWeight);
}

/**
 * Resolve slits between orthogonally adjacent blocks. A positive gap smaller
 * than a usable opening is closed by moving both blocks toward each other.
 * Accumulating pair forces before moving anything lets a block between two
 * narrow gaps settle naturally between both neighbours rather than snapping
 * arbitrarily toward whichever one happened to be processed first.
 */
function closeNarrowOpenings(walls, {
  columns,
  rows,
  width,
  height,
  shortCellSide,
}) {
  if (walls.length < 2) return;

  const byCell = new Map(walls.map((wall) => [`${wall.gridX}:${wall.gridY}`, wall]));
  const minimumOpening = shortCellSide * DEFAULTS.minimumOpeningRatio;
  const touchingGap = shortCellSide * DEFAULTS.touchingGapRatio;
  const maxStep = shortCellSide * DEFAULTS.minimumOpeningRatio * 0.5;
  const edgePadding = Math.max(2, shortCellSide * 0.025);

  for (let pass = 0; pass < DEFAULTS.maxGapResolvePasses; pass++) {
    const shifts = new Map();
    let foundNarrowGap = false;
    const addShift = (wall, dx, dy) => {
      let shift = shifts.get(wall);
      if (!shift) {
        shift = { x: 0, y: 0 };
        shifts.set(wall, shift);
      }
      shift.x += dx;
      shift.y += dy;
    };

    const checkPair = (first, second, axis) => {
      const delta = axis === "x" ? second.x - first.x : second.y - first.y;
      // Grid jitter and the previous corrections should preserve ordering. If
      // malformed inputs ever break it, leave the pair alone rather than flip it.
      if (delta <= 0) return;
      const gap = delta - first.size - second.size;
      if (gap <= touchingGap || gap >= minimumOpening) return;

      foundNarrowGap = true;
      const correction = (gap - touchingGap) / 2;
      if (axis === "x") {
        addShift(first, correction, 0);
        addShift(second, -correction, 0);
      } else {
        addShift(first, 0, correction);
        addShift(second, 0, -correction);
      }
    };

    for (const wall of walls) {
      const right = byCell.get(`${wall.gridX + 1}:${wall.gridY}`);
      const below = byCell.get(`${wall.gridX}:${wall.gridY + 1}`);
      if (right && right.gridX < columns) checkPair(wall, right, "x");
      if (below && below.gridY < rows) checkPair(wall, below, "y");
    }

    if (!foundNarrowGap) break;
    for (const [wall, shift] of shifts) {
      wall.x = Math.max(
        wall.size + edgePadding,
        Math.min(width - wall.size - edgePadding,
          wall.x + Math.max(-maxStep, Math.min(maxStep, shift.x)))
      );
      wall.y = Math.max(
        wall.size + edgePadding,
        Math.min(height - wall.size - edgePadding,
          wall.y + Math.max(-maxStep, Math.min(maxStep, shift.y)))
      );
    }
  }
}

/**
 * Create a randomized maze on a world-space grid unrelated to ROOM_SETUP's
 * dimensions. ROOM_SETUP is used as a placement mask: walls can appear in
 * normal, nest, and obstacle/resource tiles, while bases/objectives/gates and
 * other special tiles keep a clearance zone.
 *
 * The output contains one wall entity position per occupied world-grid cell.
 * Size variation, substantial positional jitter, weighted placement and gap
 * relaxation keep the result irregular while preserving connected formations.
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
  // SIZE is the wall's collision radius. Leave room for both positional jitter
  // and the gap resolver's maximum adjustment when protecting special zones.
  const maxWallRadius = shortCellSide * DEFAULTS.maxWallSizeScale;
  const maxJitterX = cellWidth * DEFAULTS.positionJitterRatio;
  const maxJitterY = cellHeight * DEFAULTS.positionJitterRatio;
  const maxPlacementShiftX = shortCellSide * DEFAULTS.minimumOpeningRatio * 0.5;
  const maxPlacementShiftY = maxPlacementShiftX;
  const clearanceX = maxWallRadius + maxJitterX + maxPlacementShiftX + cellWidth * DEFAULTS.specialClearanceBufferRatio;
  const clearanceY = maxWallRadius + maxJitterY + maxPlacementShiftY + cellHeight * DEFAULTS.specialClearanceBufferRatio;
  const edgePadding = Math.max(2, shortCellSide * 0.025);
  const specialBounds = getSpecialRoomBounds(roomSetup, width, height);
  const allowed = Array.from({ length: rows }, () => Array(columns).fill(false));
  const candidates = [];

  // Reserve two gently meandering, three-cell-wide travel corridors across the
  // map. They guarantee that the generated wall field cannot seal the world
  // into isolated regions, while the random walk keeps them from looking like
  // rigid cross-shaped highways. Corridors only affect generated walls.
  const reserved = Array.from({ length: rows }, () => Array(columns).fill(false));
  let corridorY = Math.floor(rows / 2);
  for (let x = 0; x < columns; x++) {
    if (unit() < 0.34) corridorY += intBetween(0, 1) ? 1 : -1;
    corridorY = Math.max(2, Math.min(rows - 3, corridorY));
    for (let dy = -1; dy <= 1; dy++) reserved[corridorY + dy][x] = true;
  }
  let corridorX = Math.floor(columns / 2);
  for (let y = 0; y < rows; y++) {
    if (unit() < 0.34) corridorX += intBetween(0, 1) ? 1 : -1;
    corridorX = Math.max(2, Math.min(columns - 3, corridorX));
    for (let dx = -1; dx <= 1; dx++) reserved[y][corridorX + dx] = true;
  }

  for (let gridY = 0; gridY < rows; gridY++) {
    for (let gridX = 0; gridX < columns; gridX++) {
      const x = (gridX + 0.5) * cellWidth;
      const y = (gridY + 0.5) * cellHeight;
      // The outermost cells are valid too. Final positions are clamped using
      // each wall's actual size, while selection weighting discourages excessive
      // edge density instead of imposing a hard border exclusion.
      // Named special areas retain a clearance halo; nest and obstacle/resource
      // tiles are intentionally omitted from this list and can host wall blocks.
      let nearSpecialRoom = false;
      for (const bounds of specialBounds) {
        if (
          x >= bounds.left - clearanceX && x <= bounds.right + clearanceX &&
          y >= bounds.top - clearanceY && y <= bounds.bottom + clearanceY
        ) {
          nearSpecialRoom = true;
          break;
        }
      }
      const roomTile = getRoomTileAtPoint(roomSetup, x, y, width, height);
      const isObstacleTile = typeof roomTile === "string" &&
        ["nest", "rock", "roid"].includes(roomTile.toLowerCase());
      if (nearSpecialRoom || (reserved[gridY][gridX] && !isObstacleTile)) continue;

      allowed[gridY][gridX] = true;
      const placementWeight = getPlacementWeight(x, y, width, height, minDimension);
      candidates.push([
        gridX,
        gridY,
        isObstacleTile ? placementWeight * 2.5 : placementWeight,
      ]);
    }
  }

  const requestedDensity = Number(density);
  const wallDensity = Number.isFinite(requestedDensity)
    ? Math.max(0, Math.min(0.45, requestedDensity))
    : DEFAULTS.wallDensity;
  const targetWalls = Math.floor(candidates.length * wallDensity);
  const occupied = Array.from({ length: rows }, () => Array(columns).fill(false));
  const walls = [];
  const addWall = (gridX, gridY) => {
    if (
      gridX < 0 || gridY < 0 || gridX >= columns || gridY >= rows ||
      !allowed[gridY][gridX] || occupied[gridY][gridX]
    ) return false;

    occupied[gridY][gridX] = true;
    const jitterX = (unit() * 2 - 1) * maxJitterX;
    const jitterY = (unit() * 2 - 1) * maxJitterY;
    // Keep wall blocks within roughly one grid cell. A few small blocks add
    // texture, while the bulk remain large enough to form recognizable runs.
    const sizeRoll = unit();
    let minScale;
    let maxScale;
    if (sizeRoll < 0.10) {
      [minScale, maxScale] = [0.22, 0.29];
    } else if (sizeRoll < 0.30) {
      [minScale, maxScale] = [0.29, 0.36];
    } else if (sizeRoll < 0.78) {
      [minScale, maxScale] = [0.36, 0.43];
    } else {
      [minScale, maxScale] = [0.43, DEFAULTS.maxWallSizeScale];
    }
    const size = shortCellSide * (minScale + unit() * (maxScale - minScale));
    walls.push({
      // Clamp by the actual size so even walls very close to the map boundary
      // stay fully inside it. Positions still vary by a meaningful fraction of
      // the cell rather than snapping to each grid centre.
      x: Math.max(size + edgePadding, Math.min(width - size - edgePadding,
        (gridX + 0.5) * cellWidth + jitterX)),
      y: Math.max(size + edgePadding, Math.min(height - size - edgePadding,
        (gridY + 0.5) * cellHeight + jitterY)),
      size,
      gridX,
      gridY,
    });
    return true;
  };

  const canPlacePattern = (anchorX, anchorY, pattern) => pattern.every(([offsetX, offsetY]) => {
    const gridX = anchorX + offsetX;
    const gridY = anchorY + offsetY;
    return gridX >= 0 && gridY >= 0 && gridX < columns && gridY < rows &&
      allowed[gridY][gridX] && !occupied[gridY][gridX];
  });

  const makeWeightedPicker = (openCandidates) => {
    const cumulativeWeights = [];
    let totalWeight = 0;
    for (const candidate of openCandidates) {
      totalWeight += candidate[2];
      cumulativeWeights.push(totalWeight);
    }
    return () => {
      const roll = unit() * totalWeight;
      let low = 0;
      let high = cumulativeWeights.length - 1;
      while (low < high) {
        const middle = (low + high) >> 1;
        if (roll < cumulativeWeights[middle]) high = middle;
        else low = middle + 1;
      }
      return openCandidates[low];
    };
  };

  const chooseAnchor = (openCandidates, pickWeightedCandidate) => {
    let best = pickWeightedCandidate();
    let bestScore = Infinity;
    const sampleCount = Math.min(16, openCandidates.length);
    for (let sample = 0; sample < sampleCount; sample++) {
      const candidate = pickWeightedCandidate();
      let adjacentWalls = 0;
      let nearbyWalls = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = candidate[0] + dx;
          const ny = candidate[1] + dy;
          if (nx < 0 || ny < 0 || nx >= columns || ny >= rows || !occupied[ny][nx]) continue;
          nearbyWalls++;
          if (Math.abs(dx) + Math.abs(dy) === 1) adjacentWalls++;
        }
      }
      // Spatial weighting discourages the centre and border. Neighbour scoring
      // still forms clusters and corridors instead of isolated random rubble.
      const spatialPenalty = (1 - candidate[2]) * 2.5;
      const score = spatialPenalty + Math.abs(adjacentWalls - 1) * 1.5 +
        Math.max(0, nearbyWalls - 7) * 0.18 + unit() * 0.8;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  };

  while (walls.length < targetWalls) {
    const openCandidates = candidates.filter(([x, y]) => !occupied[y][x]);
    if (!openCandidates.length) break;

    let placedPattern = false;
    const pickWeightedCandidate = makeWeightedPicker(openCandidates);
    let fallbackAnchor = pickWeightedCandidate();
    const attemptsForPattern = Math.min(12, openCandidates.length);
    const remainingBudget = targetWalls - walls.length;

    // Only place complete formations. The old behavior silently dropped any
    // pattern cells masked by protected areas or existing walls, which left
    // awkward partial rectangles and corridors along clearance-zone edges.
    for (let attempt = 0; attempt < attemptsForPattern; attempt++) {
      const [anchorX, anchorY] = chooseAnchor(openCandidates, pickWeightedCandidate);
      fallbackAnchor = [anchorX, anchorY];
      let pattern = makePattern(tools);
      if (pattern.length > remainingBudget) pattern = [[0, 0]];
      if (!canPlacePattern(anchorX, anchorY, pattern)) continue;
      for (const [offsetX, offsetY] of pattern) addWall(anchorX + offsetX, anchorY + offsetY);
      placedPattern = true;
      break;
    }

    // Every fallback anchor comes from an unoccupied, allowed cell, so this
    // path guarantees progress even when no complete multi-cell pattern fits.
    if (!placedPattern) addWall(fallbackAnchor[0], fallbackAnchor[1]);
  }

  closeNarrowOpenings(walls, {
    columns,
    rows,
    width,
    height,
    shortCellSide,
  });

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
