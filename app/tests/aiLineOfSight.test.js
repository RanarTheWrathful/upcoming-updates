"use strict";

const assert = require("assert");
const hasClearLineOfSight = require("../lib/aiLineOfSight");

const source = { x: 0, y: 0, size: 10 };
const target = { x: 100, y: 0, size: 10 };
const candidates = (items) => (_midpoint, _radius) => items;
const wall = { x: 50, y: 0, realSize: 10, type: "squareWall", label: "Maze Wall", isWall: true };
const rock = { x: 50, y: 0, realSize: 10, label: "Rock" };

assert.strictEqual(hasClearLineOfSight(source, target, candidates([])), true);
assert.strictEqual(hasClearLineOfSight(source, target, candidates([rock])), false,
  "rocks intersecting the ray should block ordinary targets");
assert.strictEqual(hasClearLineOfSight(source, target, candidates([wall])), false,
  "maze walls should block ordinary targets");
assert.strictEqual(hasClearLineOfSight(source, target, candidates([
  { x: 50, y: 30, realSize: 5, label: "Rock" },
])), true, "rocks away from the ray should not block targets");
assert.strictEqual(hasClearLineOfSight(source,
  { x: 50, y: 0, label: "Rock", realSize: 10 }, candidates([rock])), true,
  "the target entity itself must not occlude its own ray");

for (const capableSource of [
  { ...source, isRanar: true, name: "Ranar" },
  { ...source, specialEffect: "dieWall" },
  { ...source, specialEffect: "crusherFortWall" },
  { ...source, ignoreCollision: true },
]) {
  assert.strictEqual(hasClearLineOfSight(capableSource, target, candidates([wall])), true,
    "wall-breaking/phasing AI should be able to target through maze walls");
  assert.strictEqual(hasClearLineOfSight(capableSource, target, candidates([rock])), false,
    "wall-breaking/phasing AI should still respect rock obstruction");
}

assert.strictEqual(hasClearLineOfSight(source, target, candidates([
  { x: 50, y: 0, realSize: 10, type: "fortWall", label: "Fort Wall", isWall: true },
])), true, "fort walls must not block targeting through them");
assert.strictEqual(hasClearLineOfSight(source, target, candidates([
  { x: 50, y: 0, realSize: 10, type: "fortGate", label: "Fort Gate", isGate: true },
])), true, "fort gates must not block targeting through them");
assert.strictEqual(hasClearLineOfSight(source, target, candidates([
  { x: 50, y: 0, realSize: 10, isGate: true, label: "Gate" },
])), true, "gate flags must not make gates into line-of-sight blockers");

console.log("aiLineOfSight tests passed");
