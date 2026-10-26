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
assert.strictEqual(Class.arenaOpener.GUNS.length, 1, "Arena Opener should retain the single-barrel Arena Closer silhouette");
const openerGun = Class.arenaOpener.GUNS[0].PROPERTIES;
assert.strictEqual(openerGun.TYPE, Class.arenaOpenerShot);
assert.strictEqual(Class.arenaOpenerShot.MOTION_TYPE, "glide", "opener seeds should travel using bullet-like glide motion");
assert.strictEqual(Class.arenaOpenerShot.DIE_AT_RANGE, true);
assert.strictEqual(Class.arenaOpenerShot.RANGE_TRANSITION_TO_SELECTED_DRONE_PROFILE, true);
assert.strictEqual(openerGun.RANDOM_DRONE_SHOT_PROFILES.length, 5,
  "the one visible barrel should draw from the four Polymancer profiles and the Poly Tyrant profile");
for (let i = 0; i < Class.polymancer.GUNS.length; i++) {
  assert.strictEqual(openerGun.RANDOM_DRONE_SHOT_PROFILES[i].TYPE, Class.polymancer.GUNS[i].PROPERTIES.TYPE);
  assert.strictEqual(openerGun.RANDOM_DRONE_SHOT_PROFILES[i].SHOOT_SETTINGS, Class.polymancer.GUNS[i].PROPERTIES.SHOOT_SETTINGS);
}
assert.strictEqual(openerGun.RANDOM_DRONE_SHOT_PROFILES[4].TYPE, Class.polyTyrant.GUNS[0].PROPERTIES.TYPE);
assert.strictEqual(openerGun.RANDOM_DRONE_SHOT_PROFILES[4].SHOOT_SETTINGS, Class.polyTyrant.GUNS[0].PROPERTIES.SHOOT_SETTINGS);
assert.match(server, /selectRandomDroneShotProfile\(\)[\s\S]*?Math\.floor\(Math\.random\(\) \* this\.randomDroneShotProfiles\.length\)/,
  "each shot should select one source barrel profile with equal probability");
assert.match(server, /rangeTransitionToSelectedDroneProfile[\s\S]*?this\._rangeTransitionDroneType/,
  "the seed must become the matching drone profile when its range expires");
assert.match(server, /preservedBody[\s\S]*?this\.define\(definition\)/,
  "the range transition should retain calculated source-barrel stats while applying the drone definition");

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
