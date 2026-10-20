"use strict";

const POLYGON_SPAWN_COUNTS = Object.freeze({
  egg: 25,
  square: 25,
  triangle: 25,
  pentagon: 25,
  hexagon: 5,
  septagon: 5,
  octagon: 2,
  nonagon: 2,
});

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
  const selected = pool.slice(0, count);
  // Reinforcements are a rare event: when selected, there is a 50% chance
  // to ignore them and continue with ordinary enemy themes instead.
  const allyTheme = selected.find((theme) => theme.id === "spawnAllies");
  if (!allyTheme) return selected;
  if (randomUnit(random) >= 0.5) return [allyTheme];

  const ordinaryThemes = selected.filter((theme) => theme.id !== "spawnAllies");
  if (ordinaryThemes.length) return ordinaryThemes;
  const ordinaryPool = pool.filter((theme) => theme.id !== "spawnAllies");
  return ordinaryPool.length ? [ordinaryPool[randomIndex(ordinaryPool.length, random)]] : [];
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

/**
 * Plan a reinforcement roster under the wave budget. A reinforcement event may
 * include at most one uniquely defined boss, plus any bots the remaining budget
 * can pay for. Bots have a lower event cost so bosses and bots can arrive together.
 */
function planAllyRoster(theme, budget, random = Math.random, isValid = () => true, botBudgetCost = 10, maxBots = 3) {
  const availableBudget = Number(budget);
  const botCost = Number(botBudgetCost);
  const botLimit = Number.isFinite(Number(maxBots)) ? Math.max(0, Math.floor(Number(maxBots))) : 3;
  if (!Number.isFinite(availableBudget) || availableBudget <= 0 || !Number.isFinite(botCost) || botCost <= 0) return [];

  const eligible = [];
  const seenNames = new Set();
  for (const enemy of (theme && theme.enemies) || []) {
    if (!enemy || typeof enemy.name !== "string" || !Number.isFinite(enemy.cost) || enemy.cost <= 0) continue;
    if (enemy.name !== "bot" && seenNames.has(enemy.name)) continue;
    if (!isValid(enemy)) continue;
    if (enemy.name !== "bot") seenNames.add(enemy.name);
    eligible.push(enemy.name === "bot" ? { name: "bot", cost: botCost } : enemy);
  }

  const bot = eligible.find((enemy) => enemy.name === "bot");
  const bosses = eligible.filter((enemy) => enemy.name !== "bot" && enemy.cost <= availableBudget);
  const bossesThatCanBringBots = bot
    ? bosses.filter((enemy) => enemy.cost + botCost <= availableBudget)
    : [];

  let boss = null;
  if (bossesThatCanBringBots.length) {
    boss = bossesThatCanBringBots[randomIndex(bossesThatCanBringBots.length, random)];
  } else if (bosses.length && (!bot || availableBudget < botCost || randomUnit(random) < 0.5)) {
    boss = bosses[randomIndex(bosses.length, random)];
  }

  const roster = [];
  let remaining = availableBudget;
  if (boss) {
    roster.push({ name: boss.name, cost: boss.cost });
    remaining -= boss.cost;
  }
  if (bot) {
    let botsAdded = 0;
    while (remaining >= botCost && botsAdded < botLimit) {
      roster.push({ name: "bot", cost: botCost });
      remaining -= botCost;
      botsAdded++;
    }
  }
  if (!roster.length && bosses.length) {
    const fallback = bosses[randomIndex(bosses.length, random)];
    roster.push({ name: fallback.name, cost: fallback.cost });
  }
  return roster;
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
     "nestkeep", "nestward", "nestguard", "exorcistor"
    ],
  },
  {
    id: "cultBosses",
    label: "Cult Bosses",
    enemies: [
      "Pawn", "Rook", "bishop", "mortarLordCenturion", "hiveLordCenturion",
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
     "nestkeep", "nestward", "nestguard", "exorcistor",
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
      "arenaguard", "damagedArenaCloser", "arenaslayer", "bot",
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
  {
    id: "spawnAllies",
    label: "Backup Allies",
    enemies: [
      "roguepalisade", "roguarmada", "RogueLibor", "roguemothership",
      "castaway", "twilight", "bot",
    ],
  },
];

module.exports = {
  POLYGON_SPAWN_COUNTS,
  THEME_DEFINITIONS,
  createEnemyCatalog,
  chooseRandomThemes,
  chooseEnemy,
  planAllyRoster,
};
