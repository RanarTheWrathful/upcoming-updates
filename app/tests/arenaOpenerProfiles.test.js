"use strict";
const assert = require("assert");
const Class = require("../lib/definitions");
const fs = require("fs");
const path = require("path");
const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

const opener = Class.arenaOpener.GUNS[0].PROPERTIES.PROJECTILE_TRANSFORM_PROFILES;
assert.strictEqual(opener.length, 5);
assert.deepStrictEqual(
  opener.map((profile) => profile.LABEL),
  [
    "Polymancer Square",
    "Polymancer Triangle",
    "Polymancer Pentagon",
    "Polymancer Hexagon",
    "Poly Tyrant Septagon",
  ]
);
assert.deepStrictEqual(
  opener.map((profile) => profile.PROJECTILE_WIDTH),
  [0.8, 0.8, 0.8, 0.8, 1.3],
  "each profile should retain the source barrel's projectile-width scaling"
);
assert.strictEqual(Class.arenaOpener.GUNS.length, 1);
assert.strictEqual(Class.arenaOpener.PARENT[0], Class.damagedArenaCloser,
  "Arena Opener inherits its base size/stats from damagedArenaCloser");
assert.ok(!Object.prototype.hasOwnProperty.call(Class.arenaOpener, "SIZE"),
  "Arena Opener must not override its parent's size");
assert.strictEqual(Class.arenaOpenerShot.DIE_AT_RANGE, true);
assert.strictEqual(Class.arenaOpenerShot.TRANSFORM_ON_RANGE_END, true);
assert.strictEqual(Class.arenaOpener.GUNS[0].PROPERTIES.TYPE, Class.arenaOpenerShot);
assert.notStrictEqual(Class.arenaOpener.GUNS[0].PROPERTIES.STAT_CALCULATOR, Class.polymancer.GUNS[0].PROPERTIES.STAT_CALCULATOR,
  "the visible barrel should calculate a normal bullet seed, not inherit the drone stat calculator");
assert.strictEqual(Class.arenaOpener.GUNS[0].PROPERTIES.PROJECTILE_TRANSFORM_USE_PROFILE_SETTINGS, false,
  "source drone profiles should affect the replacement drone, not the seed's firing cadence");
assert.ok(Class.arenaOpener.GUNS[0].PROPERTIES.SHOOT_SETTINGS.reload < opener[4].SHOOT_SETTINGS.reload,
  "seed firing cadence should not inherit the Poly Tyrant's long drone reload");
assert.strictEqual(Class.arenaOpener.GUNS[0].PROPERTIES.SHOOT_SETTINGS.size, 1,
  "the seed should use normal visible projectile size instead of the old half-size setting");
assert.ok(Class.arenaOpener.GUNS[0].PROPERTIES.SHOOT_SETTINGS.maxSpeed >= 4,
  "the seed should have sufficient top speed to avoid sluggish glide movement");
assert.strictEqual(Class.arenaOpener.GUNS[0].PROPERTIES.SHOOT_SETTINGS.range, 1,
  "the seed should use its own bullet range, rather than the oversized drone-profile range");
assert.deepStrictEqual(
  opener.map((profile) => profile.TYPE),
  [
    Class.polymancer.GUNS[0].PROPERTIES.TYPE,
    Class.polymancer.GUNS[1].PROPERTIES.TYPE,
    Class.polymancer.GUNS[2].PROPERTIES.TYPE,
    Class.polymancer.GUNS[3].PROPERTIES.TYPE,
    Class.polyTyrant.GUNS[0].PROPERTIES.TYPE,
  ]
);
for (let i = 0; i < Class.polymancer.GUNS.length; i++) {
  assert.strictEqual(opener[i].SHOOT_SETTINGS, Class.polymancer.GUNS[i].PROPERTIES.SHOOT_SETTINGS);
  assert.strictEqual(opener[i].SOURCE_BODY_SIZE, Class.polymancer.SIZE || Class.genericTank.SIZE);
}
assert.strictEqual(opener[4].SHOOT_SETTINGS, Class.polyTyrant.GUNS[0].PROPERTIES.SHOOT_SETTINGS);
assert.strictEqual(opener[4].SOURCE_BODY_SIZE, Class.polyTyrant.SIZE || Class.genericTank.SIZE);
assert.match(server, /selectProjectileTransformProfile\(\)[\s\S]*?projectileTransformation\.chooseProfile/,
  "each launch randomly chooses one source barrel's actual settings and drone type");
assert.match(server, /interpretTransformProfile\(profile\)[\s\S]*?return this\.interpret\(\)/,
  "the selected drone profile should be calculated separately from the seed gun");
assert.match(server, /_projectileTransformBody = this\.useTransformProfileForSeed[\s\S]*?interpretTransformProfile\(profile\)/,
  "each seed should retain its selected drone's calculated combat stats");
assert.match(server, /projectileTransformation\.transitionAtRange\(this, Entity\)/,
  "range expiry should use the reusable projectile transformation helper");
assert.match(server, /if \(projectileTransformation\.transitionAtRange\(this, Entity\)\) return 1/,
  "the original seed should expire after a replacement drone is spawned");
assert.match(server, /const transformProfiles = info\.PROPERTIES\.PROJECTILE_TRANSFORM_PROFILES/,
  "profile-driven transformation should not depend on Arena Opener-specific settings");
console.log("Arena Opener random source-profile tests passed.");
