"use strict";

const assert = require("assert");
const maze = require("../lib/mazeGenerator");

const source = [
  ["wall", "norm", "norm", "norm", "wall", "norm", "norm", "norm", "wall"],
  ["norm", "wall", "norm", "norm", "norm", "wall", "norm", "wall", "norm"],
  ["norm", "norm", "norm", "wall", "norm", "norm", "norm", "norm", "norm"],
  ["norm", "wall", "norm", "norm", "nest", "norm", "wall", "norm", "norm"],
  ["norm", "norm", "wall", "norm", "norm", "norm", "norm", "wall", "norm"],
  ["norm", "wall", "norm", "norm", "norm", "wall", "norm", "wall", "norm"],
  ["norm", "norm", "norm", "wall", "norm", "norm", "norm", "norm", "norm"],
  ["norm", "wall", "norm", "norm", "norm", "wall", "norm", "wall", "norm"],
  ["wall", "norm", "norm", "norm", "wall", "norm", "norm", "norm", "wall"],
];

assert.strictEqual(maze.shouldRandomizeMaze({ serverType: "normal", modeName: "Maze Execution", settings: { MODE: "execution" } }), true);
assert.strictEqual(maze.shouldRandomizeMaze({ serverType: "lore", modeName: "Maze Lore", settings: { MAZE_GENERATION: true } }), false);
assert.strictEqual(maze.shouldRandomizeMaze({ serverType: "normal", modeName: "Sandbox", settings: { MAZE_GENERATION: true } }), true);
assert.strictEqual(maze.shouldRandomizeMaze({ serverType: "normal", modeName: "Sandbox", settings: {} }), false);

const before = JSON.stringify(source);

const clearedTemplate = maze.clearAuthoredWalls(source);
assert.notStrictEqual(JSON.stringify(clearedTemplate), before, "clearing authored walls should create a fresh generation template");
assert.strictEqual(JSON.stringify(source), before, "clearing authored walls must not mutate the source map");
assert(clearedTemplate.every((row) => row.every((tile) => tile !== "wall")), "generation template should not retain authored wall tiles");
assert.strictEqual(clearedTemplate[3][4], "nest", "clearing authored walls must preserve special gameplay tiles");
const regeneratedFromClearedTemplate = maze.randomizeMaze(clearedTemplate, { random: () => 0.1 });
assert(regeneratedFromClearedTemplate.some((row) => row.includes("wall")), "randomization should create new maze walls from the cleared template");
const generated = maze.randomizeMaze(source, { random: () => 0.1 });
const alternate = maze.randomizeMaze(source, { random: () => 0.9 });
assert.notDeepStrictEqual(generated, alternate, "different random sources should make different maze layouts");
assert.strictEqual(JSON.stringify(source), before, "generation must not mutate the source map");
assert.strictEqual(generated[3][4], "nest", "special gameplay tiles must be preserved");
for (let x = 0; x < generated[0].length; x++) {
  assert.notStrictEqual(generated[0][x], "wall", "top border must not contain maze walls");
  assert.notStrictEqual(generated[generated.length - 1][x], "wall", "bottom border must not contain maze walls");
}
for (let y = 0; y < generated.length; y++) {
  assert.notStrictEqual(generated[y][0], "wall", "left border must not contain maze walls");
  assert.notStrictEqual(generated[y][generated[y].length - 1], "wall", "right border must not contain maze walls");
}
const centerX = Math.floor(generated[0].length / 2);
const centerY = Math.floor(generated.length / 2);
for (let y = centerY - 1; y <= centerY + 1; y++) {
  for (let x = centerX - 1; x <= centerX + 1; x++) {
    assert.notStrictEqual(generated[y][x], "wall", "the central pocket should remain open");
  }
}
const passable = generated.reduce((count, row) => count + row.filter((tile) => tile !== "wall").length, 0);
assert.strictEqual(maze.floodFill(generated, centerX, centerY).size, passable, "all walkable map sections must remain connected");
console.log("Maze generation tests passed.");
