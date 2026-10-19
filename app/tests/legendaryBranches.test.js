"use strict";

const assert = require("assert");
const definitions = require("../lib/definitions");
const legendaryBranches = require("../lib/legendaryBranches");

let index = 0;
for (const definition of Object.values(definitions)) {
  if (definition && typeof definition === "object") definition.index = index++;
}

function player(label, team, score = 1000000) {
  return {
    isPlayer: true,
    type: "tank",
    label,
    team,
    skill: { score },
    upgrades: [{ class: definitions.basic, tier: 1, level: 0, index: definitions.basic.index }],
  };
}

// Every branch target is a real class and every listed prerequisite label exists.
for (const branch of legendaryBranches.BRANCHES) {
  assert(definitions[branch.className], `Missing legendary class target ${branch.className}`);
  for (const parentLabel of branch.parents) {
    assert(
      Object.values(definitions).some((definition) => definition && definition.LABEL === parentLabel),
      `Missing prerequisite tank label ${parentLabel} for ${branch.name}`
    );
  }
}

// Faction eligibility is enforced outside Siege, then deliberately relaxed in Siege.
{
  const necromancer = player("Necromancer", -1);
  assert.deepStrictEqual(
    legendaryBranches.getEligibleBranches(necromancer, "normal", definitions),
    [],
    "Necro Tyrant must not unlock for a player on the wrong faction"
  );
  assert.strictEqual(
    legendaryBranches.getEligibleBranches(necromancer, "siege", definitions)[0].key,
    "necrotyrant",
    "Siege allows the prerequisite tank to access the legendary branch regardless of team"
  );
}

// FFA variants never receive legendary branch options.
for (const mode of ["ffa", "ffaPoly"]) {
  const spike = player("Spike", -1);
  assert.deepStrictEqual(legendaryBranches.getEligibleBranches(spike, mode, definitions), []);
}

// Normal upgrade choices are added once, carry ordinary upgrade-menu metadata,
// and are removed if the player no longer qualifies.
{
  const spike = player("Spike", -1);
  const unlocked = legendaryBranches.syncUpgradeOptions(spike, "normal", definitions);
  assert.strictEqual(unlocked.length, 1);
  assert.strictEqual(unlocked[0].key, "rebel");
  const option = spike.upgrades.find((upgrade) => upgrade.legendaryBranchKey === "rebel");
  assert(option);
  assert.strictEqual(option.class, definitions.rebel);
  assert.strictEqual(option.tier, 0);
  assert.strictEqual(option.level, 0);
  assert.strictEqual(legendaryBranches.syncUpgradeOptions(spike, "normal", definitions).length, 0,
    "the unlock announcement should happen only once");
  assert.strictEqual(spike.upgrades.filter((upgrade) => upgrade.legendaryBranchKey === "rebel").length, 1,
    "the upgrade option must not duplicate on repeated ticks");
  spike.team = -2;
  legendaryBranches.syncUpgradeOptions(spike, "normal", definitions);
  assert.strictEqual(spike.upgrades.some((upgrade) => upgrade.legendaryBranchKey === "rebel"), false,
    "a faction-ineligible legendary option must be removed");
}

// Siege ignores faction restrictions, but legendary branches still follow the
// original prerequisite lists: Skimmer is not a Flesh prerequisite.
{
  const skimmer = player("Skimmer", -99);
  assert.deepStrictEqual(legendaryBranches.getEligibleBranches(skimmer, "siege", definitions), []);
  const rocketeer = player("Rocketeer", -99);
  assert.deepStrictEqual(
    legendaryBranches.getEligibleBranches(rocketeer, "siege", definitions).map((branch) => branch.key),
    ["flesh"]
  );
  const hyperSkimmer = player("Hyper Skimmer", -99);
  assert.deepStrictEqual(
    legendaryBranches.getEligibleBranches(hyperSkimmer, "siege", definitions).map((branch) => branch.key),
    ["mechanist"]
  );
}

console.log("legendaryBranches tests passed");
