"use strict";

const assert = require("assert");
const maze = require("../lib/mazeGenerator");

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function assertPhysicalClearanceConnectivity(layout, width, height) {
  const sampleColumns = layout.columns * 3;
  const sampleRows = layout.rows * 3;
  const stepX = width / sampleColumns;
  const stepY = height / sampleRows;
  const clearance = Math.min(layout.cellWidth, layout.cellHeight) * 0.16;
  const blocked = new Uint8Array(sampleColumns * sampleRows);
  const indexOf = (x, y) => y * sampleColumns + x;
  for (const wall of layout.walls) {
    const radius = wall.size + clearance;
    const radiusSquared = radius * radius;
    const minX = Math.max(0, Math.floor((wall.x - radius) / stepX));
    const maxX = Math.min(sampleColumns - 1, Math.floor((wall.x + radius) / stepX));
    const minY = Math.max(0, Math.floor((wall.y - radius) / stepY));
    const maxY = Math.min(sampleRows - 1, Math.floor((wall.y + radius) / stepY));
    for (let y = minY; y <= maxY; y++) {
      const py = (y + 0.5) * stepY;
      for (let x = minX; x <= maxX; x++) {
        const px = (x + 0.5) * stepX;
        if ((px - wall.x) ** 2 + (py - wall.y) ** 2 < radiusSquared) {
          blocked[indexOf(x, y)] = 1;
        }
      }
    }
  }
  const reachable = new Uint8Array(blocked.length);
  const queue = new Int32Array(blocked.length);
  let head = 0;
  let tail = 0;
  const visit = (x, y) => {
    if (x < 0 || y < 0 || x >= sampleColumns || y >= sampleRows) return;
    const index = indexOf(x, y);
    if (blocked[index] || reachable[index]) return;
    reachable[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < sampleColumns; x++) {
    visit(x, 0);
    visit(x, sampleRows - 1);
  }
  for (let y = 0; y < sampleRows; y++) {
    visit(0, y);
    visit(sampleColumns - 1, y);
  }
  for (; head < tail; head++) {
    const index = queue[head];
    const x = index % sampleColumns;
    const y = Math.floor(index / sampleColumns);
    visit(x + 1, y);
    visit(x - 1, y);
    visit(x, y + 1);
    visit(x, y - 1);
  }
  for (let index = 0; index < blocked.length; index++) {
    assert(blocked[index] || reachable[index],
      "every physically traversable clearance sample should connect to the world perimeter");
  }
}

const source = Array.from({ length: 15 }, () => Array(15).fill("norm"));
source[6][6] = "nest";
source[6][7] = "nest";
source[7][6] = "nest";
source[7][7] = "nest";
source[1][1] = "bas1";
source[1][13] = "bas2";
source[13][1] = "bas3";
source[13][13] = "bas4";
// A compact obstacle region makes sure generated walls are permitted in it,
// rather than testing a single resource tile that random distribution may miss.
source[3][5] = "rock";
source[3][6] = "rock";
source[4][5] = "rock";
source[4][6] = "rock";
source[10][10] = "roid";
source[10][11] = "roid";
source[11][10] = "roid";
source[11][11] = "roid";
source[4][4] = "wall";

assert.strictEqual(
  maze.shouldRandomizeMaze({ serverType: "normal", modeName: "Maze Execution", settings: { MODE: "execution" } }),
  true
);
assert.strictEqual(
  maze.shouldRandomizeMaze({ serverType: "lore", modeName: "Maze Lore", settings: { MAZE_GENERATION: true } }),
  false
);
assert.strictEqual(
  maze.shouldRandomizeMaze({ serverType: "normal", modeName: "Sandbox", settings: { MAZE_GENERATION: true } }),
  true
);
assert.strictEqual(
  maze.shouldRandomizeMaze({ serverType: "normal", modeName: "Sandbox", settings: {} }),
  false
);

const sourceBefore = JSON.stringify(source);
const cleared = maze.clearAuthoredWalls(source);
assert.strictEqual(JSON.stringify(source), sourceBefore, "clearing walls must not mutate the mode's source setup");
assert.strictEqual(cleared[4][4], "norm", "old hand-authored wall cells should be cleared");
assert.strictEqual(cleared[6][6], "nest", "named gameplay tiles must be preserved");
assert.strictEqual(cleared[1][1], "bas1", "base tiles must be preserved");

const generated = maze.generateWorldMaze({
  width: 4000,
  height: 4000,
  roomSetup: cleared,
  layoutType: "chaos",
  random: seededRandom(0xC0FFEE),
});
const alternate = maze.generateWorldMaze({
  width: 4000,
  height: 4000,
  roomSetup: cleared,
  layoutType: "chaos",
  random: seededRandom(0x51A7),
});
assert.strictEqual(generated.layoutType, "chaos", "the requested maze style should be reported");

assert(maze.MAZE_LAYOUT_TYPES.includes(maze.generateWorldMaze({
  width: 2000, height: 2000, roomSetup: cleared, random: seededRandom(0xA11CE), density: 0,
}).layoutType), "the default generation style should randomly choose a supported layout");
for (const style of maze.MAZE_LAYOUT_TYPES) {
  const styleLayout = maze.generateWorldMaze({
    width: 2600,
    height: 2600,
    roomSetup: cleared,
    layoutType: style,
    density: 0.24,
    random: seededRandom(0xACED + maze.MAZE_LAYOUT_TYPES.indexOf(style)),
  });
  assert.strictEqual(styleLayout.layoutType, style, `${style} should stay selected for the generated layout`);
  assert(styleLayout.walls.every((wall) => Number.isFinite(wall.x) && Number.isFinite(wall.y) && wall.size > 0),
    `${style} should generate valid wall entities`);
  assertPhysicalClearanceConnectivity(styleLayout, 2600, 2600);
}
const littleStyle = maze.generateWorldMaze({
  width: 2600, height: 2600, roomSetup: cleared, layoutType: "lotta-littles", density: 0.24, random: seededRandom(0xBEEF),
});
const largeStyle = maze.generateWorldMaze({
  width: 2600, height: 2600, roomSetup: cleared, layoutType: "lotta-larges", density: 0.24, random: seededRandom(0xBEEF),
});
assert(Math.max(...littleStyle.walls.map((wall) => wall.size)) < Math.min(...largeStyle.walls.map((wall) => wall.size)),
  "lotta-littles and lotta-larges must use distinct physical size profiles");
assert.strictEqual(maze.resolveWallDefinition("mazewall", { wall: { key: "wall" }, obstacle: { key: "obstacle" } }).key, "wall",
  "mazewall should resolve to the default exported wall definition");
assert.strictEqual(maze.resolveWallDefinition("Maze Wall", { wall: { key: "wall" } }).key, "wall",
  "the visible Maze Wall name should resolve to the default wall definition");
assert.strictEqual(maze.resolveWallDefinition("ObStAcLe", { obstacle: { key: "obstacle" } }).key, "obstacle",
  "other exported entity definitions should be selectable case-insensitively");
assert.strictEqual(maze.resolveWallDefinition("missing", { wall: { key: "wall" } }), null,
  "unknown entity classes should fall back explicitly in server setup");

assert(generated.columns > cleared[0].length, "world-grid resolution should be independent of, and finer than, ROOM_SETUP");
assert(generated.rows > cleared.length, "world-grid row count should not be copied from ROOM_SETUP");
assert(generated.walls.length > 25, "the generator should make a meaningful number of wall blocks");
assert(generated.targetWalls > generated.candidateCells * 0.30, "default maze density should be significantly denser than the old 23% setting");
assert(generated.walls.length < generated.targetWalls, "connectivity repair should carve openings when random formations enclose regions");
assert(generated.walls.length > generated.candidateCells * 0.30,
  "two-cell connectivity corridors should preserve a denser wall layout after connectivity repair");
const occupiedCells = new Set(generated.walls.map((wall) => `${wall.gridX}:${wall.gridY}`));
const reachable = new Set();
const queue = [];
const addOpen = (x, y) => {
  const key = `${x}:${y}`;
  if (x < 0 || y < 0 || x >= generated.columns || y >= generated.rows || occupiedCells.has(key) || reachable.has(key)) return;
  reachable.add(key);
  queue.push([x, y]);
};
for (let x = 0; x < generated.columns; x++) {
  addOpen(x, 0);
  addOpen(x, generated.rows - 1);
}
for (let y = 0; y < generated.rows; y++) {
  addOpen(0, y);
  addOpen(generated.columns - 1, y);
}
for (let i = 0; i < queue.length; i++) {
  const [x, y] = queue[i];
  addOpen(x + 1, y);
  addOpen(x - 1, y);
  addOpen(x, y + 1);
  addOpen(x, y - 1);
}
for (let y = 1; y < generated.rows - 1; y++) {
  for (let x = 1; x < generated.columns - 1; x++) {
    assert(occupiedCells.has(`${x}:${y}`) || reachable.has(`${x}:${y}`), "no open region should be sealed off from the map perimeter");
  }
}
assert(generated.walls.length <= generated.candidateCells * 0.36, "default wall density should remain bounded near 35%");
assert(generated.clearanceRepairs > 0, "the physical-clearance pass should repair at least one enclosed pocket in this seeded layout");

// Check real movement clearance, not only logical grid connectivity.
assertPhysicalClearanceConnectivity(generated, 4000, 4000);

assert(
  Math.abs(generated.cellWidth - (4000 / 15 / 2)) < 10,
  "world-grid cell scale should be based on roughly half an in-game room tile"
);
const sizeValues = generated.walls.map((wall) => wall.size);
assert(Math.max(...sizeValues) / Math.min(...sizeValues) > 2.0, "generated wall sizes should have substantial variation");
const emptyMaze = maze.generateWorldMaze({
  width: 4000,
  height: 4000,
  roomSetup: cleared,
  density: 0,
  random: seededRandom(99),
});
assert.strictEqual(emptyMaze.walls.length, 0, "an explicit zero wall density should generate no wall entities");
assert.notDeepStrictEqual(generated.walls, alternate.walls, "different random seeds should generate different wall layouts");
assert.strictEqual(JSON.stringify(source), sourceBefore, "world maze generation must not mutate ROOM_SETUP");

const keys = new Set();
const wallsByCell = new Map(generated.walls.map((wall) => [`${wall.gridX}:${wall.gridY}`, wall]));
let adjacentWallPairs = 0;
let significantlyOffsetWalls = 0;
let checkedOpenings = 0;
let awkwardNarrowOpenings = 0;
let checkedDiagonalOpenings = 0;
let awkwardDiagonalOpenings = 0;
for (const wall of generated.walls) {
  assert(Number.isFinite(wall.x) && Number.isFinite(wall.y) && Number.isFinite(wall.size), "each wall needs finite coordinates and size");
  assert(wall.x > 0 && wall.x < 4000, "walls may approach either border but must remain inside the world");
  assert(wall.y > 0 && wall.y < 4000, "walls may approach either border but must remain inside the world");
  assert(wall.x - wall.size > 0 && wall.x + wall.size < 4000, "wall blocks must fit inside the world bounds");
  assert(wall.y - wall.size > 0 && wall.y + wall.size < 4000, "wall blocks must fit inside the world bounds");
  if (
    Math.abs(wall.x - (wall.gridX + 0.5) * generated.cellWidth) > generated.cellWidth * 0.08 ||
    Math.abs(wall.y - (wall.gridY + 0.5) * generated.cellHeight) > generated.cellHeight * 0.08
  ) significantlyOffsetWalls++;
  const key = `${wall.gridX}:${wall.gridY}`;
  assert(!keys.has(key), "a world-grid cell must not spawn duplicate wall blocks");
  keys.add(key);
  if (keys.has(`${wall.gridX + 1}:${wall.gridY}`) || keys.has(`${wall.gridX - 1}:${wall.gridY}`) ||
      keys.has(`${wall.gridX}:${wall.gridY + 1}`) || keys.has(`${wall.gridX}:${wall.gridY - 1}`)) adjacentWallPairs++;

  // The centre is legal but lower-weight. The test's neighbouring-wall count
  // also confirms that connected runs remain after position relaxation.
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const neighbor = wallsByCell.get(`${wall.gridX + dx}:${wall.gridY + dy}`);
    if (!neighbor) continue;
    const gap = dx
      ? Math.abs(neighbor.x - wall.x) - wall.size - neighbor.size
      : Math.abs(neighbor.y - wall.y) - wall.size - neighbor.size;
    checkedOpenings++;
    const touchingGap = Math.min(generated.cellWidth, generated.cellHeight) * 0.025;
    const minimumOpening = Math.min(generated.cellWidth, generated.cellHeight) * 0.42;
    if (gap > touchingGap + 2 && gap < minimumOpening - 1) awkwardNarrowOpenings++;
  }
  // Diagonal pairs used to regain pinched gaps after the final cardinal pass.
  // Check the nearest edge-to-edge clearance, not just their center distance.
  for (const [dx, dy] of [[1, 1], [-1, 1]]) {
    const neighbor = wallsByCell.get(`${wall.gridX + dx}:${wall.gridY + dy}`);
    if (!neighbor) continue;
    const gapX = Math.max(0, Math.abs(neighbor.x - wall.x) - wall.size - neighbor.size);
    const gapY = Math.max(0, Math.abs(neighbor.y - wall.y) - wall.size - neighbor.size);
    const gap = Math.hypot(gapX, gapY);
    checkedDiagonalOpenings++;
    const touchingGap = Math.min(generated.cellWidth, generated.cellHeight) * 0.025;
    const minimumOpening = Math.min(generated.cellWidth, generated.cellHeight) * 0.42;
    if (gap > touchingGap + 2 && gap < minimumOpening - 1) awkwardDiagonalOpenings++;
  }
}
assert(adjacentWallPairs > 10, "wall layouts should include connected blocky runs and clusters");
assert(
  significantlyOffsetWalls > generated.walls.length * 0.5,
  "wall positions should vary noticeably instead of sitting at grid-cell centres"
);
assert(
  awkwardNarrowOpenings <= Math.max(1, checkedOpenings * 0.02),
  "adjacent walls should either touch closely or leave a usable opening"
);
assert(
  awkwardDiagonalOpenings <= Math.max(1, checkedDiagonalOpenings * 0.03),
  "diagonal walls should not leave tiny corner passages that can appear sealed off"
);

const roomTileForWall = (wall) => ({
  column: Math.min(14, Math.max(0, Math.floor(((wall.gridX + 0.5) * generated.cellWidth / 4000) * 15))),
  row: Math.min(14, Math.max(0, Math.floor(((wall.gridY + 0.5) * generated.cellHeight / 4000) * 15))),
});
assert(
  generated.walls.some((wall) => {
    const tile = roomTileForWall(wall);
    return (tile.column === 6 || tile.column === 7) && (tile.row === 6 || tile.row === 7);
  }),
  "wall placement should be eligible within nest-area cells"
);
assert(
  [[5, 3], [6, 3], [5, 4], [6, 4], [10, 10], [11, 10], [10, 11], [11, 11]].some(([x, y]) =>
    generated.walls.some((wall) => {
      const tile = roomTileForWall(wall);
      return tile.column === x && tile.row === y;
    })
  ),
  "wall placement should be eligible within rock/roid obstacle cells"
);

// The centre and map edges are now legal placement areas, but their density
// should fall below the preferred middle band over many independent layouts.
const plainSetup = Array.from({ length: 15 }, () => Array(15).fill("norm"));
let centerWallCount = 0;
let centerCellCount = 0;
let borderWallCount = 0;
let borderCellCount = 0;
let middleWallCount = 0;
let middleCellCount = 0;
let centerAppeared = false;
let borderAppeared = false;
for (let seed = 1; seed <= 30; seed++) {
  const layout = maze.generateWorldMaze({
    width: 4000,
    height: 4000,
    roomSetup: plainSetup,
    random: seededRandom(seed),
  });
  assertPhysicalClearanceConnectivity(layout, 4000, 4000);
  const centerRadius = 160;
  const borderBand = 200;
  for (let y = 0; y < layout.rows; y++) {
    for (let x = 0; x < layout.columns; x++) {
      const px = (x + 0.5) * layout.cellWidth;
      const py = (y + 0.5) * layout.cellHeight;
      const centerDistance = Math.hypot(px - 2000, py - 2000);
      const edgeDistance = Math.min(px, 4000 - px, py, 4000 - py);
      if (centerDistance < centerRadius) centerCellCount++;
      if (edgeDistance < borderBand) borderCellCount++;
      if (edgeDistance > 600 && centerDistance > 800) middleCellCount++;
    }
  }
  for (const wall of layout.walls) {
    const centerDistance = Math.hypot(wall.x - 2000, wall.y - 2000);
    const edgeDistance = Math.min(wall.x, 4000 - wall.x, wall.y, 4000 - wall.y);
    if (centerDistance < centerRadius) {
      centerWallCount++;
      centerAppeared = true;
    }
    if (edgeDistance < borderBand) {
      borderWallCount++;
      borderAppeared = true;
    }
    if (edgeDistance > 600 && centerDistance > 800) middleWallCount++;
  }
}
const centerRate = centerWallCount / centerCellCount;
const borderRate = borderWallCount / borderCellCount;
const middleRate = middleWallCount / middleCellCount;
assert(centerAppeared, "maze walls should sometimes appear near the centre");
assert(borderAppeared, "maze walls should sometimes appear near map borders");
assert(centerRate < middleRate, "centre placements should be less common than the middle band");
assert(borderRate < middleRate, "border placements should be less common than the middle band");

// Test non-square world coordinates as well; row/column counts should follow
// world dimensions and not ROOM_SETUP's fixed 15x15 layout.
const wideWorld = maze.generateWorldMaze({
  width: 8000,
  height: 4000,
  roomSetup: Array.from({ length: 15 }, () => Array(15).fill("norm")),
  random: seededRandom(17),
});
assert(wideWorld.columns > wideWorld.rows, "wide maps should generate more world-grid columns than rows");
assert(Math.abs(wideWorld.cellWidth - wideWorld.cellHeight) < 20, "world grid cells should stay roughly square");

// Maze modes must no longer depend on hand-authored wall locations.
for (const modeName of [
  "Maze Execution", "Maze 4TDM", "FFA Maze", "Maze Fort Domination",
  "Maze Domination", "Maze Graveyard", "Maze Plague"
]) {
  const settings = require(`../Game Modes/${modeName}`);
  assert(
    !settings.ROOM_SETUP.flat().some((tile) => String(tile).toLowerCase() === "wall"),
    `${modeName} should not hard-code wall tiles in ROOM_SETUP`
  );
}

console.log("World-grid maze generation tests passed.");
