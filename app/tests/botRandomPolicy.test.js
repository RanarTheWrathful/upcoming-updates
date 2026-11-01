"use strict";
const assert = require("assert");
const policy = require("../lib/botRandomPolicy/botRandomPolicy");

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

const tierBot = {
  upgrades: [
    { class: { id: "tier-a" }, level: 15 },
    { class: { id: "tier-b" }, level: 15 },
    { class: { id: "later" }, level: 30 },
  ],
};
assert.deepStrictEqual(
  [0, 1, 2].map((bucket) => {
    const bot = { upgrades: tierBot.upgrades.map((option) => ({ ...option })) };
    return policy.selectNextUpgradeDecision(bot, 15, () => (bucket + 0.5) / 3).index;
  }),
  [0, 1, null],
  "each newly unlocked tier option and skipping need equal probability",
);
assert.deepStrictEqual(
  [0, 1, 2, 3].map((bucket) => {
    const bot = { upgrades: tierBot.upgrades.map((option) => ({ ...option })) };
    return policy.selectNextUpgradeDecision(bot, 30, () => (bucket + 0.5) / 4).index;
  }),
  [0, 1, 2, null],
  "at later milestones all currently eligible classes remain uniformly selectable, with skip equally likely",
);
const pendingBot = { upgrades: tierBot.upgrades };
assert.ok(policy.selectNextUpgradeDecision(pendingBot, 15, () => 0));
assert.strictEqual(policy.selectNextUpgradeDecision(pendingBot, 15, () => 0), undefined,
  "the same tier cannot trigger repeated upgrades for the same class after a skip");
const changedClassBot = {
  index: 22,
  upgrades: [
    { class: { id: "next-class-tier-choice" }, level: 15 },
    { class: { id: "next-class-next-tier" }, level: 30 },
  ],
  _botUpgradeDecisions: { "tier:11:15": true },
};
assert.deepStrictEqual(
  policy.selectNextUpgradeDecision(changedClassBot, 15, () => 0),
  { index: 0, keys: ["tier:22:15"], tierLevel: 15 },
  "a new class gets its own decision at a tier previously considered by the old class",
);

const scoreOptions = [
  { class: { id: "score-a" }, level: 0, autoUpgradeRuleIds: ["score-rule"] },
  { class: { id: "score-b" }, level: 0, autoUpgradeRuleIds: ["score-rule"] },
];
assert.deepStrictEqual(
  [0, 1, 2].map((bucket) => {
    const bot = { upgrades: scoreOptions.map((option) => ({ ...option })) };
    return policy.selectNextUpgradeDecision(bot, 0, () => (bucket + 0.5) / 3).index;
  }),
  [0, 1, null],
  "score-based auto-upgrades also include an equally likely skip choice",
);
const nanBot = { upgrades: [{ class: { id: "bad" }, level: NaN }] };
assert.strictEqual(policy.selectNextUpgradeDecision(nanBot, 100, () => 0), undefined,
  "invalid skill levels cannot create upgrade opportunities");

console.log("Bot randomness policy tests passed.");
