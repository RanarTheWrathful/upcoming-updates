"use strict";

function randomUnit(random) {
  const value = Number(random());
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(0.999999999999, value));
}

function randomIndex(length, random) {
  return Math.floor(randomUnit(random) * length);
}

/**
 * Build themed lists with costs inherited from Siege's existing budget tiers.
 * A class that appears in more than one tier keeps its cheapest listed cost.
 */
function createEnemyCatalog(costTiers, themeDefinitions) {
  const costs = new Map();

  for (const tier of costTiers || []) {
    const cost = Number(tier && tier.cost);
    if (!Number.isFinite(cost) || cost <= 0) continue;
    for (const name of (tier && tier.enemies) || []) {
      if (typeof name !== "string" || !name) continue;
      const existing = costs.get(name);
      if (existing === undefined || cost < existing) costs.set(name, cost);
    }
  }

  return (themeDefinitions || [])
    .map((theme) => {
      const seen = new Set();
      const enemies = [];
      for (const name of (theme && theme.enemies) || []) {
        if (seen.has(name) || !costs.has(name)) continue;
        seen.add(name);
        enemies.push({ name, cost: costs.get(name) });
      }
      return {
        id: theme.id,
        label: theme.label || theme.id,
        enemies,
      };
    })
    .filter((theme) => theme.id && theme.enemies.length > 0);
}

/** Randomly select between one and every available theme, without replacement. */
function chooseRandomThemes(themes, random = Math.random) {
  const pool = (themes || []).filter(
    (theme) => theme && Array.isArray(theme.enemies) && theme.enemies.length > 0
  );
  if (!pool.length) return [];

  // Pick the count independently, then shuffle so any subset can be selected.
  const count = 1 + randomIndex(pool.length, random);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1, random);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/**
 * Choose one unique enemy from the selected themes that fits the remaining
 * budget. The validity callback lets the caller reject missing Class entries.
 */
function chooseEnemy(themes, remainingBudget, random = Math.random, isValid = () => true) {
  const budget = Number(remainingBudget);
  if (!Number.isFinite(budget) || budget <= 0) return null;

  const candidatesByName = new Map();
  for (const theme of themes || []) {
    for (const enemy of (theme && theme.enemies) || []) {
      if (
        !enemy ||
        typeof enemy.name !== "string" ||
        !Number.isFinite(enemy.cost) ||
        enemy.cost <= 0 ||
        enemy.cost > budget ||
        !isValid(enemy)
      ) {
        continue;
      }

      const previous = candidatesByName.get(enemy.name);
      if (!previous || enemy.cost < previous.cost) {
        candidatesByName.set(enemy.name, enemy);
      }
    }
  }

  const candidates = Array.from(candidatesByName.values());
  if (!candidates.length) return null;
  return candidates[randomIndex(candidates.length, random)];
}

const THEME_DEFINITIONS = [
  {
    id: "crashers",
    label: "Crashers",
    enemies: [
      "eggCrasher", "squareCrasher", "triangleCrasher", "pentagonCrasher",
      "triangleSentry", "trianglePounderSentry", "triangleTrapperSentry",
      "triangleSwarmSentry", "hexagonCrasher",
    ],
  },
  {
    id: "sentries",
    label: "Sentries",
    enemies: [
      "triangleSentry", "eggSentry", "squareSentry", "pentagonSentry", "trianglePounderSentry", "triangleTrapperSentry",
      "triangleSwarmSentry",
                        "pentagonSwarmerSentry",
                        "pentagonTriAngleSentry",
                        "pentagonHunterSentry",
                        "squareTwinSentry",
                        "squareSniperSentry",
                        "squareAuto2Sentry",
                        "eggSorcererSentry",
                        "eggAutoSentry",
                        "eggBasicSentry",
    ],
  },
  {
    id: "sentinels",
    label: "Sentinel",
    enemies: [
 "skimmerSentinel", "crossbowSentinel", "minigunSentinel",
    ],
  },
  {
    id: "unawakened",
    label: "Unawakened",
    enemies: [
      "Unawakened1", "Unawakened2", "Unawakened3",
    ],
  },
  {
    id: "aether",
    label: "Aether Bosses",
    enemies: [ 
      "lesserCaster", "lesserCreed", "lesserAetherAspect",
      "lesserlightFinder", "lesserConstant",
    ],
  },
  {
    id: "spellcasters",
    label: "Spellcasters & Summoners",
    enemies: [
      "sorcerer", "summoner", "enchantress", "witch", "cultist",
      "exorcistor",
    ],
  },
  {
    id: "thrashersAnomalies",
    label: "Thrashers & Anomalies",
    enemies: [
      "thrasher", "glitch", "aoc", "aokaol", "anomaly", "nulltype",
      "amalgam",
      "beeMechab", "machinegunMechab", "trapMechab", "trapMechabarab",
      "swarmMechab", "buildMechab", "AlfabuildMechab",
    ],
  },
  {
    id: "thrashersAnomalies",
    label: "Thrashers & Anomalies",
    enemies: [
      "thrasher", "glitch", "aoc", "aokaol", "anomaly",
      "beeMechab", "machinegunMechab", "trapMechab", "trapMechabarab",
      "swarmMechab", "buildMechab", "AlfabuildMechab",
    ],
  },
  
  {
    id: "voidBosses",
    label: "Void Bosses",
    enemies: [
      "elder", "nulltype", "hiveMind", "abyssthrasher",
      "amalgam",
    ],
  },
  {
    id: "eggBosses",
    label: "Egg Bosses",
    enemies: [
     "oblivion", "sorcerer",
    ],
  },
  {
    id: "squareBosses",
    label: "Square Bosses",
    enemies: [
     "hellwark", "summoner", "squaredpelleter",
    ],
  },
  {
    id: "triangleBosses",
    label: "Triangle Bosses",
    enemies: [
     "elite_skimmer", "witch", "enchantress", "defender", "defector"
    ],
  },
  {
    id: "pentagonBosses",
    label: "Pentagon Bosses",
    enemies: [
     "nest_keep", "nest_ward", "nestguard", "exorcistor"
    ],
  },
  {
    id: "cultBosses",
    label: "Cult Bosses",
    enemies: [
, "Pawn", "Rook", "bishop", "mortarLordCenturion", "hiveLordCenturion",
    ],
  },
  {
    id: "crasherEntities",
    label: "Crasher Entities",
    enemies: [
      "hexagonCrasher",
      "eggCrasher", "squareCrasher", "triangleCrasher", "pentagonCrasher",
      "triangleSentry", "trianglePounderSentry", "triangleTrapperSentry",
      "triangleSwarmSentry", "eggSentry", "squareSentry", "pentagonSentry",
  "elite_machine", "elite_destroyer", "elite_gunner",
      "elite_spawner", "elite_battleship",
      "elite_spinner", "elite_sprayer", "elite_swarmer", "elite_fortress",
                        "pentagonSwarmerSentry",
                        "pentagonTriAngleSentry",
                        "pentagonHunterSentry",
                        "squareTwinSentry",
                        "squareSniperSentry",
                        "squareAuto2Sentry",
                        "eggSorcererSentry",
                        "eggAutoSentry",
                        "eggBasicSentry",
    ],
  },
  {
    id: "eggs",
    label: "Egg Entities",
    enemies: [
      "egg", 
      "auto3Guard", "bansheeGuard", "spawnerGuard",
     "oblivion", "sorcerer",
    ],
  },
  {
    id: "squares",
    label: "Square Entities",
    enemies: [
      "square",
     "hellwark", "summoner", "squaredpelleter","swarmerProtector",
      "cruiserProtector", "beekeeperProtector",
    ],
  },
  {
    id: "triangles",
    label: "Triangle Entities",
    enemies: [
      "triangle",
     "elite_skimmer", "witch", "enchantress", "defender", "defector", "commanderKeeper",
      "directorKeeper", "overKeeper",

    ],
  },
  {
    id: "pentagons",
    label: "Pentagon Entities",
    enemies: [
      "pentagon",
     "nest_keep", "nest_ward", "nestguard", "exorcistor",
 "skimmerSentinel", "crossbowSentinel", "minigunSentinel",

    ],
  },
  {
    id: "polygons",
    label: "Polygons",
    enemies: [
      "egg", "square", "triangle", "pentagon",
      "hexagon", "septagon", "octagon", "nonagon"
    ],
  },
   {
    id: "diepBosses",
    label: "Diep Bosses",
    enemies: [
      "defender", "fallenoverlord", "fallenbooster", "summoner",
      "elite_swarmer"
    ],
  },
  {
    id: "elites",
    label: "Elite Crashers",
    enemies: [
  "elite_machine", "elite_destroyer", "elite_gunner",
      "elite_spawner", "elite_battleship",
      "elite_spinner", "elite_sprayer", "elite_swarmer", "elite_fortress",
    ],
  },
  {
    id: "machines",
    label: "Mechs & Machines",
    enemies: [
      "contraption", "elite_warkspawner",
    ],
  },
  {
    id: "guardsKeepers",
    label: "Guards, Keepers & Protectors",
    enemies: [
      "auto3Guard", "bansheeGuard", "spawnerGuard", "swarmerProtector",
      "cruiserProtector", "beekeeperProtector", "commanderKeeper",
      "directorKeeper", "overKeeper",
 "skimmerSentinel", "crossbowSentinel", "minigunSentinel",
    ],
  },
  {
    id: "closers",
    label: "Arena Bosses",
    enemies: [
"arenaguard",
      "damagedArenaCloser", "arenaslayer",
    ],
  },
  {
    id: "fallen",
    label: "Fallen",
    enemies: [
      "fallenhybrid", "fallenanni", "fallenflankguard", "fallenfalcon",
      "fallenoverlord", "fallenbooster", "fallenautodouble", "fallentyrant",
   "enslaver",
    ],
  },
];

module.exports = {
  THEME_DEFINITIONS,
  createEnemyCatalog,
  chooseRandomThemes,
  chooseEnemy,
};
