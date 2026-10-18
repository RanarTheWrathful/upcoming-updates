"use strict";

const assert = require("assert");
const generateCaveMaze = require("../lib/mazeGenerator");

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const cells = [];
for (let y = 125; y < 4000; y += 250) {
  for (let x = 125; x < 4000; x += 250) cells.push({ x, y });
}
const layout = generateCaveMaze({
  width: 4000,
  height: 4000,
  gridWidth: 250,
  gridHeight: 250,
  cells,
  targetCount: 190,
  random: seededRandom(9917),
  isOpen: () => true,
  canPlace: () => true,
});

assert(layout.length >= 150, "maze generator should create a meaningfully denser layout");
assert(layout.length <= 190, "maze generator must respect its wall budget");
for (const wall of layout) {
  assert(wall.x >= 0 && wall.x <= 4000, "wall x should stay within room bounds");
  assert(wall.y >= 0 && wall.y <= 4000, "wall y should stay within room bounds");
  assert(wall.size >= 1 && Number.isFinite(wall.size), "wall size should be finite and positive");
}
for (let i = 0; i < layout.length; i++) {
  for (let j = i + 1; j < layout.length; j++) {
    assert(Math.hypot(layout[i].x - layout[j].x, layout[i].y - layout[j].y) >= 24,
      "maze generator should not create exact/near-identical duplicate walls");
  }
}

const reserved = generateCaveMaze({
  width: 1000,
  height: 1000,
  gridWidth: 250,
  gridHeight: 250,
  cells: [{ x: 125, y: 125 }, { x: 375, y: 125 }, { x: 625, y: 125 }, { x: 875, y: 125 }],
  targetCount: 20,
  random: seededRandom(14),
  isOpen: (p) => p.y < 500,
  canPlace: (p) => p.x > 200,
});
assert(reserved.every((wall) => wall.x > 200 && wall.y < 500), "non-open/protected wall points must be rejected");

console.log("maze generator tests passed");
