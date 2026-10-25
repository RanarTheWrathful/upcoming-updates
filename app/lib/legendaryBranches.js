"use strict";

// Legendary upgrades retain the faction and prerequisite restrictions from the
// former special-key transforms, but are now ordinary upgrade-menu choices.
const BRANCHES = Object.freeze([
  {
    key: "rebel", name: "Rebel", className: "rebel", teams: [-1], parents: ["Spike", "Eagle", "Surfer", "Beekeeper"],
    broadcast: (name) => `${name}: Okay, I have taken your crap long enough, time for a barrel-whooping!`,
    maxChildrenZero: true,
  },
  {
    key: "destructionist", name: "Destructionist", className: "destructionist", teams: [-1], parents: ["Collider", "Shotgun", "Twister", "Decimator"],
    broadcast: (name) => `${name}: Looks like I'll have to destroy you all myself huh?`,
    maxChildrenZero: true,
  },
  {
    key: "necrotyrant", name: "Necro Tyrant", className: "necrotyrant", teams: [-2], parents: ["Necromancer", "Enchanter", "Exorcist", "Infestor"],
    broadcast: (name) => `${name}: Minions and servants, tanks and barrels, drones and souls, obey my call!`,
    maxChildrenZero: false,
  },
  {
    key: "flesh", name: "Flesh", className: "flesh", teams: [-2], parents: ["Hexa-Trapper", "Animator", "Constructor", "Rocketeer"],
    broadcast: (name) => `Hordes of the undead gather around ${name}... What the hell?`,
    maxChildrenZero: true,
  },
  {
    key: "massProducer", name: "Mass Producer", className: "MassProducer", teams: [-3], parents: ["Trilogy of Traps", "Constructionist", "Fragmentor", "Bombarder", "Originator", "Rebounder", "Warzone", "Castle"],
    broadcast: (name) => `${name}: THE POWER OF SCIENCE SHALL DESTROY YOU, SCUM!`,
    maxChildrenZero: true,
  },
  {
    key: "operator", name: "Operator", className: "operator", teams: [-3], parents: ["Intercepter", "Auto-Spawner", "Engineer", "Auto-Mech"],
    broadcast: (name) => `${name}: BE BLINDED BY THE POWER OF SCIENCE YOU EVIL FIENDS!`,
    maxChildrenZero: true,
  },
  {
    key: "conductor", name: "Conductor", className: "conductor", teams: [-3], parents: ["Auto-Cruiser", "Auto-Smasher", "Carrier", "Armor Piercer"],
    broadcast: (name) => `${name}: I'm gonna have some fun whooping your barrels!`,
    maxChildrenZero: true,
  },
  {
    key: "mechanist", name: "Mechanist", className: "mechanist", teams: [-3], parents: ["Auto-5", "Hardshell Spawner", "Hyper Skimmer"],
    broadcast: (name) => `${name}: I bet you can't outrun a few missiles.`,
    maxChildrenZero: true,
  },
  {
    key: "creationist", name: "Creationist", className: "creation", teams: [-3], parents: ["Auto-4", "Armsman", "Quad-Twin-Engineer"],
    broadcast: (name) => `${name}: Lay your witness to the Creationist creating your demise!`,
    maxChildrenZero: true,
  },
  {
    key: "reaper", name: "Reaper", className: "reaper", teams: [-4], parents: ["Mortar", "Ordnance", "Poacher", "X-Hunter"],
    broadcast: (name) => `Clouds of sinister black mist gather around ${name}. Be afraid, VERY AFRAID!`,
    maxChildrenZero: true,
  },
  {
    key: "hollow", name: "Hollow", className: "hollow", teams: [-4], parents: ["Poltergeist", "Revenant", "Shade", "Skulker"],
    broadcast: (name) => `${name} has started haunting the server. Watch your step. Trust nothing.`,
    maxChildrenZero: true,
  },
  {
    key: "embodimentOfDestruction", name: "Embodiment of Destruction", className: "helpme", teams: [-4], parents: ["Master", "Hexanomaly", "Pulsar", "Overgunner"],
    broadcast: (name) => `Clumps of anomalies seem to gather around ${name}. You better start running, and fast.`,
    maxChildrenZero: true,
  },
  {
    key: "arenaGuard", name: "Arena Guard", className: "arenaguardpl", teams: [-100], parents: ["Master"], siegeOnlyParent: "Master",
    broadcast: (name) => `Valrayvn: ${name}! I shall grant you true power! ASCEND!`,
    maxChildrenZero: true,
  },
]);

const BY_KEY = new Map(BRANCHES.map((branch) => [branch.key, branch]));

function isFfaMode(mode) {
  return mode === "ffa" || mode === "ffaPoly";
}

function getEligibleBranches(entity, mode, classes, hasLegend = false) {
  if (!entity || !entity.skill || Number(entity.skill.score) < 1000000 || hasLegend || isFfaMode(mode)) return [];
  return BRANCHES.filter((branch) => {
    if (!branch.parents.includes(entity.label) || !classes[branch.className]) return false;
    if (branch.key === "arenaGuard") {
      return entity.team === -100 || mode === "siege" && entity.label === branch.siegeOnlyParent;
    }
    return mode === "siege" || branch.teams.includes(entity.team);
  });
}

function syncUpgradeOptions(entity, mode, classes, hasLegend = false) {
  if (!entity || !Array.isArray(entity.upgrades)) return [];
  const eligible = getEligibleBranches(entity, mode, classes, hasLegend);
  const eligibleKeys = new Set(eligible.map((branch) => branch.key));

  // Reevaluate on every server tick. If the entity's faction/mode ceases to
  // qualify, remove only our injected choices and leave normal upgrades alone.
  entity.upgrades = entity.upgrades.filter((upgrade) =>
    !upgrade || !upgrade.legendaryBranchKey || eligibleKeys.has(upgrade.legendaryBranchKey)
  );
  if (!entity._legendaryBranchUnlockMessages) entity._legendaryBranchUnlockMessages = Object.create(null);

  const newlyUnlocked = [];
  for (const branch of eligible) {
    if (!entity.upgrades.some((upgrade) => upgrade && upgrade.legendaryBranchKey === branch.key)) {
      const target = classes[branch.className];
      entity.upgrades.push({
        class: target,
        tier: 0,
        level: 0,
        index: target.index,
        legendaryBranchKey: branch.key,
      });
    }
    if (!entity._legendaryBranchUnlockMessages[branch.key]) {
      entity._legendaryBranchUnlockMessages[branch.key] = true;
      newlyUnlocked.push(branch);
    }
  }
  return newlyUnlocked;
}

function getBranch(key) {
  return BY_KEY.get(key) || null;
}

module.exports = {
  BRANCHES,
  getEligibleBranches,
  syncUpgradeOptions,
  getBranch,
  isFfaMode,
};
