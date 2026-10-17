"use strict";

const assert = require("assert");
const { applyModeBranches, applyModeBranchExceptions } = require("../lib/modeBranches");
const basic = { UPGRADES_TIER_1: [{ name: "Existing" }] };
const twin = { name: "Twin" };
const sniper = { name: "Sniper" };
const machineGun = { name: "Machine Gun" };
const classes = { basic, twin, sniper, machineGun };

applyModeBranches(classes, {
  basic: {
    "1": ["twin", "sniper", "twin"],
    "2": ["machineGun"],
  },
}, "test mode");
assert.deepStrictEqual(basic.UPGRADES_TIER_1, [{ name: "Existing" }, twin, sniper],
  "mode branches should append to existing upgrades and suppress duplicates");
assert.deepStrictEqual(basic.UPGRADES_TIER_2, [machineGun],
  "mode branches should support multiple upgrade tiers");
assert.throws(() => applyModeBranches(classes, { missingTank: { "1": ["twin"] } }, "bad mode"), /unknown source tank/);
assert.throws(() => applyModeBranches(classes, { basic: { "16": ["twin"] } }, "bad mode"), /invalid tier/);
assert.throws(() => applyModeBranches(classes, { basic: { "1": ["missingTank"] } }, "bad mode"), /unknown tank/);

const preexistingOption = basic.UPGRADES_TIER_1[0];
basic.UPGRADES_TIER_3 = [twin, sniper, machineGun];
applyModeBranchExceptions(classes, {
  basic: { "1": ["sniper"], "all": ["machineGun"] },
}, "exception test");
assert.deepStrictEqual(basic.UPGRADES_TIER_1, [preexistingOption, twin]);
assert.deepStrictEqual(basic.UPGRADES_TIER_2, []);
assert.deepStrictEqual(basic.UPGRADES_TIER_3, [twin, sniper]);
assert.throws(() => applyModeBranchExceptions(classes, { basic: { "16": ["twin"] } }, "bad exception"), /invalid tier/);
assert.throws(() => applyModeBranchExceptions(classes, { basic: { "1": ["missingTank"] } }, "bad exception"), /unknown tank/);
console.log("Mode branch tests passed.");
