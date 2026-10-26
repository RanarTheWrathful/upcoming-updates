"use strict";
const assert = require("assert");
const policy = require("../lib/botRandomPolicy");

assert.strictEqual(policy.selectBotArchetype(() => 0), "bot0");
assert.strictEqual(policy.selectBotArchetype(() => 0.999999), "bot7");
assert.strictEqual(policy.selectBotArchetype(() => 0.5), "bot4");
assert.deepStrictEqual(
  Array.from({ length: policy.SKILL_STATS.length }, (_, index) =>
    policy.selectSkillStat(() => (index + 0.5) / policy.SKILL_STATS.length)),
  [...policy.SKILL_STATS],
  "every skill stat should have its own equal-size random bucket",
);

const upgrades = [
  { class: { id: "a" }, level: 0 },
  { class: { id: "locked" }, level: 9 },
  { class: { id: "b" }, level: 0 },
  { class: { id: "invalid-level" }, level: Infinity },
];
const options = Array.from({ length: 3 }, (_, bucket) =>
  policy.selectUpgradeIndex(upgrades, 0, () => (bucket + 0.5) / 3));
assert.deepStrictEqual(options, [0, 2, null],
  "two eligible upgrade classes and skipping must each have exactly one bucket");
assert.strictEqual(policy.selectUpgradeIndex(upgrades, 8, () => 0.1), 0);
assert.strictEqual(policy.selectUpgradeIndex([], 99, () => 0.1), undefined,
  "no eligible options is not treated as a skip, so the bot does not consume a choice");
assert.strictEqual(policy.selectUpgradeIndex(upgrades, 0, () => 1), null,
  "an out-of-range RNG endpoint is safely clamped to the skip bucket");
assert.strictEqual(policy.selectUpgradeIndex([
  { class: { id: "bad" }, level: NaN },
  { class: { id: "valid" }, level: 0 },
], 0, () => 0), 1,
  "invalid required levels are excluded instead of being interpreted as level zero");
console.log("Bot randomness policy tests passed.");
