"use strict";

const assert = require("assert");
const hasClearLineOfSight = require("../lib/aiLineOfSight");

const source = { x: 0, y: 0, size: 10 };
const target = { x: 100, y: 0, size: 10 };
const candidates = (items) => (_midpoint, _radius) => items;

assert.strictEqual(
  hasClearLineOfSight(source, target, candidates([])),
  true,
  "unobstructed targets should be visible"
);
assert.strictEqual(
  hasClearLineOfSight(source, target, candidates([{ x: 50, y: 0, realSize: 10, label: "Rock" }])),
  false,
  "a rock intersecting the ray should block the target"
);
assert.strictEqual(
  hasClearLineOfSight(source, target, candidates([{ x: 50, y: 0, realSize: 10, type: "squareWall" }])),
  false,
  "a wall intersecting the ray should block the target"
);
assert.strictEqual(
  hasClearLineOfSight(source, target, candidates([{ x: 50, y: 30, realSize: 5, label: "Rock" }])),
  true,
  "rocks away from the ray should not block the target"
);
assert.strictEqual(
  hasClearLineOfSight(source, { x: 50, y: 0, label: "Rock", realSize: 10 }, candidates([{ x: 50, y: 0, realSize: 10, label: "Rock" }])),
  true,
  "the target entity itself must not occlude its own ray"
);


assert.strictEqual(
  hasClearLineOfSight(source, target, candidates([{ x: 50, y: 0, realSize: 10, isGate: true, label: "Gate" }])),
  true,
  "gates should not block targeting because projectiles pass through them"
);
assert.strictEqual(
  hasClearLineOfSight(source, target, candidates([{ x: 50, y: 0, realSize: 10, type: "fortWall", label: "Fort Wall", isWall: true }])),
  true,
  "fort walls should not block targeting because projectiles pass through them"
);



// Wall-passing projectile capability is detected from explicit inherited flags,
// including turret weapons; penetration values alone are not enough.
assert.strictEqual(
  hasClearLineOfSight.hasWallPassingProjectile({
    guns: [{ canShoot: true, bulletTypes: [{ PARENT: [{ LABEL: "Basic Bullet" }], BODY: { PENETRATION: 999 } }] }],
    turrets: [],
  }),
  false,
  "high penetration alone does not imply that a projectile passes through walls"
);
assert.strictEqual(
  hasClearLineOfSight.hasWallPassingProjectile({
    guns: [{ canShoot: true, bulletTypes: [{ PARENT: [{ WALL_IMMUNITY: true }] }] }],
    turrets: [],
  }),
  true,
  "inherited wall immunity makes a projectile eligible to target through walls"
);
assert.strictEqual(
  hasClearLineOfSight.hasWallPassingProjectile({
    guns: [],
    turrets: [{
      guns: [{ canShoot: true, bulletTypes: [{ WALL_IMMUNITY: true }] }],
      turrets: [],
    }],
  }),
  true,
  "a wall-passing weapon mounted on a turret counts for the owning entity"
);

console.log("aiLineOfSight tests passed");
