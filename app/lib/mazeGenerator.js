"use strict";

const DEFAULTS = Object.freeze({
  // The generated grid is based on the existing in-game ROOM_SETUP grid,
  // generally splitting each room tile into roughly two maze cells. The
  // limits keep the wall count bounded on very fine/coarse maps.
  targetCellsAcrossShortSide: 28,
  minCellSize: 115,
  maxCellSize: 230,
  wallDensity: 0.40,
  maxWallSizeScale: 0.52,
  // Bias density away from the exact centre and outer edge, but never forbid
  // either region. Smooth falloffs avoid obvious empty bands.
  centerFadeRatio: 0.15,
  centerDensityFloor: 0.22,
  borderFadeRatio: 0.14,
  borderDensityFloor: 0.18,
  // Real positional variance prevents the layout from reading as a rigid grid.
  positionJitterRatio: 0.17,
  // Narrow clearances are closed up; wider clearances remain useful passages.
  minimumOpeningRatio: 0.42,
  touchingGapRatio: 0.025,
  maxGapResolvePasses: 256,
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

  if (roll < 0.08) {
    // Isolated blocks remain possible, but should be uncommon.
    cells.push([0, 0]);
  } else if (roll < 0.36) {
    // Favor larger, chunky rectangles over a field of tiny individual blocks.
    const width = intBetween(1, unit() < 0.68 ? 3 : 4);
    const height = intBetween(1, unit() < 0.68 ? 3 : 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) cells.push([x, y]);
    }
  } else if (roll < 0.59) {
    // Longer corridors are more frequent, with a meaningful share two blocks thick.
    const length = intBetween(2, 6);
    const thicknessRoll = unit();
    const thickness = thicknessRoll < 0.42 ? 2 : thicknessRoll < 0.48 ? 3 : 1;
    const horizontal = unit() < 0.5;
    for (let i = 0; i < length; i++) {
      for (let t = 0; t < thickness; t++) {
        cells.push(horizontal ? [i, t] : [t, i]);
      }
    }
  } else if (roll < 0.78) {
    // Broader L-shaped chunks make recognizable corners and routes.
    const horizontalLength = intBetween(2, 5);
    const verticalLength = intBetween(2, 5);
    for (let x = 0; x < horizontalLength; x++) cells.push([x, 0]);
    for (let y = 1; y < verticalLength; y++) cells.push([horizontalLength - 1, y]);
    if (unit() < 0.5 && horizontalLength > 2) cells.push([horizontalLength - 2, 1]);
  } else if (roll < 0.93) {
    // Staggered patches create denser clusters without filling whole rectangles.
    const length = intBetween(3, 6);
    for (let x = 0; x < length; x++) {
      const y = Math.floor(x / 2);
      cells.push([x, y]);
      if (unit() < 0.48) cells.push([x, y + 1]);
      if (unit() < 0.18 && x > 0) cells.push([x - 1, y + 1]);
    }
  } else {
    // Larger formations are uncommon, but now often form substantial barriers.
    const horizontal = unit() < 0.5;
    const length = intBetween(4, 8);
    const thicknessRoll = unit();
    const thickness = thicknessRoll < 0.45 ? 2 : thicknessRoll < 0.53 ? 3 : 1;
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
  const addShift = (shifts, wall, dx, dy) => {
    let shift = shifts.get(wall);
    if (!shift) { shift = { x: 0, y: 0 }; shifts.set(wall, shift); }
    shift.x += dx;
    shift.y += dy;
  };
  const applyShifts = (shifts) => {
    for (const [wall, shift] of shifts) {
      wall.x = Math.max(wall.size + edgePadding, Math.min(width - wall.size - edgePadding,
        wall.x + Math.max(-maxStep, Math.min(maxStep, shift.x))));
      wall.y = Math.max(wall.size + edgePadding, Math.min(height - wall.size - edgePadding,
        wall.y + Math.max(-maxStep, Math.min(maxStep, shift.y))));
    }
  };

  // Resolve cardinal openings with axis-aligned movement. The resolver returns
  // whether it changed any positions so it can alternate with the diagonal pass.
  const resolveCardinal = (passes) => {
    let changed = false;
    for (let pass = 0; pass < passes; pass++) {
      const shifts = new Map();
      let found = false;
      const check = (first, second, axis) => {
        const delta = axis === "x" ? second.x - first.x : second.y - first.y;
        if (delta <= 0) return;
        const gap = delta - first.size - second.size;
        if (gap <= touchingGap || gap >= minimumOpening) return;
        found = true;
        const correction = (gap - touchingGap) / 2;
        if (axis === "x") {
          addShift(shifts, first, correction, 0);
          addShift(shifts, second, -correction, 0);
        } else {
          addShift(shifts, first, 0, correction);
          addShift(shifts, second, 0, -correction);
        }
      };
      for (const wall of walls) {
        const right = byCell.get(`${wall.gridX + 1}:${wall.gridY}`);
        const below = byCell.get(`${wall.gridX}:${wall.gridY + 1}`);
        if (right && wall.gridX + 1 < columns) check(wall, right, "x");
        if (below && wall.gridY + 1 < rows) check(wall, below, "y");
      }
      if (!found) break;
      changed = true;
      applyShifts(shifts);
    }
    return changed;
  };

  // Resolve cardinal and diagonal gaps together. A final cardinal-only pass
  // used to reopen diagonal slits that the previous pass had just closed.
  // Alternating both constraints allows the positions to settle without leaving
  // tiny diagonal holes or compromising the minimum straight corridor width.
  const diagonalOffsets = [[1, 1], [-1, 1]];
  const resolveDiagonals = () => {
    const shifts = new Map();
    let found = false;
    for (const wall of walls) {
      for (const [ox, oy] of diagonalOffsets) {
        const other = byCell.get(`${wall.gridX + ox}:${wall.gridY + oy}`);
        if (!other) continue;
        const dx = other.x - wall.x;
        const dy = other.y - wall.y;
        const radiusSum = wall.size + other.size;
        const gapX = Math.max(0, Math.abs(dx) - radiusSum);
        const gapY = Math.max(0, Math.abs(dy) - radiusSum);
        const gap = Math.hypot(gapX, gapY);
        if (!Number.isFinite(gap) || gap <= touchingGap || gap >= minimumOpening) continue;
        found = true;
        const correction = (gap - touchingGap) / 2;
        const moveX = Math.sign(dx) * correction * (gapX / gap);
        const moveY = Math.sign(dy) * correction * (gapY / gap);
        addShift(shifts, wall, moveX, moveY);
        addShift(shifts, other, -moveX, -moveY);
      }
    }
    if (found) applyShifts(shifts);
    return found;
  };

  for (let pass = 0; pass < DEFAULTS.maxGapResolvePasses; pass++) {
    const cardinalChanged = resolveCardinal(1);
    const diagonalChanged = resolveDiagonals();
    if (!cardinalChanged && !diagonalChanged) break;
  }
}


/**
 * Ensure every open grid region can reach the map perimeter. Random clusters can
 * accidentally form a complete ring; carve a two-cell-wide route through the
 * cheapest wall cells whenever a free-space component is enclosed. A two-cell
 * route is intentional: a single grid-cell corridor can be pinched by the
 * collision radii of the wall entities even when its tile is technically open.
 */
function connectOpenRegions(walls, { columns, rows }) {
  if (!walls.length || columns < 3 || rows < 3) return;
  const wallByCell = new Map(walls.map((wall) => [`${wall.gridX}:${wall.gridY}`, wall]));
  const key = (x, y) => `${x}:${y}`;
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < columns && y < rows;
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const flood = () => {
    const seen = new Set();
    const queue = [];
    const add = (x, y) => {
      const k = key(x, y);
      if (inBounds(x, y) && !wallByCell.has(k) && !seen.has(k)) {
        seen.add(k);
        queue.push([x, y]);
      }
    };
    for (let x = 0; x < columns; x++) { add(x, 0); add(x, rows - 1); }
    for (let y = 0; y < rows; y++) { add(0, y); add(columns - 1, y); }
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of directions) add(x + dx, y + dy);
    }
    return { seen, queue };
  };

  // Repeat because carving one route can expose another previously enclosed region.
  for (let pass = 0; pass < columns * rows; pass++) {
    const { seen: exteriorReachable } = flood();
    let enclosed = null;
    for (let y = 1; y < rows - 1 && !enclosed; y++) {
      for (let x = 1; x < columns - 1; x++) {
        const k = key(x, y);
        if (wallByCell.has(k) || exteriorReachable.has(k)) continue;
        enclosed = [x, y];
        break;
      }
    }
    if (!enclosed) break;

    // BFS through open cells at zero cost and wall cells at one cost is not
    // needed here: a normal BFS finds a short route, then only wall cells on it
    // are removed. This keeps the repair deterministic and bounded.
    const queue = [enclosed];
    const previous = new Map([[key(...enclosed), null]]);
    let exit = null;
    for (let i = 0; i < queue.length && !exit; i++) {
      const [x, y] = queue[i];
      if (x === 0 || y === 0 || x === columns - 1 || y === rows - 1) {
        exit = [x, y];
        break;
      }
      for (const [dx, dy] of directions) {
        const nx = x + dx, ny = y + dy, nk = key(nx, ny);
        if (!inBounds(nx, ny) || previous.has(nk)) continue;
        previous.set(nk, [x, y]);
        queue.push([nx, ny]);
      }
    }
    if (!exit) break;

    const route = [];
    for (let point = exit; point; point = previous.get(key(...point))) route.push(point);
    route.reverse();
    const carve = new Set();
    for (let i = 0; i < route.length; i++) {
      const [x, y] = route[i];
      carve.add(key(x, y));
      const next = route[i + 1];
      const previousPoint = route[i - 1];
      const reference = next || previousPoint;
      if (!reference) continue;
      const dx = next ? next[0] - x : x - previousPoint[0];
      const dy = next ? next[1] - y : y - previousPoint[1];
      // Clear one consistent perpendicular cell as well as the route cell. This
      // creates a two-cell-wide exit without erasing three adjacent wall bands.
      const px = -dy;
      const py = dx;
      if (inBounds(x + px, y + py)) carve.add(key(x + px, y + py));
    }
    for (const k of carve) wallByCell.delete(k);
    if (wallByCell.size === 0) break;
  }

  const kept = walls.filter((wall) => wallByCell.has(key(wall.gridX, wall.gridY)));
  walls.splice(0, walls.length, ...kept);
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
      if (nearSpecialRoom) continue;

      allowed[gridY][gridX] = true;
      candidates.push([
        gridX,
        gridY,
        getPlacementWeight(x, y, width, height, minDimension),
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
  connectOpenRegions(walls, { columns, rows });

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
