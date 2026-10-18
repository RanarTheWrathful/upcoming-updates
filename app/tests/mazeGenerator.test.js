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

const source = Array.from({ length: 15 }, () => Array(15).fill("norm"));
source[6][6] = "nest";
source[6][7] = "nest";
source[7][6] = "nest";
source[7][7] = "nest";
source[1][1] = "bas1";
source[1][13] = "bas2";
source[13][1] = "bas3";
source[13][13] = "bas4";
source[3][5] = "rock";
source[10][11] = "roid";
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
  random: seededRandom(0xC0FFEE),
});
const alternate = maze.generateWorldMaze({
  width: 4000,
  height: 4000,
  roomSetup: cleared,
  random: seededRandom(0x51A7),
});

assert(generated.columns > cleared[0].length, "world-grid resolution should be independent of, and finer than, ROOM_SETUP");
assert(generated.rows > cleared.length, "world-grid row count should not be copied from ROOM_SETUP");
assert(generated.walls.length > 25, "the generator should make a meaningful number of wall blocks");
assert(generated.targetWalls > generated.candidateCells * 0.30, "default maze density should be significantly denser than the old 23% setting");
assert(generated.walls.length === generated.targetWalls, "the planner should fill its requested wall target when space remains available");
assert(generated.walls.length <= generated.candidateCells * 0.36, "default wall density should remain bounded near 35%");
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
let adjacentWallPairs = 0;
for (const wall of generated.walls) {
  assert(Number.isFinite(wall.x) && Number.isFinite(wall.y) && Number.isFinite(wall.size), "each wall needs finite coordinates and size");
  assert(wall.x > 180 && wall.x < 3820, "walls should remain clear of the map's outer border");
  assert(wall.y > 180 && wall.y < 3820, "walls should remain clear of the map's outer border");
  assert(wall.x - wall.size > 0 && wall.x + wall.size < 4000, "wall blocks must fit inside the world bounds");
  assert(wall.y - wall.size > 0 && wall.y + wall.size < 4000, "wall blocks must fit inside the world bounds");
  const key = `${wall.gridX}:${wall.gridY}`;
  assert(!keys.has(key), "a world-grid cell must not spawn duplicate wall blocks");
  keys.add(key);
  if (keys.has(`${wall.gridX + 1}:${wall.gridY}`) || keys.has(`${wall.gridX - 1}:${wall.gridY}`) ||
      keys.has(`${wall.gridX}:${wall.gridY + 1}`) || keys.has(`${wall.gridX}:${wall.gridY - 1}`)) adjacentWallPairs++;

  // A square, not circular, clearance zone around the map center is kept open.
  assert(
    !(Math.abs(wall.x - 2000) < 300 && Math.abs(wall.y - 2000) < 300),
    "maze walls should leave a usable central pocket"
  );

  // The central nest is a 2x2 room-tile region; keep a generous margin clear.
  const nestLeft = (6 / 15) * 4000;
  const nestRight = (8 / 15) * 4000;
  const nestTop = (6 / 15) * 4000;
  const nestBottom = (8 / 15) * 4000;
  assert(
    !(wall.x >= nestLeft - 110 && wall.x <= nestRight + 110 &&
      wall.y >= nestTop - 110 && wall.y <= nestBottom + 110),
    "generated walls should not intrude into or crowd the nest room"
  );
}
assert(adjacentWallPairs > 10, "wall layouts should include connected blocky runs and clusters");

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
