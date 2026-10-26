"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Class = require("../lib/definitions");
const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

assert.ok(Class.boomerang.CONTROLLERS.includes("boomerang"));
assert.ok(Class.boomerang.SPECIAL_EFFECT.includes("block"));
assert.strictEqual(Class.boomerang.MOTION_TYPE, "motor");
assert.strictEqual(Class.boomerang.DIE_AT_RANGE, false);
assert.strictEqual(Class.boomerangToMaster.BOOMERANG_RETURN_TO_MASTER, true);
assert.match(server, /class io_boomerang extends IO[\s\S]*?this\.dwellDuration = 24/);
assert.match(server, /class io_goToMasterTarget extends IO[\s\S]*?this\.isBlockProjectile = isBlockProjectile/);
assert.match(server, /!this\.isBlockProjectile && value >= 8/,
  "high intellect must not override each builder block's own launch direction");

assert.ok(Class.arenaOpener);
assert.strictEqual(Class.arenaOpener.PARENT[0], Class.arenaCloser);
assert.strictEqual(Class.arenaOpener.COLOR, Class.egg.COLOR);
assert.ok(Class.page4.UPGRADES_TIER_2.includes(Class.arenaOpener),
  "Arena Opener should be available alongside Arena Closer in the class tree");
assert.strictEqual(Class.arenaOpener.GUNS.length, 3, "opener should use a distinctive three-barrel pattern");
assert.ok(Class.arenaOpener.GUNS.every((gun) => gun.PROPERTIES.TYPE === Class.arenaOpenerShot));
assert.strictEqual(Class.arenaOpenerShot.MOTION_TYPE, "glide", "opener seeds should travel using bullet-like glide motion");
assert.strictEqual(Class.arenaOpenerShot.DIE_AT_RANGE, true);
assert.strictEqual(Class.arenaOpenerShot.RANGE_TRANSITION_TO_RANDOM_POLYGON_DRONE, true);
assert.match(server, /rangeTransitionToRandomPolygonDrone[\s\S]*?Class\.triangleDrone, Class\.squareDrone, Class\.pentagonDrone, Class\.hexagonDrone/);

assert.match(server, /class IO[\s\S]*?intellect\.distributeTargetFocus/,
  "higher intellect should add coordinated target distribution to hostile-target controllers");
const homepageStart = server.indexOf('    case "/":', server.indexOf('// Create an HTTP server'));
const chatStart = server.indexOf('    case "/chat":', homepageStart);
const homepage = server.slice(homepageStart, chatStart);
assert.match(homepage, /home-topbar[\s\S]*?home-hero/,
  "main menu should use the modern chat-style portal layout");
assert.strictEqual((server.match(/id="arena-countdown"/g) || []).length, 1,
  "the live countdown should have one unique DOM id");
assert.strictEqual((homepage.match(/\$\{timeDisplay\}/g) || []).length, 1,
  "the live countdown should be rendered only once in the main-menu body");
assert.ok(homepage.includes('href="/chat"'), "main menu should link to chat");
console.log("Gameplay feature definition and integration checks passed.");
