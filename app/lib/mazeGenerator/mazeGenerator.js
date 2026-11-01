"use strict";

const DEFAULTS = Object.freeze({
  // The generated grid is based on the existing in-game ROOM_SETUP grid,
  // generally splitting each room tile into roughly two maze cells. The
  // limits keep the wall count bounded on very fine/coarse maps.
  targetCellsAcrossShortSide: 28,
  minCellSize: 115,
  maxCellSize: 230,
  // Slightly denser than the previous default. The connectivity passes below
  // still remove a small number of blocks to avoid physically trapped pockets.
  wallDensity: 0.48,
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
  // Extra radius used by the physical connectivity pass to approximate the
  // space a normal tank needs to move through a generated corridor.
  minimumTraversalClearanceRatio: 0.16,
  touchingGapRatio: 0.025,
  maxGapResolvePasses: 256,
  specialClearanceBufferRatio: 0.06,
});

const MAZE_LAYOUT_TYPES = Object.freeze([
  "cave-like",
  "natural-maze",
  "lotta-littles",
  "lotta-larges",
  "chaos",
  "simplistic",
]);

function normalizeLayoutType(value, tools) {
  const normalized = String(value || "random").trim().toLowerCase()
    .replace(/[\s_]+/g, "-");
  const aliases = {
    cave: "cave-like", caves: "cave-like", caveish: "cave-like",
    maze: "natural-maze", natural: "natural-maze", naturalmaze: "natural-maze",
    littles: "lotta-littles", "lots-of-littles": "lotta-littles",
    larges: "lotta-larges", "lots-of-larges": "lotta-larges",
    simple: "simplistic",
  };
  const candidate = aliases[normalized] || normalized;
  return MAZE_LAYOUT_TYPES.includes(candidate) ? candidate : tools.choose(MAZE_LAYOUT_TYPES);
}

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

function resolveWallDefinition(name, definitions) {
  if (!definitions || typeof definitions !== "object") return null;
  const requestedName = String(name || "mazewall").trim();
  const normalize = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalized = normalize(requestedName);
  const aliases = { mazewall: "wall", wall: "wall", rock: "obstacle" };
  const keyName = aliases[normalized] || requestedName;
  const direct = definitions[keyName];
  if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct;
  const matchingKey = Object.keys(definitions).find((key) => normalize(key) === normalize(keyName));
  const match = matchingKey ? definitions[matchingKey] : null;
  return match && typeof match === "object" && !Array.isArray(match) ? match : null;
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

function makeCavePattern(tools) {
  const { unit, intBetween } = tools;
  // Slightly broader organic formations give caves enough room for chambers,
  // side pockets, and irregular approaches instead of tiny filled-in blobs.
  const width = intBetween(5, 8);
  const height = intBetween(5, 8);
  let cells = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => unit() < 0.47)
  );

  // Cellular smoothing makes irregular, cave-like masses rather than clean
  // rectangles. Out-of-bounds neighbours count as solid to round the edges.
  for (let pass = 0; pass < 2; pass++) {
    const next = Array.from({ length: height }, () => Array(width).fill(false));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let neighbours = 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue;
            const nx = x + ox;
            const ny = y + oy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height || cells[ny][nx]) {
              neighbours++;
            }
          }
        }
        next[y][x] = neighbours >= 5 || (cells[y][x] && neighbours >= 3);
      }
    }
    cells = next;
  }

  // Carved cells are reserved during placement. They stay open so later
  // formations cannot fill the caves, chambers, or narrow connecting passages.
  const voids = [];
  const carve = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    cells[y][x] = false;
    voids.push([x, y]);
  };

  if (unit() < 0.72) {
    const chamberWidth = width >= 7 && unit() < 0.32 ? 3 : 2;
    const chamberHeight = height >= 7 && unit() < 0.32 ? 3 : 2;
    const chamberX = intBetween(1, width - chamberWidth - 1);
    const chamberY = intBetween(1, height - chamberHeight - 1);
    for (let y = chamberY; y < chamberY + chamberHeight; y++) {
      for (let x = chamberX; x < chamberX + chamberWidth; x++) carve(x, y);
    }

    const exits = [
      { side: "left", distance: chamberX },
      { side: "right", distance: width - chamberX - chamberWidth },
      { side: "top", distance: chamberY },
      { side: "bottom", distance: height - chamberY - chamberHeight },
    ];
    const minDistance = Math.min(...exits.map((exit) => exit.distance));
    const exit = tools.choose(exits.filter((candidate) => candidate.distance === minDistance));
    // The main throat is always two cells wide for reliable traversal.
    const throatX = chamberX + Math.floor((chamberWidth - 2) / 2);
    const throatY = chamberY + Math.floor((chamberHeight - 2) / 2);
    if (exit.side === "left") {
      for (let x = chamberX - 1; x >= 0; x--) {
        carve(x, throatY);
        carve(x, throatY + 1);
      }
    } else if (exit.side === "right") {
      for (let x = chamberX + chamberWidth; x < width; x++) {
        carve(x, throatY);
        carve(x, throatY + 1);
      }
    } else if (exit.side === "top") {
      for (let y = chamberY - 1; y >= 0; y--) {
        carve(throatX, y);
        carve(throatX + 1, y);
      }
    } else {
      for (let y = chamberY + chamberHeight; y < height; y++) {
        carve(throatX, y);
        carve(throatX + 1, y);
      }
    }

    // Many caves also contain a side alcove connected by a short crooked
    // passage. This creates a pocket to explore without sealing the main route.
    if (unit() < 0.56) {
      const branchOptions = [
        { side: "left", dx: -1, dy: 0 },
        { side: "right", dx: 1, dy: 0 },
        { side: "top", dx: 0, dy: -1 },
        { side: "bottom", dx: 0, dy: 1 },
      ].filter((branch) => branch.side !== exit.side);
      const branch = tools.choose(branchOptions);
      const length = intBetween(1, 3);
      let branchX = chamberX + Math.floor(chamberWidth / 2);
      let branchY = chamberY + Math.floor(chamberHeight / 2);
      for (let step = 0; step < length; step++) {
        branchX += branch.dx;
        branchY += branch.dy;
        carve(branchX, branchY);
        if (branch.dx !== 0) carve(branchX, branchY + (unit() < 0.5 ? 1 : -1));
        else carve(branchX + (unit() < 0.5 ? 1 : -1), branchY);
      }
      // Expand the end into a small irregular pocket.
      carve(branchX + 1, branchY);
      carve(branchX, branchY + 1);
      carve(branchX + 1, branchY + 1);
    }
  }

  const points = [];
  const offsetX = Math.floor(width / 2);
  const offsetY = Math.floor(height / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y][x]) points.push([x - offsetX, y - offsetY]);
    }
  }
  // Never let an all-empty cellular pattern stall formation placement.
  if (!points.length) points.push([0, 0]);
  return { points, voids: voids.map(([x, y]) => [x - offsetX, y - offsetY]) };
}

function makeWindingPattern(tools) {
  const { unit, intBetween } = tools;
  const cells = new Map();
  const add = (x, y) => cells.set(`${x}:${y}`, [x, y]);
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  let x = 0;
  let y = 0;
  let direction = Math.floor(unit() * directions.length);
  const thickness = unit() < 0.18 ? 2 : 1;
  const segments = intBetween(7, 11);

  add(x, y);
  for (let segment = 0; segment < segments; segment++) {
    // Mostly turn; occasional straight runs create switchbacks and long halls.
    if (segment > 0 && unit() < 0.82) {
      const turn = unit() < 0.5 ? -1 : 1;
      direction = (direction + turn + directions.length) % directions.length;
    }
    const [dx, dy] = directions[direction];
    const length = intBetween(1, 4);
    for (let step = 0; step < length; step++) {
      if (dx !== 0) {
        for (let t = 0; t < thickness; t++) add(x, y + t);
      } else {
        for (let t = 0; t < thickness; t++) add(x + t, y);
      }
      x += dx;
      y += dy;
      add(x, y);
    }
  }
  return Array.from(cells.values());
}

function makePattern(tools, layoutType) {
  const { unit, intBetween } = tools;
  const roll = unit();
  const cells = [];
  let reservedVoids = [];

  if (layoutType === "cave-like") {
    const cave = makeCavePattern(tools);
    cells.push(...cave.points);
    reservedVoids = cave.voids;
  } else if (layoutType === "natural-maze") {
    cells.push(...makeWindingPattern(tools));
    // Occasional short side branches make the corridors feel hand-dug rather
    // than like a single snake, without breaking the connected formation.
    if (unit() < 0.5) {
      const branchAt = cells[intBetween(0, cells.length - 1)] || [0, 0];
      const branchLength = intBetween(2, 4);
      const [dx, dy] = tools.choose([[1, 0], [0, 1], [-1, 0], [0, -1]]);
      for (let i = 1; i <= branchLength; i++) cells.push([branchAt[0] + dx * i, branchAt[1] + dy * i]);
    }
  } else if (layoutType === "lotta-littles") {
    // Small connected clumps keep this style scattered and granular. Wall
    // radii are reduced separately in addWall().
    const points = new Map([["0:0", [0, 0]]]);
    const count = intBetween(1, 4);
    for (let i = 0; i < count; i++) {
      const existing = Array.from(points.values());
      const [x, y] = tools.choose(existing);
      const [dx, dy] = tools.choose([[1, 0], [0, 1], [-1, 0], [0, -1]]);
      points.set(`${x + dx}:${y + dy}`, [x + dx, y + dy]);
    }
    cells.push(...points.values());
  } else if (layoutType === "lotta-larges") {
    // Broad masses, sometimes with a small interior void, create large
    // formations rather than simply increasing the count of small blocks.
    const width = intBetween(4, 7);
    const height = intBetween(4, 7);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const insidePocket = x > 0 && y > 0 && x < width - 1 && y < height - 1;
        if (insidePocket && unit() < 0.10) reservedVoids.push([x, y]);
        else cells.push([x, y]);
      }
    }
  } else if (layoutType === "simplistic") {
    // Clean rectangular blocks and straight ribs: deliberately little
    // ornamentation compared with cave/chaos/winding styles.
    const rollSimple = unit();
    if (rollSimple < 0.40) {
      const length = intBetween(3, 6);
      const horizontal = unit() < 0.5;
      for (let i = 0; i < length; i++) cells.push(horizontal ? [i, 0] : [0, i]);
    } else {
      const width = intBetween(2, 3);
      const height = intBetween(2, 3);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) cells.push([x, y]);
      }
    }
  } else if (roll < 0.02) {
    // A few isolated stones give large formations breathing room.
    cells.push([0, 0]);
  } else if (roll < 0.10) {
    const width = intBetween(2, unit() < 0.68 ? 3 : 4);
    const height = intBetween(2, unit() < 0.68 ? 3 : 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) cells.push([x, y]);
    }
  } else if (roll < 0.24) {
    // Corridor walls form the long ribs of a maze; two-cell widths remain rare.
    const length = intBetween(3, 7);
    const thicknessRoll = unit();
    const thickness = thicknessRoll < 0.30 ? 2 : thicknessRoll < 0.34 ? 3 : 1;
    const horizontal = unit() < 0.5;
    for (let i = 0; i < length; i++) {
      for (let t = 0; t < thickness; t++) {
        cells.push(horizontal ? [i, t] : [t, i]);
      }
    }
  } else if (roll < 0.34) {
    // L-shaped buttresses make corners and force routes to bend.
    const horizontalLength = intBetween(2, 5);
    const verticalLength = intBetween(2, 5);
    for (let x = 0; x < horizontalLength; x++) cells.push([x, 0]);
    for (let y = 1; y < verticalLength; y++) cells.push([horizontalLength - 1, y]);
    if (unit() < 0.5 && horizontalLength > 2) cells.push([horizontalLength - 2, 1]);
  } else if (roll < 0.44) {
    // Broken, staggered runs create rough natural-looking boundaries.
    const length = intBetween(3, 7);
    for (let x = 0; x < length; x++) {
      const y = Math.floor(x / 2);
      cells.push([x, y]);
      if (unit() < 0.55) cells.push([x, y + 1]);
      if (unit() < 0.24 && x > 0) cells.push([x - 1, y + 1]);
      if (unit() < 0.12 && x > 1) cells.push([x - 2, y + 2]);
    }
  } else if (roll < 0.78) {
    const cave = makeCavePattern(tools);
    cells.push(...cave.points);
    reservedVoids = cave.voids;
  } else {
    // A winding chain makes the map feel labyrinthine rather than tiled.
    cells.push(...makeWindingPattern(tools));
  }

  // Rotate and mirror each formation so corridors and caves grow in every
  // direction rather than creating a visible down-right placement bias.
  const turns = intBetween(0, 3);
  const mirrorX = unit() < 0.5;
  const transform = ([originalX, originalY]) => {
    let x = mirrorX ? -originalX : originalX;
    let y = originalY;
    for (let i = 0; i < turns; i++) [x, y] = [-y, x];
    return [x, y];
  };
  const deduplicate = (points) => Array.from(new Map(
    points.map(([x, y]) => [`${x}:${y}`, [x, y]])
  ).values());
  const transformedCells = deduplicate(cells.map(transform));
  const wallCoordinates = new Set(transformedCells.map(([x, y]) => `${x}:${y}`));
  const transformedVoids = deduplicate(reservedVoids.map(transform))
    .filter(([x, y]) => !wallCoordinates.has(`${x}:${y}`));
  return { cells: transformedCells, voids: transformedVoids };
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

    // Prefer a route that removes as few wall cells as possible, then the
    // shortest such route. The old unweighted BFS routinely cut straight
    // through dense formations and threw away many more walls than necessary.
    const totalCells = columns * rows;
    const wallPenalty = totalCells + 1;
    const distances = new Float64Array(totalCells);
    distances.fill(Infinity);
    const previous = new Int32Array(totalCells);
    previous.fill(-1);
    const cellIndex = (x, y) => y * columns + x;
    const startIndex = cellIndex(enclosed[0], enclosed[1]);
    const heap = [];
    const push = (cost, index) => {
      let i = heap.length;
      heap.push({ cost, index });
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (heap[parent].cost <= cost) break;
        heap[i] = heap[parent];
        i = parent;
      }
      heap[i] = { cost, index };
    };
    const pop = () => {
      if (!heap.length) return null;
      const first = heap[0];
      const last = heap.pop();
      if (heap.length) {
        let i = 0;
        while (true) {
          const left = i * 2 + 1;
          const right = left + 1;
          if (left >= heap.length) break;
          let child = left;
          if (right < heap.length && heap[right].cost < heap[left].cost) child = right;
          if (heap[child].cost >= last.cost) break;
          heap[i] = heap[child];
          i = child;
        }
        heap[i] = last;
      }
      return first;
    };

    distances[startIndex] = 0;
    push(0, startIndex);
    let exitIndex = -1;
    while (heap.length) {
      const current = pop();
      if (!current || current.cost !== distances[current.index]) continue;
      const x = current.index % columns;
      const y = Math.floor(current.index / columns);
      if (x === 0 || y === 0 || x === columns - 1 || y === rows - 1) {
        exitIndex = current.index;
        break;
      }
      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny)) continue;
        const nextIndex = cellIndex(nx, ny);
        const nextCost = current.cost + (wallByCell.has(key(nx, ny)) ? wallPenalty : 1);
        if (nextCost >= distances[nextIndex]) continue;
        distances[nextIndex] = nextCost;
        previous[nextIndex] = current.index;
        push(nextCost, nextIndex);
      }
    }
    if (exitIndex < 0) break;

    const route = [];
    for (let point = exitIndex; point >= 0; point = previous[point]) {
      route.push([point % columns, Math.floor(point / columns)]);
      if (point === startIndex) break;
    }
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
 * Repair enclosed pockets that exist in world-space even though their grid
 * cells look connected. Jitter and variable wall radii can close a route after
 * the cell-grid connectivity pass, leaving tiny spaces a tank cannot enter or
 * leave. A small clearance-expanded raster catches those cases; one boundary
 * wall is removed per repair and the raster is rebuilt until each traversable
 * sample can reach the map edge.
 */
function repairPhysicalClearanceConnectivity(walls, {
  width,
  height,
  columns,
  rows,
  cellWidth,
  cellHeight,
}) {
  if (walls.length < 4 || columns < 3 || rows < 3) return 0;

  // Three samples per world-grid cell detect narrow pockets without turning
  // generation into a high-resolution physics simulation.
  const sampleColumns = columns * 3;
  const sampleRows = rows * 3;
  const stepX = width / sampleColumns;
  const stepY = height / sampleRows;
  const clearance = Math.min(cellWidth, cellHeight) *
    DEFAULTS.minimumTraversalClearanceRatio;
  const sampleCount = sampleColumns * sampleRows;
  const key = (x, y) => y * sampleColumns + x;
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // Connectivity is four-way so agents do not rely on diagonal corner cuts;
  // boundary ownership also checks diagonals so a pinched pocket can still
  // identify the wall that formed its corner.
  const boundaryDirections = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  // Bound startup work on unusually large maps while allowing enough repairs
  // for the small pockets created by ordinary randomized layouts.
  const maxRepairs = Math.min(
    walls.length,
    Math.max(24, Math.min(128, Math.ceil(walls.length * 0.20)))
  );
  let repairs = 0;

  while (repairs < maxRepairs && walls.length) {
    const blocked = new Uint8Array(sampleCount);
    const blockerAt = new Int32Array(sampleCount);
    blockerAt.fill(-1);
    const boundaryPenetration = new Float32Array(sampleCount);
    boundaryPenetration.fill(Infinity);

    // Rasterize only within each wall's expanded bounds, rather than checking
    // every wall against every sample in the world.
    for (let wallIndex = 0; wallIndex < walls.length; wallIndex++) {
      const wall = walls[wallIndex];
      const radius = wall.size + clearance;
      const radiusSquared = radius * radius;
      const minX = Math.max(0, Math.floor((wall.x - radius) / stepX));
      const maxX = Math.min(sampleColumns - 1, Math.floor((wall.x + radius) / stepX));
      const minY = Math.max(0, Math.floor((wall.y - radius) / stepY));
      const maxY = Math.min(sampleRows - 1, Math.floor((wall.y + radius) / stepY));

      for (let y = minY; y <= maxY; y++) {
        const pointY = (y + 0.5) * stepY;
        for (let x = minX; x <= maxX; x++) {
          const pointX = (x + 0.5) * stepX;
          const dx = pointX - wall.x;
          const dy = pointY - wall.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared >= radiusSquared) continue;

          const index = key(x, y);
          blocked[index] = 1;
          // The shallowest overlapping wall sits nearest this sample's edge,
          // making it a good candidate to remove at a pinched passage.
          const penetration = radius - Math.sqrt(distanceSquared);
          if (penetration < boundaryPenetration[index]) {
            boundaryPenetration[index] = penetration;
            blockerAt[index] = wallIndex;
          }
        }
      }
    }

    const reachable = new Uint8Array(sampleCount);
    const queue = new Int32Array(sampleCount);
    let head = 0;
    let tail = 0;
    const addReachable = (x, y) => {
      if (x < 0 || y < 0 || x >= sampleColumns || y >= sampleRows) return;
      const index = key(x, y);
      if (blocked[index] || reachable[index]) return;
      reachable[index] = 1;
      queue[tail++] = index;
    };
    for (let x = 0; x < sampleColumns; x++) {
      addReachable(x, 0);
      addReachable(x, sampleRows - 1);
    }
    for (let y = 0; y < sampleRows; y++) {
      addReachable(0, y);
      addReachable(sampleColumns - 1, y);
    }
    for (; head < tail; head++) {
      const index = queue[head];
      const x = index % sampleColumns;
      const y = Math.floor(index / sampleColumns);
      for (const [dx, dy] of directions) addReachable(x + dx, y + dy);
    }

    // Find the first enclosed free-space component and count which walls form
    // its boundary. Rebuild after each removal to verify the new gap is usable.
    let repairWallIndex = -1;
    let bestBoundaryCount = -1;
    let bestWallSize = Infinity;
    for (let start = 0; start < sampleCount && repairWallIndex < 0; start++) {
      if (blocked[start] || reachable[start]) continue;
      const component = [start];
      const wallBoundaryCounts = new Map();
      reachable[start] = 1; // Reuse as the visited bit for this pocket.

      for (let cursor = 0; cursor < component.length; cursor++) {
        const index = component[cursor];
        const x = index % sampleColumns;
        const y = Math.floor(index / sampleColumns);
        // Count diagonally-touching wall samples as potential boundary walls,
        // but only traverse orthogonal open samples. This avoids leaving a
        // one-pixel pocket behind when blockers meet at a diagonal corner.
        for (const [dx, dy] of boundaryDirections) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= sampleColumns || ny >= sampleRows) continue;
          const neighbor = key(nx, ny);
          if (!blocked[neighbor]) continue;
          const wallIndex = blockerAt[neighbor];
          if (wallIndex >= 0) {
            wallBoundaryCounts.set(wallIndex, (wallBoundaryCounts.get(wallIndex) || 0) + 1);
          }
        }
        for (const [dx, dy] of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= sampleColumns || ny >= sampleRows) continue;
          const neighbor = key(nx, ny);
          if (!blocked[neighbor] && !reachable[neighbor]) {
            reachable[neighbor] = 1;
            component.push(neighbor);
          }
        }
      }

      for (const [wallIndex, boundaryCount] of wallBoundaryCounts) {
        const wall = walls[wallIndex];
        if (!wall) continue;
        if (
          boundaryCount > bestBoundaryCount ||
          (boundaryCount === bestBoundaryCount && wall.size < bestWallSize)
        ) {
          repairWallIndex = wallIndex;
          bestBoundaryCount = boundaryCount;
          bestWallSize = wall.size;
        }
      }
    }

    if (repairWallIndex < 0) break;
    walls.splice(repairWallIndex, 1);
    repairs++;
  }

  return repairs;
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
  layoutType = "random",
} = {}) {
  width = Number(width);
  height = Number(height);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new TypeError("World maze generation requires positive finite world width and height.");
  }

  const tools = makeRandomTools(random);
  const { unit, intBetween } = tools;
  const selectedLayoutType = normalizeLayoutType(layoutType, tools);
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
    ? Math.max(0, Math.min(0.49, requestedDensity))
    : DEFAULTS.wallDensity;
  const targetWalls = Math.floor(candidates.length * wallDensity);
  const occupied = Array.from({ length: rows }, () => Array(columns).fill(false));
  const reservedOpen = Array.from({ length: rows }, () => Array(columns).fill(false));
  const walls = [];
  const styleJitterRatio = selectedLayoutType === "simplistic" ? 0.025
    : selectedLayoutType === "natural-maze" ? 0.10
      : DEFAULTS.positionJitterRatio;
  const styleMaxJitterX = cellWidth * styleJitterRatio;
  const styleMaxJitterY = cellHeight * styleJitterRatio;
  const addWall = (gridX, gridY) => {
    if (
      gridX < 0 || gridY < 0 || gridX >= columns || gridY >= rows ||
      !allowed[gridY][gridX] || occupied[gridY][gridX] || reservedOpen[gridY][gridX]
    ) return false;

    occupied[gridY][gridX] = true;
    const jitterX = (unit() * 2 - 1) * styleMaxJitterX;
    const jitterY = (unit() * 2 - 1) * styleMaxJitterY;
    // Size profile is part of the layout style: little-heavy and large-heavy
    // layouts differ in actual collision radii as well as formation shape.
    let minScale;
    let maxScale;
    if (selectedLayoutType === "lotta-littles") {
      minScale = 0.16;
      maxScale = 0.29;
    } else if (selectedLayoutType === "lotta-larges") {
      minScale = 0.40;
      maxScale = DEFAULTS.maxWallSizeScale;
    } else if (selectedLayoutType === "simplistic") {
      minScale = 0.34;
      maxScale = 0.40;
    } else {
      const sizeRoll = unit();
      if (sizeRoll < 0.10) {
        [minScale, maxScale] = [0.22, 0.29];
      } else if (sizeRoll < 0.30) {
        [minScale, maxScale] = [0.29, 0.36];
      } else if (sizeRoll < 0.78) {
        [minScale, maxScale] = [0.36, 0.43];
      } else {
        [minScale, maxScale] = [0.43, DEFAULTS.maxWallSizeScale];
      }
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

  const canPlacePattern = (anchorX, anchorY, pattern) => {
    const cellsFit = pattern.cells.every(([offsetX, offsetY]) => {
      const gridX = anchorX + offsetX;
      const gridY = anchorY + offsetY;
      return gridX >= 0 && gridY >= 0 && gridX < columns && gridY < rows &&
        allowed[gridY][gridX] && !occupied[gridY][gridX] && !reservedOpen[gridY][gridX];
    });
    if (!cellsFit) return false;
    return pattern.voids.every(([offsetX, offsetY]) => {
      const gridX = anchorX + offsetX;
      const gridY = anchorY + offsetY;
      return gridX >= 0 && gridY >= 0 && gridX < columns && gridY < rows &&
        allowed[gridY][gridX] && !occupied[gridY][gridX] && !reservedOpen[gridY][gridX];
    });
  };

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
      // Prefer formations that can join nearby runs, but penalize fully packed
      // pockets. That creates winding lanes and caves instead of evenly spaced
      // scatter while the connectivity passes still guarantee usable exits.
      const score = spatialPenalty + Math.abs(adjacentWalls - 2) * 1.0 +
        Math.max(0, nearbyWalls - 9) * 0.10 + unit() * 0.8;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  };

  while (walls.length < targetWalls) {
    const openCandidates = candidates.filter(([x, y]) => !occupied[y][x] && !reservedOpen[y][x]);
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
      let pattern = makePattern(tools, selectedLayoutType);
      if (pattern.cells.length > remainingBudget) pattern = { cells: [[0, 0]], voids: [] };
      if (!canPlacePattern(anchorX, anchorY, pattern)) continue;
      for (const [offsetX, offsetY] of pattern.cells) addWall(anchorX + offsetX, anchorY + offsetY);
      for (const [offsetX, offsetY] of pattern.voids) {
        reservedOpen[anchorY + offsetY][anchorX + offsetX] = true;
      }
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
  const clearanceRepairs = repairPhysicalClearanceConnectivity(walls, {
    width,
    height,
    columns,
    rows,
    cellWidth,
    cellHeight,
  });
  // The physical-clearance pass can remove a wall from the middle of a fully
  // filled cave mass, creating a new enclosed grid pocket. Re-run the cheap
  // logical pass afterward so the final layout never contains a sealed region.
  connectOpenRegions(walls, { columns, rows });
  // The logical pass may fill the last grid cell of a one-cell pocket while
  // repairing connectivity; validate physical clearance again on the final
  // arrangement so no tiny world-space pocket is accidentally re-sealed.
  const finalClearanceRepairs = repairPhysicalClearanceConnectivity(walls, {
    width,
    height,
    columns,
    rows,
    cellWidth,
    cellHeight,
  });

  return {
    layoutType: selectedLayoutType,
    columns,
    rows,
    cellWidth,
    cellHeight,
    candidateCells: candidates.length,
    targetWalls,
    clearanceRepairs: clearanceRepairs + finalClearanceRepairs,
    walls,
  };
}

module.exports = {
  MAZE_LAYOUT_TYPES,
  shouldRandomizeMaze,
  resolveWallDefinition,
  clearAuthoredWalls,
  generateWorldMaze,
};
