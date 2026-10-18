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
    id: "crashersSentries",
    label: "Crashers & Sentries",
    enemies: [
      "eggCrasher", "squareCrasher", "triangleCrasher", "pentagonCrasher",
      "triangleSentry", "trianglePounderSentry", "triangleTrapperSentry",
      "triangleSwarmSentry", "hexagonCrasher",
    ],
  },
  {
    id: "sentinels",
    label: "Sentinels & Unawakened",
    enemies: [
      "skimmerSentinel", "crossbowSentinel", "minigunSentinel",
      "Unawakened1", "Unawakened2", "Unawakened3",
    ],
  },
  {
    id: "spellcasters",
    label: "Spellcasters & Summoners",
    enemies: [
      "sorcerer", "summoner", "enchantress", "witch", "cultist",
      "exorcistor", "lesserCaster", "lesserCreed", "lesserAetherAspect",
      "lesserlightFinder", "lesserConstant", "plaguedoc",
    ],
  },
  {
    id: "thrashersAnomalies",
    label: "Thrashers & Anomalies",
    enemies: [
      "thrasher", "glitch", "aoc", "aokaol", "anomaly", "nulltype",
      "amalgam", "oblivion",
    ],
  },
  {
    id: "polygons",
    label: "Polygons & Shape Variants",
    enemies: [
      "eggCrasher", "squareCrasher", "triangleCrasher", "pentagonCrasher",
      "hexagonCrasher", "Pawn", "Rook", "squaredpelleter",
    ],
  },
  {
    id: "machines",
    label: "Mechs & Machines",
    enemies: [
      "beeMechab", "machinegunMechab", "trapMechab", "trapMechabarab",
      "swarmMechab", "buildMechab", "AlfabuildMechab", "contraption",
      "elite_skimmer", "elite_machine", "elite_destroyer", "elite_gunner",
      "elite_spawner", "elite_battleship", "elite_warkspawner",
      "elite_spinner", "elite_sprayer", "elite_swarmer", "elite_fortress",
      "hellwark",
    ],
  },
  {
    id: "guardsKeepers",
    label: "Guards, Keepers & Protectors",
    enemies: [
      "auto3Guard", "bansheeGuard", "spawnerGuard", "swarmerProtector",
      "cruiserProtector", "beekeeperProtector", "commanderKeeper",
      "directorKeeper", "overKeeper", "defender", "nestkeep", "nestward",
      "nestguard", "arenaguard", "mortarLordCenturion", "hiveLordCenturion",
      "damagedArenaCloser", "elder", "exterminator",
    ],
  },
  {
    id: "fallenCorrupted",
    label: "Fallen & Corrupted",
    enemies: [
      "fallenhybrid", "fallenanni", "fallenflankguard", "fallenfalcon",
      "fallenoverlord", "fallenbooster", "fallenautodouble", "fallentyrant",
      "defector", "enslaver",
    ],
  },
];

module.exports = {
  THEME_DEFINITIONS,
  createEnemyCatalog,
  chooseRandomThemes,
  chooseEnemy,
};
