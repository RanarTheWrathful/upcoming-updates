"use strict";

const assert = require("assert");
const branches = require("../lib/entityBranches");
const existing = { index: 1 };
const removeMe = { index: 2 };
const keepMe = { index: 3 };
const secret = { index: 4 };
const classes = { existing, removeMe, keepMe, secret };
const levels = { 0: 0, 1: 15, 2: 30, 3: 45, 15: 650, god: 1000 };
const entity = {
  upgrades: [
    { class: existing, tier: 1, level: 15, index: existing.index },
    { class: removeMe, tier: 1, level: 15, index: removeMe.index },
    { class: keepMe, tier: 2, level: 30, index: keepMe.index },
    { class: removeMe, tier: 2, level: 30, index: removeMe.index },
  ],
};
branches.applyDefinitionBranchOverrides(entity, {
  BRANCH_OVERRIDES: {
    remove: ["removeMe"],
    addByTier: { "3": ["secret"] },
  },
}, classes, levels);
assert(!entity.upgrades.some((upgrade) => upgrade.class === removeMe), "remove should exclude a class from every tier");
assert(entity.upgrades.some((upgrade) => upgrade.class === existing), "unmentioned branches should remain");
assert(entity.upgrades.some((upgrade) => upgrade.class === secret && upgrade.tier === 3 && upgrade.level === 45), "addByTier should add an instance-only upgrade");

const tierEntity = { upgrades: [
  { class: existing, tier: 1, level: 15, index: existing.index },
  { class: keepMe, tier: 2, level: 30, index: keepMe.index },
] };
branches.applyDefinitionBranchOverrides(tierEntity, {
  BRANCH_OVERRIDES: { removeByTier: { "1": ["existing"] } },
}, classes, levels);
assert(!tierEntity.upgrades.some((upgrade) => upgrade.class === existing));
assert(tierEntity.upgrades.some((upgrade) => upgrade.class === keepMe));

const player = { upgrades: [], messages: [], sendMessage(message) { this.messages.push(message); } };
const unlock = { id: "secret-route", tiers: { "god": ["secret"] }, message: "Secret route unlocked." };
assert.strictEqual(branches.grantBranchUnlock(player, unlock, classes, levels, "boss-class"), true);
assert.strictEqual(branches.grantBranchUnlock(player, unlock, classes, levels, "boss-class"), false);
assert.strictEqual(player.upgrades.length, 1);
assert.strictEqual(player.upgrades[0].class, secret);
assert.strictEqual(player.upgrades[0].level, 1000);
assert.deepStrictEqual(player.messages, ["Secret route unlocked."]);
assert.strictEqual(branches.validateDefinitions({ target: { index: 0, BRANCH_UNLOCK_ON_KILL: { tiers: { "2": ["secret"] } } }, secret, existing, removeMe, keepMe }), true);
assert.throws(() => branches.validateDefinitions({ target: { index: 0, BRANCH_UNLOCK_ON_KILL: { tiers: { "16": ["secret"] } } }, secret }), /Invalid branch tier/);
console.log("Entity branch override tests passed.");
