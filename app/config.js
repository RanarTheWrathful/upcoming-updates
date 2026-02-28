module.exports = 
{    
  /* ================= CORE ================= */

  "SPEED": 1,
  "WIDTH": 8000,
  "HEIGHT": 8000,
  "MODE": "ffa",

  /* ================= NETWORK ================= */

  "NETWORK_UPDATE_FACTOR": 24,
  "SOCKET_WARNING_LIMIT": 5,
  "NETWORK_FRONTLOG": 1,
  "NETWORK_FALLBACK_TIME": 30,
  "VISIBLE_LIST_INTERVAL": 750,
  "RUN_SPEED": 1.5,
  "MAX_HEARTBEAT_INTERVAL": 30000000,
  "VERBOSE": true,
  "BANNED_CHARACTER_REGEX": /[\uFDFD\u200E\u0000]/gi,

  /* ================= SERVER ================= */

  "HOST": "0.0.0.0",
  "PORT": 3000,
  "SERVER": "upcoming-update.glitch.me",
  "TYPE": "testing",
  "GATE": false,
  "BOTS_ENABLED": true,
  "MESSAGE_DELAY": 5000,
  "WAVE": 0,
  "EVENT": 0,
  "TIME": 0,
  "PLAYERS": 0,
  "VOTES": [],
  "BANS": [],
  "MUTES": [],
  "SOCKETS": [],
  "LIST": [],
  
  /* ================= GAMEPLAY ================= */


  "NPC_WANDER_LOC_1": [],
  "NPC_WANDER_LOC_2": [],
  "RANDOM_COLORS": false,

  "STEALTH": 4,
  "MIN_SPEED": 0.001,
  "GLASS_HEALTH_FACTOR": 3.6,
  "RESPAWN_TIMER": 5,
  "STARTING_CLASS": "basic",

  /* ================= SCORE TRACKING ================= */

  "POINTS": {
    "guardians": 0,
    "fallen": 0,
    "highlords": 0,
    "voidlords": 0,
    "neutralAlliance": 0,
    "other": 0
  },

  /* ================= ENEMIES ================= */

  "ENEMIES": {
    "crashers": [
      "eggCrasher",
      "squareCrasher",
      "triangleCrasher",
      "pentagonCrasher",
      "hexagonCrasher"
    ],
    "shinyCrashers": [
      "swarmerProtector",
      "cruiserProtector",
      "beekeeperProtector"
    ],
    "sentries": [
      "triangleSentry",
      "trianglePounderSentry",
      "triangleTrapperSentry",
      "triangleSwarmSentry"
    ],
    "guards": [
      "auto3Guard",
      "bansheeGuard",
      "spawnerGuard"
    ],
    "protectors": [
      "swarmerProtector",
      "cruiserProtector",
      "beekeeperProtector"
    ],
    "keepers": [
      "commanderKeeper",
      "directorKeeper",
      "overKeeper"
    ],
    "sentinels": [
      "skimmerSentinel",
      "crossbowSentinel",
      "minigunSentinel"
    ],
    "thrashers": [
      "thrasher"
    ],
    "anomalies": [
      "anomaly",
      "glitch",
      "aoc",
      "beeMechab",
      "machinegunMechab",
      "trapMechab",
      "trapMechabarab",
      "swarmMechab",
      "buildMechab",
      "aokaol",
      "AlfabuildMechab"
    ],
    "unawakened": [
      "Unawakened1",
      "Unawakened2",
      "Unawakened3"
    ],
    "eggBosses": [
      "sorcerer",
      "oblivion",
      "cultist"
    ],
    "squareBosses": [
      "summoner",
      "squaredpelleter",
      "hellwark"
    ],
    "triangleBosses": [
      "enchantress",
      "elite_skimmer",
      "defender",
      "defector",
      "witch"
    ],
    "pentagonBosses": [
      "exorcistor",
      "nestkeep",
      "nestward",
      "nestguard"
    ],
    "hexagonBosses": [
      "mortarLordCenturion",
      "hiveLordCenturion"
    ],
    "megaPolygonBosses": [
      "Pawn",
      "Rook"
    ],
    "arenaBosses": [
      "arenaguard",
      "damagedArenaCloser"
    ],
    "elites": [
      "elite_machine",
      "elite_destroyer",
      "elite_gunner",
      "elite_spawner",
      "elite_battleship",
      "elite_fortress",
      "elite_spinner",
      "elite_sprayer",
      "elite_swarmer"
    ],
    "fallenBosses": [
      "fallenhybrid",
      "fallenanni",
      "fallenflankguard",
      "fallenfalcon",
      "fallenautodouble",
      "fallenoverlord",
      "fallenbooster",
      "fallentyrant"
    ],
    "corpseBosses": [
      "enslaver",
      "plaguedoc"
    ],
    "highlordTechBosses": [
      "elite_warkspawner",
      "contraption",
      "exterminator"
    ],
    "voidSpawnBosses": [
      "elder",
      "nulltype"
    ],
    "voidCorruptedBosses": [
      "amalgam"
    ],
    "aetherBosses": [
      "lesserCaster",
      "lesserCreed",
      "lesserAetherAspect",
      "lesserlightFinder",
      "lesserConstant"
    ]
  },

  "ENEMY_INTENSITY": {
    "CRASHERS": 25,
    "THRASHERS": 15,
    "SENTINELS": 5
  },

  "BOSS_LIMIT": {
    "GUARDIANS": 3,
    "FALLEN": 3,
    "HIGHLORDS": 3,
    "VOIDLORDS": 3,
    "NEUTRAL_ALLIANCE": 3
  },
  
  "SPAWN_FOOD": true,
  "SPAWN_NEUTRAL_BOSSES": true,
  "SPAWN_CRASHER": true,
  "SPAWN_SENTINEL": true,
  "SPAWN_GUARDIAN_BOSSES": false,
  "SPAWN_FALLEN_BOSSES": false,
  "SPAWN_VOIDLORD_ENEMIES": false,
  
  /* ================= ORIGINAL SETTINGS ================= */

  "DEADLY_BORDERS": false,
  "ALLOW_SERVER_END": false,
  "ENCLOSED_ARENA": false,
  "DISABLED_TEAM_MESSAGE": false,
  "MAZE_GENERATION": false,

  "DAMAGE_CONSTANT": 0.6,
  "KNOCKBACK_CONSTANT": 1,
  "ROOM_BOUND_FORCE": 0.01,

  "FOOD": [100,34,17,10,1,0.1,0.01,0.001],
  "FOOD_NEST": [0.1,0.1,0.1,100,10,1,0.1,0.01],

  "SKILL_CAP": 45,
  "MAX_SKILL": 9,
  "SOFT_MAX_SKILL": 0.59,
  "SKILL_SOFT_CAP": 0,
  "SKILL_CHEAT_CAP": 45,
  "SKILL_LEAK": 0,
  "SKILL_BOOST": 5,

  "FOOD_AMOUNT": 0.25,
  "BOTS": 0,
  "TEAMS": [1,2,3,4],

  "PLAYER_SPAWN_LOCATION": "random",
  "CONSIDER_PLAYER_TEAM_LOCATION": false,
  "CONSIDER_BOT_TEAM_LOCATION": false,
  "BOT_SPAWN_LOCATION": "norm",
  "BOT_TEAMS": [1,2,3,4],
  "REDUCE_BOTS_PER_PLAYER": 1,
  "ACTIVATION_MODE": "normal",

  /* ================= GAME MODE SETTINGS ================= */
  
  "PLAGUE": false,
  "GROWTH": false,
  "POLYGONS_FIGHT_BACK": false,
  "SHINY_GLORY": false,
  "SOCCER": false,
  "SIEGE": false,
  "DOMINATION": false,
  "DOMINATOR_COUNT": 4,
  "INSTANT_CAPTURE": false,
  "BASE_DRONES": false,
  "SANCTUARIES": false,
}
