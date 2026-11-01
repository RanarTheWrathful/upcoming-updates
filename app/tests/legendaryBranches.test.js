"use strict";
const assert = require("assert");
const branches = require("../lib/legendaryBranches/legendaryBranches");
const names = ["reaper", "operator", "MassProducer", "necrotyrant", "flesh", "rebel", "arenaguardpl"];
const Class = {};
for (let i = 0; i < names.length; i++) Class[names[i]] = { index: i + 10, LABEL: names[i] };

function bot(team, overrides = {}) {
  return Object.assign({
    isBot: true,
    type: "tank",
    index: 99,
    team,
    label: "Sniper",
    skill: { score: 1000000, level: 0 },
    upgrades: [],
    maxChildren: 0,
    invuln: false,
    trueDev: false,
  }, overrides);
}

assert.deepStrictEqual(
  branches.getBotScoreUnlockedBranches(bot(-4), "siege", Class).map(({ branch }) => branch.key),
  ["reaper"],
  "the old Reaper score threshold now unlocks a menu choice rather than a forced transform",
);
assert.deepStrictEqual(
  branches.getBotScoreUnlockedBranches(bot(-3), "siege", Class).map(({ branch }) => branch.key),
  ["operator", "massProducer"],
);
assert.deepStrictEqual(
  branches.getBotScoreUnlockedBranches(bot(-2), "siege", Class).map(({ branch }) => branch.key),
  ["necrotyrant", "flesh"],
);
assert.deepStrictEqual(
  branches.getBotScoreUnlockedBranches(bot(-1), "siege", Class),
  [], "Rebel does not unlock from the former bot rule in Siege or theDenied",
);
assert.deepStrictEqual(
  branches.getBotScoreUnlockedBranches(bot(-100, { maxChildren: 2 }), "siege", Class)
    .map(({ branch }) => branch.key),
  ["arenaGuard"],
);
assert.deepStrictEqual(branches.getBotScoreUnlockedBranches(bot(-4, { skill: { score: 999999, level: 0 } }), "siege", Class), []);
assert.deepStrictEqual(branches.getBotScoreUnlockedBranches(bot(-4, { invuln: true }), "siege", Class), []);
assert.deepStrictEqual(branches.getBotScoreUnlockedBranches(bot(-4), "ffa", Class), []);
assert.deepStrictEqual(branches.getBotScoreUnlockedBranches(bot(-4), "theControlled", Class), []);
assert.deepStrictEqual(
  branches.getBotScoreUnlockedBranches(bot(-4, { index: Class.reaper.index }), "siege", Class),
  [], "an upgrade option should not offer the class the bot already uses",
);

console.log("Legendary score-unlock option tests passed.");

assert.deepStrictEqual(
  branches.getBotScoreUnlockedBranches(bot(-4, { skill: { score: NaN, level: 0 } }), "siege", Class),
  [], "NaN score must not unlock legendary choices",
);
