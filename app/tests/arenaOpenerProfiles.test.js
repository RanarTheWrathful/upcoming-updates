"use strict";
const assert = require("assert");
const Class = require("../lib/definitions");
const fs = require("fs");
const path = require("path");
const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

const opener = Class.arenaOpener.GUNS[0].PROPERTIES.RANDOM_DRONE_SHOT_PROFILES;
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
assert.strictEqual(Class.arenaOpenerShot.DIE_AT_RANGE, true);
assert.strictEqual(Class.arenaOpenerShot.RANGE_TRANSITION_TO_SELECTED_DRONE_PROFILE, true);
assert.match(server, /getGunNaturalFromTypes\(profile\.TYPE\)/,
  "profile-specific drone BODY modifiers should be included in seed stats");
assert.match(server, /child\._arenaOpenerShotProfile/,
  "skill synchronization should recalculate every projectile/drone using its own chosen source profile");
assert.match(server, /this\.settings\.rangeTransitionToSelectedDroneProfile =\s*set\.RANGE_TRANSITION_TO_SELECTED_DRONE_PROFILE === true/);
console.log("Arena Opener random source-profile tests passed.");
