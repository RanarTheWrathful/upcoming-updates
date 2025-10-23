/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
//guh duh.
// General require
require("google-closure-library");
goog.require("goog.structs.PriorityQueue");
const boxIntersect = require("box-intersect");
const net = require("net");
const { cleanText } = require("./filter");
// Import game settings.
// Import utilities.
const util = require("./lib/util");
const ran = require("./lib/random");
const fs = require("fs"); // Example of using serverStateManager module
const serverState = require("./serverStateManager");
// Example usage:
let currentState = serverState.getServerState();

const lockFilePath = "./serv.lock";
// Create lock file
fs.writeFileSync(lockFilePath, process.pid.toString());

let chosenMode;
function countInstances(arr) {
  const countMap = {}; // Object to store counts

  // Loop through each element in the array
  arr.forEach((item) => {
    if (countMap[item]) {
      countMap[item]++; // Increment count if item exists
    } else {
      countMap[item] = 1; // Initialize count if item does not exist
    }
  });

  return countMap; // Return the object containing counts
}
function pickTheBiggest(countMap) {
  // Determine the maximum count
  let maxCount = -1;
  let maxItems = [];

  for (let key in countMap) {
    if (countMap[key] > maxCount) {
      maxCount = countMap[key];
      maxItems = [key]; // Reset maxItems with the new maximum count item
    } else if (countMap[key] === maxCount) {
      maxItems.push(key); // Add to maxItems if count is equal to maxCount
    }
  }

  // Randomly select one item from maxItems
  const randomIndex = Math.floor(Math.random() * maxItems.length);
  const selected = maxItems[randomIndex];

  // Return just the selected item (not wrapped in an array)
  return { selected, count: maxCount };
}

let modeList = ["Unknown"];
let serverType = "testing"; //change this to play preset modes look
if (serverType === "JJ's Reasearch Facility")
  chosenMode = "JJ's Reasearch Facility"; //or this
if (serverType === "testing") chosenMode = "Siege";
//change this to play a specifict mode
else if (serverType === "normal") {
  //dont change these - J.J.
  modeList = [
    //oh ok - kris
    "Open Execution",
    "Maze Execution",
    "4TDM Growth",
    "Maze 4TDM",
    "Open 4TDM",
    "FFA Maze",
    "FFA PFB",
    "Maze Fort Domination",
    "Open Fort Domination",
    "Open Domination",
    "Maze Domination",
    "Territory Control",
    "Open Graveyard",
    "Maze Graveyard",
    "Open Plague",
    "Maze Plague",
    "King of the Hill",
    "Soccer",
    "Grudge Ball",
    "Siege",
  ];
  if (currentState.modeVotes.length === 0) {
    chosenMode = ran.choose(modeList);
  } else {
    let votes = countInstances(currentState.modeVotes);
    let result = pickTheBiggest(votes);
    chosenMode = result.selected;
  }
  currentState.modeVotes = [];
  if (chosenMode === "siege") {
    for (let i = 0; i < 3; i++) {
      currentState.modeVotes.push("siege");
    }
    if (currentState.bossWaves > 50) {
      currentState.modeVotes = [];
    }
  }
} else if (serverType === "lore") {
  modeList = [
    "The Expanse",
    "The Infestation",
    "The Controlled",
    "The Denied",
    "The Awakening",
    "The Distance",
  ];
  let listCount = modeList.length;
  if (listCount > currentState.loreModeIndex) {
    chosenMode = modeList[currentState.loreModeIndex];
  } else {
    chosenMode = modeList[0];
    serverState.resetLoreIndex();
  }
}

//serverState.resetLoreIndex();
//serverState.advanceLoreSequence();
let config = require("./config.js"),
  gameMode = require("./Game Modes/" + chosenMode),
  c = { ...config, ...gameMode };
//util.log(JSON.stringify(c, null, 2));
const decodeHTML = require("html-entities").decode;
// Set up room
util.log(chosenMode);
c.allowEntry = false;
c.server = `upcoming-update.glitch.me`;
c.botSpawn = true;
c.messageLimit = 3000;
let rareMode = Math.random() * 250;
if (rareMode < 1 && c.SPAWN_FOOD) {
  c.SHINY_GLORY = true;
}
global.fps = 50;

var roomSpeed = c.gameSpeed;
c.soccerBlueCount = 0;
c.soccerGreenCount = 0;
c.soccerRedCount = 0;
c.soccerPurpleCount = 0;
c.enemyCount = 0;
c.botAmount = 1;
c.playerz = 1;
c.bossAmount = 0;
c.whar = 0;
c.uniqueBossList = [];
let wE1 = [
  "eggCrasher",
  "squareCrasher",
  "triangleCrasher",
  "thrasher",
  "auto3Guard",
  "bansheeGuard",
  "spawnerGuard",
];
let wE2 = [
  "swarmerProtector",
  "pentagonCrasher",
  "cruiserProtector",
  "beekeeperProtector",
];
let wE3 = [
  "triangleSentry",
  "glitch",
  "aoc",
  "beeMechab",
  "machinegunMechab",
  "trapMechab",
  "trapMechabarab",
  "swarmMechab",
  "buildMechab",
  "aokaol",
  "commanderKeeper",
  "directorKeeper",
  "overKeeper",
];
let nE1 = [
  "trianglePounderSentry",
  "triangleTrapperSentry",
  "triangleSwarmSentry",
  "hexagonCrasher",
  "anomaly",
  "AlfabuildMechab",
];
let nE2 = [
  "skimmerSentinel",
  "crossbowSentinel",
  "minigunSentinel",
  "Unawakened1",
  "Unawakened2",
  "Unawakened3",
  /*/     "swarmeggsenti1b",
        "swarmeggsenti2b",
        "swarmeggsenti3b",/*/
];
let sE1 = [];
let t1B = [
  "sorcerer",
  "summoner",
  "enchantress",
  "elite_skimmer",
  "elite_machine",
  "elite_destroyer",
  "elite_gunner",
  "elite_spawner",
  "elite_battleship",
  "fallenhybrid",
  "fallenanni",
  "fallenflankguard",
  "fallenfalcon",
  "abdul",
  "Pawn",
  "oblivion",
]; //yipeeeeee
let t2B = [
  "nulltype",
  "elite_warkspawner",
  "contraption",
  "defender",
  "exorcistor",
  "nestkeep",
  "nestward",
  "mortarLordCenturion",
  "hiveLordCenturion",
  "cultist",
  "arenaguard",
  "elite_fortress",
  "defector",
  "witch",
  "elite_spinner",
  "elite_sprayer",
  "elite_swarmer",
  "fallenoverlord",
  "fallenbooster",
  "enslaver",
  "plaguedoc",
  "fallenautodouble",
  "squaredpelleter",
  "hellwark",
];
let t3B = [
  "damagedArenaCloser",
  "nestguard",
  "amalgam",
  "exterminator",
  "Rook",
  "lesserCaster",
  "lesserCreed",
  "lesserAetherAspect",
  "lesserlightFinder",
  "lesserConstant",
  "fallentyrant",
];
const currentDate = new Date();
const currentMonth = currentDate.getMonth(); // 0 = January, 11 = December

if (currentMonth === 9) {
  // October
  if (serverType === "normal") {
    c.SPAWN_REAPER = true;
  }
  util.log("Happy Halloween!");
  c.hallowsPaint = true;
} else if (currentMonth === 11) {
  // December
  console.log("It's December! Do something special.");
}

if (currentState.bossWaves <= 50) {
  c.bossWave = currentState.bossWaves * 1;
  // util.log(c.bossWave);
} else {
  c.bossWave = 1;
}
if (c.MODE === "siege" && c.bossWave >= 10)
  c.bonus = Math.floor(c.bossWave / 10) * 3;
else if (c.MODE === "theAwakening") c.bonus = 10;
else c.bonus = 0;
switch (c.MODE) {
  case "theControlled":
    c.bonus = 10;
    break;
}
//currentState.bossWaves = 1;
c.timeLeft = 0;
c.playerCount = 0;
setTimeout(() => {
  c.playerCount = 0;
}, 2500);
c.bossProgress = 0;
c.bossStage = 0;
if (c.MODE === "theAwakening") c.npcMove = "rep11";
c.wavesSkipped = 0;
c.preparedCounter = 50;
c.countdown = 60000;
c.godRole = true; //ran.choose([true, false]);
//important settings
c.voteList = ["placeHolder"];
c.banList = ["placeHolder"];
c.muteList = ["placeHolder"];
c.socketList = [];
c.socketEnterList = [];
c.socketExitList = [];
c.host = "0.0.0.0";
for (let i = 1; i < 11; i++) {
  c["recentMessage" + i] = "";
}
//util.log(Date());
c.servesStatic = true;
c.port = 3000;
c.networkUpdateFactor = 24;
c.socketWarningLimit = 5;
c.networkFrontlog = 1;
c.networkFallbackTime = 30;
c.visibleListInterval = 750;
if (c.MODE === "theDistance") c.visibleListInterval = 1;
c.runSpeed = 1.5;
c.maxHeartbeatInterval = 30000000;
c.verbose = true;
c.BANNED_CHARACTER_REGEX = "/[\uFDFD\u200E\u0000]/gi";
c.STEALTH = 4;
c.MAX_SKILL = 9;
c.SOFT_MAX_SKILL = 0.59;
c.SKILL_SOFT_CAP = 0;
c.SKILL_CHEAT_CAP = 45;
c.SKILL_LEAK = 0;
c.SKILL_BOOST = 5;
c.MIN_SPEED = 0.001;
c.TIER_1 = 15;
c.TIER_2 = 30;
c.TIER_3 = 45;
c.TIER_4 = 75;
c.TIER_5 = 125;
c.TIER_6 = 150;
c.TIER_7 = 200;
c.TIER_8 = 250;
c.TIER_9 = 300;
c.TIER_10 = 350;
c.TIER_11 = 400;
c.TIER_12 = 450;
c.TIER_13 = 550;
c.TIER_14 = 600;
c.TIER_15 = 650;
c.TIER_GOD = 1000;
c.GLASS_HEALTH_FACTOR = 3.6;
c.RESPAWN_TIMER = 5;
c.startingClass = "basic";
if (c.MODE === "theDistance") c.startingClass = "racer";
if (c.MODE === "theRestless") c.startingClass = "highlordLegendaryClasses";
if (c.MODE === "theAwakening") c.startingClass = "arenaguardpl";
if (c.MODE === "theAssault") c.startingClass = "swarmProtector2";
//if (serverType === "testing") c.startingClass = "testbed";
c.DomxClass = "minibois";
function removeMuted(socketIP) {
  console.log("Removing from muteList:", socketIP);
  console.log("Current muteList:", c.muteList);
  const index = c.muteList.indexOf(socketIP);
  if (index !== -1) {
    c.muteList.splice(index, 1);
    console.log("Updated muteList:", c.muteList);
  }
}

function removeBanned(socketIP) {
  const index = c.banList.indexOf(socketIP);
  if (index !== -1) {
    c.banList.splice(index, 1);
  }
}
const room = {
  lastCycle: undefined,
  cycleSpeed: 1000 / roomSpeed / 30,
  width: c.WIDTH,
  height: c.HEIGHT,
  setup: c.ROOM_SETUP,
  xgrid: c.X_GRID,
  ygrid: c.Y_GRID,
  gameMode: c.MODE,
  skillBoost: c.SKILL_BOOST,
  scale: {
    square: (c.WIDTH * c.HEIGHT) / 100000000,
    linear: Math.sqrt(c.WIDTH * c.HEIGHT) / 100000000,
  },
  maxFood: ((c.WIDTH * c.HEIGHT) / 20000) * c.FOOD_AMOUNT,
  isInRoom: (location) => {
    return (
      location.x >= 0 &&
      location.x <= room.width &&
      location.y >= 0 &&
      location.y <= room.height
    );
  },
  topPlayerID: -1,
};
room.xgrid = c.ROOM_SETUP[0].length;
room.ygrid = c.ROOM_SETUP.length;
room.findType = () => {
  let j = 0;
  room.setup.forEach((row) => {
    let i = 0;
    row.forEach((cell) => {
      if (!room[cell]) room[cell] = [];
      room[cell].push({
        x: ((i + 0.5) * room.width) / room.xgrid,
        y: ((j + 0.5) * room.height) / room.ygrid,
      });
      i++;
    });
    j++;
  });
};
room.findType();

room.nestFoodAmount = 0;
if (room.nest) {
  room.nestFoodAmount =
    (1.5 * Math.sqrt(room.nest.length)) / room.xgrid / room.ygrid;
}
room.random = () => {
  return {
    x: ran.irandom(room.width),
    y: ran.irandom(room.height),
  };
};
room.randomType = (type) => {
  if (!room[type] || !room[type].length) return undefined;
  let selection = room[type][ran.irandom(room[type].length - 1)];
  return {
    x:
      ran.irandom((0.5 * room.width) / room.xgrid) * ran.choose([-1, 1]) +
      selection.x,
    y:
      ran.irandom((0.5 * room.height) / room.ygrid) * ran.choose([-1, 1]) +
      selection.y,
  };
};
room.type = (type) => {
  if (!room[type] || !room[type].length) return undefined;
  let selection = room[type][ran.irandom(room[type].length - 1)];
  return {
    x: selection.x,
    y: selection.y,
  };
};
room.gauss = (clustering) => {
  let output;
  do {
    output = {
      x: ran.gauss(room.width / 2, room.height / clustering),
      y: ran.gauss(room.width / 2, room.height / clustering),
    };
  } while (!room.isInRoom(output));
};
room.gaussInverse = (clustering) => {
  let output;
  do {
    output = {
      x: ran.gaussInverse(0, room.width, clustering),
      y: ran.gaussInverse(0, room.height, clustering),
    };
  } while (!room.isInRoom(output));
  return output;
};
room.gaussRing = (radius, clustering) => {
  let output;
  do {
    output = ran.gaussRing(room.width * radius, clustering);
    output = {
      x: output.x + room.width / 2,
      y: output.y + room.height / 2,
    };
  } while (!room.isInRoom(output));
  return output;
};
room.isIn = (type, location) => {
  if (room.isInRoom(location)) {
    let a = Math.floor((location.y * room.ygrid) / room.height);
    let b = Math.floor((location.x * room.xgrid) / room.width);
    return room.setup[a] && type === room.setup[a][b];
  } else {
    return false;
  }
};
room.isInNorm = (location) => {
  if (room.isInRoom(location)) {
    let a = Math.floor((location.y * room.ygrid) / room.height);
    let b = Math.floor((location.x * room.xgrid) / room.width);
    let v = room.setup[a][b];
    return v !== "nest";
  } else {
    return false;
  }
};
/*/room.gaussType = (type, clustering) => {
  if (!room[type] || !room[type].length) return undefined;
  let selection = room[type][ran.irandom(room[type].length - 1)];
  let location = {};
  do {
    location = {
      x: ran.gauss(selection.x, room.width / room.xgrid / clustering),
      y: ran.gauss(selection.y, room.height / room.ygrid / clustering),
    };
  } while (!room.isIn(type, location));
  return location;
};/*/
util.log(
  room.width +
    " x " +
    room.height +
    " room initalized.  Max food: " +
    room.maxFood +
    ", max nest food: " +
    room.maxFood * room.nestFoodAmount +
    "."
);
if (c.MODE === "theInfestation") {
  c.anubLocX = room.type("dbc2").x;
  c.anubLocY = room.type("dbc2").y;
}
// Define a vector
class Vector {
  constructor(x, y) {
    //Vector constructor.

    this.x = x;
    this.y = y;
  }

  update() {
    this.len = this.length;
    this.dir = this.direction;
  }

  get length() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }

  get direction() {
    return Math.atan2(this.y, this.x);
  }
}
function nullVector(v) {
  v.x = 0;
  v.y = 0; //this guy's useful
}

class Velocity {
  constructor(i, x, y) {
    this.i = i;
    this.x = x;
    this.y = y;
  }

  get x() {
    return soaEntity.velocityX[this.i];
  }
  set x(v) {
    soaEntity.velocityX[this.i] = v;
  }
  get y() {
    return soaEntity.velocityY[this.i];
  }
  set y(v) {
    soaEntity.velocityY[this.i] = v;
  }

  get length() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }

  get direction() {
    return Math.atan2(this.y, this.x);
  }
}

class Acceleration {
  constructor(i, x, y) {
    this.i = i;
    this.x = x;
    this.y = y;
  }

  get x() {
    return soaEntity.accelX[this.i];
  }
  set x(v) {
    soaEntity.accelX[this.i] = v;
  }
  get y() {
    return soaEntity.accelY[this.i];
  }
  set y(v) {
    soaEntity.accelY[this.i] = v;
  }

  get length() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }

  get direction() {
    return Math.atan2(this.y, this.x);
  }
}

// Get class definitions and index them
let Class = (() => {
  let def = require("./lib/definitions"),
    i = 0;
  for (let k in def) {
    if (!def.hasOwnProperty(k)) continue;
    def[k].index = i++;
  }
  return def;
})();

//Makenpc functions

function racingTiles() {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;

  let racing = (loc, grid) => {
    let o;
    let a = Class.tileFloor;
    if (c.beginRace) {
      a = Class.arrowFloor;
    }
    let alpha = 0.5;
    if (gridWidth > gridHeight) {
      let start = loc.x - gridWidth / 2 + gridHeight / 2;
      let end = loc.x + gridWidth / 2 - gridHeight / 2;
      let x = start;
      for (;;) {
        o = new Entity({
          x: Math.min(x, end),
          y: loc.y,
        });
        o.define(a);
        o.SIZE = gridHeight / 2;
        if (x >= end) {
          break;
        }
        x += gridHeight;
      }
    } else if (gridWidth < gridHeight) {
      let start = loc.y + gridWidth / 2 - gridHeight / 2;
      let end = loc.y - gridWidth / 2 + gridHeight / 2;
      let y = start;
      for (;;) {
        o = new Entity({
          x: loc.x,
          y: Math.min(y, end),
        });
        o.define(a);
        o.SIZE = gridWidth / 2;
        if (y >= end) {
          break;
        }
        y += gridWidth;
      }
    } else {
      o = new Entity(loc);
      o.define(a);
      o.SIZE = gridWidth / 2;
    }
    o.filled = true;
    o.spawnLoc = loc;
    o.coreSize = o.SIZE;
    o.team = -100;
    o.color = 16;
    o.alpha = alpha;
    if (c.beginRace) {
      o.color = 10;
      o.alpha = 0.35;
    }
    o.refreshBodyAttributes();
    o.grid = grid;
    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
  };
  if (room["bstS"]) {
    room["bstS"].forEach((loc) => {
      racing(loc, {
        x: Math.floor(loc.x / gridWidth),
        y: Math.floor(loc.y / gridHeight),
      });
    });
  }
}
function makeTiling() {
  let alpha = 0.25;
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;
  if ((c.MODE === "theDenied" && c.wave > 0) || c.MODE === "theAwakening") {
    let tileSet1 = (loc, team, grid) => {
      let o;
      let a = Class.tileFloor;
      if (gridWidth > gridHeight) {
        let start = loc.x - gridWidth / 2 + gridHeight / 2;
        let end = loc.x + gridWidth / 2 - gridHeight / 2;
        let x = start;
        for (;;) {
          o = new Entity({
            x: Math.min(x, end),
            y: loc.y,
          });
          o.define(a);
          o.SIZE = gridHeight / 2;
          if (x >= end) {
            break;
          }
          x += gridHeight;
        }
      } else if (gridWidth < gridHeight) {
        let start = loc.y + gridWidth / 2 - gridHeight / 2;
        let end = loc.y - gridWidth / 2 + gridHeight / 2;
        let y = start;
        for (;;) {
          o = new Entity({
            x: loc.x,
            y: Math.min(y, end),
          });
          o.define(a);
          o.SIZE = gridWidth / 2;
          if (y >= end) {
            break;
          }
          y += gridWidth;
        }
      } else {
        o = new Entity(loc);
        o.define(a);
        o.SIZE = gridWidth / 2;
      }
      o.filled = true;
      o.coreSize = o.SIZE;
      o.protect();
      o.team = -100;
      o.color = 3;
      o.alpha = alpha;
      o.refreshBodyAttributes();
      o.grid = grid;
      o.VELOCITY.x = 0;
      o.VELOCITY.y = 0;
      o.ACCEL.x = 0;
      o.ACCEL.y = 0;
    };

    if (room["bas0"]) {
      room["bas0"].forEach((loc) => {
        tileSet1(loc, {
          x: Math.floor(loc.x / gridWidth),
          y: Math.floor(loc.y / gridHeight),
        });
      });
    }
  }
  if (c.MODE === "theExpanse") {
    let tileSet2 = (loc, team, grid) => {
      let o;
      let a = Class.tileFloor;
      alpha = 0.5;
      if (gridWidth > gridHeight) {
        let start = loc.x - gridWidth / 2 + gridHeight / 2;
        let end = loc.x + gridWidth / 2 - gridHeight / 2;
        let x = start;
        for (;;) {
          o = new Entity({
            x: Math.min(x, end),
            y: loc.y,
          });
          o.define(a);
          o.SIZE = gridHeight / 2;
          if (x >= end) {
            break;
          }
          x += gridHeight;
        }
      } else if (gridWidth < gridHeight) {
        let start = loc.y + gridWidth / 2 - gridHeight / 2;
        let end = loc.y - gridWidth / 2 + gridHeight / 2;
        let y = start;
        for (;;) {
          o = new Entity({
            x: loc.x,
            y: Math.min(y, end),
          });
          o.define(a);
          o.SIZE = gridWidth / 2;
          if (y >= end) {
            break;
          }
          y += gridWidth;
        }
      } else {
        o = new Entity(loc);
        o.define(a);
        o.SIZE = gridWidth / 2;
      }

      o.coreSize = o.SIZE;
      o.protect();
      o.team = -4;
      o.color = 17;
      o.alpha = alpha;
      o.refreshBodyAttributes();
      o.grid = grid;
      o.VELOCITY.x = 0;
      o.VELOCITY.y = 0;
      o.ACCEL.x = 0;
      o.ACCEL.y = 0;
    };
    const roomsToCheck = [
      "zne0",
      "zne1",
      "zne2",
      "zne3",
      "zne4",
      "zne5",
      "rep0",
      "rep1",
      "rep2",
      "rep3",
      "rep4",
      "rep5",
      "bos0",
      "bos1",
      "bos2",
      "bos3",
      "bos4",
      "bos5",
    ];
    roomsToCheck.forEach((roomName) => {
      if (room.hasOwnProperty(roomName)) {
        room[roomName].forEach((loc) => {
          tileSet2(loc, {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          });
        });
      }
    });
  }
  if (c.MODE === "theDistance") {
    let tileSet4 = (loc, team, grid) => {
      let o;
      let a = Class.tileFloor;
      alpha = 0.5;
      if (gridWidth > gridHeight) {
        let start = loc.x - gridWidth / 2 + gridHeight / 2;
        let end = loc.x + gridWidth / 2 - gridHeight / 2;
        let x = start;
        for (;;) {
          o = new Entity({
            x: Math.min(x, end),
            y: loc.y,
          });
          o.define(a);
          o.SIZE = gridHeight / 2;
          if (x >= end) {
            break;
          }
          x += gridHeight;
        }
      } else if (gridWidth < gridHeight) {
        let start = loc.y + gridWidth / 2 - gridHeight / 2;
        let end = loc.y - gridWidth / 2 + gridHeight / 2;
        let y = start;
        for (;;) {
          o = new Entity({
            x: loc.x,
            y: Math.min(y, end),
          });
          o.define(a);
          o.SIZE = gridWidth / 2;
          if (y >= end) {
            break;
          }
          y += gridWidth;
        }
      } else {
        o = new Entity(loc);
        o.define(a);
        o.SIZE = gridWidth / 2;
      }
      o.spawnLoc = loc;
      o.coreSize = o.SIZE;
      o.protect();
      o.team = -1;
      o.color = 10;
      o.alpha = alpha;
      o.refreshBodyAttributes();
      o.grid = grid;
      o.VELOCITY.x = 0;
      o.VELOCITY.y = 0;
      o.ACCEL.x = 0;
      o.ACCEL.y = 0;
    };
    const roomsToCheck = ["bdrR", "bdrL", "bdrU", "bdrD"];
    roomsToCheck.forEach((roomName) => {
      if (room.hasOwnProperty(roomName)) {
        room[roomName].forEach((loc) => {
          tileSet4(loc, {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          });
        });
      }
    });
  }
  if (c.MODE === "theControlled") {
    let tileSet3 = (loc, team, grid) => {
      let o;
      let a = Class.tileFloor;
      alpha = 0.5;
      if (gridWidth > gridHeight) {
        let start = loc.x - gridWidth / 2 + gridHeight / 2;
        let end = loc.x + gridWidth / 2 - gridHeight / 2;
        let x = start;
        for (;;) {
          o = new Entity({
            x: Math.min(x, end),
            y: loc.y,
          });
          o.define(a);
          o.SIZE = gridHeight / 2;
          if (x >= end) {
            break;
          }
          x += gridHeight;
        }
      } else if (gridWidth < gridHeight) {
        let start = loc.y + gridWidth / 2 - gridHeight / 2;
        let end = loc.y - gridWidth / 2 + gridHeight / 2;
        let y = start;
        for (;;) {
          o = new Entity({
            x: loc.x,
            y: Math.min(y, end),
          });
          o.define(a);
          o.SIZE = gridWidth / 2;
          if (y >= end) {
            break;
          }
          y += gridWidth;
        }
      } else {
        o = new Entity(loc);
        o.define(a);
        o.SIZE = gridWidth / 2;
      }

      o.coreSize = o.SIZE;
      o.protect();
      o.team = -4;
      o.color = 7;
      o.alpha = alpha;
      o.refreshBodyAttributes();
      o.grid = grid;
      o.VELOCITY.x = 0;
      o.VELOCITY.y = 0;
      o.ACCEL.x = 0;
      o.ACCEL.y = 0;
    };
    const roomsToCheck = ["bos0", "lab3"];
    roomsToCheck.forEach((roomName) => {
      if (room.hasOwnProperty(roomName)) {
        room[roomName].forEach((loc) => {
          tileSet3(loc, {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          });
        });
      }
    });
  }

  if (c.MODE === "theDistance") {
    let tileSet5 = (loc, team, grid) => {
      let o;
      let a = Class.tileFloor;
      alpha = 0.75;
      if (gridWidth > gridHeight) {
        let start = loc.x - gridWidth / 2 + gridHeight / 2;
        let end = loc.x + gridWidth / 2 - gridHeight / 2;

        let x = start;
        for (;;) {
          o = new Entity({
            x: Math.min(x, end),
            y: loc.y,
          });
          o.define(a);
          o.SIZE = gridHeight / 4;
          if (x >= end) {
            break;
          }
          x += gridHeight;
        }
      } else if (gridWidth < gridHeight) {
        let start = loc.y + gridWidth / 2 - gridHeight / 2;
        let end = loc.y - gridWidth / 2 + gridHeight / 2;
        let y = start;
        for (;;) {
          o = new Entity({
            x: loc.x,
            y: Math.min(y, end),
          });
          o.define(a);
          o.SIZE = gridWidth / 4;
          if (y >= end) {
            break;
          }
          y += gridWidth;
        }
      } else {
        o = new Entity(loc);
        o.define(a);
        o.SIZE = gridWidth / 4;
      }
      o.filled = true;
      o.spawnLoc = loc;
      o.coreSize = o.SIZE;
      o.protect();
      o.team = -100;
      o.color = 12;
      o.alpha = alpha;
      o.refreshBodyAttributes();
      o.grid = grid;
      o.VELOCITY.x = 0;
      o.VELOCITY.y = 0;
      o.ACCEL.x = 0;
      o.ACCEL.y = 0;
    };
    if (room["gggo"]) {
      room["gggo"].forEach((loc) => {
        tileSet5(loc, {
          x: Math.floor(loc.x / gridWidth),
          y: Math.floor(loc.y / gridHeight),
        });
      });
    }
    function placeArrowFloors(loc, grid, controller) {
      let o = new Entity(loc);
      o.define(Class.arrowFloor);
      o.spawnLoc = loc;
      o.SIZE = gridWidth / 2;
      o.coreSize = o.SIZE;
      o.protect();
      o.alpha = 0.35;
      o.color = 10;
      o.team = -1;
      o.refreshBodyAttributes();
      o.grid = grid;
      o.VELOCITY.x = 0;
      o.VELOCITY.y = 0;
      o.ACCEL.x = 0;
      o.ACCEL.y = 0;
      if (controller) {
        o.addController(controller);
      }
    }
    if (room["bstL"]) {
      room["bstL"].forEach((loc) => {
        placeArrowFloors(
          loc,
          {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          },
          new io_rightTurn()
        );
        loc = null;
      });
    }

    if (room["bstR"]) {
      room["bstR"].forEach((loc) => {
        placeArrowFloors(
          loc,
          {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          },
          null
        );
      });
    }

    if (room["bstU"]) {
      room["bstU"].forEach((loc) => {
        placeArrowFloors(
          loc,
          {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          },
          new io_downTurn()
        );
      });
    }

    if (room["bstD"]) {
      room["bstD"].forEach((loc) => {
        placeArrowFloors(
          loc,
          {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          },
          new io_dontTurn()
        );
      });
    }
  }

  if (c.MODE === "theAwakening") {
    let switches = (loc, team, grid) => {
      let o;
      let a = Class.tileFloor;
      alpha = 0.75;
      if (gridWidth > gridHeight) {
        let start = loc.x - gridWidth / 2 + gridHeight / 2;
        let end = loc.x + gridWidth / 2 - gridHeight / 2;

        let x = start;
        for (;;) {
          o = new Entity({
            x: Math.min(x, end),
            y: loc.y,
          });
          o.define(a);
          o.SIZE = gridHeight / 4;
          if (x >= end) {
            break;
          }
          x += gridHeight;
        }
      } else if (gridWidth < gridHeight) {
        let start = loc.y + gridWidth / 2 - gridHeight / 2;
        let end = loc.y - gridWidth / 2 + gridHeight / 2;
        let y = start;
        for (;;) {
          o = new Entity({
            x: loc.x,
            y: Math.min(y, end),
          });
          o.define(a);
          o.SIZE = gridWidth / 4;
          if (y >= end) {
            break;
          }
          y += gridWidth;
        }
      } else {
        o = new Entity(loc);
        o.define(a);
        o.SIZE = gridWidth / 4;
      }
      o.filled = true;
      o.coreSize = o.SIZE;
      o.protect();
      o.team = -100;
      o.color = 12;
      o.off = true;
      o.alpha = alpha;
      o.refreshBodyAttributes();
      o.grid = grid;
      o.VELOCITY.x = 0;
      o.VELOCITY.y = 0;
      o.ACCEL.x = 0;
      o.ACCEL.y = 0;
    };
    if (room["swch"]) {
      room["swch"].forEach((loc) => {
        switches(loc, {
          x: Math.floor(loc.x / gridWidth),
          y: Math.floor(loc.y / gridHeight),
        });
      });
    }
  }
}

function makeBaseProtectors() {
  // Make base protectors if needed.

  let entity = (loc, team) => {
    if (c.BASE_DRONES === true) {
      let o = new Entity(loc);
      o.define(Class.baseProtector);
      o.team = -team;
      o.color = [10, 18, 7, 19][team - 1];
    }
  };
  for (let i = 1; i < 9; i++) {
    if (room["bap" + i]) {
      room["bap" + i].forEach((loc) => {
        entity(loc, i);
      });
    }
  }
}
function makeAntiTanks() {
  let entity = (loc, team) => {
    let o = new Entity(loc);
    o.define(Class.anti_tank);
    o.team = -100;
    o.color = 12;
  };
  if (room["anti"]) {
    room["anti"].forEach((loc) => {
      entity(loc);
    });
  }
}
function makeAnubis() {
  let entity = (loc, team) => {
    let o = new Entity(loc);
    o.define(Class.zomblord1);
    o.team = -2;
    o.isAnubis = true;
    //o.ignoreCollision = true;
    o.addController(new io_guard1(o));
  };
  if (room["dbc2"]) {
    room["dbc2"].forEach((loc) => {
      entity(loc);
    });
  }
}
function makeNiceAntiTanks() {
  let entity = (loc, team) => {
    let o = new Entity(loc);
    o.define(Class[ran.choose(["anti_tank", "anti_tankdestroy"])]);
    o.ignoreCollision = true;
    o.spooky = true;
    o.FOV /= 20;
    o.team = -1;
    o.color = 10;
    o.targetable = false;
  };
  if (c.MODE !== "theDenied") {
    if (room["bad1"]) {
      room["bad1"].forEach((loc) => {
        entity(loc);
      });
    }
  }
}
function makeBall() {
  let entity = (loc, team) => {
    let o = new Entity(loc);
    o.define(Class.ball);
    o.isSoccerBall = true;
    o.team = -100;
    //o.color = 3;
  };
  if (room["ball"]) {
    room["ball"].forEach((loc) => {
      entity(loc);
    });
  }
}
function makeReaper() {
  let entity = (loc, team) => {
    let o = new Entity(loc);
    o.define(Class.skullGunner);
    o.impervious = true;
    o.team = -1000;
    //o.color = 3;
  };
  entity(room.random());
}
function makeCasings() {
  let stfu = 0;
  let entity = (loc, team) => {
    let o = new Entity(loc);
    switch (stfu) {
      case 1:
        o.define(Class.eggDefinerCasing);
        break;
      case 2:
        o.define(Class.squareDefinerCasing);
        break;
      case 3:
        o.define(Class.triangleDefinerCasing);
        break;
      case 4:
        o.define(Class.pentagonDefinerCasing);
        break;
      case 5:
        o.define(Class.hexagonDefinerCasing);
        break;
    }
    o.team = -5;
    //o.color = 3;
  };
  for (let i = 0; i < 6; i++) {
    if (room["cse" + i]) {
      room["cse" + i].forEach((loc) => {
        entity(loc);
      });
    }
    stfu += 1;
  }
}
function makeDominators() {
  // Make dominators.
  let entity = (loc, team, grid) => {
    let o = new Entity(loc);
    o.define(
      Class[
        ran.choose(["dominator_single", "dominator_trap", "dominator_nail"])
      ]
    );
    if (c.SANCTUARIES === true) {
      o.define(Class[ran.choose(["sanct_single", "sanct_trap", "sanct_nail"])]);
    } //no
    if (o.team === 3) {
      //yes
      o.define(Class[ran.choose(["basic", "twin"])]);
    }
    if (team) {
      o.team = -team;
      o.color = [10, 18, 7, 19][team - 1];
    } else {
      o.team = -100;
      o.color = 3;
    }
    o.coreSize = o.SIZE;
    o.refreshBodyAttributes();
    if (c.MODE === "territoryControl" || c.MODE === "theExpanse") {
      o.define(Class.dominator);
      o.health.max = 0.01;
      // o.health.amount = o.health.max;

      o.resist = 0.05;
      if (c.MODE === "theExpanse") o.dangerValue = -1;
    }
    o.grid = grid;
    o.spawnLoc = loc;
    o.isDominator = true;
    o.isTaken = false;
    room.dominators.push(o);
  };
  let gridWidth = room.width / room.xgrid,
    gridHeight = room.height / room.ygrid;
  for (let i = 0; i < 9; i++) {
    if (room["dom" + i]) {
      room["dom" + i].forEach((loc) => {
        entity(loc, i, {
          x: Math.floor(loc.x / gridWidth),
          y: Math.floor(loc.y / gridHeight),
        });
      });
    }
  }
}
function makeFortGates() {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;

  let placegate = (loc, team, grid) => {
    let a = Class.fortgate;
    let o;

    if (gridWidth > gridHeight) {
      let start = loc.x - gridWidth / 2 + gridHeight / 2;
      let end = loc.x + gridWidth / 2 - gridHeight / 2;
      let x = start;
      for (;;) {
        o = new Entity({
          x: Math.min(x, end),
          y: loc.y,
        });
        o.define(a);
        o.SIZE = gridHeight / 2;
        if (x >= end) {
          break;
        }
        x += gridHeight;
      }
    } else if (gridWidth < gridHeight) {
      let start = loc.y + gridWidth / 2 - gridHeight / 2;
      let end = loc.y - gridWidth / 2 + gridHeight / 2;
      let y = start;
      for (;;) {
        o = new Entity({
          x: loc.x,
          y: Math.min(y, end),
        });
        o.define(a);
        o.SIZE = gridWidth / 2;
        if (y >= end) {
          break;
        }
        y += gridWidth;
      }
    } else {
      o = new Entity(loc);
      o.define(a);
      o.SIZE = gridWidth / 2;
    }

    o.coreSize = o.SIZE;
    o.protect();

    if (team) {
      o.team = -team;
      o.color = [10, 18, 7, 19][team - 1];
    } else {
      o.team = -100;
      o.color = 3;
    }
    if (c.MODE === "theAwakening") o.color = 8;
    o.refreshBodyAttributes();
    o.grid = grid;
    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
    o.isGate = true;
    o.spawnLoc = loc;
  };

  // Assuming this loop is correctly controlled elsewhere in your code
  for (let i = 0; i < 9; i++) {
    if (room["gte" + i]) {
      room["gte" + i].forEach((loc) => {
        placegate(loc, i, {
          x: Math.floor(loc.x / gridWidth),
          y: Math.floor(loc.y / gridHeight),
        });
        //util.log("ruh");
      });
    }
    if (c.MODE === "theDenied") {
      if (room["bad" + i]) {
        room["bad" + i].forEach((loc) => {
          placegate(loc, i, {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          });
          //util.log("ruh");
        });
      }
    }
  }
}

function makeFortWalls() {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;
  let placefort = (loc, team, grid) => {
    let a = Class.fortwall;
    let o;
    if (gridWidth > gridHeight) {
      let start = loc.x - gridWidth / 2 + gridHeight / 2;
      let end = loc.x + gridWidth / 2 - gridHeight / 2;
      let x = start;
      for (;;) {
        o = new Entity({
          x: Math.min(x, end),
          y: loc.y,
        });
        o.define(a);
        o.SIZE = gridHeight / 2;
        if (x >= end) {
          break;
        }
        x += gridHeight;
      }
    } else if (gridWidth < gridHeight) {
      let start = loc.y + gridWidth / 2 - gridHeight / 2;
      let end = loc.y - gridWidth / 2 + gridHeight / 2;
      let y = start;
      for (;;) {
        o = new Entity({
          x: loc.x,
          y: Math.min(y, end),
        });
        o.define(a);
        o.SIZE = gridWidth / 2;
        if (y >= end) {
          break;
        }
        y += gridWidth;
      }
    } else {
      o = new Entity(loc);
      o.define(a);
      o.SIZE = gridWidth / 2;
    }
    o.coreSize = o.SIZE;
    o.protect();

    if (team) {
      o.team = -team;
      o.color = [10, 18, 7, 19][team - 1];
    } else {
      o.team = -100;
      o.color = 3;
    }
    o.refreshBodyAttributes();
    o.grid = grid;

    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
    o.isWall = true;
    o.spawnLoc = loc;
  };
  for (let i = 0; i < 9; i++) {
    if (room["frt" + i]) {
      room["frt" + i].forEach((loc) => {
        placefort(loc, i, {
          x: Math.floor(loc.x / gridWidth),
          y: Math.floor(loc.y / gridHeight),
        });
      });
    }
  }
}
function makepentFortWalls() {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;
  let entity = (loc, team, grid) => {
    let o = new Entity(loc);
    o.define(Class.pentagonfortwall);
    o.SIZE = gridWidth / 2.01;
    o.coreSize = o.SIZE;
    o.protect();

    if (team) {
      o.team = -team;
      o.color = [10, 18, 7, 19][team - 1];
    } else {
      o.team = -100;
      o.color = 14;
    }
    o.refreshBodyAttributes();
    o.grid = grid;
    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
    o.isWall = true;
    o.spawnLoc = loc;
    o.facingType = 0;
  };
  for (let i = 0; i < 9; i++) {
    if (room["pft" + i]) {
      room["pft" + i].forEach((loc) => {
        entity(loc, i, {
          x: Math.floor(loc.x / gridWidth),
          y: Math.floor(loc.y / gridHeight),
        });
      });
    }
  }
}
function makeAutoFortWalls() {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;
  let entity = (loc, team, grid) => {
    let o = new Entity(loc);
    o.define(Class.autowall1);
    o.SIZE = gridWidth / 2;
    o.coreSize = o.SIZE;
    o.protect();

    if (team) {
      o.team = -team;
      o.color = [10, 18, 7, 19][team - 1];
    } else {
      o.team = -100;
      o.color = 3;
    }
    o.refreshBodyAttributes();
    o.grid = grid;
    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
    o.isWall = true;
    o.spawnLoc = loc;
    o.facingType = 0;
  };

  for (let i = 0; i < 9; i++) {
    if (room["fao" + i]) {
      room["fao" + i].forEach((loc) => {
        entity(loc, i, {
          x: Math.floor(loc.x / gridWidth),
          y: Math.floor(loc.y / gridHeight),
        });
      });
    }
  }
}
function makepentagontrapperFortWalls() {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;
  let entity = (loc, team, grid) => {
    let o = new Entity(loc);
    o.define(Class.pentagontrapperwall360);
    o.SIZE = gridWidth / 2;
    o.coreSize = o.SIZE;
    o.protect();

    if (team) {
      o.team = -team;
      o.color = [10, 18, 7, 19][team - 1];
    } else {
      o.team = -100;
      o.color = 14;
    }
    o.refreshBodyAttributes();
    o.grid = grid;
    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
    o.isWall = true;
    o.spawnLoc = loc;
    o.facingType = 0;
  };
  for (let i = 0; i < 9; i++) {
    if (room["fta" + i]) {
      room["fta" + i].forEach((loc) => {
        entity(loc, i, {
          x: Math.floor(loc.x / gridWidth),
          y: Math.floor(loc.y / gridHeight),
        });
      });
    }
  }
}
function makepentagonAutoFortWalls() {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;
  let entity = (loc, team, grid) => {
    let o = new Entity(loc);
    o.define(Class.pentagonautowall);
    o.SIZE = gridWidth / 2;
    o.coreSize = o.SIZE;
    o.protect();

    if (team) {
      o.team = -team;
      o.color = [10, 18, 7, 19][team - 1];
    } else {
      o.team = -100;
      o.color = 14;
    }
    o.refreshBodyAttributes();
    o.grid = grid;
    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
    o.isWall = true;
    o.spawnLoc = loc;
    o.facingType = 0;
  };
  for (let i = 0; i < 9; i++) {
    if (room["paf" + i]) {
      room["paf" + i].forEach((loc) => {
        entity(loc, i, {
          x: Math.floor(loc.x / gridWidth),
          y: Math.floor(loc.y / gridHeight),
        });
      });
    }
  }
}
function makeTrapFortWalls() {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;

  function placeTrapFort(loc, team, grid, controller) {
    let o = new Entity(loc);
    o.define(Class.trapperwall);
    o.SIZE = gridWidth / 2;
    o.coreSize = o.SIZE;
    o.protect();

    if (team) {
      o.team = -team;
      o.color = [10, 18, 7, 19][team - 1];
    } else {
      o.team = -100;
      o.color = 3;
    }
    o.refreshBodyAttributes();
    o.grid = grid;
    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
    o.isWall = true;
    o.spawnLoc = loc;
    if (controller) {
      o.addController(controller);
    }
  }

  for (let i = 0; i < 9; i++) {
    if (room["ftR" + i]) {
      room["ftR" + i].forEach((loc) => {
        placeTrapFort(
          loc,
          i,
          {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          },
          new io_rightTurn()
        );
      });
    }

    if (room["ftL" + i]) {
      room["ftL" + i].forEach((loc) => {
        placeTrapFort(
          loc,
          i,
          {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          },
          null
        );
      });
    }

    if (room["ftU" + i]) {
      room["ftU" + i].forEach((loc) => {
        placeTrapFort(
          loc,
          i,
          {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          },
          new io_dontTurn()
        );
      });
    }

    if (room["ftD" + i]) {
      room["ftD" + i].forEach((loc) => {
        placeTrapFort(
          loc,
          i,
          {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          },
          new io_downTurn()
        );
      });
    }
  }
}
function makeCrusherFortWalls() {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;

  function placeCrusherFort(loc, team, grid, controller) {
    let o = new Entity(loc);
    o.define(Class.crusherFortWall);
    o.SIZE = gridWidth / 2;
    o.coreSize = o.SIZE;
    o.protect();

    if (team) {
      o.team = -team;
      o.color = [10, 18, 7, 19][team - 1];
    } else {
      o.team = -100;
      o.color = 3;
    }
    o.refreshBodyAttributes();
    o.grid = grid;
    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
    o.isWall = true;
    if (controller) {
      o.addController(controller);
    }
  }

  for (let i = 0; i < 9; i++) {
    if (room["fcR" + i]) {
      room["fcR" + i].forEach((loc) => {
        placeCrusherFort(
          loc,
          i,
          {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          },
          new io_rightTurn()
        );
      });
    }

    if (room["fcL" + i]) {
      room["fcL" + i].forEach((loc) => {
        placeCrusherFort(
          loc,
          i,
          {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          },
          null
        );
      });
    }

    if (room["fcU" + i]) {
      room["fcU" + i].forEach((loc) => {
        placeCrusherFort(
          loc,
          i,
          {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          },
          new io_dontTurn()
        );
      });
    }

    if (room["fcD" + i]) {
      room["fcD" + i].forEach((loc) => {
        placeCrusherFort(
          loc,
          i,
          {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          },
          new io_downTurn()
        );
      });
    }
  }
}

function makeTeamedWalls() {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;
  let entity = (loc, team, grid) => {
    let o;
    let a = Class.wall;
    if (gridWidth > gridHeight) {
      let start = loc.x - gridWidth / 2 + gridHeight / 2;
      let end = loc.x + gridWidth / 2 - gridHeight / 2;
      let x = start;
      for (;;) {
        o = new Entity({
          x: Math.min(x, end),
          y: loc.y,
        });
        o.define(a);
        o.SIZE = gridHeight / 2;
        if (x >= end) {
          break;
        }
        x += gridHeight;
      }
    } else if (gridWidth < gridHeight) {
      let start = loc.y + gridWidth / 2 - gridHeight / 2;
      let end = loc.y - gridWidth / 2 + gridHeight / 2;
      let y = start;
      for (;;) {
        o = new Entity({
          x: loc.x,
          y: Math.min(y, end),
        });
        o.define(a);
        o.SIZE = gridWidth / 2;
        if (y >= end) {
          break;
        }
        y += gridWidth;
      }
    } else {
      o = new Entity(loc);
      o.define(a);
      o.SIZE = gridWidth / 2;
    }

    o.coreSize = o.SIZE;
    o.protect();
    o.alwaysExists = true;
    o.isMazeWall = true;
    o.spawnLoc = loc;
    if (team) {
      o.team = -team;
      o.color = [10, 18, 7, 19][team - 1];
    } else {
      o.team = -100;
      o.color = 3;
    }
    o.refreshBodyAttributes();
    o.grid = grid;
    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
  };
  for (let i = 0; i < 9; i++) {
    if (room["wal" + i]) {
      room["wal" + i].forEach((loc) => {
        entity(loc, i, {
          x: Math.floor(loc.x / gridWidth),
          y: Math.floor(loc.y / gridHeight),
        });
      });
    }
  }
}
function makepentagonWorkbench() {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;
  let entity = (loc, team, grid) => {
    let o;
    let a = Class.Workbench;
    if (gridWidth > gridHeight) {
      let start = loc.x - gridWidth / 2 + gridHeight / 2;
      let end = loc.x + gridWidth / 2 - gridHeight / 2;
      let x = start;
      for (;;) {
        o = new Entity({
          x: Math.min(x, end),
          y: loc.y,
        });
        o.define(a);
        o.SIZE = gridHeight / 2;
        if (x >= end) {
          break;
        }
        x += gridHeight;
      }
    } else if (gridWidth < gridHeight) {
      let start = loc.y + gridWidth / 2 - gridHeight / 2;
      let end = loc.y - gridWidth / 2 + gridHeight / 2;
      let y = start;
      for (;;) {
        o = new Entity({
          x: loc.x,
          y: Math.min(y, end),
        });
        o.define(a);
        o.SIZE = gridWidth / 2;
        if (y >= end) {
          break;
        }
        y += gridWidth;
      }
    } else {
      o = new Entity(loc);
      o.define(a);
      o.SIZE = gridWidth / 2;
    }
    o.spawnLoc = loc;
    o.coreSize = o.SIZE;
    o.protect();
    o.team = -101;
    o.color = 7;
    o.isMazeWall = true;
    o.refreshBodyAttributes();
    o.grid = grid;
    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
  };
  if (room["wrkb"]) {
    room["wrkb"].forEach((loc) => {
      entity(loc, {
        x: Math.floor(loc.x / gridWidth),
        y: Math.floor(loc.y / gridHeight),
      });
    });
  }
}
function makeMazeWalls() {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;
  let entity = (loc, team, grid) => {
    let o;
    let a = Class.wall;
    if (gridWidth > gridHeight) {
      let start = loc.x - gridWidth / 2 + gridHeight / 2;
      let end = loc.x + gridWidth / 2 - gridHeight / 2;
      let x = start;
      for (;;) {
        o = new Entity({
          x: Math.min(x, end),
          y: loc.y,
        });
        o.define(a);
        o.SIZE = gridHeight / 2;
        if (x >= end) {
          break;
        }
        x += gridHeight;
      }
    } else if (gridWidth < gridHeight) {
      let start = loc.y + gridWidth / 2 - gridHeight / 2;
      let end = loc.y - gridWidth / 2 + gridHeight / 2;
      let y = start;
      for (;;) {
        o = new Entity({
          x: loc.x,
          y: Math.min(y, end),
        });
        o.define(a);
        o.SIZE = gridWidth / 2;
        if (y >= end) {
          break;
        }
        y += gridWidth;
      }
    } else {
      o = new Entity(loc);
      o.define(a);
      o.SIZE = gridWidth / 2;
    }
    o.spawnLoc = loc;
    o.coreSize = o.SIZE;
    o.protect();
    o.team = -101;
    o.color = 16;
    o.alwaysExists = true;
    o.isMazeWall = true;
    o.refreshBodyAttributes();
    o.grid = grid;
    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
  };
  if (room["wall"]) {
    room["wall"].forEach((loc) => {
      entity(loc, {
        x: Math.floor(loc.x / gridWidth),
        y: Math.floor(loc.y / gridHeight),
      });
    });
  }
}
function makePortals() {
  let entity = (loc, team) => {
    let o = new Entity(loc);
    o.define(Class.voidportal);

    if (team) {
      o.team = -team;
      o.color = [10, 18, 7, 19][team - 1];
    } else {
      o.team = -100;
      o.color = 3;
    }
    o.targetable = false;
    o.settings.drawHealth = false;
    if (c.MODE === "theInfestation") {
      o.godMode = true;
    }
    if (c.MODE === "theControlled") {
      o.targetable = false;
    }
  };
  for (let i = 0; i < 9; i++) {
    if (room["vpr" + i]) {
      room["vpr" + i].forEach((loc) => {
        entity(loc, i);
      });
    }
  }
}
function makepentarifts() {
  let entity = (loc, team) => {
    let o = new Entity(loc);
    o.define(Class.pentarift);

    if (team) {
      o.team = -team;
      o.color = [15, 15, 7, 19][team - 1];
    } else {
      o.team = -100;
      o.color = 14;
    }
    if (c.MODE === "theGreatPlague") {
      o.godMode = true;
    }
  };
  for (let i = 0; i < 9; i++) {
    if (room["prf" + i]) {
      room["prf" + i].forEach((loc) => {
        entity(loc, i);
      });
    }
  }
}
function makecubedrifts() {
  let entity = (loc, team) => {
    let o = new Entity(loc);
    o.define(Class.Cubedrift);

    if (team) {
      o.team = -team;
      o.color = [13, 13, 7, 19][team - 1];
    } else {
      o.team = -100;
      o.color = 13;
    }
  };
  for (let i = 0; i < 9; i++) {
    if (room["crf" + i]) {
      room["crf" + i].forEach((loc) => {
        entity(loc, i);
      });
    }
  }
}

function makeRepairMen() {
  let entity = (loc) => {
    let o = new Entity(loc);
    o.define(Class.repPod);
    o.targetable = false;
    o.settings.drawHealth = false;
    if (c.MODE === "theExpanse") {
      o.team = -4;
      o.color = 7;
    } else if (c.MODE === "theControlled") {
      o.team = -3;
      o.color = 19;
    } else if (c.MODE === "theAwakening") {
      o.team = -100;
      o.color = 3;
    }
  };

  if (room["rep" + c.bossStage]) {
    room["rep" + c.bossStage].forEach((loc) => {
      entity(loc);
    });
  }
}
function makeDummies() {
  for (let i = 0; i < 100; i++) {
    if (room["tst" + i]) {
      room["tst" + i].forEach((loc) => {
        let o = new Entity(loc);
        o.godMode = true;
        o.skill.score = 26263;
        o.area = loc;
        switch (i) {
          case 0:
            o.define(Class.buildGlass);
            o.define(Class.testDummy);
            o.name = "Glass Dummy";
            break;
          case 1:
            o.define(Class.buildExpert);
            o.define(Class.testDummy);
            o.name = "Tough Dummy";
            break;
          case 2:
            o.define(Class.buildRam);
            o.define(Class.testDummy);
            o.name = "Rammer Dummy";
            break;
          case 3:
            o.define(Class.buildGlass);
            o.define(Class.testDummy);
            o.addController(new io_nearestDifferentMaster(o));
            o.aiTarget = "self";
            o.team = -100;
            o.color = 3;
            o.name = "AI Dummy";
            break;
          case 4:
            o.define(Class.counterDenied);
            o.team = -100;
            o.settings.leaderboardable = false;
            o.godMode = true;
            break;
          case 5:
            o.define(Class.dummyelite);
            o.name = "Elite Dummy";
            break;
          case 6:
            o.define(Class.buildGlass);
            o.define(Class.testDummy);
            o.team = -4;
            o.name = "Voidlord Glass Dummy";
            break;
          case 7:
            o.define(Class.buildExpert);
            o.define(Class.testDummy);
            o.name = "Voidlord Tough Dummy";
            o.team = -4;
            break;
          case 8:
            o.define(Class.buildRam);
            o.define(Class.testDummy);
            o.name = "Voidlord Rammer Dummy";
            o.team = -4;
            break;
          default:
            o.define(Class.buildGlass);
            o.define(Class.testDummy);
        }
      });
    }
  }
}
function makeEventBosses() {
  let entity = (loc) => {
    let o = new Entity(loc);
    if (c.MODE === "theExpanse") {
      o.define(Class.voidportal);
      switch (c.bossStage) {
        case 0:
          o.deathSpawn = "abdul";
          break;
        case 1:
          o.deathSpawn = "weakHiveMind";
          c.BOT_SPAWN_LOCATION, (c.PLAYER_SPAWN_LOCATION = "bad");
          break;
        case 2:
          o.deathSpawn = "weakNulltype";
          c.BOT_SPAWN_LOCATION, (c.PLAYER_SPAWN_LOCATION = "spw");
          break;
        case 3:
          o.deathSpawn = "weakSardonyx";
          c.BOT_SPAWN_LOCATION, (c.PLAYER_SPAWN_LOCATION = "dbc");
          c.DEADLY_BORDERS = false;
          break;
      }
      o.team = -4;
      o.color = 19;
      o.impervious = true;
    }
    if (c.MODE === "theControlled") {
      o.define(Class.voidportal);
      switch (c.bossStage) {
        case 2:
          o.deathSpawn = "highlordKairo";
          break;
        case 3:
          o.deathSpawn = "highlordAkavir";
          c.PLAYER_SPAWN_LOCATION = "bad";
          break;
        case 4:
          o.deathSpawn = "highlordAidra";
          setTimeout(() => {
            c.PLAYER_SPAWN_LOCATION = "spw";
          }, 60000);
          break;
        case 5:
          o.deathSpawn = "weakHighlordAlbatar";
          break;
      }
      o.team = -3;
      o.color = 7;
      o.impervious = true;
      setTimeout(() => {
        o.kill();
      }, 5000);
    }
    if (c.MODE === "theAwakening") {
      switch (c.bossStage) {
        case 1:
          o.define(Class.lesserCaster);
          o.bossProgress = true;
          break;
        case 2:
          o.define(Class.lesserlightFinder);
          o.bossProgress = true;
          break;
        case 6:
          o.define(Class.lesserAetherAspect);
          break;
        case 7:
          o.define(Class.lesserConstant);
          break;
        case 9:
          o.define(Class.lesserCreed);
          o.bossProgress = true;
          sockets.broadcast(
            "An Ancient Guardian rises through the ruined floors..."
          );
          break;
      }
      o.team = -5;
      o.area = "bos" + c.bossStage;
      o.zone = "zne" + c.bossStage;
    }
  };
  if (room["bos" + c.bossStage]) {
    room["bos" + c.bossStage].forEach((loc) => {
      entity(loc);
    });
  }
}

function makeShrine() {
  let entity = (loc, team) => {
    let o = new Entity(loc);
    o.define(Class.ranarShrine);
    o.team = -100;
    if (c.MODE === "theDistance") {
      o.win = true;
    }
    if (c.MODE === "theInfestation") o.define(Class.cxShrine);
  };

  if (room["tmpl"]) {
    room["tmpl"].forEach((loc) => {
      entity(loc);
    });
  }
}
function closeArena() {
  if (!room.closed) {
    setTimeout(() => {
      sockets.broadcast("Arena closed. No players can join!");
      c.visibleListInterval = 0;
      c.RESPAWN_TIMER = Infinity;
      room.closed = true;
      setTimeout(() => {
        entities.forEach((e) => {
          e.alwaysExists = true;
          if (e.isWall || e.isGate || e.isDominator || e.type === "tile") {
            e.kill();
            e.destroy();
          }
        });
        let o;
        for (let i = 0; i < 4; i++) {
          switch (i) {
            case 0:
              o = new Entity({
                x: room.width,
                y: room.height,
              });
              break;
            case 1:
              o = new Entity({
                x: room.width,
                y: 0,
              });
              break;
            case 2:
              o = new Entity({
                x: 0,
                y: room.height,
              });
              break;
            case 3:
              o = new Entity({
                x: 0,
                y: 0,
              });
              break;
          }

          /*  sockets.broadcast(
            ran.choose([
              "Deific Ranar: Do you believe in Ranarok? Too bad, LET THE CLEANSING BEGIN!!!",
              "Deific Ranar: Oh, yeah, by the way, I can kill LITERALLY EVERYTHING!",
              "Deific Ranar: Yeah, praying won't help, I killed your god.",
              "Deific Ranar: 'The Badass has arrived', hehehehehhhee.",
              "Deific Ranar: Vacuum Cleaner coming...wait, seeing as I am able  erase reality, vaccum causer seems more accurate.",
              "Deific Ranar: Arena Closed, EVERYTHING MUST DIE, HAHAHAHAHAAA!",
              "Deific Ranar: YOU MUST DIE!",
            ])
          );*/
          o.define(Class[ran.choose(["livingApocalypse"])]);
          o.team = -1000;
          o.color = 3;
          o.coreSize = o.SIZE;
          o.endless = true;
          o.refreshBodyAttributes();
          o.invuln = false;
          o.defy = true;
          c.killCheaters = true;
          o.impervious = true;
          o.alwaysExists = true;
        }

        /*   for (let i = 0; i < 16; i++) {
        let angle = ((Math.PI * 2) / 16) * i;
        let o = new Entity({
          x: room.width / 2 + room.width * Math.cos(angle),
          y: room.height / 2 + room.height * Math.sin(angle),
        });
        o.define(Class.arenaCloser);
        o.team = -100;
        o.color = 3;
        o.coreSize = o.SIZE;
        o.endless = true;
        //o.SPEED /= 2;
        o.refreshBodyAttributes();
        o.invuln = false;
        o.defy = true;
        c.killCheaters = true;
      }/*/

        c.soccerBlueCount = 0;

        c.soccerGreenCount = 0;

        c.soccerRedCount = 0;
        c.BOTS = 0;
        c.soccerPurpleCount = 0;
        c.SPAWN_SENTINEL = false;
        c.SPAWN_CRASHER = false;
        c.SPAWN_SENTINEL = false;
        c.SPAWN_VOIDLORD_ENEMIES = false;
        c.SPAWN_NEUTRAL_BOSSES = false;
        c.SPAWN_FALLEN_BOSSES = false;
        c.SPAWN_FOOD = false;
        c.MODE = "none";
        if (c.playerCount < 1) {
          util.log("ARENA CLOSED!");
          sockets.broadcast("Closing!");
          process.exit();
        }

        setTimeout(() => {
          util.log("ARENA CLOSED!");
          sockets.broadcast("Closing!");
          process.exit();
        }, 30000);
      }, 10000);
    }, 2500);
  }
}
function roomShrinkage() {
  if (!c.delay) {
    room.width -= 2;
    room.height -= 2;
    sockets.changeroom();
    c.delay = true;
    setTimeout(() => {
      c.delay = false;
    }, 1);
  }
}

function siegeCountdown() {
  setInterval(() => {
    if (c.initiateCountdown) {
      switch (c.countdown) {
        case 60000:
          sockets.broadcast(
            "Your team will lose in 60 seconds! No players can respawn until a sanctuary is repaired!"
          );
          c.botSpawn = false;
          break;
        case 45000:
          sockets.broadcast("Your team will lose in 45 seconds!");
          break;
        case 30000:
          sockets.broadcast("Your team will lose in 30 seconds!");
          break;
        case 15000:
          sockets.broadcast("Your team will lose in 15 seconds!");
          break;
        case 5000:
          sockets.broadcast("Your team will lose in 5!");
          break;
        case 4000:
          sockets.broadcast("4!");
          break;
        case 3000:
          sockets.broadcast("3!");
          break;
        case 2000:
          sockets.broadcast("2!");
          break;
        case 1000:
          sockets.broadcast("1!");
          break;
        case 0:
          sockets.broadcast("Your team has lost the game!");
          currentState.bossWaves = 1;
          currentState.modeVotes = [];
          closeArena();
      }
      c.countdown -= 1000;
    }
  }, 1000);
}

function createMaze() {
  for (let i = 0; i < Math.ceil((c.WIDTH + c.HEIGHT / 2) / 50); i++) {
    let loc = room.randomType("norm");
    do {
      let o = new Entity(loc);
      o.define(Class.wall);
      o.alwaysExists = true;
      o.team = -101;
      o.SIZE = Math.ceil(Math.random() * 40 + (c.HEIGHT / 100) * 2.25);
      o.coreSize = o.SIZE;
      o.ACCELERATION = 0;
      o.SPEED = 0;
      o.refreshBodyAttributes();
    } while (!dirtyCheck(loc, 20));
  }
}
function sortByDistance(array, location) {
  array.sort((a, b) => {
    let ad = Math.pow(a.x - location.x, 2) + Math.pow(a.y - location.y, 2);
    let bd = Math.pow(b.x - location.x, 2) + Math.pow(b.y - location.y, 2);
    if (a < b) {
      return -1;
    } else if (b < a) {
      return 1;
    } else {
      return 0;
    }
  });
}

function getEntitiesFromRange(location, range) {
  let box = [
    location.x - range,
    location.y - range,
    location.x + range,
    location.y + range,
  ];
  return boxIntersect([box], activeAabb)
    .map((v) => {
      let e = activeEntities[v[1]];
      if (e.valid()) {
        return e;
      }
    })
    .filter((e) => {
      return e;
    });
}

// Define IOs (AI)
function nearest(
  array,
  location,
  test = () => {
    return true;
  }
) {
  let list = new goog.structs.PriorityQueue();
  let d;
  if (!array.length) {
    return undefined;
  }
  array.forEach(function (instance) {
    d =
      Math.pow(instance.x - location.x, 2) +
      Math.pow(instance.y - location.y, 2);
    if (test(instance, d)) {
      list.enqueue(d, instance);
    }
  });
  return list.dequeue();
}
function timeOfImpact(p, v, s) {
  // Requires relative position and velocity to aiming point
  let a = s * s - (v.x * v.x + v.y * v.y);
  let b = p.x * v.x + p.y * v.y;
  let c = p.x * p.x + p.y * p.y;

  let d = b * b + a * c;

  let t = 0;
  if (d >= 0) {
    t = Math.max(0, (b + Math.sqrt(d)) / a);
  }

  return t * 0.9;
}
class IO {
  constructor(body) {
    this.body = body;
    this.acceptsFromTop = true;
  }

  think() {
    return {
      target: null,
      goal: null,
      fire: null,
      main: null,
      alt: null,
      power: null,
    };
  }
}

class io_doNothing extends IO {
  constructor(body) {
    super(body);
    this.acceptsFromTop = false;
  }

  think() {
    return {
      goal: {
        x: this.body.x,
        y: this.body.y,
      },
      main: false,
      alt: false,
      fire: false,
    };
  }
}
class io_moveInCircles extends IO {
  constructor(body) {
    super(body);
    this.acceptsFromTop = false;
    this.timer = ran.irandom(10) + 3;
    this.goal = {
      x: this.body.x + 10 * Math.cos(-this.body.facing),
      y: this.body.y + 10 * Math.sin(-this.body.facing),
    };
  }

  think() {
    if (!this.timer--) {
      this.timer = 10;
      this.goal = {
        x: this.body.x + 10 * Math.cos(-this.body.facing),
        y: this.body.y + 10 * Math.sin(-this.body.facing),
      };
    }
    return { goal: this.goal };
  }
}
class io_listenToPlayer extends IO {
  constructor(b, p) {
    super(b);
    this.player = p;
    this.acceptsFromTop = false;
  }

  // THE PLAYER MUST HAVE A VALID COMMAND AND TARGET OBJECT

  think() {
    let targ = {
      x: this.player.target.x,
      y: this.player.target.y,
    };
    if (this.player.command.rmb) {
      if (this.body.label === "Spectator" && this.body.fov > 200) {
        this.body.fov -= 200;
      }
    }
    if (this.player.command.autospin) {
      let kk =
        Math.atan2(this.body.control.target.y, this.body.control.target.x) +
        0.02;
      targ = {
        x: 100 * Math.cos(kk),
        y: 100 * Math.sin(kk),
      };
    }
    if (this.body.invuln) {
      if (
        this.player.command.right ||
        this.player.command.left ||
        this.player.command.up ||
        this.player.command.down ||
        this.player.command.lmb
      ) {
        this.body.invuln = false;
      }
    }
    this.body.autoOverride = this.player.command.override;
    return {
      target: targ,
      goal: {
        x: this.body.x + this.player.command.right - this.player.command.left,
        y: this.body.y + this.player.command.down - this.player.command.up,
      },
      fire: this.player.command.lmb || this.player.command.autofire,
      main:
        this.player.command.lmb ||
        this.player.command.autospin ||
        this.player.command.autofire,
      alt: this.player.command.rmb,
    };
  }
}
class io_mapTargetToGoal extends IO {
  constructor(b) {
    super(b);
  }

  think(input) {
    if (this.body.invuln === true) return;
    if (input.main || input.alt) {
      if (input.target) {
        return {
          goal: {
            x: input.target.x + this.body.x,
            y: input.target.y + this.body.y,
          },
          power: 1,
        };
      }
    }
  }
}
class io_boomerang extends IO {
  constructor(b) {
    super(b);
    this.r = 0;
    this.b = b;
    this.m = b.master;
    this.turnover = false;
    let len = 10 * util.getDistance({ x: 0, y: 0 }, b.master.control.target);
    this.myGoal = {
      x: 3 * b.master.control.target.x + b.master.x,
      y: 3 * b.master.control.target.y + b.master.y,
    };
  }
  think(input) {
    if (this.b.range > this.r) this.r = this.b.range;
    let t = 1; //1 - Math.sin(2 * Math.PI * this.b.range / this.r) || 1;
    if (!this.turnover) {
      if (this.r && this.b.range < this.r * 0.5) {
        this.turnover = true;
      }
      return {
        goal: this.myGoal,
        power: t,
      };
    } else {
      return {
        goal: {
          x: this.m.x,
          y: this.m.y,
        },
        power: t,
      };
    }
  }
}
class io_goToMasterTarget extends IO {
  constructor(body) {
    super(body);
    this.myGoal = {
      x: body.master.control.target.x + body.master.x,
      y: body.master.control.target.y + body.master.y,
    };
    this.countdown = 5;
  }

  think() {
    if (this.countdown) {
      if (util.getDistance(this.body, this.myGoal) < 1) {
        this.countdown--;
      }

      return {
        goal: {
          x: this.myGoal.x,
          y: this.myGoal.y,
        },
      };
    }
  }
}
class io_canRepel extends IO {
  constructor(b) {
    super(b);
  }

  think(input) {
    if (input.alt && input.target) {
      return {
        target: {
          x: -input.target.x,
          y: -input.target.y,
        },
        main: true,
      };
    }
  }
}
class io_alwaysFire extends IO {
  constructor(body) {
    super(body);
  }

  think() {
    return {
      fire: true,
    };
  }
}
class io_mapAltToFire extends IO {
  constructor(body) {
    super(body);
  }

  think(input) {
    if (input.alt) {
      return {
        fire: true,
      };
    }
  }
}
class io_onlyAcceptInArc extends IO {
  constructor(body) {
    super(body);
  }

  think(input) {
    if (input.target && this.body.firingArc != null) {
      if (
        Math.abs(
          util.angleDifference(
            Math.atan2(input.target.y, input.target.x),
            this.body.firingArc[0]
          )
        ) >= this.body.firingArc[1]
      ) {
        return {
          fire: false,
          alt: false,
          main: false,
        };
      }
    }
  }
}
class io_nearestDifferentMaster extends IO {
  constructor(body) {
    super(body);
    this.targetLock = undefined;
    this.tick = ran.irandom(30);
    this.lead = 0;
    this.validTargets = this.buildList(body.fov / 2);
    this.oldHealth = body.health.display();
    this.body.facing = 0;
  }

  /* buildList(range) {
    // Establish whom we judge in reference to
    let m = { x: this.body.x, y: this.body.y },
      mm = { x: this.body.master.master.x, y: this.body.master.master.y },
      mostDangerous = 0,
      sqrRange = range * range,
      keepTarget = false;
    // Filter through everybody...
    let out = getEntitiesFromRange(m, range)
      .map((e) => {
        // Only look at those within our view, and our parent's view, not dead, not our kind, not a bullet/trap/block etc
        if (!c.globalAIDisable && !this.body.master.AIDisable) {
          if (e.health.amount > 0 && e.team !== -101 && e.type !== "deity") {
            if (!e.invuln && !this.body.excludedTargets.includes(e.type)) {
              switch (this.body.aiTarget) {
                case "projectiles":
                  if (
                    e.master.master.team !== this.body.master.master.team &&
                    e.isProjectile
                  ) {
                    if (
                      Math.abs(e.x - m.x) < range &&
                      Math.abs(e.y - m.y) < range
                    ) {
                      if (
                        !this.body.aiSettings.blind ||
                        (Math.abs(e.x - mm.x) < range &&
                          Math.abs(e.y - mm.y) < range)
                      )
                        return e;
                    }
                  }
                  break;
                case "allHostiles":
                  if (e.master.master.team !== this.body.master.master.team && !e.isProjectile) {
              if ((this.body.label === "Harvest") && (e.isDominator||e.isGate||e.isWall||e.isSoccerBall||e.impervious||e.type === "base"||e.label === "Target Dummy")) return;
                    if (c.MODE === "JJ's RF" && this.body.aiTarget === "allHostiles" && (!room.isIn("gte1", e) && !room.isIn("bas1", e) && !room.isIn("bad1", e) && !room.isIn("wall", e)||e.isProjectile)) return;
                    if (
                      Math.abs(e.x - m.x) < range &&
                      Math.abs(e.y - m.y) < range
                    ) {
                      if (
                        !this.body.aiSettings.blind ||
                        (Math.abs(e.x - mm.x) < range &&
                          Math.abs(e.y - mm.y) < range)
                      )
                        return e;
                    }
                  }
                  break;

                case "self":
                  if (e.master === this.body.master) {
                    if (
                      Math.abs(e.x - m.x) < range &&
                      Math.abs(e.y - m.y) < range
                    ) {
                      if (
                        !this.body.aiSettings.blind ||
                        (Math.abs(e.x - mm.x) < range &&
                          Math.abs(e.y - mm.y) < range)
                      )
                        return e;
                    }
                  }

                  break;
                case "allies":
                  if (
                    e.master.master.team === this.body.master.master.team &&
                    e.master !== this.body.master &&
                    !e.isDominator &&
                    !e.isWall &&
                    !e.isGate
                  ) {
                      if (
                        e.name !== "Baltyla" &&
                          c.MODE === "theAwakening" &&
                        this.body.name === "Valrayvn"
                      )
                        return;
                    if (e.targetable === true) {
                      if (
                        Math.abs(e.x - m.x) < range &&
                        Math.abs(e.y - m.y) < range
                      ) {
                        if (
                          !this.body.aiSettings.blind ||
                          (Math.abs(e.x - mm.x) < range &&
                            Math.abs(e.y - mm.y) < range)
                        )
                          return e;
                      }
                    }
                  }
                  break;
                case "healAllies":
                  if (
                    e.master.master.team === this.body.master.master.team &&
                    e.master !== this.body.master &&
                    e.health.amount < e.health.max &&
                    !e.isDominator &&
                    !e.isWall &&
                    !e.isGate
                  ) {
                    if (e.targetable === true) {
                      if (
                        Math.abs(e.x - m.x) < range &&
                        Math.abs(e.y - m.y) < range
                      ) {
                        if (
                          !this.body.aiSettings.blind ||
                          (Math.abs(e.x - mm.x) < range &&
                            Math.abs(e.y - mm.y) < range)
                        )
                          return e;
                      }
                    }
                  }
                  break;
                case "structures":
                  if (e.master !== this.body.master) {
                    if (
                      ((e.isDominator ||
                        e.isGate ||
                        e.isWall ||
                        e.type === "drone" ||
                        e.type === "minion" ||
                        e.type === "trap") &&
                        e.master !== this.body.master &&
                        e.team !== this.body.team) ||
                      ((e.isDominator ||
                        e.isGate ||
                        e.isWall ||
                        e.type === "drone" ||
                        e.type === "minion" ||
                        e.type === "trap") &&
                        e.master !== this.body.master &&
                        e.team === this.body.team &&
                        e.health.amount < e.health.max)
                    ) {
                      if (
                        !e.isGate &&
                        (c.MODE === "theExpanse" ||
                          c.MODE === "theControlled" ||
                          c.MODE === "theAwakening")
                      )
                        return;
                      if (
                        Math.abs(e.x - m.x) < range &&
                        Math.abs(e.y - m.y) < range
                      ) {
                        if (
                          !this.body.aiSettings.blind ||
                          (Math.abs(e.x - mm.x) < range &&
                            Math.abs(e.y - mm.y) < range)
                        )
                          return e;
                      }
                    }
                  }

                  break;
                case "general":
                case "mostDeadly":
                case "leastDeadly":
                default:
                  if (
                    e.master.master.team !== this.body.master.master.team &&
                    e.alpha > 0.3 &&
                    !room.isIn("bas0", e) &&
                    !room.isIn("bas1", e) &&
                    !room.isIn("bap1", e) &&
                    !room.isIn("bas2", e) &&
                    !room.isIn("bap2", e) &&
                    !room.isIn("bas3", e) &&
                    !room.isIn("bap3", e) &&
                    !room.isIn("bas4", e) &&
                    !room.isIn("bas4", e)
                  ) {
                    if (e.master.master.team !== -101) {
                      if (
                        e.targetable === true ||
                        (!this.body.aiSettings.shapefriend &&
                          e.type === "food") ||
                        (e.isDominator &&
                          this.body.team !== -101 &&
                          this.body.type !== "food")
                      ) {
                        if (
                          (this.body.specialEffect === "crusherFortWall" &&
                            e.ignoreCollision) ||
                          (c.MODE === "theDenied" && e.isGate)||(this.body.isAnubis && c.MODE === "theInfestation" && (e.isGate && e.isWall))
                  )
                          return; 
                        if (
                          e.isGate &&
                          (c.MODE === "theExpanse" ||
                            c.MODE === "theControlled" ||
                            c.MODE === "theAwakening")
                        )
                          return;
                        if (
                          Math.abs(e.x - m.x) < range &&
                          Math.abs(e.y - m.y) < range
                        ) {
                          if (
                            !this.body.aiSettings.blind ||
                            (Math.abs(e.x - mm.x) < range &&
                              Math.abs(e.y - mm.y) < range)
                          )
                            return e;
                        }
                      }
                    }
                  }
              }
            }
          }
        }
      })
      .filter((e) => {
        return e;
      });
    if (!out.length) return [];

    out = out
      .map((e) => {
        // Only look at those within range and arc (more expensive, so we only do it on the few)
        let yaboi = false;
        if (
          Math.pow(this.body.x - e.x, 2) + Math.pow(this.body.y - e.y, 2) <
          sqrRange
        ) {
          if (this.body.firingArc == null || this.body.aiSettings.view360) {
            yaboi = true;
          } else if (
            Math.abs(
              util.angleDifference(
                util.getDirection(this.body, e),
                this.body.firingArc[0]
              )
            ) < this.body.firingArc[1]
          )
            yaboi = true;
        }
        switch (this.body.aiTarget) {
          case "leastDeadly":
            mostDangerous = Infinity;
            mostDangerous = Math.min(e.dangerValue, mostDangerous);
            break;
            
          default:
            if (yaboi) {
              mostDangerous = Math.max(e.dangerValue, mostDangerous);
            }
        }
        return e;
      })
      .filter((e) => {
        // Only return the highest tier of danger
        if (e != null) {
          if (this.body.aiSettings.farm || e.dangerValue === mostDangerous) {
            if (this.targetLock) {
              if (e.id === this.targetLock.id) keepTarget = true;
            }
            return e;
          }
        }
      });
    // Reset target if it's not in there
    if (!keepTarget || this.notWorthIt) this.targetLock = undefined;
    return out;
  }*/
  buildList(range) {
    let m = { x: this.body.x, y: this.body.y },
      mm = { x: this.body.master.master.x, y: this.body.master.master.y },
      mostDangerous = 0, // Default: most dangerous (highest dangerValue)
      leastDangerous = Infinity, // For least deadly case (lowest dangerValue)
      sqrRange = range * range,
      keepTarget = false;

    // Filter entities in range and process their details
    let out = getEntitiesFromRange(m, range)
      .map((e) => {
        if (!c.globalAIDisable && !this.body.master.AIDisable) {
          if (e.health.amount > 0 && e.team !== -101 && e.type !== "deity") {
            if (!e.invuln && !this.body.excludedTargets.includes(e.type)) {
              switch (this.body.aiTarget) {
                case "leastDeadly":
                  // Track the least dangerous target (lowest dangerValue)
                  if (
                    e.master.master.team !== this.body.master.master.team &&
                    e.alpha > 0.3 &&
                    !room.isIn("bas0", e) &&
                    !room.isIn("bas1", e) &&
                    !room.isIn("bap1", e) &&
                    !room.isIn("bas2", e) &&
                    !room.isIn("bap2", e) &&
                    !room.isIn("bas3", e) &&
                    !room.isIn("bap3", e) &&
                    !room.isIn("bas4", e) &&
                    !room.isIn("bas4", e)
                  ) {
                    if (e.master.master.team !== -101) {
                      if (
                        e.targetable === true ||
                        (!this.body.aiSettings.shapefriend &&
                          e.type === "food") ||
                        (e.isDominator &&
                          this.body.team !== -101 &&
                          this.body.type !== "food")
                      ) {
                        if (
                          (this.body.specialEffect === "crusherFortWall" &&
                            e.ignoreCollision) ||
                          (c.MODE === "theDenied" && e.isGate) ||
                          (this.body.isAnubis &&
                            c.MODE === "theInfestation" &&
                            e.isGate &&
                            e.isWall)
                        )
                          return;
                        if (
                          e.isGate &&
                          (c.MODE === "theExpanse" ||
                            c.MODE === "theControlled" ||
                            c.MODE === "theAwakening")
                        )
                          return;
                        if (
                          Math.abs(e.x - m.x) < range &&
                          Math.abs(e.y - m.y) < range
                        ) {
                          if (
                            !this.body.aiSettings.blind ||
                            (Math.abs(e.x - mm.x) < range &&
                              Math.abs(e.y - mm.y) < range)
                          ) {
                            leastDangerous = Math.min(
                              e.dangerValue,
                              leastDangerous
                            );
                            return e; // Return this target if it has the least dangerValue
                          }
                        }
                      }
                    }
                  }
                  break;
                case "projectiles":
                  if (
                    e.master.master.team !== this.body.master.master.team &&
                    e.isProjectile
                  ) {
                    if (
                      Math.abs(e.x - m.x) < range &&
                      Math.abs(e.y - m.y) < range
                    ) {
                      if (
                        !this.body.aiSettings.blind ||
                        (Math.abs(e.x - mm.x) < range &&
                          Math.abs(e.y - mm.y) < range)
                      )
                        return e;
                    }
                  }
                  break;
                case "allHostiles":
                  if (
                    e.master.master.team !== this.body.master.master.team &&
                    !e.isProjectile
                  ) {
                    if (
                      this.body.label === "Harvest" &&
                      (e.isDominator ||
                        e.isGate ||
                        e.isWall ||
                        e.isSoccerBall ||
                        e.impervious ||
                        e.type === "base" ||
                        e.label === "Target Dummy")
                    )
                      return;
                    if (
                      c.MODE === "JJ's RF" &&
                      this.body.aiTarget === "allHostiles" &&
                      ((!room.isIn("gte1", e) &&
                        !room.isIn("bas1", e) &&
                        !room.isIn("bad1", e) &&
                        !room.isIn("wall", e)) ||
                        e.isProjectile)
                    )
                      return;
                    if (
                      Math.abs(e.x - m.x) < range &&
                      Math.abs(e.y - m.y) < range
                    ) {
                      if (
                        !this.body.aiSettings.blind ||
                        (Math.abs(e.x - mm.x) < range &&
                          Math.abs(e.y - mm.y) < range)
                      )
                        return e;
                    }
                  }
                  break;

                case "structures":
                  if (e.master !== this.body.master) {
                    if (
                      ((e.isDominator ||
                        e.isGate ||
                        e.isWall ||
                        e.type === "drone" ||
                        e.type === "minion" ||
                        e.type === "trap") &&
                        e.master !== this.body.master &&
                        e.team !== this.body.team) ||
                      ((e.isDominator ||
                        e.isGate ||
                        e.isWall ||
                        e.type === "drone" ||
                        e.type === "minion" ||
                        e.type === "trap") &&
                        e.master !== this.body.master &&
                        e.team === this.body.team &&
                        e.health.amount < e.health.max)
                    ) {
                      if (
                        !e.isGate &&
                        (c.MODE === "theExpanse" ||
                          c.MODE === "theControlled" ||
                          c.MODE === "theAwakening")
                      )
                        return;
                      if (
                        Math.abs(e.x - m.x) < range &&
                        Math.abs(e.y - m.y) < range
                      ) {
                        if (
                          !this.body.aiSettings.blind ||
                          (Math.abs(e.x - mm.x) < range &&
                            Math.abs(e.y - mm.y) < range)
                        )
                          return e;
                      }
                    }
                  }

                  break;

                case "self":
                  if (e.master === this.body.master) {
                    if (
                      Math.abs(e.x - m.x) < range &&
                      Math.abs(e.y - m.y) < range
                    ) {
                      if (
                        !this.body.aiSettings.blind ||
                        (Math.abs(e.x - mm.x) < range &&
                          Math.abs(e.y - mm.y) < range)
                      )
                        return e;
                    }
                  }

                  break;
                case "allies":
                  if (
                    e.master.master.team === this.body.master.master.team &&
                    e.master !== this.body.master &&
                    !e.isDominator &&
                    !e.isWall &&
                    !e.isGate
                  ) {
                    if (
                      e.name !== "Baltyla" &&
                      c.MODE === "theAwakening" &&
                      this.body.name === "Valrayvn"
                    )
                      return;
                    if (e.targetable === true) {
                      if (
                        Math.abs(e.x - m.x) < range &&
                        Math.abs(e.y - m.y) < range
                      ) {
                        if (
                          !this.body.aiSettings.blind ||
                          (Math.abs(e.x - mm.x) < range &&
                            Math.abs(e.y - mm.y) < range)
                        )
                          return e;
                      }
                    }
                  }
                  break;
                case "healAllies":
                  if (
                    e.master.master.team === this.body.master.master.team &&
                    e.master !== this.body.master &&
                    e.health.amount < e.health.max &&
                    !e.isDominator &&
                    !e.isWall &&
                    !e.isGate
                  ) {
                    if (e.targetable === true) {
                      if (
                        Math.abs(e.x - m.x) < range &&
                        Math.abs(e.y - m.y) < range
                      ) {
                        if (
                          !this.body.aiSettings.blind ||
                          (Math.abs(e.x - mm.x) < range &&
                            Math.abs(e.y - mm.y) < range)
                        )
                          return e;
                      }
                    }
                  }
                  break;
                case "general":
                case "mostDeadly":
                default:
                  if (
                    e.master.master.team !== this.body.master.master.team &&
                    e.alpha > 0.3 &&
                    !room.isIn("bas0", e) &&
                    !room.isIn("bas1", e) &&
                    !room.isIn("bap1", e) &&
                    !room.isIn("bas2", e) &&
                    !room.isIn("bap2", e) &&
                    !room.isIn("bas3", e) &&
                    !room.isIn("bap3", e) &&
                    !room.isIn("bas4", e) &&
                    !room.isIn("bas4", e)
                  ) {
                    if (e.master.master.team !== -101) {
                      if (
                        e.targetable === true ||
                        (!this.body.aiSettings.shapefriend &&
                          e.type === "food") ||
                        (e.isDominator &&
                          this.body.team !== -101 &&
                          this.body.type !== "food")
                      ) {
                        if (
                          (this.body.specialEffect === "crusherFortWall" &&
                            e.ignoreCollision) ||
                          (c.MODE === "theDenied" && e.isGate) ||
                          (this.body.isAnubis &&
                            c.MODE === "theInfestation" &&
                            e.isGate &&
                            e.isWall)
                        )
                          return;
                        if (
                          e.isGate &&
                          (c.MODE === "theExpanse" ||
                            c.MODE === "theControlled" ||
                            c.MODE === "theAwakening")
                        )
                          return;
                        if (
                          Math.abs(e.x - m.x) < range &&
                          Math.abs(e.y - m.y) < range
                        ) {
                          if (
                            !this.body.aiSettings.blind ||
                            (Math.abs(e.x - mm.x) < range &&
                              Math.abs(e.y - mm.y) < range)
                          )
                            return e;
                        }
                      }
                    }
                  }
              }
            }
          }
        }
      })
      .filter((e) => e); // Remove any null or undefined entries

    // If there are no valid targets, return an empty array
    if (!out.length) return [];

    // Post-processing: select target based on most or least dangerous
    out = out
      .map((e) => {
        let yaboi = false;
        if (
          Math.pow(this.body.x - e.x, 2) + Math.pow(this.body.y - e.y, 2) <
          sqrRange
        ) {
          if (this.body.firingArc == null || this.body.aiSettings.view360) {
            yaboi = true;
          } else if (
            Math.abs(
              util.angleDifference(
                util.getDirection(this.body, e),
                this.body.firingArc[0]
              )
            ) < this.body.firingArc[1]
          ) {
            yaboi = true;
          }
        }

        // Choose the target based on the most or least dangerous
        if (this.body.aiTarget === "leastDeadly") {
          // Only return the target with the least dangerValue
          if (yaboi && e.dangerValue < leastDangerous) {
            return e;
          }
        } else {
          // Default behavior: Most dangerous target
          if (yaboi && e.dangerValue > mostDangerous) {
            return e;
          }
        }

        return e;
      })
      .filter((e) => e); // Remove any null or undefined entries

    // Reset target if it's not in the list
    if (!keepTarget || this.notWorthIt) this.targetLock = undefined;
    return out;
  }

  think(input) {
    // Override target lock upon other commandscommandspull
    if (input.main || input.alt || this.body.master.autoOverride) {
      this.targetLock = undefined;
      return {};
    }
    // Otherwise, consider how fast we can either move to ram it or shoot at a potiential target.
    let tracking = this.body.topSpeed,
      range = this.body.fov / 2;
    // Use whether we have functional guns to decide
    for (let i = 0; i < this.body.guns.length; i++) {
      if (this.body.guns[i].canShoot && !this.body.aiSettings.skynet) {
        let v = this.body.guns[i].getTracking();
        tracking = v.speed;
        range = Math.min(range, v.speed * v.range);
        if (this.body.guns[i].altFire) {
          this.body.guns[i].altFire = false;
        }

        break;
      }
    }
    // Check if my target's alive
    if (this.targetLock) {
      if (
        this.targetLock.health.amount <= 0 ||
        isNaN(this.targetLock.x) ||
        isNaN(this.targetLock.y)
      ) {
        switch (this.body.aiTarget) {
          case "allies":
            if (
              this.targetLock.team === this.body.team &&
              this.targetLock.health.amount === this.targetLock.health.max
            ) {
              this.targetLock = undefined;
              this.tick = 100;
            }
            break;
          default:
            this.targetLock = undefined;
            this.tick = 100;
        }
        /* if (!this.click) {
      setTimeout(()=> {
          this.targetLock = undefined;
          this.tick = 100;
          this.click = false;
        }, 60000);
                this.click = true;
                }*/
      }
    }
    // Think damn hard
    if (this.tick++ > 15 * roomSpeed) {
      this.tick = 0;
      this.validTargets = this.buildList(range);
      // Ditch our old target if it's invalid
      if (
        this.targetLock &&
        this.validTargets.indexOf(this.targetLock) === -1
      ) {
        this.targetLock = undefined;
      }
      // Lock new target if we still don't have one.
      if (this.targetLock == null && this.validTargets.length) {
        this.targetLock =
          this.validTargets.length === 1
            ? this.validTargets[0]
            : nearest(this.validTargets, { x: this.body.x, y: this.body.y });
        this.tick = -90;
      }
    }
    // Lock onto whoever's shooting me.

    switch (this.body.aiTarget) {
      case "leastDeadly":
      case "mostDeadly":
      case "projectiles":
      case "allHostiles":
      case "self":
      case "structures":
      case "allies":
      case "healAllies":
        break;
      case "general":
      default:
        let damageRef = this.body.bond == null ? this.body : this.body.bond;
        if (
          damageRef.collisionArray.length &&
          damageRef.health.display() < this.oldHealth
        ) {
          this.oldHealth = damageRef.health.display();
          if (this.validTargets.indexOf(damageRef.collisionArray[0]) === -1) {
            this.targetLock =
              damageRef.collisionArray[0].master.id === -1
                ? damageRef.collisionArray[0].source
                : damageRef.collisionArray[0].master;
          }
        }
    }
    // Consider how fast it's moving and shoot at it
    if (this.targetLock != null && this.targetLock.valid()) {
      let radial = this.targetLock.velocity;
      let diff = {
        x: this.targetLock.x - this.body.x,
        y: this.targetLock.y - this.body.y,
      };
      /// Refresh lead time
      if (this.tick % 4 === 0) {
        this.lead = 0;
        // Find lead time (or don't)
        if (!this.body.aiSettings.chase) {
          let toi = timeOfImpact(diff, radial, tracking);
          this.lead = toi;
        }
      }
      // And return our aim
      if (!this.body.isWall) {
        return {
          target: {
            x: diff.x + this.lead * radial.x,
            y: diff.y + this.lead * radial.y,
          },
          fire: true,
          main: true,
        };
      } else {
        return {
          fire: true,
          main: true,
        };
      }
    }
    if (this.body.turnWhileIdle) {
      this.body.facing += 0.025;
      return {
        target: {
          x: Math.cos(this.body.facing),
          y: Math.sin(this.body.facing),
        },
        //main: true,
      };
    } else return {};
  }
}
class io_Dominator extends IO {
  constructor(body) {
    super(body);
    this.targetLock = undefined;
    this.tick = ran.irandom(30);
    this.lead = 0;
    this.validTargets = this.buildList(body.fov / 2);
    this.oldHealth = body.health.display();
    this.body.facing = 0;
  }

  buildList(range) {
    // Establish whom we judge in reference to
    let m = { x: this.body.x, y: this.body.y },
      mm = { x: this.body.master.master.x, y: this.body.master.master.y },
      mostDangerous = 0,
      sqrRange = range * range,
      keepTarget = false;
    // Filter through everybody...
    let out = getEntitiesFromRange(m, range)
      .map((e) => {
        // Only look at those within our view, and our parent's view, not dead, not our kind, not a bullet/trap/block etc
        if (e.health.amount > 0) {
          if (!e.invuln) {
            if (
              e.master.master.team !== this.body.master.master.team &&
              e.alpha > 0.3 &&
              !room.isIn("bas0", e) &&
              !room.isIn("bas1", e) &&
              !room.isIn("bap1", e) &&
              !room.isIn("bas2", e) &&
              !room.isIn("bap2", e) &&
              !room.isIn("bas3", e) &&
              !room.isIn("bap3", e) &&
              !room.isIn("bas4", e) &&
              !room.isIn("bas4", e)
            ) {
              if (this.body.aiTarget === "allHostiles" && c.MODE === "JJ's RF")
                return;
              if (e.master.master.team !== -101) {
                if (
                  e.targetable === true ||
                  (!this.body.aiSettings.shapefriend && e.type === "food") ||
                  (e.isDominator &&
                    this.body.team !== -101 &&
                    this.body.type !== "food")
                ) {
                  if (
                    Math.abs(e.x - m.x) < range &&
                    Math.abs(e.y - m.y) < range
                  ) {
                    if (
                      !this.body.aiSettings.blind ||
                      (Math.abs(e.x - mm.x) < range &&
                        Math.abs(e.y - mm.y) < range)
                    )
                      return e;
                  }
                }
              }
            }
          }
        }
      })
      .filter((e) => {
        return e;
      });

    if (!out.length) return [];

    out = out
      .map((e) => {
        // Only look at those within range and arc (more expensive, so we only do it on the few)
        let yaboi = false;
        if (
          Math.pow(this.body.x - e.x, 2) + Math.pow(this.body.y - e.y, 2) <
          sqrRange
        ) {
          if (this.body.firingArc == null || this.body.aiSettings.view360) {
            yaboi = true;
          } else if (
            Math.abs(
              util.angleDifference(
                util.getDirection(this.body, e),
                this.body.firingArc[0]
              )
            ) < this.body.firingArc[1]
          )
            yaboi = true;
        }
        if (yaboi) {
          mostDangerous = Math.max(e.dangerValue, mostDangerous);
          return e;
        }
      })
      .filter((e) => {
        // Only return the highest tier of danger
        if (e != null) {
          if (this.body.aiSettings.farm || e.dangerValue === mostDangerous) {
            if (this.targetLock) {
              if (e.id === this.targetLock.id) keepTarget = true;
            }
            return e;
          }
        }
      });
    // Reset target if it's not in there
    if (!keepTarget) this.targetLock = undefined;
    return out;
  }

  think(input) {
    // Override target lock upon other commands
    if (input.main || input.alt || this.body.master.autoOverride) {
      this.targetLock = undefined;
      return {};
    }
    // Otherwise, consider how fast we can either move to ram it or shoot at a potiential target.
    let tracking = this.body.topSpeed,
      range = this.body.fov / 2;
    // Use whether we have functional guns to decide
    for (let i = 0; i < this.body.guns.length; i++) {
      if (this.body.guns[i].canShoot && !this.body.aiSettings.skynet) {
        let v = this.body.guns[i].getTracking();
        tracking = v.speed;
        range = Math.min(range, v.speed * v.range);
        break;
      }
    }
    // Check if my target's alive
    if (this.targetLock) {
      if (this.targetLock.health.amount <= 0) {
        this.targetLock = undefined;
        this.tick = 100;
      }
    }
    // Think damn hard
    if (this.tick++ > 15 * roomSpeed) {
      this.tick = 0;
      this.validTargets = this.buildList(range);
      // Ditch our old target if it's invalid
      if (
        this.targetLock &&
        this.validTargets.indexOf(this.targetLock) === -1
      ) {
        this.targetLock = undefined;
      }
      // Lock new target if we still don't have one.
      if (this.targetLock == null && this.validTargets.length) {
        this.targetLock =
          this.validTargets.length === 1
            ? this.validTargets[0]
            : nearest(this.validTargets, { x: this.body.x, y: this.body.y });
        this.tick = -90;
      }
    }
    // Lock onto whoever's shooting me.
    // let damageRef = (this.body.bond == null) ? this.body : this.body.bond;
    // if (damageRef.collisionArray.length && damageRef.health.display() < this.oldHealth) {
    //     this.oldHealth = damageRef.health.display();
    //     if (this.validTargets.indexOf(damageRef.collisionArray[0]) === -1) {
    //         this.targetLock = (damageRef.collisionArray[0].master.id === -1) ? damageRef.collisionArray[0].source : damageRef.collisionArray[0].master;
    //     }
    // }
    // Consider how fast it's moving and shoot at it
    if (this.targetLock != null && this.targetLock.valid()) {
      let radial = this.targetLock.velocity;
      let diff = {
        x: this.targetLock.x - this.body.x,
        y: this.targetLock.y - this.body.y,
      };
      /// Refresh lead time
      if (this.tick % 4 === 0) {
        this.lead = 0;
        // Find lead time (or don't)
        if (!this.body.aiSettings.chase) {
          let toi = timeOfImpact(diff, radial, tracking);
          this.lead = toi;
        }
      }
      // And return our aim
      return {
        target: {
          x: diff.x + this.lead * radial.x,
          y: diff.y + this.lead * radial.y,
        },
        fire: true,
        main: true,
      };
    }
    this.body.facing += 0.02;
    return {
      target: {
        x: Math.cos(this.body.facing),
        y: Math.sin(this.body.facing),
      },
      main: true,
    };
  }
}
class io_minion extends IO {
  constructor(body) {
    super(body);
    this.turnwise = 1;
  }
  think(input) {
    if (this.body.invuln === true) return;
    if (this.body.aiSettings.reverseDirection && ran.chance(0.005)) {
      this.turnwise = -1 * this.turnwise;
    }
    if (input.target != null && (input.alt || input.main)) {
      let sizeFactor = Math.sqrt(this.body.master.size / this.body.master.SIZE);
      let leash = 60 * sizeFactor;
      let orbit = 120 * sizeFactor;
      if (this.body.orbitDistance <= 0 || this.body.orbitDistance > 0) {
        orbit = this.body.orbitDistance * sizeFactor;
      }

      let repel = (100 * sizeFactor * this.body.SPEED) / 2;
      let goal;
      let power = 1;
      let target = new Vector(input.target.x, input.target.y);
      if (input.alt) {
        // Leash
        if (target.length < leash) {
          goal = {
            x: this.body.x + target.x,
            y: this.body.y + target.y,
          };

          // Spiral repel
        } else if (target.length < repel) {
          let dir = -this.turnwise * target.direction + Math.PI / 5;
          goal = {
            x: this.body.x + Math.cos(dir),
            y: this.body.y + Math.sin(dir),
          };
          // Free repel
        } else {
          goal = {
            x: this.body.x - target.x,
            y: this.body.y - target.y,
          };
        }
      } else if (input.main) {
        // Orbit point
        let dir = this.turnwise * target.direction + 0.01;
        goal = {
          x: this.body.x + target.x - orbit * Math.cos(dir),
          y: this.body.y + target.y - orbit * Math.sin(dir),
        };
        if (Math.abs(target.length - orbit) < this.body.size * 2) {
          power = 0.7;
        }
      }
      return {
        goal: goal,
        power: power,
      };
    }
  }
}
class io_wanderAroundMap extends IO {
  constructor(b) {
    super(b);

    this.spot = room.random();
  }
  think(input) {
    if (!this.body.invuln) {
      if (
        new Vector(this.body.x - this.spot.x, this.body.y - this.spot.y)
          .length < 50 ||
        this.targetLock != undefined
      ) {
        this.spot = room.random();
      }

      return { goal: this.spot };
    }
  }
}
class io_pathFinder extends IO {
  constructor(b) {
    super(b);
    this.path = 1;
    this.spot = room.randomType("pth1");
  }
  think(input) {
    if (!this.body.invuln) {
      if (room["pth" + this.path]) {
        if (
          new Vector(this.body.x - this.spot.x, this.body.y - this.spot.y)
            .length < 50 ||
          this.targetLock != undefined
        ) {
          this.path += 1;
          this.spot = room.randomType("pth" + this.path);
        }
      } else {
        this.path = 1;
        this.spot = room.randomType("pth" + this.path);
      }

      return { goal: this.spot };
    }
  }
}
class io_guard1 extends IO {
  constructor(b) {
    super(b);
    if (c.MODE === "theDenied" || c.MODE === "theDivided") {
      if (this.body.isRanar || this.body.eliteBoss) {
        this.spot = room.type("spw0");
      } else {
        this.spot = room.type("nest");
      }
    }
    if (c.MODE === "BossArena") {
      this.spot = room.type("vpr0");
    }
    if (c.MODE === "theAwakening") {
      this.spot = room.type(c.npcMove);
    }
    if (c.MODE === "siege") {
      this.spot = room.randomType("dom1");
    }
    if (c.MODE === "theInfestation") {
      if (this.body.isAnubis) {
        this.spot = room.randomType("vpr0");
      } else this.spot = room.randomType("dom0");
    }
    if (c.MODE === "theGreatPlague") {
      this.spot = room.randomType("dom0");
    }
  }
  think(input) {
    if (this.body) {
      if (
        new Vector(this.body.x - this.spot.x, this.body.y - this.spot.y)
          .length < 50 ||
        this.targetLock != undefined ||
        this.body.invuln
      ) {
        if (c.MODE === "theAwakening") this.spot = room.type(c.npcMove);
      }
    }
    return { goal: this.spot };
  }
}
class io_hangOutNearMaster extends IO {
  constructor(body) {
    super(body);
    this.acceptsFromTop = false;
    this.orbit = 30;
    this.currentGoal = { x: this.body.source.x, y: this.body.source.y };
    this.timer = 0;
  }
  think(input) {
    if (this.body.source != this.body) {
      let bound1 = this.orbit * 0.8 + this.body.source.size + this.body.size;
      let bound2 = this.orbit * 1.5 + this.body.source.size + this.body.size;
      let dist = util.getDistance(this.body, this.body.source) + Math.PI / 8;
      let output = {
        target: {
          x: this.body.velocity.x,
          y: this.body.velocity.y,
        },
        goal: this.currentGoal,
        power: undefined,
      };
      // Set a goal
      if (dist > bound2 || this.timer > 30) {
        this.timer = 0;

        let dir =
          util.getDirection(this.body, this.body.source) +
          Math.PI * ran.random(0.5);
        let len = ran.randomRange(bound1, bound2);
        let x = this.body.source.x - len * Math.cos(dir);
        let y = this.body.source.y - len * Math.sin(dir);
        this.currentGoal = {
          x: x,
          y: y,
        };
      }
      if (dist < bound2) {
        output.power = 0.15;
        if (ran.chance(0.3)) {
          this.timer++;
        }
      }
      return output;
    }
  }
}
class io_teleportToMaster extends IO {
  constructor(body) {
    super(body);
  }
  think(input) {
    this.body.x = this.body.source.x; //+ this.body.source.velocity.x;
    this.body.y = this.body.source.y; //+ this.body.source.velocity.y;
    this.body.accel.x = 0;
    this.body.accel.y = 0;
  }
}
class io_spin extends IO {
  constructor(b) {
    super(b);
    this.a = 0;
  }

  think(input) {
    this.body.facing += 0.05;
    if (this.body.spinRate <= 0 || this.body.spinRate > 0) {
      this.body.facing += this.body.spinRate;
    }
    let offset = 0;
    if (this.body.bond != null) {
      offset = this.body.bound.angle;
    }
    return {
      target: {
        x: Math.cos(this.body.facing),
        y: Math.sin(this.body.facing),
      },
      main: true,
    };
  }
}
class io_dontTurn extends IO {
  constructor(b) {
    super(b);
  }
  think(input) {
    if (!this.targetLock) {
      return {
        target: {
          x: 0,
          y: 1,
        },
        main: true,
      };
    }
  }
}
class io_rightTurn extends IO {
  constructor(b) {
    super(b);
  }

  think(input) {
    if (!this.targetLock) {
      return {
        target: {
          x: -1,
          y: 0,
        },
        main: true,
      };
    }
  }
}
class io_downTurn extends IO {
  constructor(b) {
    super(b);
  }
  think(input) {
    if (!this.targetLock) {
      return {
        target: {
          x: 0,
          y: -1,
        },
        main: true,
      };
    }
  }
}

class io_turretWithMotion extends IO {
  constructor(b, opts = {}) {
    super(b);
  }
  think(input) {
    return {
      target: this.body.master.velocity,
      main: true,
    };
  }
}

class io_fleeAtLowHealth extends IO {
  constructor(b) {
    super(b);
    this.fear = util.clamp(ran.gauss(0.2, 0.08), 0.1, 0.8);
  }

  think(input) {
    if (this.body.team !== -2 && this.body.team !== -4) {
      if (
        input.fire &&
        input.target != null &&
        this.body.health.amount < this.body.health.max * (this.fear * 2)
      ) {
        return {
          goal: {
            x: this.body.x - input.target.x,
            y: this.body.y - input.target.y,
          },
        };
      }
    }
  }
}
/***** ENTITIES *****/
// Define skills
const skcnv = {
  rld: 0,
  pen: 1,
  str: 2,
  dam: 3,
  spd: 4,

  shi: 5,
  atk: 6,
  hlt: 7,
  rgn: 8,
  mob: 9,
};
const levelers = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
  43, 45, 54, 63, 72, 80, 88, 94, 100, 110, 119, 127, 134, 143, 150, 159, 168,
  175, 184, 195, 200, 208, 219, 227, 234, 240, 252, 259, 267, 275,
];
class Skill {
  constructor(inital = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) {
    // Just skill stuff.
    this.raw = inital;
    this.caps = [];
    this.setCaps([
      c.MAX_SKILL,
      c.MAX_SKILL,
      c.MAX_SKILL,
      c.MAX_SKILL,
      c.MAX_SKILL,
      c.MAX_SKILL,
      c.MAX_SKILL,
      c.MAX_SKILL,
      c.MAX_SKILL,
      c.MAX_SKILL,
    ]);
    this.name = [
      "Reload",
      "Bullet Penetration",
      "Bullet Health",
      "Bullet Damage",
      "Bullet Speed",
      "Shield Capacity",
      "Body Damage",
      "Max Health",
      "Shield Regeneration",
      "Movement Speed",
    ];
    this.atk = 0;
    this.hlt = 0;
    this.spd = 0;
    this.str = 0;
    this.pen = 0;
    this.dam = 0;
    this.rld = 0;
    this.mob = 0;
    this.rgn = 0;
    this.shi = 0;
    this.rst = 0;
    this.brst = 0;
    this.ghost = 0;
    this.acl = 0;

    this.reset();
  }

  reset() {
    this.points = 0;
    this.score = 0;
    this.growthCap = 0;
    this.level = 0;
    this.canUpgrade = false;
    this.update();
    this.maintain();
  }

  update() {
    let curve = (() => {
      function make(x) {
        return Math.log(4 * x + 1) / Math.log(5);
      }
      let a = [];
      for (let i = 0; i < c.MAX_SKILL * 2; i++) {
        a.push(make(i / c.MAX_SKILL));
      }
      // The actual lookup function
      return (x) => {
        return a[x * c.MAX_SKILL];
      };
    })();
    function apply(f, x) {
      return x < 0 ? 1 / (1 - x * f) : f * x + 1;
    }
    for (let i = 0; i < 10; i++) {
      if (this.raw[i] > this.caps[i]) {
        this.points += this.raw[i] - this.caps[i];
        this.raw[i] = this.caps[i];
      }
    }
    let attrib = [];
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 2; j += 1) {
        attrib[i + 5 * j] = curve(
          (this.raw[i + 5 * j] + this.bleed(i, j)) / c.MAX_SKILL
        );
      }
    }
    this.rld = Math.pow(0.5, attrib[skcnv.rld]);
    this.pen = apply(2.5, attrib[skcnv.pen]);
    this.str = apply(2, attrib[skcnv.str]);
    this.dam = apply(3, attrib[skcnv.dam]);
    this.spd = 0.5 + apply(1.5, attrib[skcnv.spd]);

    this.acl = apply(0.5, attrib[skcnv.rld]);

    this.rst = 0.5 * attrib[skcnv.str] + 2.5 * attrib[skcnv.pen];
    this.ghost = attrib[skcnv.pen];
    if (!this.isProjectile) {
      this.shi =
        c.GLASS_HEALTH_FACTOR *
        apply(3 / c.GLASS_HEALTH_FACTOR - 1, attrib[skcnv.shi]);
      this.atk = apply(1, attrib[skcnv.atk]);
      this.hlt =
        c.GLASS_HEALTH_FACTOR *
        apply(2 / c.GLASS_HEALTH_FACTOR - 1, attrib[skcnv.hlt]);
    } else if (this.isProjectile) {
      this.shi = 1.75 * apply(3 / 1.75 - 1, attrib[skcnv.shi]);
      this.atk = apply(1, attrib[skcnv.atk]);
      this.hlt = 1.75 * apply(2 / 1.75 - 1, attrib[skcnv.hlt]);
    }
    this.mob = apply(0.8, attrib[skcnv.mob]);
    this.rgn = apply(25, attrib[skcnv.rgn]);

    this.brst =
      0.3 *
      (0.5 * attrib[skcnv.atk] + 0.5 * attrib[skcnv.hlt] + attrib[skcnv.rgn]);
  }

  set(thing) {
    this.raw[0] = thing[0];
    this.raw[1] = thing[1];
    this.raw[2] = thing[2];
    this.raw[3] = thing[3];
    this.raw[4] = thing[4];
    this.raw[5] = thing[5];
    this.raw[6] = thing[6];
    this.raw[7] = thing[7];
    this.raw[8] = thing[8];
    this.raw[9] = thing[9];
    this.update();
  }

  setCaps(thing) {
    this.caps[0] = thing[0];
    this.caps[1] = thing[1];
    this.caps[2] = thing[2];
    this.caps[3] = thing[3];
    this.caps[4] = thing[4];
    this.caps[5] = thing[5];
    this.caps[6] = thing[6];
    this.caps[7] = thing[7];
    this.caps[8] = thing[8];
    this.caps[9] = thing[9];
    this.update();
  }

  maintain() {
    if (this.score >= this.levelScore) {
      this.level += 1;
      if (this.level <= c.SKILL_CAP) {
        this.points += this.levelPoints;
        this.growthCap += 1;
      }
      if (
        this.level == 0 ||
        this.level == c.TIER_1 ||
        this.level == c.TIER_2 ||
        this.level == c.TIER_3 ||
        this.level == c.TIER_4 ||
        this.level == c.TIER_5 ||
        this.level == c.TIER_6 ||
        this.level == c.TIER_7 ||
        this.level == c.TIER_8
      ) {
        this.canUpgrade = true;
      }
      this.update();
      return true;
    }

    return false;
  }

  get levelScore() {
    return 1 + 0.6 * Math.pow((this.level ? this.level : 1) + 1.45, 2.8);
  }

  get progress() {
    return this.levelScore ? this.score / this.levelScore : 0;
  }

  get levelPoints() {
    if (
      levelers.findIndex((e) => {
        return e === this.level;
      }) != -1
    ) {
      return 1;
    }
    return 0;
  }

  cap(skill, real = false) {
    if (!real && this.level < c.SKILL_SOFT_CAP) {
      return Math.round(this.caps[skcnv[skill]] * c.SOFT_MAX_SKILL);
    }
    return this.caps[skcnv[skill]];
  }

  bleed(i, j) {
    let a = ((i + 2) % 5) + 5 * j,
      b = ((i + (j === 1 ? 1 : 4)) % 5) + 5 * j;
    let value = 0;
    let denom = Math.max(c.MAX_SKILL, this.caps[i + 5 * j]);
    value +=
      (1 - Math.pow(this.raw[a] / denom - 1, 2)) * this.raw[a] * c.SKILL_LEAK;
    value -= Math.pow(this.raw[b] / denom, 2) * this.raw[b] * c.SKILL_LEAK;

    return value;
  }

  upgrade(stat) {
    if (this.points && this.amount(stat) < this.cap(stat)) {
      this.change(stat, 1);
      this.points -= 1;
      return true;
    }
    return false;
  }

  title(stat) {
    return this.name[skcnv[stat]];
  }

  /*
    let i = skcnv[skill] % 5,
        j = (skcnv[skill] - i) / 5;
    let roundvalue = Math.round(this.bleed(i, j) * 10);
    let string = '';
    if (roundvalue > 0) { string += '+' + roundvalue + '%'; }
    if (roundvalue < 0) { string += '-' + roundvalue + '%'; }

    return string;
    */

  amount(skill) {
    return this.raw[skcnv[skill]];
  }

  change(skill, levels) {
    this.raw[skcnv[skill]] += levels;
    this.update();
  }
}

const lazyRealSizes = (() => {
  let o = [1, 1, 1];
  for (var i = 3; i < 16; i++) {
    // We say that the real size of a 0-gon, 1-gon, 2-gon is one, then push the real sizes of triangles, squares, etc...
    o.push(Math.sqrt(((2 * Math.PI) / i) * (1 / Math.sin((2 * Math.PI) / i))));
  }
  return o;
})();

const combineStats = function (arr) {
  try {
    // Build a blank array of the appropiate length
    let data = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    arr.forEach(function (component) {
      for (let i = 0; i < data.length; i++) {
        data[i] = data[i] * component[i];
      }
    });
    return {
      reload: data[0],
      recoil: data[1],
      shudder: data[2],
      size: data[3],
      health: data[4],
      damage: data[5],
      pen: data[6],
      speed: data[7],
      maxSpeed: data[8],
      range: data[9],
      density: data[10],
      spray: data[11],
      resist: data[12],
    };
  } catch (err) {
    console.log(err);
    console.log(JSON.stringify(arr));
  }
};
// Define how guns work
class Gun {
  constructor(body, info) {
    this.lastShot = {
      time: 0,
      power: 0,
    };
    this.body = body;
    this.master = body.source;
    this.label = "";
    this.controllers = [];
    this.children = [];
    this.control = {
      target: new Vector(0, 0),
      goal: new Vector(0, 0),
      main: false,
      alt: false,
      fire: false,
    };
    this.canShoot = false;
    if (info.PROPERTIES != null && info.PROPERTIES.TYPE != null) {
      this.canShoot = true;
      this.label = info.PROPERTIES.LABEL == null ? "" : info.PROPERTIES.LABEL;
      if (Array.isArray(info.PROPERTIES.TYPE)) {
        // This is to be nicer about our definitions
        this.bulletTypes = info.PROPERTIES.TYPE;
        this.natural = info.PROPERTIES.TYPE.BODY;
      } else {
        this.bulletTypes = [info.PROPERTIES.TYPE];
      }
      // Pre-load bullet definitions so we don't have to recalculate them every shot
      let natural = {};
      this.bulletTypes.forEach(function setNatural(type) {
        if (type.PARENT != null) {
          // Make sure we load from the parents first
          for (let i = 0; i < type.PARENT.length; i++) {
            setNatural(type.PARENT[i]);
          }
        }
        if (type.BODY != null) {
          // Get values if they exist
          for (let index in type.BODY) {
            natural[index] = type.BODY[index];
          }
        }
      });
      this.natural = natural; // Save it
      if (info.PROPERTIES.GUN_CONTROLLERS != null) {
        let toAdd = [];
        let self = this;
        info.PROPERTIES.GUN_CONTROLLERS.forEach(function (ioName) {
          toAdd.push(eval("new " + ioName + "(self)"));
        });
        this.controllers = toAdd.concat(this.controllers);
      }
      this.autofire =
        info.PROPERTIES.AUTOFIRE == null ? false : info.PROPERTIES.AUTOFIRE;
      this.altFire =
        info.PROPERTIES.ALT_FIRE == null ? false : info.PROPERTIES.ALT_FIRE;
      this.settings =
        info.PROPERTIES.SHOOT_SETTINGS == null
          ? []
          : info.PROPERTIES.SHOOT_SETTINGS;
      this.calculator =
        info.PROPERTIES.STAT_CALCULATOR == null
          ? "default"
          : info.PROPERTIES.STAT_CALCULATOR;
      this.waitToCycle =
        info.PROPERTIES.WAIT_TO_CYCLE == null
          ? false
          : info.PROPERTIES.WAIT_TO_CYCLE;
      this.bulletStats =
        info.PROPERTIES.BULLET_STATS == null ||
        info.PROPERTIES.BULLET_STATS == "master"
          ? "master"
          : new Skill(info.PROPERTIES.BULLET_STATS);
      this.settings =
        info.PROPERTIES.SHOOT_SETTINGS == null
          ? []
          : info.PROPERTIES.SHOOT_SETTINGS;
      this.countsOwnKids =
        info.PROPERTIES.MAX_CHILDREN == null
          ? false
          : info.PROPERTIES.MAX_CHILDREN;
      this.syncsSkills =
        info.PROPERTIES.SYNCS_SKILLS == null
          ? false
          : info.PROPERTIES.SYNCS_SKILLS;
      this.negRecoil =
        info.PROPERTIES.NEGATIVE_RECOIL == null
          ? false
          : info.PROPERTIES.NEGATIVE_RECOIL;
      this.shootOnDeath =
        info.PROPERTIES.SHOOT_ON_DEATH == null
          ? false
          : info.PROPERTIES.SHOOT_ON_DEATH;
    }
    let position = info.POSITION;
    this.length = position[0] / 10;
    this.width = position[1] / 10;
    this.aspect = position[2];
    let _off = new Vector(position[3], position[4]);
    this.angle = (position[5] * Math.PI) / 180;
    this.direction = _off.direction;
    this.offset = _off.length / 10;
    this.delay = position[6];

    this.position = 0;
    this.motion = 0;
    if (this.canShoot) {
      this.cycle = !this.waitToCycle - this.delay;
      this.trueRecoil = this.settings.recoil;
    }
  }

  recoil() {
    if (this.motion || this.position) {
      // Simulate recoil
      this.motion -= (0.25 * this.position) / roomSpeed;
      this.position += this.motion;
      if (this.position < 0) {
        // Bouncing off the back
        this.position = 0;
        this.motion = -this.motion;
      }
      if (this.motion > 0) {
        this.motion *= 0.75;
      }
    }
    if (this.canShoot && !this.body.settings.hasNoRecoil) {
      // Apply recoil to motion
      if (this.motion > 0) {
        let recoilForce =
          (-this.position * this.trueRecoil * 0.045) / roomSpeed;
        this.body.accel.x +=
          recoilForce * Math.cos(this.body.facing + this.angle);
        this.body.accel.y +=
          recoilForce * Math.sin(this.body.facing + this.angle);
      }
    }
  }

  getSkillRaw() {
    if (this.bulletStats === "master") {
      return [
        this.body.skill.raw[0],
        this.body.skill.raw[1],
        this.body.skill.raw[2],
        this.body.skill.raw[3],
        this.body.skill.raw[4],
        0,
        0,
        0,
        0,
        0,
      ];
    }
    return this.bulletStats.raw;
  }

  getLastShot() {
    return this.lastShot;
  }

  live() {
    // Do
    this.recoil();
    // Dummies ignore this
    if (this.canShoot) {
      // Find the proper skillset for shooting
      let sk =
        this.bulletStats === "master" ? this.body.skill : this.bulletStats;
      // Decides what to do based on child-counting settings
      let shootPermission = this.countsOwnKids
        ? this.countsOwnKids >
          this.children.length * (this.calculator == "necro" ? sk.rld : 1)
        : this.body.maxChildren
        ? this.body.maxChildren >
          this.body.children.length * (this.calculator == "necro" ? sk.rld : 1)
        : true;
      // Override in invuln
      if (this.body.master.invuln && this.body.INVULNERABLE !== true) {
        shootPermission = false;
      }
      // Cycle up if we should
      if (shootPermission || !this.waitToCycle) {
        if (this.cycle < 1) {
          this.cycle +=
            1 /
            this.settings.reload /
            roomSpeed /
            (this.calculator == "necro" || this.calculator == "fixed reload"
              ? 1
              : sk.rld);
        }
      }

      // Firing routines
      if (
        shootPermission &&
        (this.autofire ||
          (this.altFire ? this.body.control.alt : this.body.control.fire))
      ) {
        if (this.cycle >= 1) {
          // Find the end of the gun barrel
          let gx =
            this.offset *
              Math.cos(this.direction + this.angle + this.body.facing) +
            (1.5 * this.length - (this.width * this.settings.size) / 2) *
              Math.cos(this.angle + this.body.facing);
          let gy =
            this.offset *
              Math.sin(this.direction + this.angle + this.body.facing) +
            (1.5 * this.length - (this.width * this.settings.size) / 2) *
              Math.sin(this.angle + this.body.facing);
          // Shoot, multiple times in a tick if needed
          while (shootPermission && this.cycle >= 1) {
            this.fire(gx, gy, sk);
            // Figure out if we may still shoot
            shootPermission = this.countsOwnKids
              ? this.countsOwnKids > this.children.length
              : this.body.maxChildren
              ? this.body.maxChildren > this.body.children.length
              : true;

            // Cycle down
            this.cycle -= 1;
          }
        } // If we're not shooting, only cycle up to where we'll have the proper firing delay
      } else if (this.cycle > !this.waitToCycle - this.delay) {
        this.cycle = !this.waitToCycle - this.delay;
      }
    }
  }

  syncChildren() {
    if (this.syncsSkills) {
      let self = this;
      this.children.forEach(function (o) {
        o.define({
          BODY: self.interpret(),
          SKILL: self.getSkillRaw(),
        });
      });
    }
  }

  fire(gx, gy, sk) {
    // Recoil
    this.lastShot.time = util.time();
    this.lastShot.power =
      3 * Math.log(Math.sqrt(sk.spd) + this.trueRecoil + 1) + 1;
    this.motion += this.lastShot.power;
    // Find inaccuracy
    let ss, sd;
    do {
      ss = ran.gauss(0, Math.sqrt(this.settings.shudder));
    } while (Math.abs(ss) >= this.settings.shudder * 2);
    do {
      sd = ran.gauss(0, this.settings.spray * this.settings.shudder);
    } while (Math.abs(sd) >= this.settings.spray / 2);
    sd *= Math.PI / 180;
    // Find speed
    let s = new Vector(
      (this.negRecoil ? -1 : 1) *
        this.settings.speed *
        c.runSpeed *
        sk.spd *
        (1 + ss) *
        Math.cos(this.angle + this.body.facing + sd),
      (this.negRecoil ? -1 : 1) *
        this.settings.speed *
        c.runSpeed *
        sk.spd *
        (1 + ss) *
        Math.sin(this.angle + this.body.facing + sd)
    );
    // Boost it if we shouldw
    if (this.body.velocity.length) {
      let extraBoost =
        Math.max(0, s.x * this.body.velocity.x + s.y * this.body.velocity.y) /
        this.body.velocity.length /
        s.length;
      if (extraBoost) {
        let len = s.length;
        s.x += (this.body.velocity.length * extraBoost * s.x) / len;
        s.y += (this.body.velocity.length * extraBoost * s.y) / len;
      }
    }
    // Create the bullet
    var o = new Entity(
      {
        x: this.body.x + this.body.size * gx - s.x,
        y: this.body.y + this.body.size * gy - s.y,
      },
      this.master.master
    );
    /*let jumpAhead = this.cycle - 1;
        if (jumpAhead) {
            o.x += s.x * this.cycle / jumpAhead;
            o.y += s.y * this.cycle / jumpAhead;
        }*/
    o.velocity = s;
    this.bulletInit(o);
    o.coreSize = o.SIZE;
  }

  bulletInit(o) {
    // Define it by its natural properties
    this.bulletTypes.forEach((type) => o.define(type));
    // Pass the gun attributes
    o.define({
      BODY: this.interpret(),
      SKILL: this.getSkillRaw(),
      SIZE: (this.body.size * this.width * this.settings.size) / 2,
      LABEL:
        this.master.label +
        (this.label ? " " + this.label : "") +
        " " +
        o.label,
    });
    if (this.body.master.isCreep) {
      o.alpha = this.body.master.alpha;
    }

    if (this.body.master.spooky) {
      o.ignoreCollision = this.body.master.ignoreCollision;
    }

    if (this.body.master.copyLayer) {
      o.layer = this.body.master.layer;
    }

    o.color = this.body.master.color;
    // Keep track of it and give it the function it needs to deutil.log itself upon death
    if (this.countsOwnKids) {
      o.parent = this;
      this.children.push(o);
    } else if (this.body.maxChildren) {
      o.parent = this.body;
      this.body.children.push(o);
      this.children.push(o);
    }
    o.source = this.body;
    o.facing = o.velocity.direction;
    // Necromancers.
    o.necro = (host) => {
      let shootPermission = this.countsOwnKids
        ? this.countsOwnKids >
          this.children.length *
            (this.bulletStats === "master"
              ? this.body.skill.rld
              : this.bulletStats.rld)
        : this.body.maxChildren
        ? this.body.maxChildren >
          this.body.children.length *
            (this.bulletStats === "master"
              ? this.body.skill.rld
              : this.bulletStats.rld)
        : true;
      if (shootPermission) {
        let save = {
          facing: host.facing,
          size: host.SIZE,
        };
        (this.foodLevel = -1), this.bulletInit(host);
        host.team = o.master.master.team;
        host.master = o.master;
        host.color = o.color;
        host.facing = save.facing;
        host.SIZE = save.size;

        host.health.amount = host.health.max;

        return true;
      }
      return false;
    };
    // Otherwise
    o.refreshBodyAttributes();
    o.life();
  }

  getTracking() {
    return {
      speed: this.body.fov,
      range: this.body.fov,
    };
  }

  interpret() {
    let sizeFactor = this.master.size / this.master.SIZE;
    let shoot = this.settings;
    let sk = this.bulletStats == "master" ? this.body.skill : this.bulletStats;
    // Defaults
    let out = {
      SPEED: shoot.maxSpeed * sk.spd,
      HEALTH: shoot.health * sk.str,
      RESIST: shoot.resist + sk.rst,
      DAMAGE: shoot.damage * sk.dam,
      PENETRATION: Math.max(1, shoot.pen * sk.pen),
      RANGE: shoot.range / Math.sqrt(sk.spd),
      DENSITY: (shoot.density * sk.pen * sk.pen) / sizeFactor,
      PUSHABILITY: 1 / sk.pen,
      HETERO: 3 - 2.8 * sk.ghost,
    };
    // Special cases
    switch (this.calculator) {
      case "thruster":
        this.trueRecoil = this.settings.recoil * Math.sqrt(sk.rld * sk.spd);
        break;
      case "sustained":
        out.RANGE = shoot.range;
        break;
      case "swarm":
        out.PENETRATION = Math.max(1, shoot.pen * (0.5 * (sk.pen - 1) + 1));
        out.HEALTH /= shoot.pen * sk.pen;
        break;
      case "trap":
      case "block":
        out.PUSHABILITY = 1 / Math.pow(sk.pen, 0.5);
        out.RANGE = shoot.range;
        break;
      case "necro":
      case "drone":
        out.PUSHABILITY = 1;
        out.PENETRATION = Math.max(1, shoot.pen * (0.5 * (sk.pen - 1) + 1));
        out.HEALTH =
          (shoot.health * sk.str + sizeFactor) / Math.pow(sk.pen, 0.8);
        out.DAMAGE =
          shoot.damage * sk.dam * Math.sqrt(sizeFactor) * shoot.pen * sk.pen;
        out.RANGE = shoot.range * Math.sqrt(sizeFactor);
        break;
    }
    // Go through and make sure we respect its natural properties
    for (let property in out) {
      if (this.natural[property] == null || !out.hasOwnProperty(property))
        continue;
      out[property] *= this.natural[property];
    }
    return out;
  }
}
// Define entities
var minimap = [];
var views = [];
var entitiesToAvoid = [];
const dirtyCheck = (p, r) => {
  return entitiesToAvoid.some((e) => {
    if (e.valid()) {
      return (
        Math.abs(p.x - e.x) < r + e.size && Math.abs(p.y - e.y) < r + e.size
      );
    }
  });
};

class KeyManager {
  constructor() {
    this.generation = new Uint32Array(8192);
    this.length = 0;
    this.unusedIndex = new Uint32Array(8192);
    this.unusedIndexLength = 0;
  }

  createKey() {
    if (this.unusedIndexLength === 0) {
      this.unusedIndex[this.unusedIndexLength] = this.length;
      this.unusedIndexLength++;
      this.length++;
    }
    this.unusedIndexLength--;
    let i = this.unusedIndex[this.unusedIndexLength];
    return {
      i: i,
      g: this.generation[i],
    };
  }

  removeKey(key) {
    this.unusedIndex[this.unusedIndexLength] = key.i;
    this.unusedIndexLength++;
    this.generation[key.i]++;
  }

  hasKey(key) {
    return this.generation[key.i] === key.g;
  }
}

var keyManager = new KeyManager();
var entitiesIdLog = 0;
var entities = [];
var activeEntities = [];
var activeAabb = [];

// structure of arrays
let soaEntity = {
  x: [],
  y: [],
  velocityX: [],
  velocityY: [],
  accelX: [],
  accelY: [],
  stepRemaining: [],
  activationCheck: [],
  activationTimer: [],
};

let bringToLife = (() => {
  let remapTarget = (i, ref, self) => {
    if (i.target == null || (!i.main && !i.alt)) return undefined;
    return {
      x: i.target.x + ref.x - self.x,
      y: i.target.y + ref.y - self.y,
    };
  };
  let passer = (a, b, acceptsFromTop) => {
    return (index) => {
      if (
        a != null &&
        a[index] != null &&
        (b[index] == null || acceptsFromTop)
      ) {
        b[index] = a[index];
      }
    };
  };
  return (my) => {
    // Size
    if (my.SIZE - my.coreSize) my.coreSize += (my.SIZE - my.coreSize) / 100;
    // Think
    let faucet =
      my.settings.independent || my.source == null || my.source === my
        ? {}
        : my.source.control;
    let b = {
      target: remapTarget(faucet, my.source, my),
      goal: undefined,
      fire: faucet.fire,
      main: faucet.main,
      alt: faucet.alt,
      power: undefined,
    };
    // Seek attention
    if (my.settings.attentionCraver && !faucet.main && my.range) {
      my.range -= 1;
    }
    // Invisibility
    // Invisibility
    if (my.invisible[1] && !my.invuln) {
      my.alpha = Math.max(0, my.alpha - my.invisible[1]);
      if (
        !(
          my.velocity.x * my.velocity.x + my.velocity.y * my.velocity.y <
          0.15 * 0.15
        ) ||
        my.damageReceived
      )
        my.alpha = Math.min(1, my.alpha + my.invisible[0]);
    }
    // So we start with my master's thoughts and then we filter them down through our control stack
    my.controllers.forEach((AI) => {
      let a = AI.think(b);
      let passValue = passer(a, b, AI.acceptsFromTop);
      passValue("target");
      passValue("goal");
      passValue("fire");
      passValue("main");
      passValue("alt");
      passValue("power");
    });
    my.control.target = b.target == null ? my.control.target : b.target;
    my.control.goal = b.goal;
    my.control.fire = b.fire;
    my.control.main = b.main;
    my.control.alt = b.alt;
    my.control.power = b.power == null ? 1 : b.power;
    // React
    my.move();
    my.face();
    // Handle guns and turrets if we've got them
    my.guns.forEach((gun) => gun.live());
    my.turrets.forEach((turret) => turret.life());
    if (my.skill.maintain()) my.refreshBodyAttributes();
  };
})();

class HealthType {
  constructor(health, type, resist = 0) {
    this.max = health;
    this.amount = health;
    this.type = type;
    this.resist = resist;
    this.regen = 0;
  }

  set(health, regen = 0) {
    this.amount = this.max ? (this.amount / this.max) * health : health;
    this.max = health;
    this.regen = regen;
  }

  display() {
    return this.max > 0 ? this.amount / this.max : -1;
  }

  getDamage(amount, capped = true) {
    switch (this.type) {
      case "dynamic":
        return capped
          ? Math.min(amount * this.permeability, this.amount)
          : amount * this.permeability;
      case "static":
        return capped ? Math.min(amount, this.amount) : amount;
    }
  }

  regenerate(boost = false) {
    // if (this.regen <= 0||this.damageRecieved > 0) return;
    boost /= 2;
    let cons = 5;
    switch (this.type) {
      case "static":
        if (this.amount >= this.max || !this.amount) break;
        this.amount += cons * (this.max / 10 / 60 / 2.5 + boost);
        break;
      case "dynamic":
        let r = util.clamp(this.amount / this.max, 0, 1);
        if (!r) {
          this.amount = 0.0001;
        }
        if (r === 1) {
          this.amount = this.max;
        } else {
          this.amount +=
            cons *
            ((this.regen *
              Math.exp(-50 * Math.pow(Math.sqrt(0.5 * r) - 0.4, 2))) /
              3 +
              (r * this.max) / 10 / 15 +
              boost);
        }
        break;
    }
    if (this.amount < this.max)
      this.amount = util.clamp(this.amount, 0, this.max);
  }
  get permeability() {
    switch (this.type) {
      case "static":
        return 1;
      case "dynamic":
        return this.max ? util.clamp(this.amount / this.max, 0, 1) : 0;
    }
  }

  get ratio() {
    return this.max
      ? util.clamp(1 - Math.pow(this.amount / this.max - 1, 4), 0, 1)
      : 0;
  }
}

class Entity {
  constructor(position, master = this) {
    this.killCount = {
      solo: 0,
      assists: 0,
      bosses: 0,
      polygons: 0,
      killers: [],
    };
    this.creationTime = new Date().getTime();
    this.key = keyManager.createKey();
    // Inheritance
    this.extraMinions = 0;
    if (c.MODE === "theDistance") this.laps = 0;
    this.master = master;
    this.source = this;
    this.parent = this;
    this.control = {
      target: new Vector(0, 0),
      goal: new Vector(0, 0),
      main: false,
      alt: false,
      fire: false,
      power: 0,
    };
    this.activation = (() => {
      soaEntity.activationCheck[this.key.i] = true;
      soaEntity.activationTimer[this.key.i] = ran.irandom(15);
      return {
        check: () => {
          return soaEntity.activationCheck[this.key.i];
        },
      };
    })();
    this.autoOverride = false;
    this.controllers = [];
    this.blend = {
      color: "#FFFFFF",
      amount: 0,
    };
    // Objects
    this.skill = new Skill();
    this.health = new HealthType(1, "static", 0);
    this.shield = new HealthType(0, "dynamic");
    this.guns = [];
    this.turrets = [];
    this.upgrades = [];
    this.settings = {};
    this.aiSettings = {};
    this.children = [];
    this.excludedTargets = [];
    this.possiblyChildren = new Set();
    // Define it
    this.SIZE = 1;
    this.define(Class.genericEntity);
    // Initalize physics and collision
    this.maxSpeed = 0;
    this.facing = 0;
    this.vfacing = 0;
    this.range = 0;
    this.damageRecieved = 0;
    this.stepRemaining = 1;

    this.x = position.x;
    this.y = position.y;

    this.velocity = new Vector(0, 0);
    this.accel = new Vector(0, 0);
    this.damp = 0.05;
    this.collisionArray = [];

    if (this.invulnerable !== true) {
      this.invuln = false;
    }
    this.alpha = 1;
    this.invisible = [0, 0];
    // Get a new unique id
    this.id = entitiesIdLog++;
    this.team = this.id;
    this.team = master.team;
    entities[this.key.i] = this;
    views.forEach((v) => v.add(this));
  }

  get master() {
    return this.MASTER;
  }
  set master(e) {
    if (
      this.master &&
      this.master.possiblyChildren &&
      this.source !== this.master &&
      this.parent !== this.master
    ) {
      this.master.possiblyChildren.delete(this);
    }
    if (e && e.possiblyChildren) {
      e.possiblyChildren.add(this);
    }
    this.MASTER = e;
  }

  get source() {
    return this.SOURCE;
  }
  set source(e) {
    if (
      this.source &&
      this.source.possiblyChildren &&
      this.master !== this.source &&
      this.parent !== this.source
    ) {
      this.source.possiblyChildren.delete(this);
    }
    if (e && e.possiblyChildren) {
      e.possiblyChildren.add(this);
    }
    this.SOURCE = e;
  }

  get parent() {
    return this.PARENT;
  }
  set parent(e) {
    if (
      this.parent &&
      this.parent.possiblyChildren &&
      this.master !== this.parent &&
      this.source !== this.parent
    ) {
      this.parent.possiblyChildren.delete(this);
    }
    if (e && e.possiblyChildren) {
      e.possiblyChildren.add(this);
    }
    this.PARENT = e;
  }

  get x() {
    return soaEntity.x[this.key.i];
  }
  set x(v) {
    soaEntity.x[this.key.i] = v;
  }
  get y() {
    return soaEntity.y[this.key.i];
  }
  set y(v) {
    soaEntity.y[this.key.i] = v;
  }

  get velocity() {
    return this.VELOCITY;
  }
  set velocity(vec) {
    if (!this.VELOCITY) this.VELOCITY = new Velocity(this.key.i, 0, 0);
    this.VELOCITY.x = vec.x;
    this.VELOCITY.y = vec.y;
  }

  get accel() {
    return this.ACCEL;
  }
  set accel(vec) {
    if (!this.ACCEL) this.ACCEL = new Acceleration(this.key.i, 0, 0);
    this.ACCEL.x = vec.x;
    this.ACCEL.y = vec.y;
  }

  get stepRemaining() {
    return soaEntity.stepRemaining[this.key.i];
  }
  set stepRemaining(v) {
    soaEntity.stepRemaining[this.key.i] = v;
  }

  life() {
    bringToLife(this);
  }

  addController(newIO) {
    if (Array.isArray(newIO)) {
      this.controllers = newIO.concat(this.controllers);
    } else {
      this.controllers.unshift(newIO);
    }
  }

  define(set) {
    if (set) {
      if (set.PARENT != null) {
        for (let i = 0; i < set.PARENT.length; i++) {
          this.define(set.PARENT[i]);
        }
      }

      if (set.index != null) {
        this.index = set.index;
      }
      if (set.NAME != null) {
        this.name = set.NAME;
      }
      if (set.LABEL != null) {
        this.label = set.LABEL;
      }
      if (set.TYPE != null) {
        this.type = set.TYPE;
      }
      if (set.SPAWN != null) {
        this.spawnType = set.SPAWN;
      }
      if (set.COMMAND_TYPE != null) {
        this.commandType = set.COMMAND_TYPE;
      }
      if (set.CHANGE_SIGHT != null) {
        this.changeSight = set.CHANGE_SIGHT;
      }
      if (set.IS_CREEP != null) {
        this.isCreep = set.IS_CREEP;
      }
      if (set.REPEL != null) {
        this.repel = set.REPEL;
      }
      if (set.COPY_COLLISION != null) {
        this.spooky = set.COPY_COLLISION;
      }
      if (set.COPY_LAYER != null) {
        this.copyLayer = set.COPY_LAYER;
      }
      if (set.MERGE_LIMIT != null) {
        this.mergeLimit = set.MERGE_LIMIT;
      }
      if (set.GROWTH_FACTOR != null) {
        this.growthFactor = set.GROWTH_FACTOR;
      }
      if (set.CUSTOM_ORBIT != null) {
        this.customOrbit = set.CUSTOM_ORBIT;
      }
      if (set.ORBIT_DISTANCE != null) {
        this.orbitDistance = set.ORBIT_DISTANCE;
      }
      if (set.SPIN_RATE != null) {
        this.spinRate = set.SPIN_RATE;
      }
      if (set.IS_SPAWNER != null) {
        this.isSpawner = set.IS_SPAWNER;
      }
      if (set.STRUCTURE != null) {
        this.structure = set.STRUCTURE;
      }
      if (set.SPECIAL_EFFECT != null) {
        this.specialEffect = set.SPECIAL_EFFECT;
      }
      if (set.DEATH_THROES != null) {
        this.deathThroes = set.DEATH_THROES;
      }
      if (set.HEAL_EFFECT != null) {
        this.healEffect = set.HEAL_EFFECT;
      }
      if (set.REPAIR_EFFECT != null) {
        this.repairEffect = set.REPAIR_EFFECT;
      }
      if (set.DISABLE_DAMAGE != null) {
        this.disableDamage = set.DISABLE_DAMAGE;
      }
      if (set.TIER != null) {
        this.tier = set.TIER;
      }
      if (set.PASSIVE_EFFECT != null) {
        this.passiveEffect = set.PASSIVE_EFFECT;
      }

      if (set.SHAPE != null) {
        this.shape = typeof set.SHAPE === "number" ? set.SHAPE : 0;
        this.shapeData = set.SHAPE;
      }
      if (set.COLOR != null) {
        this.color = set.COLOR;
      }
      if (set.CONTROLLERS != null) {
        let toAdd = [];
        set.CONTROLLERS.forEach((ioName) => {
          toAdd.push(eval("new io_" + ioName + "(this)"));
        });
        this.addController(toAdd);
      }
      if (set.MOTION_TYPE != null) {
        this.motionType = set.MOTION_TYPE;
      }
      if (set.FACING_TYPE != null) {
        this.facingType = set.FACING_TYPE;
      }
      if (set.DRAW_HEALTH != null) {
        this.settings.drawHealth = set.DRAW_HEALTH;
      }
      if (set.DRAW_SELF != null) {
        this.settings.drawShape = set.DRAW_SELF;
      }
      if (set.DAMAGE_EFFECTS != null) {
        this.settings.damageEffects = set.DAMAGE_EFFECTS;
      }
      if (set.RATIO_EFFECTS != null) {
        this.settings.ratioEffects = set.RATIO_EFFECTS;
      }
      if (set.MOTION_EFFECTS != null) {
        this.settings.motionEffects = set.MOTION_EFFECTS;
      }
      if (set.ACCEPTS_SCORE != null) {
        this.settings.acceptsScore = set.ACCEPTS_SCORE;
      }
      if (set.GIVE_KILL_MESSAGE != null) {
        this.settings.givesKillMessage = set.GIVE_KILL_MESSAGE;
      }
      if (set.CAN_GO_OUTSIDE_ROOM != null) {
        this.settings.canGoOutsideRoom = set.CAN_GO_OUTSIDE_ROOM;
      }
      if (set.HITS_OWN_TYPE != null) {
        this.settings.hitsOwnType = set.HITS_OWN_TYPE;
      }
      if (set.DIE_AT_LOW_SPEED != null) {
        this.settings.diesAtLowSpeed = set.DIE_AT_LOW_SPEED;
      }
      if (set.DIE_AT_RANGE != null) {
        this.settings.diesAtRange = set.DIE_AT_RANGE;
      }
      if (set.INDEPENDENT != null) {
        this.settings.independent = set.INDEPENDENT;
      }
      if (set.INDEPENDENT != null) {
        this.settings.cantRegen = set.NO_REGEN;
      }
      if (set.PERSISTS_AFTER_DEATH != null) {
        this.settings.persistsAfterDeath = set.PERSISTS_AFTER_DEATH;
      }
      if (set.CLEAR_ON_MASTER_UPGRADE != null) {
        this.settings.clearOnMasterUpgrade = set.CLEAR_ON_MASTER_UPGRADE;
      }
      if (set.HEALTH_WITH_LEVEL != null) {
        this.settings.healthWithLevel = set.HEALTH_WITH_LEVEL;
      }
      if (set.ACCEPTS_SCORE != null) {
        this.settings.acceptsScore = set.ACCEPTS_SCORE;
      }
      if (set.NECRO != null) {
        this.settings.isNecromancer = set.NECRO;
      }
      if (set.AUTO_UPGRADE != null) {
        this.settings.upgrading = set.AUTO_UPGRADE;
      }
      if (set.HAS_NO_RECOIL != null) {
        this.settings.hasNoRecoil = set.HAS_NO_RECOIL;
      }
      if (set.CRAVES_ATTENTION != null) {
        this.settings.attentionCraver = set.CRAVES_ATTENTION;
      }
      if (set.BROADCAST_MESSAGE != null) {
        this.settings.broadcastMessage =
          set.BROADCAST_MESSAGE === "" ? undefined : set.BROADCAST_MESSAGE;
      }
      if (set.BODY_MESSAGE != null) {
        this.settings.sendMessage =
          set.BODY_MESSAGE === "" ? undefined : set.BODY_MESSAGE;
      }

      if (set.DAMAGE_CLASS != null) {
        this.settings.damageClass = set.DAMAGE_CLASS;
      }
      if (set.BUFF_VS_FOOD != null) {
        this.settings.buffVsFood = set.BUFF_VS_FOOD;
      }
      if (set.CAN_BE_ON_LEADERBOARD != null) {
        this.settings.leaderboardable = set.CAN_BE_ON_LEADERBOARD;
      }
      if (set.INTANGIBLE != null) {
        this.intangibility = set.INTANGIBLE;
      }
      if (set.INFECTOR != null) {
        this.infector = set.INFECTOR;
      }
      if (set.PLAGUEBRINGER != null) {
        this.plaguebringer = set.PLAGUEBRINGER;
      }
      if (set.VOID_CREATION != null) {
        this.voidCreation = set.VOID_CREATION;
      }
      if (set.IGNORE_COLLISION != null) {
        this.ignoreCollision = set.IGNORE_COLLISION;
      }
      if (set.TURN_WHILE_IDLE != null) {
        this.turnWhileIdle = set.TURN_WHILE_IDLE;
      }
      if (set.ALLOW_PLATE != null) {
        this.allowPlate = set.ALLOW_PLATE;
      }
      if (set.EGG_RECONSTRUCTION != null) {
        this.eggreconstruction = set.EGG_RECONSTRUCTION;
      }
      if (set.IS_SMASHER != null) {
        this.settings.reloadToAcceleration = set.IS_SMASHER;
        this.isSmasher = set.IS_SMASHER;
      }
      if (set.STAT_NAMES != null) {
        this.settings.skillNames = set.STAT_NAMES;
      }
      if (set.AI != null) {
        this.aiSettings = set.AI;
      }
      if (set.ALPHA != null) {
        this.alpha = set.ALPHA;
      }
      if (set.LAYER != null) {
        this.layer = set.LAYER;
      }
      if (set.SHOW_ON_MAP != null) {
        this.showOnMap = set.SHOW_ON_MAP;
      }
      if (set.FIXED_POSITION != null) {
        this.fixedPosition = set.FIXED_POSITION;
      }
      if (set.IS_BOSS != null) {
        this.isBoss = set.IS_BOSS;
      }
      if (set.IS_PROJECTILE != null) {
        this.isProjectile = set.IS_PROJECTILE;
      }
      if (set.WALL_IMMUNITY != null) {
        this.wallImmunity = set.WALL_IMMUNITY;
      }
      if (set.TARGETABLE != null) {
        this.targetable = set.TARGETABLE;
      }
      if (set.IS_ENEMY != null) {
        this.isEnemy = set.IS_ENEMY;
      }
      if (set.AI_TARGET != null) {
        this.aiTarget = set.AI_TARGET;
      }
      if (set.CONNECTED_DAMAGE != null) {
        this.connectedDamage = set.CONNECTED_DAMAGE;
      }
      if (set.CONNECTED_TRAITS != null) {
        this.connectedTraits = set.CONNECTED_TRAITS;
      }
      if (set.DAMAGE_MULTIPLIER != null) {
        this.damageMultiple = set.DAMAGE_MULTIPLIER;
      }
      if (set.REGEN_TYPE != null) {
        this.regenType = set.REGEN_TYPE;
      }
      if (set.INVISIBLE != null) {
        this.invisible = set.INVISIBLE;
      }
      if (set.DANGER != null) {
        this.dangerValue = set.DANGER;
      }
      if (set.VARIES_IN_SIZE != null) {
        this.settings.variesInSize = set.VARIES_IN_SIZE;
        this.squiggle = this.settings.variesInSize
          ? ran.randomRange(0.8, 1.2)
          : 1;
      }
      if (set.RESET_UPGRADES) {
        this.upgrades = [];
      }
      if (set.UPGRADES_TIER_0 != null) {
        set.UPGRADES_TIER_0.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 0,
            level: 0,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_1 != null) {
        set.UPGRADES_TIER_1.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 1,
            level: c.TIER_1,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_2 != null) {
        set.UPGRADES_TIER_2.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 2,
            level: c.TIER_2,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_3 != null) {
        set.UPGRADES_TIER_3.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 3,
            level: c.TIER_3,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_4 != null) {
        set.UPGRADES_TIER_4.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 4,
            level: c.TIER_4,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_5 != null) {
        set.UPGRADES_TIER_5.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 5,
            level: c.TIER_5,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_6 != null) {
        set.UPGRADES_TIER_6.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 6,
            level: c.TIER_6,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_7 != null) {
        set.UPGRADES_TIER_7.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 7,
            level: c.TIER_7,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_8 != null) {
        set.UPGRADES_TIER_8.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 8,
            level: c.TIER_8,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_9 != null) {
        set.UPGRADES_TIER_9.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 9,
            level: c.TIER_9,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_10 != null) {
        set.UPGRADES_TIER_10.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 10,
            level: c.TIER_10,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_11 != null) {
        set.UPGRADES_TIER_11.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 11,
            level: c.TIER_11,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_12 != null) {
        set.UPGRADES_TIER_12.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 12,
            level: c.TIER_12,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_13 != null) {
        set.UPGRADES_TIER_13.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 13,
            level: c.TIER_13,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_14 != null) {
        set.UPGRADES_TIER_14.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 14,
            level: c.TIER_14,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_15 != null) {
        set.UPGRADES_TIER_15.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 15,
            level: c.TIER_15,
            index: e.index,
          });
        });
      }
      if (set.UPGRADES_TIER_GOD != null) {
        set.UPGRADES_TIER_GOD.forEach((e) => {
          this.upgrades.push({
            class: e,
            tier: 15,
            level: c.TIER_GOD,
            index: e.index,
          });
        });
      }
      if (set.SIZE != null) {
        this.SIZE = set.SIZE * this.squiggle;
        if (this.coreSize == null) {
          this.coreSize = this.SIZE;
        }
      }
      if (set.SKILL != null && set.SKILL != []) {
        if (set.SKILL.length != 10) {
          throw "Inappropiate skill raws.";
        }
        this.skill.set(set.SKILL);
      }
      if (set.LEVEL != null) {
        if (set.LEVEL === -1) {
          this.skill.reset();
        }
        while (
          this.skill.level < c.SKILL_CHEAT_CAP &&
          this.skill.level < set.LEVEL
        ) {
          this.skill.score = this.skill.levelScore;
          this.skill.maintain();
        }
        this.refreshBodyAttributes();
      }
      if (set.SKILL_CAP != null && set.SKILL_CAP != []) {
        if (set.SKILL_CAP.length != 10) {
          throw "Inappropiate skill caps.";
        }
        this.skill.setCaps(set.SKILL_CAP);
      }
      if (set.VALUE != null) {
        this.skill.score = set.VALUE; //Math.max(this.skill.score, set.VALUE * this.squiggle);
      }
      if (set.ALT_ABILITIES != null) {
        this.abilities = set.ALT_ABILITIES;
      }
      if (set.GUNS != null) {
        let newGuns = [];
        set.GUNS.forEach((gundef) => {
          newGuns.push(new Gun(this, gundef));
        });
        this.guns = newGuns;
      }

      if (set.MAX_CHILDREN != null) {
        this.maxChildren = set.MAX_CHILDREN;
      }

      if (set.EXCLUDED_TARGETS != null) {
        this.excludedTargets = set.EXCLUDED_TARGETS;
      }
      if (set.FOOD != null) {
        if (set.FOOD.LEVEL != null) {
          this.foodLevel = set.FOOD.LEVEL;
          this.foodCountup = 0;
        }
      }
      if (set.BODY != null) {
        if (set.BODY.ACCELERATION != null) {
          this.ACCELERATION = set.BODY.ACCELERATION;
        }
        if (set.BODY.SPEED != null) {
          this.SPEED = set.BODY.SPEED;
        }
        if (set.BODY.HEALTH != null) {
          this.HEALTH = set.BODY.HEALTH;
        }
        if (set.BODY.RESIST != null) {
          this.RESIST = set.BODY.RESIST;
        }
        if (set.BODY.SHIELD != null) {
          this.SHIELD = set.BODY.SHIELD;
        }
        if (set.BODY.REGEN != null) {
          this.REGEN = set.BODY.REGEN;
        }
        if (set.BODY.DAMAGE != null) {
          this.DAMAGE = set.BODY.DAMAGE;
        }
        if (set.BODY.PENETRATION != null) {
          this.PENETRATION = set.BODY.PENETRATION;
        }
        if (set.BODY.FOV != null) {
          this.FOV = set.BODY.FOV;
        }
        if (set.BODY.RANGE != null) {
          this.RANGE = set.BODY.RANGE;
        }
        if (set.BODY.SHOCK_ABSORB != null) {
          this.SHOCK_ABSORB = set.BODY.SHOCK_ABSORB;
        }
        if (set.BODY.DENSITY != null) {
          this.DENSITY = set.BODY.DENSITY;
        }
        if (set.BODY.STEALTH != null) {
          this.STEALTH = set.BODY.STEALTH;
        }
        if (set.BODY.PUSHABILITY != null) {
          this.PUSHABILITY = set.BODY.PUSHABILITY;
        }
        if (set.BODY.HETERO != null) {
          this.heteroMultiplier = set.BODY.HETERO;
        }
        this.refreshBodyAttributes();
      }
      if (set.TURRETS != null) {
        let o;
        this.turrets.forEach((o) => o.destroy());
        this.turrets = [];
        set.TURRETS.forEach((def) => {
          o = new Entity(this, this.master);
          (Array.isArray(def.TYPE) ? def.TYPE : [def.TYPE]).forEach((type) =>
            o.define(type)
          );
          o.bindToMaster(def.POSITION, this);
          o.syncsSkills = true;
        });
      }

      if (set.mockup != null) {
        this.mockup = set.mockup;
      }
      //ON Define
      let dude = this.name;
      if (this.name === "") dude = "An unnamed player";
      if (this.specialEffect === "Legend") {
        if (c.serverType === "lore") return;
        switch (this.label) {
          case "Arena Guard":
            this.sendMessage(
              "Your powers have grown from ascension, you have become an Arena Guard Disciple!"
            );
            this.skill.score /= 10;
            if (this.skill.score < 26263) this.skill.score = 26263;
            break;
        }
      }
      if (this.team === -100 || c.MODE === "siege") {
        switch (this.label) {
          case "Mini Bosses":
            this.sendMessage(
              "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform(at the cost of score)!"
            );
            break;
        }
      }
      if (this.team === -1 || c.MODE === "siege") {
        switch (this.label) {
          case "Surfer":
          case "Eagle":
          case "Beekeeper":
          case "Spike":
          case "Collider":
          case "Shotgun":
          case "Decimator":
          case "Twister":
            this.sendMessage(
              "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
            );
            break;
          case "Rebel":
            this.sendMessage("You: I won't take this crap anymore!");
            break;
          case "Destructionist":
            this.sendMessage("You: Time to destroy thy enemies!");
            break;
        }
      }
      if (this.team === -2 || c.MODE === "siege") {
        switch (this.label) {
          case "Necromancer":
          case "Enchanter":
          case "Exorcist":
          case "Infestor":
          case "Hexa-Trapper":
          case "Animator":
          case "Constructor":
          case "Rocketeer":
            this.sendMessage(
              "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
            );
            break;
          case "Necro Tyrant":
            this.sendMessage("You: (This world shall be ours!)");
            break;
          case "Flesh":
            this.sendMessage("You: (The Deathless shall be lost no more!)");
            break;
        }
      }
      if (this.team === -3 || c.MODE === "siege") {
        switch (this.label) {
          case "Engineer":
          case "Interceptor":
          case "Auto-Mech":
          case "Auto-Spawner":
          case "Trilogy of Traps":
          case "Constructionist":
          case "Fragmentor":
          case "Bombarder":
          case "Originator":
          case "Rebounder":
          case "Warzone":
          case "Castle":
          case "Hardshell Spawner":
          case "Skimmer":
          case "Auto-Smasher":
          case "Carrier":
          case "Auto-Cruiser":
          case "Armor Piercer":
          case "Auto-5":
            this.sendMessage(
              "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
            );
            break;
          case "Operator":
            this.sendMessage("You: (Let us see what this tank can do!)");
            break;
          case "Mass Producer":
            this.sendMessage(
              "You: (Oh my god, building stuff will be so much easier!)"
            );
            break;
          case "Mechanist":
            this.sendMessage("You: (So... Many... Missiles...)");
            break;
          case "Conductor":
            this.sendMessage("You: (Havent had fun with this in a while.)");
            break;
        }
      }
      if (this.team === -4 || c.MODE === "siege") {
        switch (this.label) {
          case "Ordnance":
          case "Mortar":
          case "X-Hunter":
          case "Poacher":
          case "Hexanomaly":
          case "Pulsar":
          case "Master":
          case "Overgunner":
            this.sendMessage(
              "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
            );
            break;
          case "Reaper":
            this.sendMessage("You: (Time to corrupt some souls!)");
            break;
          case "Embodiment of Destruction":
            this.sendMessage("You: (Time to harvest some barrels.)");
            break;
        }
      }
    } // else util.log(`ERROR: Something is wrong this entity, check it out: ` + this.define());
  }
  refreshBodyAttributes() {
    let speedReduce = Math.pow(this.size / (this.coreSize || this.SIZE), 1);

    this.acceleration = (c.runSpeed * this.ACCELERATION) / speedReduce;
    if (this.settings.reloadToAcceleration) this.acceleration *= this.skill.acl;

    this.topSpeed = (c.runSpeed * this.SPEED * this.skill.mob) / speedReduce;
    if (this.settings.reloadToAcceleration)
      this.topSpeed /= Math.sqrt(this.skill.acl);

    this.health.set(
      (((this.settings.healthWithLevel ? 2 * this.skill.growthCap : 0) +
        this.HEALTH) *
        this.skill.hlt) /
        2
    );

    this.health.resist = 1 - 1 / Math.max(1, this.RESIST + this.skill.brst);

    this.shield.set(
      ((this.settings.healthWithLevel ? 0.6 * this.skill.growthCap : 0) +
        this.SHIELD) *
        this.skill.shi,
      Math.max(
        0,
        (((this.settings.healthWithLevel ? 0.006 * this.skill.growthCap : 0) +
          1) *
          this.REGEN *
          this.skill.rgn) /
          1.5
      )
    );

    this.damage = this.DAMAGE * this.skill.atk;

    this.penetration =
      this.PENETRATION + 1.5 * (this.skill.brst + 0.8 * (this.skill.atk - 1));

    if (!this.settings.dieAtRange || !this.range) {
      this.range = this.RANGE;
    }

    this.fov =
      this.FOV *
      250 *
      Math.sqrt(this.size) *
      (1 + 0.003 * this.skill.growthCap);
    if (c.MODE === "theDistance") this.fov *= 1.35;
    this.density = (1 + 0.08 * this.skill.growthCap) * this.DENSITY;

    this.stealth = this.STEALTH;

    this.pushability = this.PUSHABILITY;
  }

  bindToMaster(position, bond) {
    this.bond = bond;
    this.source = bond;
    this.bond.turrets.push(this);
    this.skill = this.bond.skill;
    this.label = this.bond.label + " " + this.label;
    this.settings.drawShape = false;
    // Get my position.
    this.bound = {};
    this.bound.size = position[0] / 20;
    let _off = new Vector(position[1], position[2]);
    this.bound.angle = (position[3] * Math.PI) / 180;
    this.bound.direction = _off.direction;
    this.bound.offset = _off.length / 10;
    this.bound.arc = (position[4] * Math.PI) / 180;
    // Figure out how we'll be drawn.
    this.bound.layer = position[5];
    // Initalize.
    this.facing = this.bond.facing + this.bound.angle;
    this.facingType = "bound";
    this.motionType = "bound";
    this.move();
  }

  valid() {
    return keyManager.hasKey(this.key);
  }

  get size() {
    if (this.bond == null) {
      let trueSize;
      if (this.isWall || this.isGate) this.skill.growthCap = 0;
      //if (this.isDominator) this.skill.growthCap = 45;
      trueSize = (this.coreSize || this.SIZE) * (1 + this.skill.growthCap / 45);

      return trueSize;
    }
    return this.bond.size * this.bound.size;
  }

  get mass() {
    return this.density * (this.size * this.size + 1);
  }

  get realSize() {
    return (
      this.size *
      (Math.abs(this.shape) > lazyRealSizes.length
        ? 1
        : lazyRealSizes[Math.abs(this.shape)])
    );
  }
  get m_x() {
    return (this.velocity.x + this.accel.x) / roomSpeed;
  }

  get m_y() {
    return (this.velocity.y + this.accel.y) / roomSpeed;
  }

  camera(tur = false) {
    return {
      type:
        0 +
        tur * 0x01 +
        this.settings.drawHealth * 0x02 +
        (this.type === "tank") * 0x04 +
        this.invuln * 0x08,
      id: this.id,
      index: this.index,
      x: this.x,
      y: this.y,
      vx: this.velocity.x,
      vy: this.velocity.y,
      size: this.size,
      rsize: this.realSize,
      status: 1,
      health: this.health.display(),
      shield: this.shield.display(),
      alpha: this.alpha,
      facing: this.facing,
      vfacing: this.vfacing,
      twiggle:
        this.facingType === "autospin" ||
        (this.facingType === "locksFacing" && this.control.alt),
      layer: this.layer,
      /*/   this.bond != null
          ? this.bound.layer
          : this.type === "wall" || this.type === "squareWall"
          ? 11
          : this.type === "food"
          ? 10
          : this.type === "tank"
          ? 5
          : this.type === "crasher"
          ? 1
          : this.type === "ariser"
          ? 1
          : this.type === "shooter"
          ? 1
          : this.type === "protector"
          ? 1
          : this.type === "thrasher"
          ? 1
          : 0,/*/
      color: this.color,
      name: this.name,
      score: this.skill.score,
      guns: this.guns.map((gun) => gun.getLastShot()),
      turrets: this.turrets.map((turret) => turret.camera(true)),
    };
  }
  takePhoto() {
    return {
      x: this.x * 16,
      y: this.y * 16,
      facing: this.facing / (Math.PI / 256),
      type:
        0 +
        (this.facingType === "autospin" ||
          (this.facingType === "locksFacing" && this.control.alt)) *
          0x03 +
        this.settings.drawHealth * 0x04 +
        this.invuln * 0x08,
      health: Math.ceil(255 * this.health.display()),
      shield: Math.round(255 * this.shield.display()),
      alpha: Math.round(255 * this.alpha),
      size: this.size * 16,
      score: this.skill.score,
      name: this.allowPlate ? this.name : "",
      index: this.index,
      color: this.color,
      layer: this.layer,
      /*/   this.bond != null
          ? this.bound.layer
          : this.type === "wall" || this.type === "squareWall"
          ? 11
          : this.type === "food"
          ? 10
          : this.type === "tank"
          ? 5
          : this.type === "crasher"
          ? 1
          : this.type === "ariser"
          ? 1
          : this.type === "shooter"
          ? 1
          : this.type === "protector"
          ? 1
          : this.type === "thrasher"
          ? 1
          : 0,/*/
      guns: this.guns.map((gun) => gun.getLastShot()),
      turrets: this.turrets.map((turret) => turret.takePhoto()),
      masterId: this.master.id,
    };
  }

  skillUp(stat) {
    let suc = this.skill.upgrade(stat);
    if (suc) {
      this.refreshBodyAttributes();
      this.guns.forEach(function (gun) {
        gun.syncChildren();
      });
    }
    return suc;
  }

  upgrade(number) {
    if (
      number < this.upgrades.length &&
      this.skill.level >= this.upgrades[number].level
    ) {
      let saveMe = this.upgrades[number].class;
      this.upgrades = [];
      this.define(saveMe);
      this.sendMessage("You have upgraded to " + this.label + ".");
      /*  if (this.team === -1 || c.MODE === "siege") {
        if (this.label === "Spike") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
        if (this.label === "Eagle") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
        if (this.label === "Surfer") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
        if (this.label === "Beekeeper") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
      }
      if (this.team === -2 || c.MODE === "siege") {
        if (this.label === "Necromancer") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
        if (this.label === "Infestor") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
        if (this.label === "Enchanter") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
        if (this.label === "Exorcist") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
      }
      if (this.team === -3 || c.MODE === "siege") {
        if (this.label === "Auto-Spawner") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
        if (this.label === "Interceptor") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
        if (this.label === "Engineer") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
        if (this.label === "Auto-Mech") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
      }
      if (this.team === -4 || c.MODE === "siege") {
        if (this.label === "X-Hunter") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
        if (this.label === "Ordnance") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
        if (this.label === "Poacher") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
        if (this.label === "Mortar") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        }
      }
      if (this.team === -100 || c.MODE === "siege" && this.label === "Master") {
          this.sendMessage(
            "When 1 Million score is achieved, you may use the '~' button(or ??? button) to transform!"
          );
        
      }*/
      //if (this.isDeveloper) {}
      if (this.label === "Score Settings") {
        this.sendMessage(
          "Left click for scores giving bullets, or right click to use drain score bullets."
        );
      }
      if (this.label === "Heal Settings") {
        this.sendMessage("These bullets heal anything.");
      }
      if (this.label === "Spawn Settings") {
        this.sendMessage(
          "These bullets will disable invulnerability and god mode."
        );
      }
      if (this.label === "Teleport Settings") {
        this.sendMessage("These bullets will fling things across the map.");
      }
      if (this.label === "Testbed Settings") {
        this.sendMessage("These bullets will give a player testbed.");
      }
      if (this.label === "Color Settings") {
        this.sendMessage("These bullets paint stuff with your color.");
      }
      if (this.label === "Team Settings") {
        this.sendMessage(
          "Left click for player-teaming bullets, or right click to use any-team bullets."
        );
      }
      if (this.label === "Falcon") {
        this.sendMessage("Right Click to use alt-fire.");
      }
      if (this.label === "Eagle") {
        this.sendMessage("Right Click to use alt-fire.");
      }
      if (this.label === "Phoenix") {
        this.sendMessage("Right Click to use alt-fire.");
      }
      if (this.label === "Banger") {
        this.sendMessage("Left Click to create an explosion.");
      }
      if (this.label === "Healer") {
        this.sendMessage("These tanks can heal ally tanks and bosses.");
      }
      if (this.label === "Mechanic") {
        this.sendMessage(
          "This tank can heal ally traps, drones, fortress walls and gates."
        );
      }
      if (this.label === "Bouncer") {
        this.sendMessage("Left Click to use your leap.");
      }
      if (this.label === "Spectre") {
        this.sendMessage(
          "Stand Still to go invisible, Collision Does not effect your movement."
        );
      }
      if (this.label === "Poltergeist") {
        this.sendMessage(
          "Stand Still to go invisible, Collision Does not effect your movement."
        );
      }
      if (this.label === "Manager") {
        this.sendMessage("Stand Still to go invisible.");
      }
      if (this.label === "Stalker") {
        this.sendMessage("Stand Still to go invisible.");
      }
      if (this.label === "Landmine") {
        this.sendMessage("Stand Still to go invisible.");
      }
      if (this.label === "Lurker") {
        this.sendMessage("Stand Still to go invisible.");
      }
      if (this.label === "Shadow Shaper") {
        this.sendMessage("Stand Still to go invisible.");
      }
      if (this.label === "Experimenter") {
        this.sendMessage(
          "Right Click to use alt-fire. Left click to aim the turrets and F(ACTION) to destroy your turrets."
        );
      }
      if (this.label === "Scientist") {
        this.sendMessage(
          "Right Click to use alt-fire. Left click to aim the turrets and F(ACTION) to destroy your turrets."
        );
      }
      if (this.label === "Physicist") {
        this.sendMessage(
          "Right Click to use alt-fire. Left click to aim the turrets and F(ACTION) to destroy your turrets."
        );
      }
      if (this.label === "Inventor") {
        this.sendMessage(
          "Right Click to use alt-fire. Left click to aim the turrets and F(ACTION) to destroy your turrets."
        );
      }
      if (this.label === "Researcher") {
        this.sendMessage(
          "Right Click to use alt-fire. Left click to aim the turrets and F(ACTION) to destroy your turrets."
        );
      }
      if (this.label === "Spectator") {
        this.ip = null;

        this.sendMessage(
          "Press F(ACTION) to increase your Field of View or right click to reduce it. You can also press o to self destruct."
        );
        // this.isPlayer = false;
      }
      if (this.label === "Collider") {
        this.sendMessage("Use Autospin to fix your Positioning.");
      }
      /*/   if (this.commandType === "maperHeight") {
        this.sendMessage(
          "Use F(ACTION) to increase map width or o to decrease map width."
        );
      }/*/
      //ON Upgrade
      this.coreSize = this.SIZE;
      if (this.isPlayer) {
        let dude = this.name;
        if (this.name === "") dude = "An unnamed player";
        util.log(dude + " has become a " + this.label + ".");
      }
      let ID = this.id;
      entities.forEach((instance) => {
        if (
          instance.valid() &&
          instance.settings.clearOnMasterUpgrade &&
          instance.master.id === ID
        ) {
          instance.kill();
        }
      });
      this.skill.update();
      this.refreshBodyAttributes();
    }
  }

  damageMultiplier() {
    switch (this.type) {
      case "swarm":
        return 0.25 + 1.5 * util.clamp(this.range / (this.RANGE + 1), 0, 1);
      default:
        return 1;
    }
  }

  move() {
    if (this.control.goal !== undefined) {
      let g = {
          x: this.control.goal.x - this.x,
          y: this.control.goal.y - this.y,
        },
        gactive = g.x !== 0 || g.y !== 0,
        engine = {
          x: 0,
          y: 0,
        },
        a = this.acceleration / roomSpeed;
      switch (this.motionType) {
        case "glide":
          this.maxSpeed = this.topSpeed;
          this.damp = 0.05;

          break;
        case "accel":
          this.maxSpeed = this.topSpeed;
          this.damp = -0.05;
          break;
          case "grow":
          this.SIZE += 2;
          this.maxSpeed = this.topSpeed;
          this.damp = 5;
          break;
        case "growth":
          this.SIZE += 20;
          this.maxSpeed = this.topSpeed;
          this.damp = 5;
          break;
        case "motor":
          this.maxSpeed = 0;
          if (this.topSpeed) {
            this.damp = a / this.topSpeed;
          }
          if (gactive) {
            let len = Math.sqrt(g.x * g.x + g.y * g.y);
            engine = {
              x: (a * g.x) / len,
              y: (a * g.y) / len,
            };
          }
          break;
        case "swarm":
          this.maxSpeed = this.topSpeed;
          let l = util.getDistance({ x: 0, y: 0 }, g) + 1;
          if (gactive && l > this.size) {
            let desiredxspeed = (this.topSpeed * g.x) / l,
              desiredyspeed = (this.topSpeed * g.y) / l,
              turning = Math.sqrt(
                (this.topSpeed * Math.max(1, this.range) + 1) / a
              );
            engine = {
              x: (desiredxspeed - this.velocity.x) / Math.max(5, turning),
              y: (desiredyspeed - this.velocity.y) / Math.max(5, turning),
            };
          } else {
            if (this.velocity.length < this.topSpeed) {
              engine = {
                x: (this.velocity.x * a) / 20,
                y: (this.velocity.y * a) / 20,
              };
            }
          }
          break;
        case "chase":
          if (gactive) {
            let l = util.getDistance({ x: 0, y: 0 }, g);
            if (l > this.size * 2) {
              this.maxSpeed = this.topSpeed;
              let desiredxspeed = (this.topSpeed * g.x) / l,
                desiredyspeed = (this.topSpeed * g.y) / l;
              engine = {
                x: (desiredxspeed - this.velocity.x) * a,
                y: (desiredyspeed - this.velocity.y) * a,
              };
            } else {
              this.maxSpeed = 0;
            }
          } else {
            this.maxSpeed = 0;
          }
          break;
        case "drift":
          this.maxSpeed = 0;
          engine = {
            x: g.x * a,
            y: g.y * a,
          };
          break;
        case "bound":
          let bound = this.bound,
            ref = this.bond;
          this.x =
            ref.x +
            ref.size *
              bound.offset *
              Math.cos(bound.direction + bound.angle + ref.facing);
          this.y =
            ref.y +
            ref.size *
              bound.offset *
              Math.sin(bound.direction + bound.angle + ref.facing);
          this.bond.velocity.x += bound.size * this.accel.x;
          this.bond.velocity.y += bound.size * this.accel.y;
          this.firingArc = [ref.facing + bound.angle, bound.arc / 2];
          nullVector(this.accel);
          this.blend = ref.blend;
          break;
      }
      this.accel.x += engine.x * this.control.power;
      this.accel.y += engine.y * this.control.power;
      //ON Move
    }
  }
  face() {
    let t = this.control.target,
      tactive = t.x !== 0 || t.y !== 0,
      oldFacing = this.facing;
    switch (this.facingType) {
      case "autospin":
      case "spin":
        this.facing += 0.02 / roomSpeed;
        if (this.spinRate <= 0 || this.spinRate > 0) {
          this.facing += this.spinRate / roomSpeed;
        }
        break;
      case "random":
        this.facing = Math.random() * 10;
        break;
      case "turnWithSpeed":
        this.facing += ((this.velocity.length / 90) * Math.PI) / roomSpeed;
        break;
      case "withMotion":
        this.facing = this.velocity.direction;
        break;
      case "smoothWithMotion":
      case "looseWithMotion":
        this.facing += util.loopSmooth(
          this.facing,
          this.velocity.direction,
          4 / roomSpeed
        );
        break;
      case "reverseWithMotion":
        this.facing += util.loopSmooth(
          this.facing,
          this.velocity.direction,
          -4 / roomSpeed
        );
        break;
      case "withTarget":
      case "toTarget":
        this.facing = Math.atan2(t.y, t.x);

        break;
      case "locksFacing":
        if (!this.control.alt) this.facing = Math.atan2(t.y, t.x);
        break;
      case "looseWithTarget":
      case "looseToTarget":
      case "smoothToTarget":
        this.facing += util.loopSmooth(
          this.facing,
          Math.atan2(t.y, t.x),
          4 / roomSpeed
        );
        break;
      case "bound":
        let givenangle;
        if (this.control.main) {
          givenangle = Math.atan2(t.y, t.x);
          let diff = util.angleDifference(givenangle, this.firingArc[0]);
          if (Math.abs(diff) >= this.firingArc[1]) {
            givenangle = this.firingArc[0]; // - util.clamp(Math.sign(diff), -this.firingArc[1], this.firingArc[1]);
          }
        } else {
          givenangle = this.firingArc[0];
        }
        this.facing += util.loopSmooth(this.facing, givenangle, 4 / roomSpeed);
        break;
    }
    // Loop
    const TAU = 2 * Math.PI;
    this.facing = ((this.facing % TAU) + TAU) % TAU;
    this.vfacing = util.angleDifference(oldFacing, this.facing) * roomSpeed;
    if (this.facingType >= 0) {
      this.facing = this.facingType;
    }
  }

  takeSelfie() {
    this.flattenedPhoto = null;
    this.photo = this.settings.drawShape
      ? this.camera()
      : (this.photo = undefined);
  }
  physics() {
    //if (!isNaN(this.velocity.x) || !isNaN(this.accel.x) || !isNaN(this.velocity.y) || !isNaN(this.accel.y)) {

    if (this.accel.x == null || this.velocity.x == null) {
      util.error("Void Error!");
      util.error(this.collisionArray);
      util.error(this.label);
      util.error(this);
      nullVector(this.accel);
      nullVector(this.velocity);
    }
    // Apply acceleration
    this.velocity.x += this.accel.x;
    this.velocity.y += this.accel.y;

    // Reset acceleration
    nullVector(this.accel);
    // Apply motion
    this.stepRemaining = 1;
    this.x += (this.stepRemaining * this.velocity.x) / roomSpeed;
    this.y += (this.stepRemaining * this.velocity.y) / roomSpeed;
  }

  friction() {
    var motion = this.velocity.length,
      excess = motion - this.maxSpeed;
    if (excess > 0 && this.damp) {
      var k = this.damp / roomSpeed,
        drag = excess / (k + 1),
        finalvelocity = this.maxSpeed + drag;
      this.velocity.x = (finalvelocity * this.velocity.x) / motion;
      this.velocity.y = (finalvelocity * this.velocity.y) / motion;
    }
  }
  confinementToTheseEarthlyShackles() {
    if (this.bond) {
      return 0;
    }
    if (this.x == null || this.y == null) {
      util.error("Void Error!");
      util.error(this.collisionArray);
      util.error(this.label);
      util.error(this);
      nullVector(this.accel);
      nullVector(this.velocity);
      return 0;
    }
    let loc = { x: this.x, y: this.y };
    if (!this.settings.canGoOutsideRoom) {
      this.accel.x -=
        ((Math.min(this.x + this.realSize + 50, 0) * c.ROOM_BOUND_FORCE) /
          roomSpeed) *
        2;
      this.accel.x -=
        ((Math.max(this.x - this.realSize - room.width - 50, 0) *
          c.ROOM_BOUND_FORCE) /
          roomSpeed) *
        2;
      this.accel.y -=
        ((Math.min(this.y + this.realSize + 50, 0) * c.ROOM_BOUND_FORCE) /
          roomSpeed) *
        2;
      this.accel.y -=
        ((Math.max(this.y - this.realSize - room.height - 50, 0) *
          c.ROOM_BOUND_FORCE) /
          roomSpeed) *
        2;
    }
    if (room.isIn("edge", this) || !room.isInRoom(this)) {
      var QedgeNums = [
        Math.floor(this.x / (room.width / (room.xgrid * 2))),
        Math.floor(this.y / (room.height / (room.ygrid * 2))),
      ];
      if (!this.settings.canGoOutsideRoom) {
        function typeRad(o) {
          var center = {
              x: ((edgeNums[0] + 1 / 2) * room.width) / room.xgrid,
              y: ((edgeNums[1] + 1 / 2) * room.height) / room.ygrid,
            },
            Di = util.getDistance(center, o),
            Le = Math.min(
              room.width / (2 * room.xgrid),
              room.height / (2 * room.ygrid)
            );
          if (Di < Le) {
            o.accel.x +=
              Math.cos(util.getDirection(center, o)) *
              Math.abs(Le - Di) *
              (c.ROOM_BOUND_FORCE / roomSpeed);
            o.accel.y +=
              Math.sin(util.getDirection(center, o)) *
              Math.abs(Le - Di) *
              (c.ROOM_BOUND_FORCE / roomSpeed);
          }
          return -1;
        }
        function typeStr(o, agl) {
          switch (agl) {
            case "R":
              {
                o.accel.x +=
                  ((((Math.floor(QedgeNums[0] / 2) + 1) * room.width) /
                    room.xgrid -
                    o.x) *
                    c.ROOM_BOUND_FORCE) /
                  roomSpeed;
              }
              break;
            case "U":
              {
                o.accel.y +=
                  ((((Math.floor(QedgeNums[1] / 2) + 1) * room.height) /
                    room.ygrid -
                    o.y) *
                    c.ROOM_BOUND_FORCE) /
                  roomSpeed;
              }
              break;
            case "L":
              {
                o.accel.x +=
                  (((Math.floor(QedgeNums[0] / 2) * room.width) / room.xgrid -
                    o.x) *
                    c.ROOM_BOUND_FORCE) /
                  roomSpeed;
              }
              break;
            case "D":
              {
                o.accel.y +=
                  (((Math.floor(QedgeNums[1] / 2) * room.height) / room.ygrid -
                    o.y) *
                    c.ROOM_BOUND_FORCE) /
                  roomSpeed;
              }
              break;
          }

          return 1;
        }
        if (room.isInRoom(this)) {
          var edgeNums = [
              Math.floor(QedgeNums[0] / 2),
              Math.floor(QedgeNums[1] / 2),
            ],
            edgeType = {
              up:
                edgeNums[1] === room.ygrid - 1 ||
                room.setup[edgeNums[1] + 1][edgeNums[0]] === "edge",
              right:
                edgeNums[1] === room.xgrid - 1 ||
                room.setup[edgeNums[1]][edgeNums[0] + 1] === "edge",
              down:
                edgeNums[1] === 0 ||
                room.setup[edgeNums[1] - 1][edgeNums[0]] === "edge",
              left:
                edgeNums[0] === 0 ||
                room.setup[edgeNums[1]][edgeNums[0] - 1] === "edge",
            };
          switch (
            (() => {
              if (QedgeNums[0] % 2 === 1 && QedgeNums[1] % 2 === 1) return 1;
              else if (QedgeNums[0] % 2 === 0 && QedgeNums[1] % 2 === 1)
                return 2;
              else if (QedgeNums[0] % 2 === 0 && QedgeNums[1] % 2 === 0)
                return 3;
              else if (QedgeNums[0] % 2 === 1 && QedgeNums[1] % 2 === 0)
                return 4;
            })()
          ) {
            case 1:
              {
                if (!edgeType.up && !edgeType.right) typeRad(this);
                else {
                  if (edgeType.up) typeStr(this, "R");
                  if (edgeType.right) typeStr(this, "U");
                }
              }
              break;
            case 2:
              {
                if (!edgeType.up && !edgeType.left) typeRad(this);
                else {
                  if (edgeType.up) typeStr(this, "L");
                  if (edgeType.left) typeStr(this, "U");
                }
              }
              break;
            case 3:
              {
                if (!edgeType.down && !edgeType.left) typeRad(this);
                else {
                  if (edgeType.down) typeStr(this, "L");
                  if (edgeType.left) typeStr(this, "D");
                }
              }
              break;
            case 4:
              {
                if (!edgeType.down && !edgeType.right) typeRad(this);
                else {
                  if (edgeType.down) typeStr(this, "R");
                  if (edgeType.right) typeStr(this, "D");
                }
              }
              break;
          }
        } else {
          var reledge = {
            up:
              this.y > room.height &&
              room.isIn("edge", { x: this.x, y: room.height - 1 }),
            right:
              this.x > room.width &&
              room.isIn("edge", { x: room.width - 1, y: this.y }),
            down: this.y < 0 && room.isIn("edge", { x: this.x, y: 1 }),
            left: this.x < 0 && room.isIn("edge", { x: 1, y: this.y }),
          };
          if (reledge.up || reledge.down) {
            if (QedgeNums[0] % 2 === 0) typeStr(this, "L");
            else typeStr(this, "R");
          }
          if (reledge.right || reledge.left) {
            if (QedgeNums[0] % 2 === 0) typeStr(this, "D");
            else typeStr(this, "U");
          }
        }
      }
    }
    if (!this.chill && Array.isArray(this.connectedTraits)) {
      for (let i = 0; i < this.connectedTraits.length; i++) {
        const trait = this.connectedTraits[i]; // Get the actual property name from the array
        if (this[trait] !== this.master[trait]) {
          if (Number.isInteger(trait)) {
            this[trait] = this.master[trait] * 1;
            if (trait === "SIZE" || trait === "coreSize")
              this.coreSize === this.SIZE;
          } else {
            // Copy the property from master to this
            this[trait] = this.master[trait];
          }
        }
      }
      this.chill = true;
      setTimeout(() => (this.chill = false), 5000);
    }
    if (c.extinction) {
      this.godMode = false;
      this.kill();
    }
    if (this.isWall) {
      if (!this.stopStuff) {
        this.controllers.unshift(new io_nearestDifferentMaster(this));
        this.stopStuff = true;
      }
    }
    if (c.MODE === "theExpanse") {
      if (
        c.bossStage >= 3 &&
        c.SPAWN_VOIDLORD_ENEMIES &&
        this.type === "thrasher"
      ) {
        this.kill();
        setTimeout(() => {
          c.SPAWN_VOIDLORD_ENEMIES = false;
        }, 1000);
      }
      if (this.label === "Dark Fate") {
        this.damage = 2 + c.playerCount;
        this.skill.dam = c.playerCount / 7.5 + 2;
        this.skill.pen = c.playerCount / 5 + 2.5;
        this.skill.str = c.playerCount / 2.5 + 3;
        this.skill.spd = c.playerCount / 10 + 2;
      }
      if (this.label === "Elder") {
        this.damage = 2 + c.playerCount / 2;
        this.skill.dam = c.playerCount / 10 + 3;
        this.skill.pen = c.playerCount / 6 + 3;
        this.skill.str = c.playerCount / 6 + 3;
        this.skill.spd = c.playerCount / 10 + 2;
        if (
          !room.isIn("bos" + c.bossStage, this) &&
          !room.isIn("zne" + c.bossStage, this)
        ) {
          let loc = room.type("bos" + c.bossStage);
          this.invuln = true;
          this.x = loc.x;
          this.y = loc.y;
          setTimeout(() => {
            this.invuln = false;
          }, 5000);
        }
      }
      if (this.label === "Hive Mind") {
        this.damage = 2 + c.playerCount / 4;
        this.skill.dam = c.playerCount / 5 + 2.5;
        this.skill.pen = c.playerCount / 5 + 3;
        this.skill.str = c.playerCount / 2.5 + 2.5;
        this.skill.spd = c.playerCount / 10 + 2;
        if (
          !room.isIn("bos" + c.bossStage, this) &&
          !room.isIn("zne" + c.bossStage, this)
        ) {
          let loc = room.type("bos" + c.bossStage);
          this.invuln = true;
          this.x = loc.x;
          this.y = loc.y;
          setTimeout(() => {
            this.invuln = false;
          }, 5000);
        }
      }
      if (this.label === "Ancient") {
        this.damage = 2 + c.playerCount / 3;
        this.skill.dam = c.playerCount / 7.5 + 2;
        this.skill.pen = c.playerCount / 5 + 2.5;
        this.skill.str = c.playerCount / 2.5 + 3;
        this.skill.spd = c.playerCount / 10 + 2;
        if (
          !room.isIn("bos" + c.bossStage, this) &&
          !room.isIn("zne" + c.bossStage, this)
        ) {
          let loc = room.type("bos" + c.bossStage);
          this.invuln = true;
          this.x = loc.x;
          this.y = loc.y;
          setTimeout(() => {
            this.invuln = false;
          }, 5000);
        }
      }
    }
    if (this.type === "tank") {
      if (c.MODE === "kingOfHill" && room.isIn("dom" + -this.team, this)) {
        let king = Math.round(this.skill.level) / 10;
        this.skill.score += king;
      }
      let loc = { x: this.x, y: this.y };
      if (room.isIn("domx", loc)) {
        if (this.team !== -100 && !this.zombied && !this.plagued) {
          this.color = 3;
          this.sendMessage(
            "Ranar: Ah yes, come child, destroy the interlopers within my domain, I don't need Valrayvn being distracted."
          );
          this.upgrades = [];
          this.define(Class[c.DomxClass]);
          this.skill.setCaps([9, 9, 9, 9, 9, 9, 9, 9, 9, 9]);
          this.skill.reset();
          this.skill.score = 26263;
          this.skill.set([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

          this.maxChildren = 0;

          this.team = ran.choose([-100]);
          this.intangibility = false;
          this.invisible = [100, 0];
          this.alpha = 100;
          this.specialEffect = "none";
          this.invuln = true;
          this.ignoreCollision = false;
          if (this.isBot) {
            this.invuln = false;
          }
        }
        if (
          this.type === "trap" ||
          this.type === "minion" ||
          this.type === "bullet" ||
          this.type === "swarm" ||
          this.type === "drone"
        ) {
          this.kill();
        }
      }
      if (room.isIn("edge", this) && this.invuln) {
        let tp = room.randomType("norm");

        this.x = tp.x;
        this.y = tp.y;
      }
    }

    if (
      this.master.label === "Defender" &&
      !this.targetable &&
      this.team === -100
    ) {
      this.color = 3;
    }
    if (
      c.unlockClasses &&
      this.isPlayer &&
      !this.trueDev &&
      this.label !== "Spectator"
    ) {
      if (!this.noo) {
        //  util.log("it works");
        this.upgrades = [];
        this.intangibility = false;
        this.invisible = [100, 0];
        this.alpha = 100;
        this.specialEffect = "none";
        this.skill.setCaps([9, 9, 9, 9, 9, 9, 9, 9, 9, 9]);

        switch (c.MODE) {
          case "siege":
            this.define(Class.currentLegendaryClasses);
            break;
          case "theInfestation":
            this.define(Class.infestationLegendaryClasses);
            break;
          case "theDenied":
            this.define(Class.deniedLegendaryClasses);
            break;
        }
        this.skill.points += 15;
        this.ignoreCollision = false;
        this.noo = true;
      }
    }
    /*if (this.skill.points >= 80) {
  
    for (let i = 0; i < this.skill.cap.length; i++) {
        this.skill.cap[i] *= 10;
        if (this.skill.cap[i] > 15) {
            this.skill.cap[i] = 15;
          }
      }
  }*/
    if (c.MODE === "theAwakening") {
      if (
        this.type === "tank" &&
        this.ignoreCollision &&
        this.skill.score < 1000000
      )
        this.ignoreCollision = false;
      if (this.isBoss && this.team === -5) {
        this.damage = c.playerCount + 5;
        this.skill.dam = c.playerCount / 5 + 1;
        this.skill.pen = c.playerCount / 5 + 1.5;
        this.skill.str = c.playerCount / 5 + 1.5;
        // this.skill.spd = c.playerCount / 10 + 2;
        if (
          !room.isIn("nest", this) &&
          !room.isIn(this.area, this) &&
          !room.isIn(this.zone, this) &&
          !room.isIn("gard", this) &&
          !room.isIn("roid", this) &&
          !room.isIn("rock", this)
        ) {
          let loc = room.type(this.area);
          this.invuln = true;
          this.x = loc.x;
          this.y = loc.y;
          setTimeout(() => {
            this.invuln = false;
          }, 5000);
        }
      }
      if (this.master.isBoss && this.team === -100 && this.master !== this)
        this.kill();
    }
    if (c.MODE === "siege") {
      if (!c.waveCount) {
        c.bossAmount = 0;
        entities.forEach((entity) => {
          if (entity.siegeProgress && entity.team === -100 && !entity.isDead())
            c.bossAmount += 1;
        });
        //console.log(c.bossAmount);
        let o = new Entity(room.type("spw0"));
        o.siegeProgress = true;
        o.kill();
        c.waveCount = true;
        setTimeout(() => {
          c.waveCount = false;
          c.waveLoop += 1;
        }, 5000);
      }
      let census = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      room.dominators.forEach((o) => {
        if (o.team === -100) {
          census[0]++;
        } else {
          census[-o.team]++;
        }
      });
      if (census[0] >= c.DOMINATOR_COUNT) {
        if (!c.initiateCountdown) {
          c.initiateCountdown = true;
          siegeCountdown();
          c.RESPAWN_TIMER = Infinity;

          //util.log("GRUH");
        }
      } else {
        c.RESPAWN_TIMER = 5;
        c.countdown = 60000;
        c.initiateCountdown = false;
        c.botSpawn = true;
      }

      if (this.eliteBoss) {
        if (this.health.amount <= this.health.max / 1.5 && this.stage === 0) {
          let o = new Entity(room.randomType("bos0"));
          o.master = this;
          o.invuln = false;
          o.stayTeam = false;
          o.define(Class.sardonyxPower0);
          o.team = -100;
          o.maxChildren = Math.ceil(c.playerCount * 1.5);
          o.SIZE = this.SIZE;
          o.color = 0;
          o.tp = true;
          this.stage += 1;
          this.color = 0;
        }
        if (this.health.amount <= this.health.max / 2 && this.stage === 1) {
          let o = new Entity(room.randomType("bos0"));
          o.master = this;
          o.stayTeam = false;
          o.color = 3;
          o.define(Class.sardonyxPower1);
          o.team = -100;
          o.SIZE = this.SIZE;
          o.invuln = false;
          o.skill.dam = 1 + c.playerCount * 2.5;
          o.tp = true;
          this.stage += 1;
          this.color = 3;
        }
        if (this.health.amount <= this.health.max / 4 && this.stage === 2) {
          let o = new Entity(room.randomType("bos0"));
          o.master = this;
          o.stayTeam = false;
          o.color = 33;
          o.skill.str = 2 + c.playerCount * 2;
          o.skill.spd = 0.5 + c.playerCount / 2;
          o.define(Class.sardonyxPower2);
          o.team = -100;
          o.SIZE = this.SIZE;
          o.invuln = false;
          o.tp = true;
          this.stage += 1;
          this.color = 33;
        }
        if (this.health.amount <= this.health.max / 5 && this.stage === 3) {
          let o = new Entity(room.randomType("bos0"));
          o.master = this;
          o.stayTeam = false;
          o.color = 12;
          o.define(Class.sardonyxPower3);
          o.RANGE += c.playerCount * 150;
          o.team = -100;
          o.SIZE = this.SIZE;
          o.invuln = false;
          o.tp = true;
          o.maxChildren = 1;
          this.stage += 1;
          this.color = 12;
        }
      }

      if (this.tp) {
        this.x = this.master.x;
        this.y = this.master.y;
      }
      if (this.isRanar) {
        if (this.stage === undefined) this.stage = 0;
        if (this.label === "Disciple") {
          if (this.health.amount <= this.health.max / 1.5 && this.stage === 0) {
            for (let i = 0; i < c.ranarDialog; i++) {
              let o = new Entity(room.randomType("spw0"));
              o.master = this;
              o.invuln = false;
              o.stayTeam = false;
              o.define(Class.ranarPower1);
              o.team = -100;
              o.maxChildren = Math.ceil(c.playerCount * 1.5);
              o.SIZE = this.SIZE;
              o.color = 0;
              o.tp = true;
              this.stage += 1;
              this.color = 0;
            }
            if (this.health.amount <= this.health.max / 4 && this.stage === 1) {
              for (let i = 0; i < c.ranarDialog; i++) {
                let o = new Entity(room.randomType("spw0"));
                o.master = this;
                o.stayTeam = false;
                o.color = 3;
                o.define(Class.ranarPower2);
                o.team = -100;
                o.SIZE = this.SIZE;
                o.invuln = false;
                o.skill.dam = 1 + c.playerCount * 2.5;
                o.tp = true;
                this.stage += 1;
                this.color = 3;
              }
            }
          }
        }
        if (this.label === "Ascendant") {
          if (this.health.amount <= this.health.max / 1.5 && this.stage === 0) {
            for (let i = 0; i < c.ranarDialog; i++) {
              let o = new Entity(room.randomType("spw0"));
              o.master = this;
              o.stayTeam = false;
              o.color = 33;
              o.skill.str = 2 + c.playerCount * 2;
              o.skill.spd = 0.5 + c.playerCount / 2;
              o.define(Class.ranarPower4);
              o.team = -100;
              o.SIZE = this.SIZE;
              o.invuln = false;
              o.tp = true;
              this.stage += 1;
              this.color = 33;
            }
          }
          if (this.health.amount <= this.health.max / 4 && this.stage === 1) {
            for (let i = 0; i < c.ranarDialog; i++) {
              let o = new Entity(room.randomType("spw0"));
              o.master = this;
              o.stayTeam = false;
              o.color = 12;
              o.define(Class.ranarPower5);
              o.RANGE += c.playerCount * 150;
              o.team = -100;
              o.SIZE = this.SIZE;
              o.invuln = false;
              o.tp = true;
              o.maxChildren = 1;
              this.stage += 1;
              this.color = 12;
            }
          }
        }
      }
      if (this.tp) {
        this.x = this.master.x;
        this.y = this.master.y;
      }
      if (
        this.skill.score >= 2500000 &&
        !this.gifted &&
        this.isPlayer &&
        !this.trueDev &&
        !this.invuln &&
        this.label !== "Spectator"
      ) {
        if (this.specialEffect !== "Legend") {
          this.sendMessage(
            "You have gained access to the Legendary Class List!"
          );
          this.maxChildren = 0;
          this.intangibility = false;
          this.invisible = [100, 0];
          this.alpha = 100;
          this.upgrades = [];
          this.define(Class.currentLegendaryClasses);
          this.ignoreCollision = false;
        } else {
          this.sendMessage("Your power grows");
          this.SIZE += 5;
          this.skill.points += 5;
          this.resist *= 5;
          //this.heath.amount = this.health.max;
          //this.shield.amount = this.shield.max;
        }
        this.skill.points += 10;
        this.gifted = true;
      }
      if (c.canProgress && c.ranarDialog === undefined) {
        c.bossAmount = 1;
        sockets.broadcast("Wave " + c.bossWave + " has started!");
        c.continueWave = true;
        c.ranarDialog = Math.round(Math.random() * 3);
      }

      if (c.continueWave && c.bossWave > 0 && !c.pingBack) {
        c.bossCounter = c.preparedCounter;
        c.pingBack = true;
        c.continueWave = false;
      }
      //    let countUp = 0;
      //  c.bossCounter = 1;
      if (c.pingBack) {
        if (c.bossWave % 10 === 0 && c.bossWave !== 0 && !c.initiateEpicWave) {
          c.initiateEpicWave = true;
          c.bonus += 3;
          c.disciple = true;
          c.waveType = "epic";
          if (c.bossWave >= 50) {
            c.waveType = "final";
          }
          if (c.bossWave <= 20 || c.bossWave >= 50) c.bossCounter = 0;
          switch (c.waveType) {
            case "epic":
              c.waveRarity = Math.ceil(Math.random() * 6);
              sockets.broadcast(
                "Wave " + c.bossWave + " has started, this is a dangerous wave!"
              );
              switch (c.waveRarity) {
                case 1:
                  if (c.MODE === "siege") {
                    let o = new Entity(room.randomType("spw0"));
                    o.define(Class.CX2);
                    o.siegeProgress = true;
                    o.impervious = true;
                    o.team = -100;
                    setTimeout(() => {
                      o.addController(new io_guard1(o));
                    }, 7500);
                    sockets.broadcast("CX: No more games, its time you die!");
                    c.uniqueBossList.push("cx");
                  }
                  break;
                case 2:
                  if (c.MODE === "siege") {
                    let groupList = Math.ceil(Math.random() * 2);
                    switch (groupList) {
                      case 1:
                        for (let i = 0; i < 8; i++) {
                          let o = new Entity(room.randomType("spw0"));
                          switch (i) {
                            case 0:
                              o.define(Class.excaliber);
                              break;
                            case 1:
                              o.define(Class.possessor);
                              break;
                            case 2:
                              o.define(Class.icecream);
                              break;
                            case 3:
                              o.define(Class.rainOfAcid);
                              break;
                            case 4:
                              o.define(Class.kristaps);
                              break;
                            case 5:
                              o.define(Class.chaser);
                              break;
                            case 6:
                              o.define(Class.annoyingDog);
                              break;
                            case 7:
                              o.define(Class.ranarDiscipleForm);
                              break;
                          }
                          o.siegeProgress = true;
                          o.impervious = true;
                          o.team = -100;
                          setTimeout(() => {
                            o.addController(new io_guard1(o));
                          }, 7500);
                        }
                        sockets.broadcast(
                          "Ranar: OK SINCE YOU CAN'T 1V1 ME, I'LL JUST SUMMON TEAM MATES OF MY OWN!"
                        );
                        c.uniqueBossList.push(
                          "ranar",
                          "excaliber",
                          "chaser",
                          "possessor",
                          "icecream",
                          "oxiniVrochi",
                          "kristaps",
                          "annoyingDog"
                        );
                        break;
                      case 2:
                        for (let i = 0; i < 7; i++) {
                          let o = new Entity(room.randomType("spw0"));
                          switch (i) {
                            case 0:
                              o.define(Class.ranarDiscipleForm);
                              break;
                            case 1:
                              o.define(Class.alexTheDemonical);
                              break;
                            case 2:
                              o.define(Class.pop64);
                              break;
                            case 3:
                              o.define(Class.johnathon);
                              break;
                            case 4:
                              o.define(Class.powernoob);
                              break;
                            case 5:
                              o.define(Class.xxtrianguli);
                              break;
                            case 6:
                              o.define(Class.duodeci);
                              break;
                          }
                          o.siegeProgress = true;
                          o.impervious = true;
                          o.team = -100;
                          setTimeout(() => {
                            o.addController(new io_guard1(o));
                          }, 7500);
                        }
                        sockets.broadcast(
                          "Ranar: OK SINCE YOU CAN'T 1V1 ME, I'LL JUST SUMMON TEAM MATES OF MY OWN!"
                        );
                        c.uniqueBossList.push(
                          "ranar",
                          "alex",
                          "pop64",
                          "johnathon",
                          "powernoob",
                          "xxtrianguli",
                          "duodeci"
                        );
                    }
                  }

                  break;
                case 3:
                  if (c.MODE === "siege") {
                    for (let i = 0; i < 20; i++) {
                      let o = new Entity(room.randomType("spw0"));
                      switch (i) {
                        case 0:
                          o.define(Class.sardonyx);
                          break;
                        case 1:
                          o.define(Class.nulltype);
                          break;
                        /*  case 2:
                      o.define(Class.nulltype);
                      break;*/
                        case 3:
                          o.define(Class.abdul);
                          break;
                        case 4:
                          o.define(Class.abdul);
                          break;
                        case 5:
                          o.define(Class.abdul);
                          break;
                        case 6:
                          o.define(Class.abdul);
                          break;
                        /* case 7:
                      o.define(Class.amalgam);
                      break;*/
                        case 8:
                          o.define(Class.amalgam);
                          break;
                        default:
                          o.define(
                            Class[
                              ran.choose([
                                "thrasher",
                                "anomaly",
                                "glitch",
                                "aoc",
                                "aokaol",
                              ])
                            ]
                          );
                      }
                      o.siegeProgress = true;
                      o.impervious = true;
                      o.team = -100;
                      setTimeout(() => {
                        o.addController(new io_guard1(o));
                      }, 7500);
                    }
                    sockets.broadcast(
                      "Reality seems to tear itself open, entities are emerging from it!"
                    );
                    c.uniqueBossList.push("sardonyx");
                  }
                  break;
                case 4:
                  if (c.MODE === "siege") {
                    let o = new Entity(room.randomType("spw0"));
                    o.define(Class.zomblord2);
                    o.siegeProgress = true;
                    o.impervious = true;
                    o.team = -100;
                    setTimeout(() => {
                      o.addController(new io_guard1(o));
                    }, 7500);
                    sockets.broadcast(
                      "Undead hoards seem to gather...what the hell?"
                    );
                    c.uniqueBossList.push("anubis");
                  }
                  break;
                case 5:
                  if (c.MODE === "siege") {
                    for (let i = 0; i < 20; i++) {
                      let o = new Entity(room.randomType("spw0"));
                      switch (i) {
                        case 0:
                          o.define(Class.ranarAscendantForm);
                          o.color = 34;
                          o.stage = 0;
                          o.isRanar = true;
                          break;
                        case 1:
                          o.define(Class.arenaguard);
                          break;
                        case 2:
                          o.define(Class.arenaguard);
                          break;
                        case 3:
                          o.define(Class.arenaguard);
                          break;
                        case 4:
                          o.define(Class.arenaguard);
                          break;
                        default:
                          o.define(
                            Class[
                              ran.choose([
                                "auto3Guard",
                                "bansheeGuard",
                                "spawnerGuard",
                                "swarmerProtector",
                                "cruiserProtector",
                                "beekeeperProtector",
                              ])
                            ]
                          );
                      }
                      o.siegeProgress = true;
                      o.impervious = true;
                      o.team = -100;
                      setTimeout(() => {
                        o.addController(new io_guard1(o));
                      }, 7500);
                    }
                    sockets.broadcast(
                      "Ranar: The time has come to purify you scum in the name of Valrayvn!"
                    );
                    c.uniqueBossList.push("ranar");
                  }
                  break;
                case 6:
                  if (c.MODE === "siege") {
                    for (let i = 0; i < 4; i++) {
                      let o = new Entity(room.randomType("spw0"));
                      switch (i) {
                        case 0:
                          o.define(Class.highlordAidra);
                          break;
                        case 1:
                          o.define(Class.highlordAkavir);
                          break;
                        case 2:
                          o.define(Class.weakHighlordAlbatar);
                          break;
                        case 3:
                          o.define(Class.highlordKairo);
                          break;
                      }
                      o.siegeProgress = true;
                      o.impervious = true;
                      o.team = -100;
                      setTimeout(() => {
                        o.addController(new io_guard1(o));
                      }, 7500);
                    }
                    sockets.broadcast(
                      "The Council has arrived to test you...and decide your fate!"
                    );
                    c.uniqueBossList.push(
                      "highlordDominique",
                      "highlordKairo",
                      "highlordAkavir",
                      "highlordAlbatar"
                    );
                  }
                  break;
              }
              break;
            case "final":
              sockets.broadcast(
                "Wave " + c.bossWave + " has started, survival is...unlikely..."
              );
              c.waveRarity = Math.ceil(Math.random() * 8);
              switch (c.waveRarity) {
                case 1:
                  if (c.MODE === "siege") {
                    let o = new Entity(room.randomType("spw0"));
                    for (let i = 0; i < 11; i++) {
                      let o = new Entity(room.randomType("spw0"));
                      switch (i) {
                        case 0:
                          o.define(Class.CX2);
                          break;
                        case 1:
                          o.define(Class.zomblord1);
                          break;
                        case 2:
                          o.define(Class.fallenbooster);
                          break;
                        case 3:
                          o.define(Class.fallenoverlord);
                          break;
                        case 4:
                          o.define(Class.plaguedoc);
                          break;
                        case 5:
                          o.define(Class.enslaver);
                          break;
                        case 6:
                          o.define(Class.fallenanni);
                          break;
                        case 7:
                          o.define(Class.fallenhybrid);
                          break;
                        case 8:
                          o.define(Class.fallenfalcon);
                          break;
                        case 9:
                          o.define(Class.fallenflankguard);
                          break;
                        case 10:
                          o.define(Class.fallenautodouble);
                          break;
                      }

                      o.siegeProgress = true;
                      o.impervious = true;
                      o.team = -100;
                      setTimeout(() => {
                        o.addController(new io_guard1(o));
                      }, 7500);
                    }
                    sockets.broadcast(
                      "CX: THE DEATHLESS SHALL REIGN SUPREME, AND YOU...YOU SHALL FALL...YOU ALL SHALL FALL!"
                    );
                    c.uniqueBossList.push("cx", "anubis");
                  }
                  break;
                case 2:
                  if (c.MODE === "siege") {
                    for (let i = 0; i < 17; i++) {
                      let o = new Entity(room.randomType("spw0"));
                      switch (i) {
                        case 0:
                          o.define(Class.excaliber);
                          break;
                        case 1:
                          o.define(Class.possessor);
                          break;
                        case 2:
                          o.define(Class.icecream);
                          break;
                        case 3:
                          o.define(Class.rainOfAcid);
                          break;
                        case 4:
                          o.define(Class.kristaps);
                          break;
                        case 5:
                          o.define(Class.chaser);
                          break;
                        case 6:
                          o.define(Class.annoyingDog);
                          break;
                        case 7:
                          o.define(Class.alexTheDemonical);
                          break;
                        case 8:
                          o.define(Class.pop64);
                          break;
                        case 9:
                          o.define(Class.johnathon);
                          break;
                        case 10:
                          o.define(Class.powernoob);
                          break;
                        case 11:
                          o.define(Class.xxtrianguli);
                          break;
                        case 12:
                          o.define(Class.duodeci);
                          break;

                        case 13:
                          o.define(Class.ranarAscendantForm);
                          o.color = 34;
                          o.stage = 0;
                          o.isRanar = true;
                          break;
                        case 14:
                          o.define(Class.swarmDisciple);
                          break;
                        case 14:
                          o.define(Class.annihilatorDisciple);
                          break;
                        case 15:
                          o.define(Class.mortarDisciple);
                          break;
                      }
                      o.siegeProgress = true;
                      o.impervious = true;
                      o.team = -100;
                      setTimeout(() => {
                        o.addController(new io_guard1(o));
                      }, 7500);
                    }
                    sockets.broadcast(
                      "Ranar: Ok, I am officially done, you clearly aren't kidding around...I will stop joking, die."
                    );
                    c.uniqueBossList.push(
                      "ranar",
                      "stark",
                      "bret",
                      "klayton",
                      "oxiniVrochi",
                      "annoyingDog",
                      "kristaps",
                      "duodeci",
                      "icecream",
                      "possessor",
                      "xxtrianguli",
                      "chaser",
                      "excaliber",
                      "johnathon",
                      "powernoob",
                      "alex",
                      "pop64"
                    );
                  }
                  break;
                case 3:
                  if (c.MODE === "siege") {
                    for (let i = 0; i < 50; i++) {
                      let o = new Entity(room.randomType("spw0"));
                      switch (i) {
                        case 0:
                          o.define(Class.sardonyx);
                          break;
                        case 2:
                          o.define(Class.nulltype);
                          break;
                        case 4:
                          o.define(Class.elder);
                          break;
                        case 6:
                          o.define(Class.abdul);
                          break;
                        case 7:
                        case 8:
                          o.define(Class.amalgam);
                          break;
                        case 10:
                          o.define(Class.trimalgam);
                          break;
                        default:
                          o.define(
                            Class[
                              ran.choose([
                                "thrasher",
                                "anomaly",
                                "glitch",
                                "aoc",
                                "aokaol",
                              ])
                            ]
                          );
                      }
                      o.siegeProgress = true;
                      o.impervious = true;
                      o.team = -100;
                      setTimeout(() => {
                        o.addController(new io_guard1(o));
                      }, 7500);
                    }
                    sockets.broadcast(
                      "Sardonyx: It is time! THE VOID SHALL CONSUME ALL!"
                    );
                    c.uniqueBossList.push("sardonyx");
                  }
                  break;
                case 4:
                  if (c.MODE === "siege") {
                    let o = new Entity(room.randomType("spw0"));
                    for (let i = 0; i < 50; i++) {
                      let o = new Entity(room.randomType("spw0"));
                      switch (i) {
                        case 0:
                          o.define(Class.zomblord2);
                          break;
                        case 1:
                          o.define(Class.fallenDouble);
                          break;
                        case 2:
                          o.define(Class.fallendestroy);
                          break;
                        default:
                          o.define(
                            Class[
                              ran.choose([
                                "zombieBarricade",
                                "zombieTrapper",
                                "zombieEngineer",
                                "zombieConstructor",
                                "zombieBuilder",
                                "zombiePounder",
                                "zombieBoomer",
                                "zombieHexaTrapper",
                                "zombieSkimmer",
                                "zombieAnnihilator",
                                "zombieStreamliner",
                                "zombieBigCheese",
                                "zombieRifle",
                                "zombieCruiser",
                                "zombieOverlord",
                                "zombieSwarmer",
                                "zombieRocketeer",
                                "zombieAnimator",
                              ])
                            ]
                          );
                          o.infector = true;
                          o.team = -2;
                          o.skill.set([4, 6, 4, 4, 4, 4, 4, 4, 4, 4]);
                      }

                      o.siegeProgress = true;
                      o.impervious = true;
                      o.team = -100;
                      setTimeout(() => {
                        o.addController(new io_guard1(o));
                      }, 7500);
                    }
                    sockets.broadcast(
                      "Anubis: The lost shall be no more, come...join us and be found..."
                    );
                    c.uniqueBossList.push("anubis");
                  }
                  break;
                case 6:
                  if (c.MODE === "siege") {
                    for (let i = 0; i < 10; i++) {
                      let o = new Entity(room.randomType("spw0"));
                      switch (i) {
                        case 0:
                          o.define(Class.highlordAidra);
                          break;
                        case 1:
                          o.define(Class.highlordAkavir);
                          break;
                        case 2:
                          o.define(Class.weakHighlordAlbatar);
                          break;
                        case 3:
                          o.define(Class.highlordKairo);
                          break;
                        case 4:
                        case 5:
                          o.define(Class.elite_warkspawner);
                          break;
                        case 6:
                        case 7:
                          o.define(Class.contraption);
                          break;
                        case 8:
                        case 9:
                        default:
                          o.define(Class.exterminator);
                          break;
                      }
                      o.siegeProgress = true;
                      o.impervious = true;
                      o.team = -100;
                      setTimeout(() => {
                        o.addController(new io_guard1(o));
                      }, 7500);
                    }
                    sockets.broadcast(
                      "Highlord Akavir: I think I speak for all of us when I say...YOU DONE SCREWED UP!"
                    );
                    c.uniqueBossList.push(
                      "highlordDominique",
                      "highlordAkavir",
                      "highlordKairo",
                      "highlordAlbatar"
                    );
                  }
                  break;
                case 7:
                  if (c.MODE === "siege") {
                    for (let i = 0; i < 15; i++) {
                      let o = new Entity(room.randomType("spw0"));
                      switch (i) {
                        case 0:
                          o.define(Class.valrayvn);
                          break;
                        case 1:
                          o.define(Class.kronos);
                          break;
                        case 2:
                        case 3:
                        case 4:
                          o.define(Class.damagedArenaCloser);
                          break;
                        case 6:
                          o.define(Class.legionaryCrasher);
                          break;
                        case 7:
                          o.define(Class.arenaslayer);
                          break;
                        case 4:
                          o.define(Class.ranarDiscipleForm);
                          break;
                        default:
                          o.define(
                            Class[
                              ran.choose([
                                "sorcerer",
                                "summoner",
                                "enchantress",
                                "elite_skimmer",
                                "elite_machine",
                                "elite_destroyer",
                                "elite_gunner",
                                "elite_spawner",
                                "elite_battleship",
                                "defender",
                                "exorcistor",
                                "nestkeep",
                                "nestward",
                                "mortarLordCenturion",
                                "hiveLordCenturion",
                                "arenaguard",
                                "elite_fortress",
                                "defector",
                                "witch",
                                "elite_spinner",
                                "elite_sprayer",
                                "elite_swarmer",
                              ])
                            ]
                          );
                      }
                      o.siegeProgress = true;
                      o.impervious = true;
                      o.team = -100;
                      setTimeout(() => {
                        o.addController(new io_guard1(o));
                      }, 7500);
                    }
                    sockets.broadcast(
                      "Valrayvn: UGH, GREAT, NOW I HAVE TO FIGHT IN PERSON, YOU GUYS SUCK!"
                    );
                    c.uniqueBossList.push(
                      "legionaryCrasher",
                      "kronos",
                      "valrayvn"
                    );
                  }
                  break;

                case 8:
                  if (c.MODE === "siege") {
                    for (let i = 0; i < 11; i++) {
                      let o = new Entity(room.randomType("spw0"));
                      switch (i) {
                        case 0:
                          o.define(Class.kronos);
                          break;
                        case 1:
                          o.define(Class.paladin);
                          break;
                        case 2:
                          o.define(Class.zaphkiel);
                          break;
                        case 3:
                          o.define(Class.freyja);
                          break;
                        case 4:
                          o.define(Class.nyx);
                          break;
                        case 5:
                          o.define(Class.theia);
                          break;
                        case 6:
                          o.define(Class.ares);
                          break;
                        case 7:
                          o.define(Class.gersemi);
                          break;
                        case 8:
                          o.define(Class.ezekiel);
                          break;
                        case 9:
                          o.define(Class.selene);
                          break;
                        case 10:
                          o.define(Class.eris);
                          break;
                      }
                      o.siegeProgress = true;
                      o.impervious = true;
                      o.team = -100;
                      setTimeout(() => {
                        o.addController(new io_guard1(o));
                      }, 7500);
                    }
                    sockets.broadcast("Kronos: Terrestrials and Celestials...");
                    sockets.broadcast(
                      "Kronos: Arise under my rule, and crush these inferior roadblocks.."
                    );
                    c.uniqueBossList.push(
                      "kronos",
                      "paladin",
                      "freyja",
                      "zaphkiel",
                      "nyx",
                      "theia",
                      "ares",
                      "gersemi",
                      "ezekiel",
                      "eris",
                      "selene"
                    );
                  }
                  break;
              }
              break;
          } //just let* me cook
        } //wdym unsystactic break
        if (c.bossCounter > 0) {
          let o = new Entity(room.randomType("spw0"));
          // o.bossTier = ran.choose(bt);
          o.rarity = Math.random() * 10000;
          if (o.rarity <= 10000 && o.rarity > 5000) {
            o.bossTier = ran.choose(["weakEnemy1", "weakEnemy2", "weakEnemy3"]);
          }
          if (o.rarity <= 5000 && o.rarity > 3000) {
            o.bossTier = ran.choose(["normalEnemy1", "normalEnemy2"]);
          }
          if (o.rarity <= 3000 && o.rarity > 2000) {
            o.bossTier = "tierOneBoss";
          }
          if (o.rarity <= 2000 && o.rarity > 750) {
            o.bossTier = "tierTwoBoss";
          }
          if (o.rarity <= 750 && o.rarity > 500) {
            o.bossTier = "tierThreeBoss";
          }
          if (o.rarity <= 500 && o.rarity > 275) {
            o.bossTier = ran.choose([
              "stark",
              "bret",
              "klayton",
              "oxiniVrochi",
              "annoyingDog",
              "kristaps",
              "duodeci",
              "icecream",
              "possessor",
              "xxtrianguli",
              "chaser",
              "excaliber",
              "johnathon",
              "powernoob",
              "alex",
              "pop64",
              "selene",
              "ezekiel",
              "gersemi",
              "ares",
              "eris",
              "disconnecter",
              "anicetus",
              "paladin",
              "zaphkiel",
              "theia",
              "nyx",
              "freyja",
              "kronos",
              "legionaryCrasher",
              "tryi",
              "cubed",
              "baltyla",
              "pendekot",
              "stfellas",
            ]);
          }
          if (o.rarity <= 275) {
            o.bossTier = "ranar";
          }
          let bc = c.bossCounter;

          if (
            (o.bossTier === "weakEnemy2" && bc < 2) ||
            (o.bossTier === "weakEnemy3" && bc < 3) ||
            (o.bossTier === "normalEnemy1" && bc < 5) ||
            (o.bossTier === "normalEnemy2" && bc < 7) ||
            (o.bossTier === "strongEnemy1" && bc < 10) ||
            (o.bossTier === "tierOneBoss" && bc < 15) ||
            (o.bossTier === "tierTwoBoss" && bc < 30) ||
            (o.bossTier === "tierThreeBoss" && bc < 45) ||
            (o.bossTier === "stark" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "bret" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "klayton" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "pop64" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "annoyingDog" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "alex" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "oxiniVrochi" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "duodeci" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "kristaps" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "icecream" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "possessor" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "excaliber" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "xxtrianguli" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "chaser" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "johnathon" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "powernoob" &&
              (bc < 20 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "selene" &&
              (bc < 45 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "ezekiel" &&
              (bc < 45 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "gersemi" &&
              (bc < 45 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "eris" &&
              (bc < 45 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "ares" &&
              (bc < 45 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "theia" &&
              (bc < 60 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "zaphkiel" &&
              (bc < 60 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "freyja" &&
              (bc < 60 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "nyx" &&
              (bc < 60 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "paladin" &&
              (bc < 60 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "anicetus" &&
              (bc < 60 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "ranar" &&
              (bc < 60 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "disconnecter" && bc < 60) ||
            (o.bossTier === "kronos" &&
              (bc < 100 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "tryi" &&
              (bc < 100 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "cubed" &&
              (bc < 100 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "baltyla" &&
              (bc < 100 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "pendekot" &&
              (bc < 100 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "stfellas" &&
              (bc < 100 || !c.uniqueBossList.includes(o.bossTier))) ||
            (o.bossTier === "legionaryCrasher" &&
              (bc < 100 || !c.uniqueBossList.includes(o.bossTier)))
          ) {
            o.bossTier = "weakEnemy1";
          }
          if (o.bossTier === "weakEnemy1") {
            o.define(Class[ran.choose(wE1)]);
            c.bossCounter -= 1;
          }
          if (o.bossTier === "weakEnemy2") {
            o.define(Class[ran.choose(wE2)]);
            c.bossCounter -= 2;
          }
          if (o.bossTier === "weakEnemy3") {
            o.define(Class[ran.choose(wE3)]);
            c.bossCounter -= 3;
          }
          if (o.bossTier === "normalEnemy1") {
            o.define(Class[ran.choose(nE1)]);
            c.bossCounter -= 5;
          }
          if (o.bossTier === "normalEnemy2") {
            o.define(Class[ran.choose(nE2)]);
            c.bossCounter -= 7;
          }
          if (o.bossTier === "tierOneBoss") {
            o.define(Class[ran.choose(t1B)]);
            c.bossCounter -= 15;
          }
          if (o.bossTier === "tierTwoBoss") {
            o.define(Class[ran.choose(t2B)]);
            c.bossCounter -= 30;
          }
          if (o.bossTier === "tierThreeBoss") {
            o.define(Class[ran.choose(t3B)]);
            c.bossCounter -= 45;
          }
          if (o.bossTier === "ranar") {
            o.define(Class.ranarDiscipleForm);
            c.bossCounter -= 60;
            c.uniqueBossList.push(o.bossTier);
            switch (c.ranarDialog) {
              case 0:
                sockets.broadcast(
                  "Ranar: I have arrived, GET READY TO FEEL MY WRATH, SCUM!"
                );
                break;
              case 1:
                sockets.broadcast("Ranar: I am back, now I can actually try!");
                break;
              case 2:
                sockets.broadcast(
                  "Ranar: THATS IT, LET THE MERCILESS ONSLOUGHT BEGIN!"
                );
                break;
              case 3:
                sockets.broadcast("Ranar: God d@mn it!");
                break;
              case 4:
                sockets.broadcast("Ranar: I hate you!");
                break;
              case 5:
                sockets.broadcast(
                  "Ranar: WHY DOES THIS SERVER KEEP SPAWNING ME!?"
                );
                break;
              case 6:
                sockets.broadcast("Ranar: WHAT HAVE I DONE TO DESERVE THIS?!");
                break;
              case 7:
                sockets.broadcast(
                  "Ranar: **** off you ****ing little ****. AND AS FOR THIS SERVER, IT CAN GO **** ITSELF AND EAT ****. DIE YOU ****ING ****HEADS!"
                );
                break;
              case 8:
                sockets.broadcast(
                  "Ranar: I give up, kill me already if you can."
                );
                break;
              default:
                sockets.broadcast("Ranar: >:(");
            }
            c.ranarDialog += 1;
            currentState.ranarDialog = c.ranarDialog;
            if (o.rarity < 50 && bc >= 100) {
              o.define(Class.ranarAscendantForm);
              o.isRanar = true;
              c.bossCounter -= 100;
              c.uniqueBossList.push(o.bossTier);
              sockets.broadcast(
                //gg
                "Ranar: Come children, and I shall show you supreme power!"
              );
            }
          }
          if (o.bossTier === "disconnecter") {
            o.define(Class.arenaslayer);
            c.bossCounter -= 60;
            sockets.broadcast(
              "...a feared being from the domain of diep has come..."
            );
          }
          if (o.bossTier === "kronos") {
            o.define(Class.kronos);
            c.bossCounter -= 100;
            c.uniqueBossList.push(o.bossTier);
            sockets.broadcast(
              //gg
              "Time itself starts to warp as an ancient God appears..."
            );
          }
          if (o.bossTier === "legionaryCrasher") {
            o.define(Class.legionaryCrasher);
            c.bossCounter -= 100;
            c.uniqueBossList.push(o.bossTier); //but
            sockets.broadcast(
              "The crashers were only the disciples of what you have awakened...what have you done?"
            ); //fair enough
          }
          if (o.bossTier === "anicetus") {
            o.define(Class.bishop);
            c.bossCounter -= 60;
            c.uniqueBossList.push(o.bossTier);
            sockets.broadcast(
              "Anicetus: Those who oppose the great Valrayvn shall be returned dust!"
            );
          }
          if (o.bossTier === "ares") {
            o.define(Class.ares);
            c.bossCounter -= 45;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "ezekiel") {
            o.define(Class.ezekiel);
            c.bossCounter -= 45;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "selene") {
            o.define(Class.selene);
            c.bossCounter -= 45;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "gersemi") {
            o.define(Class.gersemi);
            c.bossCounter -= 45;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "eris") {
            o.define(Class.eris);
            c.bossCounter -= 45;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "ares") {
            o.define(Class.ares);
            c.bossCounter -= 45;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "paladin") {
            o.define(Class.paladin);
            c.bossCounter -= 60;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "stark") {
            o.define(Class.swarmDisciple);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "bret") {
            o.define(Class.annihilatorDisciple);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "klayton") {
            o.define(Class.mortarDisciple);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "kristaps") {
            o.define(Class.kristaps);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "duodeci") {
            o.define(Class.duodeci);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "annoyingDog") {
            o.define(Class.annoyingDog);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "icecream") {
            o.define(Class.icecream);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }

          if (o.bossTier === "xxtrianguli") {
            o.define(Class.xxtrianguli);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "alex") {
            o.define(Class.alexTheDemonical);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "possessor") {
            o.define(Class.possessor);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "oxiniVrochi") {
            o.define(Class.rainOfAcid);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "chaser") {
            o.define(Class.chaser);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "excaliber") {
            o.define(Class.excaliber);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "powernoob") {
            o.define(Class.powernoob);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "johnathon") {
            o.define(Class.johnathon);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.bossTier === "pop64") {
            o.define(Class.pop64);
            c.bossCounter -= 20;
            c.uniqueBossList.push(o.bossTier);
          }
          if (o.type === "thrasher") {
            if (o.rarity <= 20) {
              o.define(Class.abyssthrasher);
            }
          }
          if (o.label === "Defender" || o.label === "Enchantress") {
            if (o.rarity <= 20) {
              o.define(Class.epilepticdefender);
            }
          }
          if (o.label === "Summoner") {
            if (o.rarity <= 20) {
              o.define(Class.splitsummoner);
            }
          }
          if (o.label === "Sorcerer") {
            if (o.rarity <= 20) {
              o.define(Class.raresorcerer);
            }
          }
          if (o.label === "Elite Gunner") {
            if (o.rarity <= 20) {
              o.define(Class.elite_Shadowgunner);
            }
          }
          if (o.label === "Nest Keeper" || o.label === "Nest Warden") {
            if (o.rarity <= 20) {
              o.define(Class.legnestkeep);
            }
          }
          if (o.type === "crasher") {
            switch (o.shape) {
              case 3:
                if (o.rarity <= 1000 && o.rarity > 500) {
                  o.define(Class.shinyEggCrasher);
                }
                if (o.rarity <= 500 && o.rarity > 250) {
                  o.define(
                    Class[
                      ran.choose(["shinySquareCrasher", "shinyTriangleSentry"])
                    ]
                  );
                }

                if (o.rarity <= 50 && o.rarity > 20) {
                  o.define(Class.rainbowTriangleCrasher);
                }
                if (o.rarity <= 20) {
                  o.define(Class.abyssalTetraCrasher);
                  sockets.broadcast(
                    "Vile Darkness Cloaks the arena, something terrifying has been summoned!"
                  );
                }
            }
          }
          o.siegeProgress = true;
          o.impervious = true;
          o.showOnMap = true;
          o.team = -100;
          setTimeout(() => {
            o.addController(new io_guard1(o));
          }, 7500);
        }

        if (c.bossCounter <= 0) {
          c.bossAmount = 0;
          entities.forEach((entity) => {
            if (
              entity.siegeProgress &&
              entity.team === -100 &&
              !entity.isDead()
            )
              c.bossAmount += 1;
          });
          // console.log(c.bossAmount);
          c.initiateEpicWave = false;
          c.pingBack = false;

          c.uniqueBossList = [];
        }
      }
    }

    if (this.isPlayer) {
      if (this.fov > (room.width + room.height) * 1.5) {
        this.fov = (room.width + room.height) * 1.5;
      }
      if (
        room.isIn("dom3", this) &&
        this.specialEffect !== "Legend" &&
        this.team === -3 &&
        c.MODE === "theExpanse"
      ) {
        this.upgrades = [];
        this.define(Class.operator);
        this.maxChildren = 0;
        this.intangibility = false;
        this.invisible = [100, 0];
        this.ignoreCollision = false;
        this.alpha = 100;
        this.skill.points += 10;
        this.skill.setCaps([9, 9, 9, 9, 9, 9, 9, 9, 9, 9]);
        sockets.broadcast(
          this.name + ": BE BLINDED BY THE POWER OF SCIENCE YOU EVIL FIENDS!"
        );
        this.sendMessage("You: (Let us see what this tank can do!)");
      }

      if (c.MODE === "theDenied" && c.eventProgress) {
        if (room.isIn("spw0", this)) {
          let loc = room.randomType("norm");
          if (c.wave < 12) {
            this.x = loc.x;
            this.y = loc.y;
          }
        }
      }
    }
    if (
      c.POLY_ATTACK === true &&
      this.type === "food" &&
      this.label !== this.doit
    ) {
      if (this.foodLevel === 0) {
        if (this.label === "Egg") this.DAMAGE = 25000;
        if (this.label === "Albino Nonagon") return;
        else this.DAMAGE = 250;
      }
      if (this.foodLevel === 1) {
        this.DAMAGE = 75;
      }
      if (this.foodLevel === 2) {
        this.DAMAGE = 100;
      }
      if (this.foodLevel === 3) {
        this.DAMAGE = 12.5;
      }

      if (this.skill.score <= 1000000 || this.foodLevel <= 4) {
        this.skill.score *= 10;
      }
      this.fov /= this.foodLevel;
      this.SPEED = 75 / (this.foodLevel + 1);
      this.ACCELERATION = 5;
      //this.maxSpeed /= 7.5;
      this.motionType = "chase";
      // this.penetration *= 4;
      this.stop = true;
      let good = 200 / this.size;
      this.health.max *= good;
      this.health.amount = this.health.max;
      setTimeout(() => {
        this.controllers = [
          new io_moveInCircles(this),
          new io_nearestDifferentMaster(this),
          new io_mapTargetToGoal(this),
        ];
        // this.addController(new io_nearestDifferentMaster(this));
        //  this.addController(new io_mapTargetToGoal(this));
      }, 100);
      this.doit = this.label;
    }

    if (c.DIE === true && this.body !== null) {
      this.kill();
      setTimeout(() => {
        c.DIE = false;
      }, 480);
    }
    /*if (this.master.isCreep && !(this.master.zombied || this.master.plagued)) {
      this.alpha = this.master.alpha;
    }*/
    if (this.growthFactor > 0 || this.growthFactor < 0) {
      this.SIZE *= this.growthFactor;
      this.growthFactor = 0;
    }
    if (this.type === "food") {
      this.ACCELERATION = 0.015;
    }
    var relocate = { x: this.x, y: this.y };
    if (
      this.skill.score === undefined ||
      this.skill.score < 0 ||
      this.skill.score > 1000000000000000
    ) {
      this.skill.score = 26263;
    }

    if (
      Number.isNaN(this.x) ||
      Number.isNaN(this.y) ||
      Number.isNaN(this.velocity.x) ||
      Number.isNaN(this.velocity.y) ||
      Number.isNaN(this.accel.y) ||
      Number.isNaN(this.accel.x) ||
      Number.isNaN(this.health.amount) ||
      Number.isNaN(this.shield.amount) ||
      this.accel.x > (room.width + room.height) / 2 ||
      this.accel.y > (room.width + room.height) / 2
    ) {
      if (this.relocateLimit === undefined) {
        this.relocateLimit = 0;
      }

      this.relocateLimit += 1;
      relocate = room.random();

      this.refreshBodyAttributes();
      this.collisionArray = [];
      this.VELOCITY.x = 0;
      this.VELOCITY.y = 0;
      this.ACCEL.x = 0;
      this.ACCEL.y = 0;
      this.velocity.x = 0;
      this.velocity.y = 0;
      this.speed = 0;
      this.accel.x = 0;
      this.accel.y = 0;
      this.angle = 0;
      this.facing = 0;
      this.targetLock = undefined;
      for (let i = 0; i < this.turrets.length; i++) {
        this.turrets[i].targetLock = undefined;
      }
      // this.health.amount = Math.random() * this.health.max;
      // this.shield.amount = Math.random() * this.shield.max;
      this.invuln = true;
      setTimeout(() => {
        this.invuln = false;
      }, 5000);
      this.x = relocate.x;
      this.y = relocate.y;

      if (this.relocateLimit >= 3) {
        this.health.max = 1;
        this.health.amount = 1;
        this.kill();
        // this.destroy();
      }
    }
    if (this.isBoss || this.type === "base") {
      this.coreSize = this.SIZE;
    }
    if (
      this.isMazeWall ||
      this.isDominator ||
      this.isGate ||
      this.isWall ||
      this.type === "tile"
    ) {
      let loc = { x: this.x, y: this.y };
      if (this.spawnLoc && this.spawnLoc !== loc) {
        this.x = this.spawnLoc.x;
        this.y = this.spawnLoc.y;
      }
    }
    if (
      this.skill.score >= 200000 &&
      this.isPlayer &&
      c.MODE === "theRestless"
    ) {
      c.eventProgress = true;
      c.sardonyxEventStopper = true;
    }
    if (c.MODE === "theAwakening") {
      if (c.bruv !== c.bossStage) {
        c.bruv = c.bossStage;
        //util.log(c.bruv);
      }
      if (c.canProgress && c.bossStage === 0) {
        c.bossStage += 1;
        sockets.broadcast("Valrayvn: Did everyone make it through?");
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: Good, now lets see if our trip was worth it, there has got to be something I can use here!"
          );
        }, 5000);
      }
      if (c.bossStage === 1) {
        makeEventBosses();
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: HUH, I think I may have accidently activated some automated forces!"
          );
        }, 15000);
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: If you can kill these Defenders, I think I can use their power to create a effective repair man."
          );
        }, 20000);
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: It should be strong enough to penetrate the gate."
          );
        }, 25000);
        c.bossStage += 1;
      }
      if (c.bossStage === 2) {
        makeEventBosses();
        c.bossStage += 1;
      }
      if (c.bossStage === 6) {
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: Ugh! Another gate and more automatons! I don't think a modified repair man will do."
          );
          makeEventBosses();
        }, 5000);
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: Hm, I see red switches, try uhhh.....stepping on them?"
          );
        }, 10000);
        makeEventBosses();
        c.bossStage += 1;
      }
      if (c.bossStage === 9) {
        makeEventBosses();
        c.bossStage += 1;
      }
      if (c.bossStage === 12) {
        c.bossStage += 1;
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: This one looks like an egg...I wonder..."
          );
        }, 15000);
        setTimeout(() => {
          if (room.isIn("cse1", this) && this.team === -5) this.kill();
          let o = new Entity(room.type("cse1"));
          o.define(Class.egg);
          o.SIZE = 30;
          setTimeout(() => {
            o.invuln = false;
          }, 1000);
        }, 17500);
        setTimeout(() => {
          let o = new Entity(room.type("cse1"));
          o.define(Class.baltyla);
          o.isBoss = false;
          o.invuln = true;
          o.team = -100;
          o.dangerValue = 50;
          o.aiTarget = "allies";
          //o.AIDisable = true;
        }, 20000);
        setTimeout(() => {
          sockets.broadcast("Valrayvn: AHAHHAHAAA, IT WORKED!");
          if (this.label === "Arrasian Lord") {
            this.aiTarget = "allies";
            this.controllers = [new io_nearestDifferentMaster(this)];
            this.facingType = "smoothToTarget";
          }
          serverState.advanceLoreSequence();
        }, 22500);
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: Can you understand me? What is your name?"
          );
        }, 25000);
        setTimeout(() => {
          sockets.broadcast("???: I...am Baltyla.");
        }, 30000);
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: I am Valrayvn, The Arrasian Lord, tell me everything you know."
          );
        }, 35000);
        setTimeout(() => {
          sockets.broadcast(
            "Balytla: I...Dont know. I've been resting here for so long that I've forgotten everything about my past."
          );
        }, 40000);
        setTimeout(() => {
          sockets.broadcast("Balytla: How did you get past Erevous?");
        }, 45000);
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: There where only mindless Outsiders defending the place, who is this 'Erevous'?"
          );
        }, 50000);
        setTimeout(() => {
          sockets.broadcast("Balytla: The one who summoned us, for...");
        }, 55000);
        setTimeout(() => {
          sockets.broadcast("Balytla: The war, d-did Cubed destroy the core?");
        }, 60000);
        setTimeout(() => {
          sockets.broadcast("Valrayvn: What?");
        }, 65000);
        setTimeout(() => {
          sockets.broadcast(
            "Rog: Valrayvn, powerful beings were located approaching the temple, we need to go NOW!"
          );
        }, 70000);
        setTimeout(() => {
          sockets.broadcast("Valrayvn: Dammit.");
        }, 72500);
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: Come everyone and help bring these cases back to my base, soon it will be time to awaken these beings!"
          );
        }, 75000);
        setTimeout(() => {
          sockets.broadcast(util.getTeam(-100) + " have won the game!");
          serverState.advanceLoreSequence();
          closeArena();
        }, 80000);
      }
    }
    if (c.hallowsPaint) {
      if (
        (this.type === "wall" || this.type === "squareWall") &&
        this.color === 16
      )
        this.color = ran.choose([17, 33, 30]);
    }
    if (c.MODE === "theDistance") {
      if (
        this.type === "tank" &&
        this.label !== this.done &&
        c.startingClass === "racer"
      ) {
        setTimeout(() => {
          this.ACCELERATION /= 5;
          this.SPEED /= 3;
        }, 5000);
        this.done = this.label;
      }
      if (this.isRacer && c.startingClass === "basic") {
        this.upgrades = [];
        this.define(Class.rebel);
        this.skill.points += 30;
        this.isRacer = false;
      }
      if (
        !c.beginRace &&
        this.type === "tank" &&
        !room.isIn("bas1", this) &&
        !room.isIn("bstS", this) &&
        !room.isIn("bstR", this)
      ) {
        loc = room.type("bas1");
        this.x = loc.x;
        this.y = loc.y;
      }
      if (
        this.counter !== c.win &&
        this.team === -100 &&
        (this.isEnemy || this.isBoss)
      ) {
        this.counter = c.win;
        this.REGEN = 0;
        this.health.amount -= this.health.max / 5.25;
        this.shield.amount /= 2;
      }

      if (c.initiateHELL) {
        sockets.broadcast(
          "Twilight: Um, I am sensing alot of powerful forces coming!"
        );
        c.PLAYER_SPAWN_LOCATION = "random";
        c.BOT_SPAWN_LOCATION = "random";
        c.CONSIDER_PLAYER_TEAM_LOCATION = false;
        c.CONSIDER_BOT_TEAM_LOCATION = false;
        c.DEADLY_BORDERS = false;
        c.visibleListInterval = 750;
        setTimeout(() => {
          sockets.broadcast(
            "The arena shakes...many powerful forces are emerging, your defenses have activated."
          );
          for (let i = 0; i < 7; i++) {
            let o = new Entity(room.random());
            o.specialEffect = "dieWall";
            o.impervious = true;
            o.counter = 0;
            c.startingClass = "basic";
            switch (i) {
              case 0:
                o.define(Class.ranarDiscipleForm);
                o.color = 10;
                o.team = -1;
                break;
              case 1:
                o.define(Class.twilight);
                o.team = -1;
                break;
              case 2:
                o.define(Class.cultist);
                o.team = -100;
                o.finish = true;
                break;
              case 3:
                o.define(Class.bishop);
                o.team = -100;
                o.finish = true;
                break;
              case 4:
                o.define(Class.mortarLordCenturion);
                o.team = -100;
                o.finish = true;
                break;
              case 5:
                o.define(Class.hiveLordCenturion);
                o.team = -100;
                o.finish = true;
                break;
              case 6:
                o.define(Class.stfellas);
                o.team = -100;
                o.finish = true;
                break;
            }
            o.REGEN = 0;
          }
        }, 5000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: Wait, what the hell? I haven't seen Valrayvn use such a being before!"
          );
        }, 10000);
        setTimeout(() => {
          sockets.broadcast("Twilight: It is radiating such intense power!");
        }, 15000);
        setTimeout(() => {
          sockets.broadcast("Ranar: Twilight we need those defenses NOW!");
        }, 20000);
        setTimeout(() => {
          sockets.broadcast("Twilight: GIMME A SEC!");
        }, 25000);
        setTimeout(() => {
          sockets.broadcast(
            "Twilight: Most of the power is being directed toward our entertainment projects!"
          );
        }, 30000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: ...I am sorry, I thought we could finally escape this war and relax a bit- OW, YOU LITTLE SH-"
          );
        }, 35000);
        setTimeout(() => {
          sockets.broadcast(
            "Twilight: I understand, apparently escaping simply isn't enough..."
          );
        }, 40000);
        setTimeout(() => {
          sockets.broadcast(
            "Twilight: Ranar, we need to return to your prophecy and finish this once and for all."
          );
        }, 45000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: Yeah, your are right, but first we need to get these jokers out of here!"
          );
        }, 50000);
        setTimeout(() => {
          sockets.broadcast("Ranar: WAIT, I have an idea!");
        }, 55000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: Twilight, do you remember our experiments with the shrine technology?"
          );
        }, 60000);
        setTimeout(() => {
          sockets.broadcast(
            "Twilight: Yes, we made them as generators to drain nearby power, but they drained all energy except for a certain type."
          );
        }, 65000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: Well, the way we track the racer's progress is using a minor amount of a specific energy type."
          );
        }, 70000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: BUT UNFORTUNATELY, I CAN'T LOOK AWAY WITHOUT SOMETHING EATING MY FACE TO FIGURE HOW TO IMPLEMENT THAT!"
          ); //kinky
        }, 75000);
        setTimeout(() => {
          sockets.broadcast(
            "Twilight: Ok I can, but they need to be manually activated, and they aren't exactly buttons, so you, the racers, need to blow them up!"
          );
          makeShrine();
          c.win = 0;
          c.finish = 0;
        }, 80000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: Well you heard her, look for the green dots on the map, smash those shrines and then finish off these forces."
          ); //im not able to afford child support, so no i wont smash em shrines
        }, 85000);
        setTimeout(() => {
          sockets.broadcast(
            "Highlord Akavir: Man, this is the first time a stake-out has actually been fun."
          ); //im not able to afford child support, so no i wont smash em shrines
        }, 100000);
        setTimeout(() => {
          sockets.broadcast(
            "Highlord Dominique: Agreed, but I am wondering what that hexagon thing with arms is, it looks alot like Albatar."
          ); //im not able to afford child support, so no i wont smash em shrines
        }, 105000);
        setTimeout(() => {
          sockets.broadcast(
            "Highlord Akavir: I scanned it, it says 'Stfellas'."
          ); //im not able to afford child support, so no i wont smash em shrines
        }, 110000);
        setTimeout(() => {
          sockets.broadcast(
            "Highlord Dominique: WHAT MORON WOULD NAME SUCH A DEADLY WEAPON A VERY STUPID NAME!?"
          ); //im not able to afford child support, so no i wont smash em shrines
        }, 115000);
        setTimeout(() => {
          sockets.broadcast(
            "Highlord Akavir: Well, no, she is technically sentient, not a weapon."
          ); //im not able to afford child support, so no i wont smash em shrines
        }, 120000);
        setTimeout(() => {
          sockets.broadcast(
            //NOT THE SPELLCHECK :sob:
            "Stfellas: You do realise I can hear you."
          ); //im not able to afford child support, so no i wont smash em shrines
        }, 125000);
        setTimeout(() => {
          sockets.broadcast("Highlord Dominique: RETREAAAAAAT!"); //im not able to afford child support, so no i wont smash em shrines
        }, 130000);
        c.initiateHELL = false;
      } //
      if (
        this.type === "tile" &&
        room.isIn("bstS", this) &&
        this.color === 16 &&
        c.beginRace
      ) {
        this.kill();
      }
      if (this.type !== "tile" && !this.isProjectile && !this.ignoreCollision) {
        if (
          (room.isIn("bstS", this) && !c.beginRace) ||
          room.isIn("bstL", this)
        ) {
          this.accel.x -= 10;
        }
        if (room.isIn("bstS", this) && c.beginRace) {
          this.accel.x += 30;
        }
        if (
          (room.isIn("bas1", this) && c.beginRace) ||
          room.isIn("bstR", this)
        ) {
          this.accel.x += 10;
        }
        if (room.isIn("bstU", this)) {
          this.accel.y -= 10;
        }
        if (room.isIn("bstD", this)) {
          this.accel.y += 10;
        }

        if (room.isIn("bdrU", this)) {
          this.accel.y -= 30;
        }
        if (room.isIn("bdrD", this)) {
          this.accel.y += 30;
        }
        if (room.isIn("bdrL", this)) {
          this.accel.x -= 30;
        }
        if (room.isIn("bdrR", this)) {
          this.accel.x += 30;
        }
        if ((this.isWall && !c.beginRace) || (this.win && !c.beginRace)) {
          this.destroy();
        }
        if (this.isBot || this.isPlayer) {
          if (
            room.isIn(c.finishLine, this) &&
            c.beginRace &&
            !this.once &&
            !this.invuln &&
            this.label !== "Spectator" &&
            !c.STOP
          ) {
            this.once = true;
            this.laps += 1;
            this.skill.score += this.laps * 15000;
            let vruh;
            switch (this.laps) {
              case 1:
                vruh = "st";
                break;
              case 2:
                vruh = "nd";
                break;
              case 3:
                vruh = "rd";
                break;
              default:
                vruh = "th";
                break;
            }
            this.sendMessage(
              "Congrats, you have completed your " +
                this.laps +
                vruh +
                " lap and earned score! If you get 750k score, you win!"
            );
            //if (c.whar < this.skill.score) {
            let dude = this.name;
            if (this.name === "") dude = "An unnamed player";
            if (this.skill.score >= 30000 && c.whar === 0) {
              c.whar += 1;
              sockets.broadcast(
                "Ranar: " + dude + " is in the lead! Keep going Racers!"
              );
              setTimeout(() => {
                for (let i = 0; i < 3; i++) {
                  let o = new Entity(room.randomType("pth1"));
                  switch (i) {
                    case 0:
                      o.define(Class.swarmDisciple);
                      break;
                    case 1:
                      o.define(Class.mortarDisciple);
                      break;
                    case 2:
                      o.define(Class.annihilatorDisciple);
                      break;
                  }
                  o.team = -100;
                  o.controllers = [
                    new io_pathFinder(o),
                    new io_nearestDifferentMaster(o),
                  ];
                }
              }, 5000);
              setTimeout(() => {
                sockets.broadcast(
                  "Ranar: What the- who the heck are these people!?"
                );
              }, 15000);
              setTimeout(() => {
                sockets.broadcast(
                  "Twilight: I do not know, I am checking defenses now!"
                );
              }, 20000);
            } else if (this.skill.score >= 60000 && c.whar === 1) {
              c.whar += 1;
              sockets.broadcast(
                "Ranar: " + dude + " is in the lead! What a good race!"
              );
              setTimeout(() => {
                for (let i = 0; i < 3; i++) {
                  let o = new Entity(room.type("norm"));
                  o.define(Class.Pawn);
                  o.controllers = [
                    new io_pathFinder(o),
                    new io_nearestDifferentMaster(o),
                  ];
                  o.team = -100;
                }
              }, 5000);
              setTimeout(() => {
                sockets.broadcast("Ranar: Twilight, did you summon these?");
              }, 15000);
              setTimeout(() => {
                sockets.broadcast(
                  "Twilight: No! It is supposed to be a static race, not chaotic!"
                );
              }, 20000);
            } else if (this.skill.score >= 105000 && c.whar === 2) {
              c.whar += 1;
              sockets.broadcast(
                "Ranar: " + dude + " is in the lead! This is nice!"
              );
              setTimeout(() => {
                for (let i = 0; i < 6; i++) {
                  let o = new Entity(room.type("norm"));
                  o.define(
                    Class[
                      ran.choose([
                        "skimmerSentinel",
                        "crossbowSentinel",
                        "minigunSentinel",
                      ])
                    ]
                  );
                  o.controllers = [
                    new io_pathFinder(o),
                    new io_nearestDifferentMaster(o),
                  ];
                  o.team = -100;
                }
              }, 5000);
              setTimeout(() => {
                sockets.broadcast("Ranar: SON OF A BI-");
              }, 15000);
              setTimeout(() => {
                sockets.broadcast(
                  "Twilight: RANAR, we need to do something about this, the race is being messed with!"
                );
              }, 20000);
              setTimeout(() => {
                sockets.broadcast(
                  "Ranar: But most of the racers seem to be surviving just fine, don't worry about it."
                );
              }, 25000);
            } else if (this.skill.score >= 165000 && c.whar === 3) {
              c.whar += 1;
              sockets.broadcast(
                "Ranar: " + dude + " is in the lead! What an epic race!"
              );
              setTimeout(() => {
                for (let i = 0; i < 2; i++) {
                  let o = new Entity(room.type("norm"));
                  o.define(Class.arenaguard);
                  o.controllers = [
                    new io_pathFinder(o),
                    new io_nearestDifferentMaster(o),
                  ];
                  o.team = -100;
                }
              }, 5000);
              setTimeout(() => {
                sockets.broadcast(
                  "Ranar: OK I'VE HAD ENOUGH, TWILIGHT PREPARE THE DEFENSE SYSTEM!"
                );
              }, 15000);
              setTimeout(() => {
                sockets.broadcast("Twilight: Already doing it!");
              }, 20000);
              setTimeout(() => {
                sockets.broadcast(
                  "Ranar: Valrayvn is going to regret messing with us."
                );
              }, 25000);
            }

            setTimeout(() => {
              this.once = false;
            }, 5000);
          }
          if (this.skill.score >= 750000 && !c.STOP && c.whar >= 4) {
            c.STOP = true;
            let dude = this.name;
            if (this.name === "") dude = "An unnamed player";

            sockets.broadcast(
              "Ranar: Against all odds, " + dude + " has won the race!"
            );
            c.initiateHELL = true; //INITIATE HELL???
            //closeArena();
          }
        }
      }
      if (!c.raceCountdown && c.canProgress) {
        c.raceCountdown = true;
        sockets.broadcast(
          "Ranar: Welcome to the race guys, we will start here soon!"
        );
        setTimeout(() => {
          sockets.broadcast(
            "Twilight: I cannot believe it has already been a year!"
          );
        }, 5000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: Time flies when you are having fun, and in this server, no one can disturb it!"
          );
        }, 10000);
        setTimeout(() => {
          setTimeout(() => {
            sockets.broadcast(
              "Ranar: ARE YOU READY FOR THE MOST EPIC ******* RACE IN ARRASIAN HISTORY?!"
            );
          }, 1000);
          setTimeout(() => {
            sockets.broadcast(
              "Twilight: Well Arras has never had any racing modes, so it would have to be."
            );
          }, 5000);
          setTimeout(() => {
            sockets.broadcast("Ranar: Shut up!");
          }, 8000);
          setTimeout(() => {
            sockets.broadcast("Ranar: RACERS GET READY!");
          }, 10000);
          setTimeout(() => {
            sockets.broadcast("Twilight: GET SET!");
            c.getSet = true;
          }, 12000);
          setTimeout(() => {
            sockets.broadcast("Twilight & Ranar: GOOOOO!");
            c.goooo = true;
            c.beginRace = true;
            racingTiles();
            setTimeout(() => {
              c.finishLine = "bas1";
              c.laps = 0;
            }, 5000);
          }, 15000);
        }, 30000);
      }

      if (room.isIn("gggo", this) && this.type === "tile") {
        if (c.getSet) {
          this.color = 3;
        }
        if (c.goooo) {
          this.color = 34;
          setTimeout(() => {
            c.getSet = false;
            c.goooo = false;
            this.destroy();
          }, 10000);
        }
      }
      if (this.isPlayer || this.isBot) {
        if (this.ignoreCollision) this.ignoreCollision = false;
      }
    }
    if (c.MODE === "theGreatPlague") {
      if (this.isPlayer && this.team === -2 && this.label !== "Spectator") {
        if (this.SIZE < 20) {
          this.define({
            //LABEL: "Lord",
            COLOR: 18,
            SIZE: 20,
            DANGER: 15,
          });
          if (this.isSmasher) {
            this.define({
              SKILL_CAP: [
                15, //reload
                0, //Penetration
                0, //bullet hp
                0, //bullet dmg
                0, //bullet spd
                15, //shield
                15, //body dmg
                15, // body hp
                15, //shield regen
                15, //body speed
              ],
            });
          } else {
            this.define({
              SKILL_CAP: [
                15, //reload
                15, //Penetration
                15, //bullet hp
                15, //bullet dmg
                15, //bullet spd
                0, //shield
                15, //body dmg
                15, // body hp
                0, //shield regen
                15, //body speed
              ],
            });
          }
          // this.SPEED /= 2;
          this.HEALTH *= 30;
          this.DAMAGE *= 7;
          this.SHIELD *= 0;
          (this.REGEN /= 7),
            //this.FOV *= 1.5;
            (this.DENSITY *= 6);
          if (this.maxChildren > 0) Math.ceil((this.maxChildren *= 2));
        }
        if (this.skill.score < 1000000) {
          this.skill.score = 1000000;
          this.skill.points += 23;
          // this.isBoss = true;
        }
      }
      if (c.bossStage === 0 && room["dom2"].length > 0) {
        c.bossStage += 1;
        c.CONSIDER_PLAYER_TEAM_LOCATION = false;
        c.PLAYER_SPAWN_LOCATION = "bos0";
        sockets.broadcast(
          "Pendekot: Threat detected, all nearby T1-T2 troops advance to the area."
        );
        for (let i = 0; i < 4; i++) {
          let o = new Entity(room.type("bos0"));
          o.define(Class[ran.choose(["AutomatedBetaPentagon", "exorcistor"])]);
          o.team = -100;
        }
      }
      let census = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      room.dominators.forEach((o) => {
        if (o.team === -100) {
          census[0]++;
        } else {
          census[-o.team]++;
        }
      });
      if (c.bossStage === 1 && census[2] > 1) {
        c.bossStage += 1;
        c.PLAYER_SPAWN_LOCATION = "bos1";
        sockets.broadcast("Pendekot: This is strange.");
        setTimeout(() => {
          sockets.broadcast("Pendekot: All of your vitals are out of line.");
          setTimeout(() => {
            sockets.broadcast("Pendekot: Yet your still alive.");
            setTimeout(() => {
              sockets.broadcast("Pendekot: Let me see.");
              c.SPAWN_VOIDLORD_ENEMIES = true;
              setTimeout(() => {
                sockets.broadcast(
                  "Pendekot: No...this cant...I need to retest, this cant be right"
                );
                for (let i = 0; i < 3; i++) {
                  let o = new Entity(room.type("bos1"));
                  o.define(
                    Class[
                      ran.choose([
                        "nestkeep",
                        "nestward",
                        "AutomatedAlphaPentagon",
                      ])
                    ]
                  );
                  o.team = -100;
                }
              }, 5000);
            }, 5000);
          }, 5000);
        }, 5000);
      }
      if (c.bossStage === 2 && census[2] > 5) {
        c.bossStage += 1;
        c.PLAYER_SPAWN_LOCATION = "bos2";
        sockets.broadcast(
          "Pendekot: A mutated strain of the fallen virus. A more durable and aggressive version. This must have been done by CX."
        );
        setTimeout(() => {
          sockets.broadcast(
            "Pendekot: Hurry, advance the nesters! We can't let them in the lab!"
          );
        }, 5000);
        for (let i = 0; i < 2; i++) {
          let o = new Entity(room.type("bos2"));
          o.define(Class.nestkeep);
          o.team = -100;
          o.ignoreCollision = false;
        }
        for (let i = 0; i < 1; i++) {
          let o = new Entity(room.type("bos2"));
          o.define(Class.nestward);
          o.team = -100;
          o.ignoreCollision = false;
        }
        for (let i = 0; i < 1; i++) {
          let o = new Entity(room.type("bos2"));
          o.define(Class.nestguard);
          o.team = -100;
          o.ignoreCollision = false;
        }
        for (let i = 0; i < 1; i++) {
          let o = new Entity(room.type("bos2"));
          o.define(Class.legnestkeep);
          o.team = -100;
          o.ignoreCollision = false;
        }
      }
      if (c.bossStage === 3 && census[2] >= 8) {
        c.bossStage += 1;
        c.PLAYER_SPAWN_LOCATION = "dom0";
        sockets.broadcast(
          "Pendekot: I have no other choice. If i must die protecting my work..."
        );
        setTimeout(() => {
          sockets.broadcast("Pendekot: THEN SO BE IT!");
          setTimeout(() => {
            sockets.broadcast("The portal has turned a strange color...");
            setTimeout(() => {
              sockets.broadcast(
                "Pendekot: PREPARE TO FEEL THE WRATH OF MY MACHINES!"
              );
            }, 5000);
          }, 2500);
        }, 5000);
        for (let i = 0; i < 4; i++) {
          let o = new Entity(room.type("prf0"));
          o.define(Class.PentagonCloser);
          o.team = -100;
          o.specialEffect = "dieWall";
          o.ignoreCollision = true;
        }
        for (let i = 0; i < 2; i++) {
          let o = new Entity(room.type("prf0"));
          o.define(Class.GreaterPentagonCloser);
          o.team = -100;
          o.specialEffect = "dieWall";
          o.ignoreCollision = true;
        }
        for (let i = 0; i < 2; i++) {
          let o = new Entity(room.type("prf0"));
          o.define(Class.LesserPentagonCloser);
          o.team = -100;
          o.specialEffect = "dieWall";
          o.ignoreCollision = true;
        }
        for (let i = 0; i < 1; i++) {
          let o = new Entity(room.type("prf0"));
          o.define(Class.pendekot);
          o.HEALTH *= 0.95;
          o.DAMAGE *= 2;
          o.team = -100;
          o.specialEffect = "dieWall";
          o.ignoreCfalseion = true;
        }
        for (let i = 0; i < 1; i++) {
          let o = new Entity(room.type("bos3"));
          o.define(Class.CX2);
          o.team = -2;
          o.HEALTH *= 3;
          o.specialEffect = "dieWall";
          o.ignoreCfalseion = true;
        }
        for (let i = 0; i < 1; i++) {
          let o = new Entity(room.type("bos3"));
          o.define(Class.zomblord2);
          o.team = -2;
          o.HEALTH *= 3;
          o.specialEffect = "dieWall";
          o.ignoreCfalseion = true;
        }
      }
      if (
        this.label === "Void Portal" &&
        this.team === -100 &&
        c.bossStage === 4 &&
        this.color !== 13
      ) {
        this.color = 13;
      }
      if (c.enableHell) {
        this.x = room.type("prf0").x;
        this.y = room.type("prf0").y;
        this.isGate = false;
        this.isDominator = false;
        this.isWall = false;
        this.godMode = false;
        this.sendMessage("Stfellas has sent you and the fort elsewhere.");
        this.kill();

        setTimeout(() => {
          c.enableHell = false;
        }, 3500);
      }
    }
    if (c.MODE === "theRestless") {
      if (this.isPlayer && this.team === -3 && this.label !== "Spectator") {
        if (this.SIZE < 17) {
          this.define({
            LABEL: "Lord",
            SIZE: 17,
            DANGER: 9,
          });
          if (this.isSmasher) {
            this.define({
              SKILL_CAP: [
                15, //reload
                0, //Penetration
                0, //bullet hp
                0, //bullet dmg
                0, //bullet spd
                15, //shield
                15, //body dmg
                15, // body hp
                15, //shield regen
                15, //body speed
              ],
            });
          }
          // this.SPEED /= 2;
          this.HEALTH *= 10;
          this.DAMAGE *= 5;
          this.SHIELD *= 5;
          (this.REGEN *= 2),
            //this.FOV *= 1.5;
            (this.DENSITY *= 4);
          if (this.maxChildren > 0) Math.ceil((this.maxChildren *= 1.5));
        }
        if (this.skill.score < 0) {
          //this.skill.score = 200000;
          this.skill.points += 20;
          // this.isBoss = true;
        }
      }
    }
    if (c.MODE === "theInfestation") {
      if (this.isPlayer && this.team === -2 && this.label !== "Spectator") {
        if (this.SIZE < 20) {
          this.define({
            // LABEL: "Lord",
            SIZE: 20,
            DANGER: 9,
          });
          if (this.isSmasher) {
            switch (this.label) {
              case "Auto-Smasher":
                this.define({
                  SKILL_CAP: [
                    15, //reload
                    15, //Penetration
                    15, //bullet hp
                    15, //bullet dmg
                    15, //bullet spd
                    15, //shield
                    15, //body dmg
                    15, // body hp
                    15, //shield regen
                    15, //body speed
                  ],
                });
                break;
              case "Collider":
                this.define({
                  SKILL_CAP: [
                    15, //reload
                    0, //Penetration
                    15, //bullet hp
                    15, //bullet dmg
                    0, //bullet spd
                    15, //shield
                    15, //body dmg
                    15, // body hp
                    15, //shield regen
                    15, //body speed
                  ],
                });
                break;
              default:
                this.define({
                  SKILL_CAP: [
                    15, //reload
                    0, //Penetration
                    0, //bullet hph
                    0, //bullet dmghh
                    0, //bullet spd
                    15, //shield
                    15, //body dmg
                    15, // body hp
                    15, //shield regen
                    15, //body speed
                  ],
                });
            }
          } else {
            this.define({
              SKILL_CAP: [
                15, //reload
                15, //Penetration
                15, //bullet hph
                15, //bullet dmg
                15, //bullet spd
                0, //shield
                15, //body dmg
                15, // body hp
                0, //shiehld regen
                15, //body speed
              ],
            });
          }
          // this.SPEED /= 2;
          this.HEALTH *= 15;
          this.DAMAGE *= 4;
          this.SHIELD *= 0;
          (this.REGEN /= 5),
            //this.FOV *= 1.5;
            (this.DENSITY *= 4);
          if (this.maxChildren > 0) Math.ceil((this.maxChildren *= 1.5));
        }
        if (this.skill.score < 200000) {
          this.skill.score = 200000;
          this.skill.points += 13;
          // this.isBoss = true;
        }
      }
      if (this.isAnubis) {
        c.anubLocX = this.x;
        c.anubLocY = this.y;
      }
      if (
        this.label === "Anti-Virus" &&
        this.DAMAGE !== c.playerCount + 10 - c.cxPowerDrain
      ) {
        this.DAMAGE = c.playerCount + 10 - c.cxPowerDrain;
      }
      let census = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      room.dominators.forEach((o) => {
        if (o.team === -100) {
          census[0]++;
        } else {
          census[-o.team]++;
        }
      });
      if (c.bossStage === 0 && census[2] > 0) {
        sockets.broadcast(
          "Anubis: Come bretheren, the time has come to be lost no more!"
        );
        c.bossStage += 1;
        c.CONSIDER_PLAYER_TEAM_LOCATION = false;
        c.PLAYER_SPAWN_LOCATION = "bos0";
        sockets.broadcast(
          "Valrayvn: Hmmm, an outpost is down. I am sending troops to investigate it."
        );
        for (let i = 0; i < 4; i++) {
          let o = new Entity(room.type("bos0"));
          o.define(
            Class[
              ran.choose([
                "summoner",
                "enchantress",
                "sorcerer",
                "elite_skimmer",
                "elite_machine",
                "elite_destroyer",
                "elite_battleship",
                "elite_gunner",
                "elite_spawner",
              ])
            ]
          );
          o.team = -100;
        }
      }
      if (c.bossStage === 1 && census[2] > 1) {
        c.bossStage += 1;
        c.PLAYER_SPAWN_LOCATION = "bos1";
        sockets.broadcast("CX: The investigation crew isn't responding.");
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: What? Surely someone must have survived!?"
          );
          setTimeout(() => {
            sockets.broadcast("CX: No. But We did recieve a transmission...");
            setTimeout(() => {
              sockets.broadcast(
                "[GR##N AND GR#Y TANKS ARE SL##GHTERING US AND R#VIVING OUR TR##PS AGAINST US, SAVE YOURS#####---]"
              );
              setTimeout(() => {
                sockets.broadcast(
                  "Valrayvn: That sounds like the Fallen...HOW THE HELL DID THEY ESCAPE DIEP!?"
                );
                setTimeout(() => {
                  sockets.broadcast(
                    "CX: I don't know, but if we don't act now Arras will be destroyed."
                  );
                  setTimeout(() => {
                    sockets.broadcast("Valrayvn: KILL THEM!");
                    for (let i = 0; i < 4; i++) {
                      let o = new Entity(room.type("bos1"));
                      o.define(
                        Class[
                          ran.choose([
                            "defender",
                            "elite_fortress",
                            "elite_spinner",
                            "elite_sprayer",
                            "nestkeep",
                            "nestward",
                            "exorcistor",
                            "defector",
                            "witch",
                            "mortarLordCenturion",
                            "hiveLordCenturion",
                          ])
                        ]
                      );
                      o.team = -100;
                    }
                  }, 5000);
                }, 5000);
              }, 5000);
            }, 5000);
          }, 5000);
        }, 5000);
      }
      if (c.bossStage === 2 && census[2] > 5) {
        sockets.broadcast("Anubis: We shall finally have a world just for us!");

        c.bossStage += 1;
        c.PLAYER_SPAWN_LOCATION = "bos2";
        setTimeout(() => {
          sockets.broadcast(
            "CX: Valrayvn, Arras will not survive if this continues."
          );
        }, 5000);
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: We will survive, our mission is too important to fail."
          );
          setTimeout(() => {
            sockets.broadcast("CX: Hm.....");
            c.SANCTUARIES = true;
            c.SIEGE = true;
          }, 5000);
        }, 1000);
        for (let i = 0; i < c.playerCount * 3; i++) {
          let o = new Entity(room.type("bos2"));
          o.define(Class.arenaguard);
          o.team = -100;
          o.impervious = true;
          o.ignoreCollision = false;
        }
        for (let i = 0; i < Math.ceil(c.playerCount / 2) + 1; i++) {
          let o = new Entity(room.type("bos2"));
          o.define(Class.damagedArenaCloser);
          o.team = -100;
          o.impervious = true;
          o.ignoreCollision = false;
        }
        for (let i = 0; i < 1; i++) {
          let o = new Entity(room.type("bos2"));
          o.define(Class.arenaslayer);
          o.team = -100;
          o.impervious = true;
          o.ignoreCollision = false;
        }
      }
      if (c.bossStage === 3 && census[2] >= 8) {
        c.unlockClasses = true;
        entities.forEach((boss) => {
          if (boss.tier === 1) {
            boss.x = c.anubLocX;
            boss.y = c.anubLocY;
          }

          if (boss.isPlayer && boss.label !== "Spectator") {
            boss.sendMessage("You have been gifted Anubis's Blessing.");
          }
        });
        sockets.broadcast("Anubis: PATHETIC FOOLS, WE CANNOT BE DEFEATED!");

        c.bossStage += 1;
        c.PLAYER_SPAWN_LOCATION = "dom0";
        setTimeout(() => {
          sockets.broadcast("CX: I have no choice, goodbye Valrayvn.");
          setTimeout(() => {
            sockets.broadcast("Valrayvn: CX WHAT ARE YOU DOING...NOOOOOOOO!!");
            setTimeout(() => {
              sockets.broadcast("The portal has turned a strange color...");
              setTimeout(() => {
                sockets.broadcast(
                  "CX: OK YOU SCUM, NEXT TIME YOU FALL, I WILL MAKE SURE YOU STAY PUT!"
                );
              }, 5000);
            }, 2500);
          }, 5000);
        }, 5000);
        for (let i = 0; i < c.playerCount; i++) {
          let o = new Entity(room.type("vpr0"));
          o.define(Class.damagedArenaCloser);
          o.team = -100;
          o.impervious = true;
          o.ignoreCollision = false;
        }
        for (let i = 0; i < Math.ceil(c.playerCount / 2); i++) {
          let o = new Entity(room.type("vpr0"));
          o.define(Class.arenaslayer);
          o.team = -100;
          o.impervious = true;
          o.ignoreCollision = false;
        }
        for (let i = 0; i < 1; i++) {
          let o = new Entity(room.type("vpr0"));
          o.define(Class.CX);
          o.team = -100;
          o.impervious = true;
          o.ignoreCollision = false;
        }
      }
      if (
        this.label === "Void Portal" &&
        this.team === -100 &&
        c.bossStage === 4 &&
        this.color !== 13
      ) {
        this.color = 13;
      }
      if (c.enableHell) {
        this.x = room.type("vpr0").x;
        this.y = room.type("vpr0").y;
        this.isGate = false;
        this.isDominator = false;
        this.isWall = false;
        this.godMode = false;
        this.sendMessage(
          "You have been sucked a into strange new world...Ranar's Prophecy..."
        );
        this.kill();

        setTimeout(() => {
          c.enableHell = false;
        }, 3500);
      }
    }
    if (this.invuln !== true && !this.isRanar) {
      if (this.isBoss) {
        this.damage = this.DAMAGE * this.skill.atk;
      }
    }
    if (this.isGate) {
      if (
        c.MODE === "theExpanse" ||
        c.MODE === "theControlled" ||
        c.MODE === "theAwakening"
      ) {
        this.health.max = 999999999999999999999999999999999999999999999999999999999999999999;
        this.settings.drawHealth = false;
        this.health.amount = this.health.max;
      }
      // if (c.MODE === "theDenied") this.damage /= 3;
    }
    if (c.MODE === "theControlled") {
      if (this.isDominator && this.REGEN > 0) {
        this.REGEN = 0;
      }
      if (this.label === "Rift Shaper") {
        this.damage = 2 + c.playerCount / 2;
        this.skill.dam = c.playerCount / 7.5 + 2;
        this.skill.pen = c.playerCount / 5 + 2.5;
        this.skill.str = c.playerCount / 2.5 + 3;
        this.skill.spd = c.playerCount / 5 + 2;
      }
      if (this.label === "Care Taker") {
        this.damage = 2 + c.playerCount / 2;
        this.skill.dam = c.playerCount / 7.5 + 3;
        this.skill.pen = c.playerCount / 7.5 + 3;
        this.skill.str = c.playerCount / 5 + 3;
        this.skill.spd = c.playerCount / 10 + 2;
      }
      if (this.label === "Peace Keeper") {
        this.damage = 2 + c.playerCount / 2;
        this.skill.dam = c.playerCount / 7.5 + 3;
        this.skill.pen = c.playerCount / 7.5 + 3;
        this.skill.str = c.playerCount / 5 + 3;
        this.skill.spd = c.playerCount / 10 + 2;
      }
      if (this.label === "Mechanical Menace") {
        this.damage = 2 + c.playerCount / 2;
        this.skill.dam = c.playerCount / 7.5 + 2;
        this.skill.pen = c.playerCount / 5 + 2.5;
        this.skill.str = c.playerCount / 2.5 + 3;
        this.skill.spd = c.playerCount / 10 + 2;
      }
      if (
        c.fuckYouAnomalies &&
        (this.type === "thrasher" || this.type === "voidlordBoss")
      ) {
        this.kill();
      }
      if (c.bossStage === 0) {
        if (!c.oneTimeMessage) {
          setTimeout(() => {
            c.bossStage += 1;
            sockets.broadcast("Sardonyx: (And so it begins...)");
          }, 5000);
        }
        c.oneTimeMessage = true;

        if (this.label === "Void Portal") {
          this.kill();
        }
      }
      let census = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      room.dominators.forEach((o) => {
        if (o.team === -100) {
          census[0]++;
        } else {
          census[-o.team]++;
        }
      });
      if (census[4] >= 1 && c.bossStage === 1) {
        c.bossStage += 1;
        sockets.broadcast(
          "Highlord Dominique: Guys, the void creatures returned and they are wrecking our ship!"
        );
        setTimeout(() => {
          sockets.broadcast(
            "Highlord Kairo: Goddamn it, fine, time to exterminate these void creatures."
          );
          makeEventBosses();
        }, 5000);
        makeRepairMen();
      }

      if (census[4] >= 2 && c.bossStage === 2) {
        c.bossStage += 1;
        sockets.broadcast("Highlord Dominique: Akavir, help!");
        setTimeout(() => {
          sockets.broadcast(
            "Highlord Akavir: I suppose it's time to have some fun."
          );
          makeEventBosses();
        }, 5000);
        makeRepairMen();
      }
      if (census[4] >= 3 && c.bossStage === 3) {
        c.bossStage += 1;
        c.BOTS += 2;
        sockets.broadcast(
          "Highlord Dominique: Great, I'm the last line of defense..."
        );
        setTimeout(() => {
          sockets.broadcast(
            "Highlord Dominique: IF I'M GONNA DIE, I'M TAKING A BUNCH OF YOU VOID-SCUM WITH ME!"
          );
          makeEventBosses();
        }, 5000);
        makeRepairMen();
      }
      if (census[4] >= 4 && c.bossStage === 4) {
        c.bossStage += 1;
        sockets.broadcast(
          "Sardonyx: I HAVE RETURNED! Thanks to your foolishness of opposing me, we have become a powerful force!"
        );
        let o = new Entity(room.type("bos0"));
        o.define(Class.sardonyx);
        o.team = -4;
        c.SPAWN_VOIDLORD_ENEMIES = true;
        c.killWalls = true;
        setTimeout(() => {
          sockets.broadcast(
            "Highlord Albatar: You sound like a lame comic book villan, I suppose it's time for me to put you in the dirt!"
          );
          c.killWalls = true;
          makeEventBosses();
        }, 5000);
        let gridWidth = room.width / room.xgrid;

        let gridHeight = room.height / room.ygrid;
        let placePortals = (loc, team, grid) => {
          let o = new Entity(loc);
          o.define(Class.voidportal);

          if (team) {
            o.team = -team;
            o.color = [10, 18, 7, 19][team - 1];
          } else {
            o.team = -100;
            o.color = 3;
          }
          o.targetable = false;
          o.settings.drawHealth = false;
          if (c.MODE === "theInfestation") {
            o.godMode = true;
          }
        };
        for (let i = 0; i < 5; i++) {
          if (room["vpr" + i]) {
            room["vpr" + i].forEach((loc) => {
              placePortals(loc, i, {
                x: Math.floor(loc.x / gridWidth),
                y: Math.floor(loc.y / gridHeight),
              });
            });
          }
        }
      }
    }
    if (
      (this.isDominator && c.MODE === "territoryControl") ||
      (this.isDominator && c.MODE === "theExpanse")
    ) {
      this.health.max = 0.01;
      this.skill.score = 1000;
      this.settings.givesKillMessage = false;
      if (c.MODE === "theExpanse") this.dangerValue = -1;
    }
    if (this.label === "Sanctuary" && this.team === -100) {
      this.define(Class.dominator);
    }
    if (
      this.label === "Dominator" &&
      c.SANCTUARIES === true &&
      this.team !== -100
    ) {
      this.define(
        Class[ran.choose(["sanct_single", "sanct_trap", "sanct_nail"])]
      );
      if (c.MODE === "kingOfHill") {
        this.define(Class.sanct);
      }
    }

    if (
      (c.killWalls === true && this.type === "squareWall") ||
      (c.killWalls === true &&
        c.MODE === "theControlled" &&
        (this.isMazeWall || this.isGate || this.isWall))
    ) {
      if (this.team !== -100) {
        this.kill();
        this.destroy();
      }
      setTimeout(() => {
        c.killWalls = false;
      }, 1);
    }
    if (c.DEADLY_BORDERS && !this.impervious) {
      let loc = { x: this.x, y: this.y };

      if (
        (this.team !== -101 && room.isIn("edge", loc)) ||
        (this.team !== -101 && !room.isInRoom(this))
      ) {
        if (!this.trueDev && this.label !== "Spectator") {
          this.damageRecieved = this.health.max / 10;
          this.invuln = false;
        }
      }
    }

    if (this.specialEffect === "denied" && c.wave > 0) {
      this.name = "Player Lives Remaining: " + c.ranarLoseCondition;
      if (c.wave > 0 && this.skill.score < 5000000) {
        this.settings.leaderboardable = true;
      }
    }
    if (
      this.master.invuln &&
      !this.targetable &&
      this.type !== "food" &&
      !this.master.isRanar
    ) {
      this.kill();
    }
    if (room.width < 100) room.width = 100;
    if (room.height < 100) room.height = 100;
    if (c.MODE === "execution" && c.doItNow) {
      roomShrinkage();
      if (room.width <= 100 || room.height <= 100) {
        c.doItNow = false;
        closeArena();
      }
      if (c.startingClass === "basic") {
        c.startingClass = "spectator";
        c.BOTS = 0;
      }
      if (!c.shift) {
        c.thing = 0;
        entities.forEach((entity) => {
          if (entity.isPlayer || entity.isBot) {
            if (entity.type === "tank" && !entity.isDead()) {
              c.thing += 1;
            } /*else {
          entity.kill();
           entity.destroy();
           }*/
          }
        });
        util.log(c.thing);
        c.shift = true;
        setTimeout(() => {
          c.shift = false;
        }, 2000);
      }
      if (c.thing === 1) {
        entities.forEach((entity) => {
          if (entity.isPlayer || entity.isBot) {
            if (entity.type === "tank" && !entity.isDead()) {
              sockets.broadcast(
                entity.name + " has survived and won the game!"
              );
              entity.skill.score +=
                100000 * (entity.killCount.solo + entity.killCount.assists);
            }
          }
        });
        closeArena();
        c.doItNow = false;
      } else if (c.thing <= 0) {
        sockets.broadcast("No one has survived!");
        closeArena();
        c.doItNow = false;
      }

      /* if (c.goNow) {
        entities.forEach((e) => {
          if (e.isPlayer || e.isBot) {
            if (e.label !== "Spectator" && c.doItNow && e.health.amount > 0) {
              sockets.broadcast(e.name + " has survived and won the game!");

              closeArena();
              c.doItNow = false;
            }
          }
        });
      }*/
    }
    if (c.MODE === "theRestless") {
      if (!c.eventProgress && this.team === -3 && this.type === "squareWall") {
        this.kill();
      }
      if (c.eventProgress) {
        //c.killWalls = true;

        if (c.wave === 0) {
          c.ranarLoseCondition = c.playerCount * 5;
        }
        if (this.isWall && this.team === -1) {
          this.kill();
        }

        /*   if (this.type === "squareWall" && c.wave >= 13) {
          this.destroy();
        }
        if (this.isWall && !room.isIn("frt0", this)) {
          this.kill();
        }*/
        /* if (this.master.invuln && this.master !== this && this.isRanar) {
          this.invuln = false;
          this.kill();
          this.destroy();
        }*/
        if (this.eliteBoss) {
          if (this.runAway) {
            //  this.FOV = 0;
            if (room.isIn("bos0", this)) {
              this.invuln = true;
            }
            if (!room.isIn("bos0", this)) {
              this.facingType = "smoothWithMotion";
              this.controllers = [new io_guard1(this)];
            }
          }

          if (!this.runAway && room.isIn("bos0", this)) {
            this.facingType = "smoothToTarget";
            this.controllers = [
              new io_nearestDifferentMaster(this),
              new io_minion(this),
            ];
            //  this.addController(new io_moveInCircles(this));

            this.invuln = false;
          }
          if (this.color !== 10) {
            if (this.label === "Dark Fate") {
              this.resist = c.playerCount / 3 + 1;
              this.damage = c.playerCount + 5;
              this.skill.dam = c.playerCount / 10 + 3;
              this.skill.pen = c.playerCount / 6 + 3;
              this.skill.str = c.playerCount / 6 + 3;
              this.skill.spd = c.playerCount / 10 + 2;
            }
            if (this.label === "Grim Truth") {
              this.resist = c.playerCount / 3 + 1;
              this.damage = c.playerCount * 2 + 5;
              //this.skill.rld = (c.playerCount/5) - 1.75;
              this.skill.dam = c.playerCount / 10 + 3;
              this.skill.pen = c.playerCount / 6 + 3;
              this.skill.str = c.playerCount / 6 + 3;
              this.skill.spd = c.playerCount / 10 + 3;
            }
          }
          if (
            this.health.amount <= this.health.max * 0.75 &&
            c.wave === 0 &&
            this.haltActions !== true
          ) {
            c.wave += 1;
            this.color = 9;
            this.haltActions = true;
            sockets.broadcast("Sardonyx: Become one with the void!");
            setTimeout(() => {
              sockets.broadcast(
                "Akavir: Watch out, Ranar is powering up! Defend yourself!"
              );
            }, 6000);
            setTimeout(() => {
              sockets.broadcast(
                "Ranar: TWILIGHT?! I thought I had destroyed you!"
              );
            }, 12000);
            setTimeout(() => {
              let o = new Entity(room.randomType("bos0"));
              o.master = this;
              o.invuln = false;
              o.stayTeam = false;
              o.define(Class.sardonyxPower1);
              o.team = -100;
              o.maxChildren = Math.ceil(c.playerCount * 1.5);
              o.SIZE = this.SIZE;
              o.color = 1;
              o.tp = true;
            }, 15000);
            setTimeout(() => {
              this.haltActions = false;
            }, 25000);
          }
          if (
            this.health.amount <= this.health.max * 0.5 &&
            c.wave === 1 &&
            !this.haltActions
          ) {
            this.goBack = true;
            this.runAway = true;
            sockets.broadcast(
              "Ranar: You shouldn't have fought back, now I am going to have to inflict some pain!"
            );

            c.wave += 1;
            this.haltActions = true;
          }
          if (this.goBack && c.wave === 2) {
            this.goBack = false;
            c.wave += 1;
            let loc = room.type("bos0");
            this.runAway = true;
            this.refreshBodyAttributes();
            this.collisionArray = [];
            c.enemyCount = 1;
            sockets.broadcast(
              "Ranar: Sad that Valrayvn is so busy, she would have enjoyed this!"
            );
            setTimeout(() => {
              setTimeout(() => {
                sockets.broadcast(
                  "Twilight: Look out, Ranar is summoning minions!"
                );
              }, 4000);
              for (let i = 0; i < c.playerCount * 4 + 4; i++) {
                let o = new Entity(room.randomType("port"));

                o.rarity = Math.random() * 300;

                if (o.rarity > 150) {
                  o.define(
                    Class[
                      ran.choose([
                        "auto3Guard",
                        "spawnerGuard",
                        "bansheeGuard",
                        "eggSorcererSentry",
                        "eggAutoSentry",
                        "eggBasicSentry",
                      ])
                    ]
                  );
                }
                if (o.rarity <= 150 && o.rarity > 75) {
                  o.define(
                    Class[
                      ran.choose([
                        "beekeeperProtector",
                        "swarmerProtector",
                        "cruiserProtector",
                        "squareTwinSentry",
                        "squareSniperSentry",
                        "squareAuto2Sentry",
                      ])
                    ]
                  );
                }
                if (o.rarity <= 75 && o.rarity > 25) {
                  o.define(
                    Class[
                      ran.choose([
                        "commanderKeeper",
                        "directorKeeper",
                        "overKeeper",
                        "triangleSwarmSentry",
                        "triangleTrapperSentry",
                        "trianglePounderSentry",
                      ])
                    ]
                  );
                }
                if (o.rarity <= 25) {
                  o.define(
                    Class[
                      ran.choose([
                        "skimmerSentinel",
                        "crossbowSentinel",
                        "minigunSentinel",
                        "pentagonSwarmerSentry",
                        "pentagonTriAngleSentry",
                        "pentagonHunterSentry",
                      ])
                    ]
                  );
                }
                o.accel.x + Math.random * 0.1 - 0.2;
                o.accel.y + Math.random * 0.1 - 0.2;
                o.facing = ran.randomAngle();
                o.team = -100;
                o.enemy = true;
                o.REGEN = -1;
                o.invuln = false;
                o.FOV *= 2;
                o.addController(new io_guard1(o));
                o.refreshBodyAttributes();
                c.enemyCount += 1;
              }
              c.enemyCount -= 1;
            }, 12000);
          }
          if (c.enemyCount <= 0 && c.wave === 3) {
            this.haltActions = false;
            this.runAway = false;
            c.wave += 1;
          }
          if (
            this.health.amount <= this.health.max * 0.25 &&
            c.wave === 4 &&
            !this.haltActions
          ) {
            c.wave += 1;
            this.color = 3;
            this.haltActions = true;
            sockets.broadcast(
              "Ranar: Agh! You are really starting to annoy me! DIE!"
            );
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: Watch out, Ranar is preparing a powerful attack!"
              );
            }, 6000);
            setTimeout(() => {
              sockets.broadcast(
                "Ranar: Shut up! It will be over soon, so just accept your death in silence!"
              );
            }, 12000);
            setTimeout(() => {
              let o = new Entity(room.randomType("bos0"));
              o.master = this;
              o.stayTeam = false;
              o.color = 3;
              o.define(Class.ranarPower2);
              o.team = -100;
              o.SIZE = this.SIZE;
              o.invuln = false;
              o.skill.dam = 1 + c.playerCount * 2.5;
              o.tp = true;
            }, 15000);
            setTimeout(() => {
              this.haltActions = false;
            }, 25000);
          }

          if (this.goBack && c.wave === 6) {
            this.goBack = false;
            c.enemyCount = 1;
            c.wave += 1;
            this.refreshBodyAttributes();
            this.collisionArray = [];
            /*  makeTiling();
            c.DEADLY_BORDERS = true;*/
            this.runAway = true;
            sockets.broadcast(
              "Twilight: Oh hell, Ranar transformed! Okay give me a moment, I'll help!"
            );
            setTimeout(() => {
              sockets.broadcast(
                "Twilight has regained strength and has joined you in your fight!"
              );
            }, 6000);
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: Okay, choose your class and kick his barrel!"
              );
              c.unlockClasses = true;
              c.startingClass = "highlordLegendaryClasses";
            }, 12000);
            c.BOTS = c.playerCount * 3;
            setTimeout(() => {
              for (let i = 0; i < Math.round(c.playerCount / 2); i++) {
                let o = new Entity(room.randomType("port"));
                o.define(
                  Class[
                    ran.choose([
                      "elite_destroyer",
                      "elite_gunner",
                      "arenaguard",
                      "elite_skimmer",
                      "elite_spawner",
                      "sorcerer",
                      "summoner",
                      "enchantress",
                      "elite_battleship",
                    ])
                  ]
                );
                o.accel.x + Math.random * 0.1 - 0.2;
                o.accel.y + Math.random * 0.1 - 0.2;
                o.facing = ran.randomAngle();
                o.team = -100;
                o.enemy = true;
                o.invuln = false;
                o.FOV = 50000;
                o.addController(new io_guard1(o));
                o.refreshBodyAttributes();
                c.enemyCount += 1;
              }
              c.enemyCount -= 1;
              c.BOTS = 0;
            }, 22000);
          }
          if (c.enemyCount < 1 && c.wave === 7) {
            this.haltActions = false;
            this.runAway = false;
            c.BOTS = 0;
            c.wave += 1;
          }
          if (
            this.health.amount <= this.health.max * 0.75 &&
            c.wave === 8 &&
            !this.haltActions
          ) {
            c.wave += 1;
            this.color = 33;
            this.haltActions = true;
            sockets.broadcast(
              "Ranar: By Valrayvn's will you shall be destroyed!"
            );
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: Something sounds off about him...he is preparing another attack!"
              );
            }, 6000);
            setTimeout(() => {
              for (let i = 0; i < c.playerCount; i++) {
                let o = new Entity(room.randomType("bos0"));
                o.master = this;
                o.stayTeam = false;
                o.color = 33;
                o.skill.str = 2 + c.playerCount * 2;
                o.skill.spd = 0.5 + c.playerCount / 2;
                o.define(Class.ranarPower4);
                o.team = -100;
                o.SIZE = this.SIZE;
                o.invuln = false;
                o.tp = true;
              }
              c.SPAWN_SENTINEL = true;
            }, 9000);
            setTimeout(() => {
              this.haltActions = false;
            }, 19000);
          }
          if (
            this.health.amount <= this.health.max * 0.5 &&
            c.wave === 9 &&
            !this.haltActions
          ) {
            this.goBack = true;
            this.runAway = true;
            c.wave += 1;
          }
          if (this.goBack && c.wave === 10) {
            this.goBack = false;
            c.enemyCount = 1;
            c.wave += 1;
            this.refreshBodyAttributes();
            this.collisionArray = [];
            this.runAway = true;
            if (c.playerCount >= 5)
              sockets.broadcast(
                "Ranar: I see you have a proper gang, thats cool, I have too :D."
              );
            else sockets.broadcast("Ranar: Witness my supreme POWER!");
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: Oh no! Ranar is summoning some VERY strong enemies!"
              );
            }, 6000);
            setTimeout(() => {
              for (let i = 0; i < Math.ceil(c.playerCount * 1.25); i++) {
                let o = new Entity(room.randomType("spw5"));
                switch (i) {
                  case 0:
                    o.define(Class.kristaps);
                    break;
                  case 1:
                    o.define(Class.duodeci);
                    break;
                  case 2:
                    o.define(Class.alexTheDemonical);
                    break;
                  case 3:
                    o.define(Class.johnathon);
                    break;
                  case 4:
                    o.define(Class.annoyingDog);
                    break;
                  case 5:
                    o.define(Class.xxtrianguli);
                    break;
                  case 6:
                    o.define(Class.chaser);
                    break;
                  case 7:
                    o.define(Class.powernoob);
                    break;
                  case 8:
                    o.define(Class.excaliber);
                    break;
                  case 9:
                    o.define(Class.possessor);
                    break;
                  case 10:
                    o.define(Class.icecream);
                    break;
                  case 11:
                    o.define(Class.rainOfAcid);
                    break;
                  case 12:
                    o.define(Class.pop64);
                    break;
                  default:
                    o.define(Class.arenaguard);
                }
                o.team = -100;
                o.enemy = true;
                o.invuln = false;
                o.FOV = 50000;
                o.addController(new io_guard1(o));
                o.refreshBodyAttributes();
                c.enemyCount += 1;
                o.REGEN = 0;
              }
              c.enemyCount -= 1;
            }, 10000);
          }

          if (c.enemyCount < 1 && c.wave === 11) {
            this.haltActions = false;
            this.runAway = false;
            c.wave += 1;
          }
          if (
            this.health.amount <= this.health.max * 0.25 &&
            c.wave === 12 &&
            !this.haltActions
          ) {
            c.wave += 1;
            this.color = 12;
            this.haltActions = true;
            sockets.broadcast(
              "Ranar: I will make sure to make you kneel before Valrayvn!"
            );
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: I recognize him, but I don't know how...oh sorry! He is using yet another attack, get FAR away from him!"
              );
            }, 6000);
            setTimeout(() => {
              let o = new Entity(room.randomType("bos0"));
              o.master = this;
              o.stayTeam = false;
              o.color = 12;
              o.define(Class.ranarPower5);
              o.RANGE += c.playerCount * 150;
              o.team = -100;
              o.SIZE = this.SIZE;
              o.invuln = false;
              o.tp = true;
            }, 9000);
            setTimeout(() => {
              this.haltActions = false;
            }, 19000);
          }
          if (
            this.health.amount <= this.health.max * 0.1 &&
            c.wave === 13 &&
            !this.haltActions
          ) {
            c.wave += 1;
            this.color = 32;
            this.haltActions = true;
            sockets.broadcast("???: We are endless.");
            setTimeout(() => {
              sockets.broadcast("Kairo: Stand your ground, he's powering up!");
            }, 6000);
            c.stopFoodSpawn = true;
            c.BOTS = c.playerCount * 2;
            setTimeout(() => {
              for (let i = 0; i < 6; i++) {
                let o = new Entity(room.randomType("bos0"));
                o.master = this;
                o.stayTeam = false;
                switch (c.shift) {
                  case 1:
                    o.color = 3;
                    o.define(Class.sardonyxPower2);
                    o.team = -100;
                    o.SIZE = this.SIZE;
                    o.invuln = false;
                    o.skill.dam = 1 + c.playerCount / 2;
                    o.tp = true;
                    break;
                  case 2:
                    o.color = 13;
                    o.define(Class.sardonyxPower1);
                    c.SPAWN_CRASHERS = true;
                    o.team = -100;
                    o.SIZE = this.SIZE;
                    o.invuln = false;
                    o.maxChildren = Math.ceil(1 + c.playerCount * 1.5);
                    o.fov = 50000;
                    o.tp = true;
                    break;
                  case 3:
                    o.color = 33;
                    o.skill.str = 2 + c.playerCount * 1.5;
                    o.skill.spd = 0.5 + c.playerCount / 3;
                    o.define(Class.sardonyxPower4);
                    o.team = -100;
                    o.SIZE = this.SIZE;
                    o.invuln = false;
                    o.tp = true;
                    break;
                  default:
                    o.define(Class.sardonyxPower0);
                    o.team = -100;
                    o.maxChildren = Math.ceil(c.playerCount / 4);
                    o.SIZE = this.SIZE;
                    o.color = 1;
                    o.tp = true;
                    c.shift = 0;
                }

                c.shift += 1;
              }
              c.stopFoodSpawn = false;
            }, 9000);
            setTimeout(() => {
              this.haltActions = false;
            }, 10000);
          }
          if (c.wave === 15 && !c.stop1 && !room.closed) {
            c.BOTS = 0;
            if (c.sardonyxLoseCondition >= c.playerCount * 5) {
              setTimeout(() => {
                sockets.broadcast("Albatar: Dammit!");
              }, 2000);
            }
            setTimeout(() => {
              sockets.broadcast("Akavir: Did we loose him...?");
            }, 4000);
            setTimeout(() => {
              sockets.broadcast("Kairo: No...this...");
            }, 8000);
            setTimeout(() => {
              sockets.broadcast(
                "Albatar: Our friend is dead, but it still remain."
              );
            }, 12000);
            setTimeout(() => {
              sockets.broadcast(
                "Kairo: Who the hell? Something just fled the scene."
              );
            }, 16000);
            setTimeout(() => {
              sockets.broadcast(
                "Dominique: ...Kairo, none of our concern right now."
              );
            }, 18000);
            setTimeout(() => {
              sockets.broadcast(
                "Dominique: We lost coldus, and until we have a way to kill whatever that this is, we're stuck."
              );
            }, 20000);
            setTimeout(() => {
              sockets.broadcast(
                "Albatar: There is nothing else we can do for now."
              );
            }, 26000);
            setTimeout(() => {
              sockets.broadcast("Kairo: Then what now?!");
            }, 30000);
            setTimeout(() => {
              sockets.broadcast("Dominique: Plan B.");
            }, 34000);
            setTimeout(() => {
              sockets.broadcast(
                "Akavir: Soldier, head to a dominator so we can transport you back to base."
              );
            }, 38000);
            c.stop1 = true;
          }

          if (c.wave === 16) {
            let o = new Entity(room.randomType("dom3"));
            o.define(Class.voidportal);
            o.godMode = true;
            o.team = -1;
            o.color = 10;
            c.wave += 1;
            sockets.broadcast(
              "Akavir: We lost Coldus...mission failed, head back to base."
            );
          }
        }

        if (this.tp) {
          this.x = this.master.x;
          this.y = this.master.y;
        }
      }
    }
    if (c.MODE === "theDenied") {
      if (this.isPlayer && !this.flip) {
        switch (this.label) {
          case "Rebel":
            this.color = 10;
            break;
          case "Necro Tyrant":
            this.color = 18;
            break;
          case "Operator":
            this.color = 7;
            break;
          case "Reaper":
            this.color = 19;
            break;
            this.flip = true;
        }
      }
      if (
        !c.eventProgress &&
        this.team === -100 &&
        this.type === "squareWall"
      ) {
        this.kill();
      }
      if (c.eventProgress) {
        //c.killWalls = true;
        if (
          (this.type === "neutralBoss" || this.isEnemy) &&
          !this.isRanar &&
          c.wave > 1
        ) {
          if (room.isIn("wal0", this) || room.isIn("spw0", this)) {
            this.x = room.random().x;
            this.y = room.random().y;
          }
        }
        if (c.wave === 0) {
          c.ranarLoseCondition = c.playerCount * 5;
        }
        if (this.isWall && this.team === -1) {
          this.kill();
        }

        /*   if (this.type === "squareWall" && c.wave >= 13) {
          this.destroy();
        }
        if (this.isWall && !room.isIn("frt0", this)) {
          this.kill();
        }*/
        if (this.isTwilight) {
          if (
            c.wave >= 6 &&
            this.health.amount === this.health.max &&
            this.REGEN > -1
          ) {
            sockets.broadcast("Twilight has rejoined the fight!");
            this.invuln = false;
            this.intangibility = false;
            this.REGEN = -1;
          }
          if (c.wave < 6) {
            this.invuln = true;
          }
        }
        /* if (this.master.invuln && this.master !== this && this.isRanar) {
          this.invuln = false;
          this.kill();
          this.destroy();
        }*/
        if (
          this.label === "Defier" &&
          this.invuln &&
          !this.isPlayer &&
          !this.intangibility
        ) {
          if (!room.isIn("bad1", this)) {
            this.x = room.type("bad1").x;
            this.y = room.type("bad1").y;
            this.intangibility = true;
            sockets.broadcast(
              "Twilight has been knocked out, she needs time to recover!"
            );
          }
        }
        if (this.isRanar) {
          if (this.runAway) {
            //  this.FOV = 0;
            if (room.isIn("spw0", this)) {
              this.invuln = true;
            }
            if (!room.isIn("spw0", this)) {
              this.facingType = "smoothWithMotion";
              this.controllers = [new io_guard1(this)];
            }
          }
          if (room.isIn("spw0", this) || room.isIn("wal0", this)) {
            if (!this.runAway) this.x -= 5;
          }
          if (!this.runAway && room.isIn("spw0", this)) {
            this.facingType = "smoothToTarget";
            this.controllers = [
              new io_nearestDifferentMaster(this),
              new io_minion(this),
            ];
            //  this.addController(new io_moveInCircles(this));

            this.invuln = false;
          }
          if (this.color !== 10) {
            if (this.label === "Disciple") {
              this.resist = c.playerCount / 4 + 1;
              this.damage = c.playerCount + 9;
              this.skill.dam = c.playerCount / 10 + 3;
              this.skill.pen = c.playerCount / 6 + 3;
              this.skill.str = c.playerCount / 6 + 3;
              this.skill.spd = c.playerCount / 10 + 2;
            }
            if (this.label === "Ascendant") {
              this.resist = c.playerCount / 4 + 1;
              this.damage = c.playerCount * 1.5 + 9;
              //this.skill.rld = (c.playerCount/5) - 1.75; remember when he turned into a machine gun with 4 players
              this.skill.dam = c.playerCount / 10 + 3;
              this.skill.pen = c.playerCount / 6 + 3;
              this.skill.str = c.playerCount / 6 + 3;
              this.skill.spd = c.playerCount / 10 + 3;
            }
          }
          if (
            this.health.amount <= this.health.max * 0.75 &&
            c.wave === 0 &&
            this.haltActions !== true
          ) {
            c.wave += 1;
            let twi = new Entity(room.type("bad1"));
            twi.define(Class.twilight);
            twi.noRestore = true;
            twi.skill.score = 26263;
            twi.team = -1;
            twi.color = 10;
            twi.invuln = true;
            twi.impervious = true;
            twi.isTwilight = true;
            twi.alwaysExists = true;
            this.color = 1;
            this.haltActions = true;
            sockets.broadcast(
              "Ranar: Do you believe in Ranarok? AHHAAAHAHAAAA!"
            );
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: Watch out, Ranar is powering up! Defend yourself!"
              );
            }, 6000);
            setTimeout(() => {
              sockets.broadcast(
                "Ranar: TWILIGHT?! I thought I had destroyed you!"
              );
            }, 12000);
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: No, I will not die while people are forced to fight."
              );
            }, 18000);
            setTimeout(() => {
              sockets.broadcast(
                "Ranar: It doesn't matter, you are too weak to help, now watch your allies die!"
              );
            }, 24000);
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: Just hang tight, I'll help when I can!"
              );
            }, 21000);
            setTimeout(() => {
              let o = new Entity(room.randomType("spw0"));
              o.master = this;
              o.invuln = false;
              o.stayTeam = false;
              o.define(Class.ranarPower1);
              o.team = -100;
              o.maxChildren = Math.ceil(c.playerCount * 1.5);
              o.SIZE = this.SIZE;
              o.color = 1;
              o.tp = true;
            }, 15000);
            setTimeout(() => {
              this.haltActions = false;
            }, 25000);
          }
          if (
            this.health.amount <= this.health.max * 0.5 &&
            c.wave === 1 &&
            !this.haltActions
          ) {
            this.goBack = true;
            this.runAway = true;
            sockets.broadcast(
              "Ranar: You shouldn't have fought back, now I am going to have to inflict some pain!"
            );

            c.wave += 1;
            this.haltActions = true;
          }
          if (this.goBack && c.wave === 2) {
            this.goBack = false;
            c.wave += 1;
            let loc = room.type("spw0");
            this.runAway = true;
            this.refreshBodyAttributes();
            this.collisionArray = [];
            c.enemyCount = 1;
            sockets.broadcast(
              "Ranar: Sad that Valrayvn is so busy, she would have enjoyed this!"
            );
            setTimeout(() => {
              setTimeout(() => {
                sockets.broadcast(
                  "Twilight: Look out, Ranar is summoning minions!"
                );
              }, 4000);
              for (let i = 0; i < c.playerCount * 4 + 4; i++) {
                let o = new Entity(room.randomType("nest"));

                o.rarity = Math.random() * 300;

                if (o.rarity > 150) {
                  o.define(
                    Class[
                      ran.choose([
                        "auto3Guard",
                        "spawnerGuard",
                        "bansheeGuard",
                        "eggSorcererSentry",
                        "eggAutoSentry",
                        "eggBasicSentry",
                      ])
                    ]
                  );
                }
                if (o.rarity <= 150 && o.rarity > 75) {
                  o.define(
                    Class[
                      ran.choose([
                        "beekeeperProtector",
                        "swarmerProtector",
                        "cruiserProtector",
                        "squareTwinSentry",
                        "squareSniperSentry",
                        "squareAuto2Sentry",
                      ])
                    ]
                  );
                }
                if (o.rarity <= 75 && o.rarity > 25) {
                  o.define(
                    Class[
                      ran.choose([
                        "commanderKeeper",
                        "directorKeeper",
                        "overKeeper",
                        "triangleSwarmSentry",
                        "triangleTrapperSentry",
                        "trianglePounderSentry",
                      ])
                    ]
                  );
                }
                if (o.rarity <= 25) {
                  o.define(
                    Class[
                      ran.choose([
                        "skimmerSentinel",
                        "crossbowSentinel",
                        "minigunSentinel",
                        "pentagonSwarmerSentry",
                        "pentagonTriAngleSentry",
                        "pentagonHunterSentry",
                      ])
                    ]
                  );
                }
                o.accel.x + Math.random * 0.1 - 0.2;
                o.accel.y + Math.random * 0.1 - 0.2;
                o.facing = ran.randomAngle();
                o.team = -100;
                o.enemy = true;
                o.REGEN = -1;
                o.invuln = false;
                o.FOV *= 2;
                o.addController(new io_guard1(o));
                o.refreshBodyAttributes();
                c.enemyCount += 1;
              }
              c.enemyCount -= 1;
            }, 12000);
          }
          if (c.enemyCount <= 0 && c.wave === 3) {
            this.haltActions = false;
            this.runAway = false;
            c.wave += 1;
          }
          if (
            this.health.amount <= this.health.max * 0.25 &&
            c.wave === 4 &&
            !this.haltActions
          ) {
            c.wave += 1;
            this.color = 3;
            this.haltActions = true;
            sockets.broadcast(
              "Ranar: Agh! You are really starting to annoy me! DIE!"
            );
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: Watch out, Ranar is preparing a powerful attack!"
              );
            }, 6000);
            setTimeout(() => {
              sockets.broadcast(
                "Ranar: Shut up! It will be over soon, so just accept your death in silence!"
              );
            }, 12000);
            setTimeout(() => {
              let o = new Entity(room.randomType("spw0"));
              o.master = this;
              o.stayTeam = false;
              o.color = 3;
              o.define(Class.ranarPower2);
              o.team = -100;
              o.SIZE = this.SIZE;
              o.invuln = false;
              o.skill.dam = 1 + c.playerCount * 2.5;
              o.tp = true;
            }, 15000);
            setTimeout(() => {
              this.haltActions = false;
            }, 25000);
          }

          if (this.goBack && c.wave === 6) {
            this.goBack = false;
            c.enemyCount = 1;
            c.wave += 1;
            this.refreshBodyAttributes();
            this.collisionArray = [];
            /*  makeTiling();
            c.DEADLY_BORDERS = true;*/
            this.runAway = true;
            sockets.broadcast(
              "Twilight: Oh hell, Ranar transformed! Okay give me a moment, I'll help!"
            );
            setTimeout(() => {
              sockets.broadcast(
                "Twilight has regained strength and has joined you in your fight!"
              );
            }, 6000);
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: Okay, choose your class and kick his barrel!"
              );
              c.unlockClasses = true;
            }, 12000);
            c.BOTS = c.playerCount * 3;
            setTimeout(() => {
              for (let i = 0; i < Math.round(c.playerCount / 2); i++) {
                let o = new Entity(room.randomType("nest"));
                o.define(
                  Class[
                    ran.choose([
                      "elite_destroyer",
                      "elite_gunner",
                      "arenaguard",
                      "elite_skimmer",
                      "elite_spawner",
                      "sorcerer",
                      "summoner",
                      "enchantress",
                      "elite_battleship",
                    ])
                  ]
                );
                o.accel.x + Math.random * 0.1 - 0.2;
                o.accel.y + Math.random * 0.1 - 0.2;
                o.facing = ran.randomAngle();
                o.team = -100;
                o.enemy = true;
                o.invuln = false;
                o.FOV = 50000;
                o.addController(new io_guard1(o));
                o.refreshBodyAttributes();
                c.enemyCount += 1;
              }
              c.enemyCount -= 1;
              c.BOTS = 0;
            }, 22000);
          }
          if (c.enemyCount < 1 && c.wave === 7) {
            this.haltActions = false;
            this.runAway = false;
            c.BOTS = 0;
            c.wave += 1;
          }
          if (
            this.health.amount <= this.health.max * 0.75 &&
            c.wave === 8 &&
            !this.haltActions
          ) {
            c.wave += 1;
            this.color = 33;
            this.haltActions = true;
            sockets.broadcast(
              "Ranar: By Valrayvn's will you shall be destroyed!"
            );
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: Something sounds off about him...he is preparing another attack!"
              );
            }, 6000);
            setTimeout(() => {
              for (let i = 0; i < c.playerCount; i++) {
                let o = new Entity(room.randomType("spw0"));
                o.master = this;
                o.stayTeam = false;
                o.color = 33;
                o.skill.str = 2 + c.playerCount * 2;
                o.skill.spd = 0.5 + c.playerCount / 2;
                o.define(Class.ranarPower4);
                o.team = -100;
                o.SIZE = this.SIZE;
                o.invuln = false;
                o.tp = true;
              }
              c.SPAWN_SENTINEL = true;
            }, 9000);
            setTimeout(() => {
              this.haltActions = false;
            }, 19000);
          }
          if (
            this.health.amount <= this.health.max * 0.5 &&
            c.wave === 9 &&
            !this.haltActions
          ) {
            this.goBack = true;
            this.runAway = true;
            c.wave += 1;
          }
          if (this.goBack && c.wave === 10) {
            this.goBack = false;
            c.enemyCount = 1;
            c.wave += 1;
            this.refreshBodyAttributes();
            this.collisionArray = [];
            this.runAway = true;
            if (c.playerCount >= 5)
              sockets.broadcast(
                "Ranar: I see you have a proper gang, thats cool, I have too :D."
              );
            // :D
            else sockets.broadcast("Ranar: Witness my supreme POWER!");
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: Oh no! Ranar is summoning some VERY strong enemies!"
              );
            }, 6000);
            setTimeout(() => {
              for (let i = 0; i < Math.ceil(c.playerCount * 1.25); i++) {
                let o = new Entity(room.randomType("nest"));
                switch (i) {
                  case 0:
                    o.define(Class.kristaps);
                    break;
                  case 1:
                    o.define(Class.duodeci);
                    break;
                  case 2:
                    o.define(Class.alexTheDemonical);
                    break;
                  case 3:
                    o.define(Class.johnathon);
                    break;
                  case 4:
                    o.define(Class.annoyingDog);
                    break;
                  case 5:
                    o.define(Class.xxtrianguli);
                    break;
                  case 6:
                    o.define(Class.chaser);
                    break;
                  case 7:
                    o.define(Class.powernoob);
                    break;
                  case 8:
                    o.define(Class.excaliber);
                    break;
                  case 9:
                    o.define(Class.possessor);
                    break;
                  case 10:
                    o.define(Class.icecream);
                    break;
                  case 11:
                    o.define(Class.rainOfAcid);
                    break;
                  case 12:
                    o.define(Class.pop64);
                    break;
                  default:
                    o.define(Class.arenaguard);
                }
                o.team = -100;
                o.enemy = true;
                o.invuln = false;
                o.FOV = 50000;
                o.addController(new io_guard1(o));
                o.refreshBodyAttributes();
                c.enemyCount += 1;
                o.REGEN = 0;
              }
              c.enemyCount -= 1;
            }, 10000);
          }

          if (c.enemyCount < 1 && c.wave === 11) {
            this.haltActions = false;
            this.runAway = false;
            c.wave += 1;
          }
          if (
            this.health.amount <= this.health.max * 0.25 &&
            c.wave === 12 &&
            !this.haltActions
          ) {
            c.wave += 1;
            this.color = 12;
            this.haltActions = true;
            sockets.broadcast(
              "Ranar: I will make sure to make you kneel before Valrayvn!"
            );
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: I recognize him, but I don't know how...oh sorry! He is using yet another attack, get FAR away from him!"
              );
            }, 6000);
            setTimeout(() => {
              let o = new Entity(room.randomType("spw0"));
              o.master = this;
              o.stayTeam = false;
              o.color = 12;
              o.define(Class.ranarPower5);
              o.RANGE += c.playerCount * 150;
              o.team = -100;
              o.SIZE = this.SIZE;
              o.invuln = false;
              o.tp = true;
            }, 9000);
            setTimeout(() => {
              this.haltActions = false;
            }, 19000);
          }
          if (
            this.health.amount <= this.health.max * 0.1 &&
            c.wave === 13 &&
            !this.haltActions
          ) {
            c.wave += 1;
            this.color = 32;
            this.haltActions = true;
            sockets.broadcast(
              "The world starts to quake as Ranar unleashes his full power!"
            );
            setTimeout(() => {
              sockets.broadcast("Twilight: What the F---?!");
            }, 6000);
            c.stopFoodSpawn = true;
            c.BOTS = c.playerCount * 2;
            setTimeout(() => {
              for (let i = 0; i < 6; i++) {
                let o = new Entity(room.randomType("spw0"));
                o.master = this;
                o.stayTeam = false;
                switch (c.shift) {
                  case 1:
                    o.color = 3;
                    o.define(Class.ranarPower2);
                    o.team = -100;
                    o.SIZE = this.SIZE;
                    o.invuln = false;
                    o.skill.dam = 1 + c.playerCount / 2;
                    o.tp = true;
                    break;
                  case 2:
                    o.color = 13;
                    o.define(Class.ranarPower1);
                    c.SPAWN_CRASHERS = true;
                    o.team = -100;
                    o.SIZE = this.SIZE;
                    o.invuln = false;
                    o.maxChildren = Math.ceil(1 + c.playerCount * 1.5);
                    o.fov = 50000;
                    o.tp = true;
                    break;
                  case 3:
                    o.color = 33;
                    o.skill.str = 2 + c.playerCount * 1.5;
                    o.skill.spd = 0.5 + c.playerCount / 3;
                    o.define(Class.ranarPower4);
                    o.team = -100;
                    o.SIZE = this.SIZE;
                    o.invuln = false;
                    o.tp = true;
                    break;
                  case 4:
                    o.color = 12;
                    o.define(Class.ranarPower5);
                    o.RANGE += c.playerCount * 100;
                    o.team = -100;
                    o.SIZE = this.SIZE;
                    o.invuln = false;
                    o.tp = true;
                    break;
                  default:
                    o.define(Class.ranarPower0);
                    o.team = -100;
                    o.maxChildren = Math.ceil(c.playerCount / 4);
                    o.SIZE = this.SIZE;
                    o.color = 1;
                    o.tp = true;
                    c.shift = 0;
                }

                c.shift += 1;
              }
              c.stopFoodSpawn = false;
            }, 9000);
            setTimeout(() => {
              for (let i = 0; i < Math.ceil(c.playerCount * 1.25); i++) {
                let o = new Entity(room.randomType("nest"));
                switch (i) {
                  case 12:
                    o.define(Class.kristaps);
                    break;
                  case 11:
                    o.define(Class.duodeci);
                    break;
                  case 10:
                    o.define(Class.alexTheDemonical);
                    break;
                  case 9:
                    o.define(Class.johnathon);
                    break;
                  case 8:
                    o.define(Class.annoyingDog);
                    break;
                  case 7:
                    o.define(Class.xxtrianguli);
                    break;
                  case 6:
                    o.define(Class.chaser);
                    break;
                  case 5:
                    o.define(Class.powernoob);
                    break;
                  case 4:
                    o.define(Class.excaliber);
                    break;
                  case 3:
                    o.define(Class.possessor);
                    break;
                  case 2:
                    o.define(Class.icecream);
                    break;
                  case 1:
                    o.define(Class.rainOfAcid);
                    break;
                  case 0:
                    o.define(Class.pop64);
                    break;
                  default:
                    o.define(Class.arenaguard);
                }
                o.team = -100;
                o.invuln = false;
                o.FOV = 50000;
                o.addController(new io_guard1(o));
                o.refreshBodyAttributes();
                o.REGEN = 0;
              }
            }, 10000);
            setTimeout(() => {
              this.haltActions = false;
            }, 10000);
          }
          if (c.wave === 15 && !c.stop1 && !room.closed) {
            c.BOTS = 0;
            if (c.ranarLoseCondition >= c.playerCount * 5) {
              setTimeout(() => {
                sockets.broadcast(
                  "Twilight: Wow, good job, I guess you guys did not need me..."
                );
              }, 2000);
            }
            setTimeout(() => {
              sockets.broadcast("Twilight: I know who you are now...");
            }, 4000);
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: You are Codex, the original leader of the Guardians!"
              );
            }, 8000);
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: We all had thought you died after you closed the portal."
              );
            }, 12000);
            setTimeout(() => {
              sockets.broadcast("Ranar: ...");
            }, 16000);
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: If you hadn't done that then Valrayvn would have surely destroyed us!"
              );
            }, 20000);
            setTimeout(() => {
              sockets.broadcast("Ranar: Valrayvn had caught me and-");
            }, 24000);
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: Brain washed you, she transformed you, Ranar, you can fight this, we can help you!"
              );
            }, 28000);
            setTimeout(() => {
              sockets.broadcast(
                "Ranar: It doesn't matter, Valrayvn will keep hunting our friends here."
              );
            }, 32000);
            setTimeout(() => {
              sockets.broadcast(
                "Ranar: She won't stop until both we and this server are wiped out!"
              );
            }, 36000);
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: Don't worry! I have a 'Prophecy' myself, it should buy us some time."
              );
            }, 40000);
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: If you want to come back, we still have some room."
              );
            }, 44000);
            setTimeout(() => {
              sockets.broadcast(
                "Twilight: Hell, you can be the leader again if you want."
              );
            }, 48000);
            setTimeout(() => {
              sockets.broadcast(
                "Ranar: No, my time as their leader is over, I wouldn't take that privilege from you."
              );
            }, 52000);
            setTimeout(() => {
              sockets.broadcast(
                "Ranar: But I will come back, I want vengeance, but its best served cold...and with allies."
              );
            }, 56000);
            setTimeout(() => {
              sockets.broadcast(
                "Ranar: DO YOU HEAR ME VALRAYVN!? THIS MEANS WAR!"
              );
            }, 60000);
            setTimeout(() => {
              sockets.broadcast("Valrayvn: Then a war we shall have!");
            }, 64000);
            setTimeout(() => {
              sockets.broadcast("Twilight & Ranar: WHAT-");
              closeArena();
            }, 68000);
            setTimeout(() => {
              c.wave += 1;
              sockets.broadcast("Twilight: Go through the portal, NOW!");
            }, 72000);
            c.stop1 = true;
          }

          if (c.wave === 16) {
            let o = new Entity(room.randomType("bad1"));
            o.define(Class.voidportal);
            o.godMode = true;
            o.team = -1;
            o.color = 10;
            c.wave += 1;
            sockets.broadcast(
              "Congratulations, you have defeated the controller of Ranar's Prophecy! We are free! Your team has won the game!"
            );
          }
        }

        if (this.tp) {
          this.x = this.master.x;
          this.y = this.master.y;
        }
      }
    }
    /*  if (c.eventProgress !== true || c.wave >= 13) {
        if (this.isWall || this.isGate) {
          this.destroy();
      }
      }*/
    if (this.specialEffect === "denied" && c.wave > 0) {
      this.name = "Player Lives Remaining: " + c.ranarLoseCondition;
      if (c.wave > 0 && this.skill.score < 5000000) {
        this.skill.score = Infinity;
      }
    }
    if (this.master.invuln && !this.targetable && this.type !== "food") {
      this.kill();
    }
    if (c.MODE === "theDivided") {
      if (c.eventProgress) {
        if (c.wave === 0) {
        }
        if (this.type === "squareWall" && c.wave >= 13) {
          this.destroy();
        }
        if (this.eliteBoss) {
          if (this.runAway) {
            //  this.FOV = 0;
            if (room.isIn("bos0", this)) {
              this.invuln = true;
            }
            if (!room.isIn("bos0", this)) {
              this.facingType = "smoothWithMotion";
              this.controllers = [new io_guard1(this)];
            }
          }

          if (!this.runAway && room.isIn("bos0", this)) {
            this.facingType = "smoothToTarget";
            this.controllers = [
              new io_nearestDifferentMaster(this),
              new io_minion(this),
            ];
            this.invuln = false;
          }
          if (this.color !== 19) {
            if (this.label === "Arrasian Lord") {
              this.resist = c.playerCount / 3 + 1;
              this.damage = c.playerCount + 5;
              this.skill.dam = c.playerCount / 3 + 4;
              this.skill.pen = c.playerCount / 4 + 3;
              this.skill.str = c.playerCount / 3 + 3;
              this.skill.spd = c.playerCount / 5 + 2;
            }
          }
          if (
            this.health.amount <= this.health.max / 1.5 &&
            c.wave === 0 &&
            this.haltActions === false
          ) {
            c.wave += 1;
            sockets.broadcast("Valrayvn: I WILL HAVE YOU SEDUCED!");
            setTimeout(() => {
              sockets.broadcast(
                "Cubed: Careful, it seems Valrayvn is throwing a fit."
              );
            }, 6000);
            setTimeout(() => {
              sockets.broadcast(
                "Tryi: Give it up Val, two of your greatest generals have turned on you, another ditched, and if our records are right..."
              );
            }, 12000);
            setTimeout(() => {
              sockets.broadcast(
                "Tryi: ...and your sister is taken by the fallen, you rely on everyone but you mistreat them and drive them away, this is deserved!"
              );
            }, 18000);
            setTimeout(() => {
              sockets.broadcast("Valrayvn: SHUT UP SHUT UP SHUT UP!");
            }, 21000);
            setTimeout(() => {
              let o = new Entity(room.randomType("bos0"));
              o.master = this;
              o.invuln = false;
              o.stayTeam = false;
              o.define(Class.valrayvnPower0);
              o.team = -100;
              o.maxChildren = Math.ceil(c.playerCount * 1.5);
              o.SIZE = this.SIZE;
              o.color = 1;
              o.tp = true;
            }, 15000);
            setTimeout(() => {
              this.haltActions = false;
            }, 25000);
          }
          if (
            this.health.amount <= this.health.max / 2 &&
            c.wave === 1 &&
            !this.haltActions
          ) {
            this.goBack = true;
            this.runAway = true;
            sockets.broadcast("Valrayvn: DIE YOU TRAITORS!!!");

            c.wave += 1;
            this.haltActions = true;
          }
          if (this.goBack && c.wave === 2) {
            this.goBack = false;
            c.wave += 1;
            let loc = room.type("spw4");
            this.runAway = true;
            this.refreshBodyAttributes();
            this.collisionArray = [];
            c.enemyCount = 1;
            setTimeout(() => {
              setTimeout(() => {
                sockets.broadcast(
                  "Cubed: We may or may not have pissed Val off too badly Tryi."
                );
              }, 4000);
              for (let i = 0; i < c.playerCount * 5 + 5; i++) {
                let o = new Entity(room.randomType("bos4"));

                o.rarity = Math.random() * 300;

                if (o.rarity > 250) {
                  o.define(
                    Class[
                      ran.choose([
                        "auto3Guard",
                        "spawnerGuard",
                        "bansheeGuard",
                        "eggSorcererSentry",
                        "eggAutoSentry",
                        "eggBasicSentry",
                      ])
                    ]
                  );
                }
                if (o.rarity <= 50) {
                  o.define(
                    Class[
                      ran.choose([
                        "skimmerSentinel",
                        "crossbowSentinel",
                        "minigunSentinel",
                        "pentagonSwarmerSentry",
                        "pentagonTriAngleSentry",
                        "pentagonHunterSentry",
                      ])
                    ]
                  );
                }
                o.accel.x + Math.random * 0.1 - 0.2;
                o.accel.y + Math.random * 0.1 - 0.2;
                o.facing = ran.randomAngle();
                o.team = -100;
                o.enemy = true;
                //o.REGEN = -1;
                o.invuln = false;
                o.FOV *= 2;
                o.addController(new io_guard1(o));
                o.refreshBodyAttributes();
                c.enemyCount += 1;
              }
              c.enemyCount -= 1;
              setTimeout(() => {
                c.enemyCount = 0;
              }, 30000);
            }, 12000);
          }
          if (c.enemyCount <= 0 && c.wave === 3) {
            this.haltActions = false;
            this.runAway = false;
            c.wave += 1;
          }
          if (
            this.health.amount <= this.health.max / 4 &&
            c.wave === 4 &&
            !this.haltActions
          ) {
            c.wave += 1;
            this.color = 3;
            this.haltActions = true;
            sockets.broadcast(
              "Cubed: Um, I think she is having another hissy fit."
            );
            setTimeout(() => {
              sockets.broadcast(
                "Valrayvn: I AM NOT THROWING A FIT! RAHHHHHHHH!"
              );
            }, 6000);
            setTimeout(() => {
              sockets.broadcast("Tryi: Uh huh, sure you aren't!");
            }, 12000);
            setTimeout(() => {
              let o = new Entity(room.randomType("bos0"));
              o.master = this;
              o.stayTeam = false;
              o.define(Class.valrayvnPower1);
              o.team = -100;
              o.SIZE = this.SIZE;
              o.invuln = false;
              o.skill.dam = 1 + c.playerCount * 2.5;
              o.tp = true;
            }, 15000);
            setTimeout(() => {
              this.haltActions = false;
            }, 25000);
          }
          if (c.wave === 6 && !c.stop1 && !room.closed) {
            c.BOTS = 0;
            setTimeout(() => {
              sockets.broadcast(
                "Valrayvn: I had enough of this, UNLEASH THE ENTIRE ALLIANCE ARMADA!"
              );
            }, 4000);
            setTimeout(() => {
              sockets.broadcast("Cubed and Tryi: HUH?!");
            }, 8000);
            setTimeout(() => {
              sockets.broadcast(
                "Valrayvn: I was giving you a chance to live, but you are all too willing to throw that away!"
              );
            }, 12000);
            setTimeout(() => {
              sockets.broadcast("Valrayvn: So now you must be executed!");
            }, 16000);
            setTimeout(() => {
              sockets.broadcast(
                "Cubed: We need to get us and our forces out, NOW!"
              );
            }, 20000);
            setTimeout(() => {
              sockets.broadcast(
                "Tryi: But Cubed, we are so close to ending this manipulative brat!"
              );
            }, 24000);
            setTimeout(() => {
              sockets.broadcast(
                "Cubed: Yes, but it wouldn't stop her army, I have a feeling we are destined for more...but dying isn't it."
              );
            }, 28000);
            setTimeout(() => {
              sockets.broadcast("Tryi: ...Fine, lets go.");
            }, 32000);
            setTimeout(() => {
              sockets.broadcast(
                "The Realm rumbles, as many forces arrive...RUN!"
              );
              closeArena();
            }, 68000);
            setTimeout(() => {
              c.wave += 1;
              sockets.broadcast(
                "Tryi: Go through the portal, we cant fight this!"
              );
            }, 72000);
            c.stop1 = true;
          }

          if (c.wave === 16) {
            let o = new Entity(room.randomType("bad1"));
            o.define(Class.voidportal);
            o.godMode = true;
            o.team = -1;
            o.color = 10;
            c.wave += 1;
            sockets.broadcast(
              "Congratulations, you have defeated Valrayvn...for now. We are free! Your team has won the game!"
            );
          }
        }

        if (this.tp) {
          this.x = this.master.x;
          this.y = this.master.y;
        }
      }
      if (c.eventProgress !== true || c.wave >= 13) {
        if (this.isWall || this.isGate) {
          this.destroy();
        }
      }
    }
    if (this.foodLevel >= 5 && this.done !== true) {
      this.done = true;

      c.hexagonCount += 1;

      if (
        (c.hexagonCount >= 5 &&
          this.passiveEffect !== "uniqueFood" &&
          !c.SHINY_GLORY) ||
        (c.hexagonCount >= 5 && c.SHINY_GLORY)
      ) {
        this.invuln = false;
        this.define(Class.hexagon);
      }
    }
    if (
      this.team !== this.master.team &&
      this.stayTeam !== false &&
      !this.severLink
    ) {
      this.team = this.master.team;
      this.color = this.master.color;
    }

    if (
      this.type === "tank" &&
      !this.invuln &&
      c.dontSpam &&
      this.yay !== c.bossWave
    ) {
      this.sendMessage(
        "Congrats for surviving the previous wave! You have been rewarded with score!"
      );
      this.skill.score += (c.bossWave + c.preparedCounter) * 3500;
      this.yay = c.bossWave;
      setTimeout(() => {
        c.dontSpam = false;
      }, 100);
    }
    if (c.globalScoreGive === true && this.targetable) {
      this.skill.score += 20000;
      setTimeout(() => {
        c.globalScoreGive = false;
      }, 100);
    }
    if (c.globalTestbed === true && this.isDeveloper && !this.trueDev) {
      this.upgrades = [];
      this.define(Class[c.startingClass]);
      this.maxChildren = 0;
      this.skill.reset();
      //this.skill.points = 42;
      this.skill.score = 26263;
      this.skill.set([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      this.isDeveloper = false;
      this.intangibility = false;
      this.invisible = [100, 0];
      this.commandType = "none";
      this.alpha = 100;
      this.specialEffect = "none";
      this.invuln = true;
      this.godMode = false;
      this.ignoreCollision = false;
      this.sendMessage("You have lost testbed!");
      setTimeout(() => {
        c.globalTestbed = false;
      }, 100);
    }
    if (c.globalHeal == true && this.type !== "grid") {
      this.health.amount = this.health.max;
      this.shield.amount = this.shield.max;
      setTimeout(() => {
        c.globalHeal = false;
      }, 100);
    }
    if (c.globalKill === true && this.type !== "grid") {
      this.kill();
      setTimeout(() => {
        c.globalKill = false;
      }, 100);
    }
    if (c.globalTeleport === true && this.type !== "grid") {
      this.invuln = true;
      this.x = c.playerPort.x;
      this.y = c.playerPort.y;
      setTimeout(() => {
        c.globalTeleport = false;
      }, 100);
    }
    if (c.globalDestroy === true && this.type !== "grid") {
      this.died = true;
      this.destroy();
      setTimeout(() => {
        c.globalDestroy = false;
      }, 100);
    }
    if (c.globalExecuteTeam === true && this.targetable) {
      this.team = c.globalTeam;
      this.color = c.globalColor;
      setTimeout(() => {
        c.globalExecuteTeam = false;
      }, 100);
    }
    if (c.globalScoreTake === true && this.targetable) {
      this.skill.score -= 20000;
      setTimeout(() => {
        c.globalScoreTake = false;
      }, 100);
    }
    if (this.skill.score >= 5000000 && c.MODE === "siege" && !this.dayum) {
      if (this.specialEffect === "Legend") {
        this.sendMessage(
          "You hear the calling...you have been chosen, warrior."
        );
      }
      this.dayum = true;
    }
    if (this.skill.score >= 1000000 && this.okGo !== true) {
      if (this.team === -1 || c.MODE === "siege") {
        switch (this.label) {
          case "Spike":
          case "Eagle":
          case "Surfer":
          case "Beekeeper":
            this.sendMessage(
              "You have unlocked the legendary class, Rebel. Press '~' to become it!"
            );
            break;
          case "Collider":
          case "Shotgun":
          case "Twister":
          case "Decimator":
            this.sendMessage(
              "You have unlocked the legendary class, Destructionist. Press '~' to become it!"
            );
            break;
        }
      }
      if (this.team === -2 || c.MODE === "siege") {
        switch (this.label) {
          case "Necromancer":
          case "Enchanter":
          case "Exorcist":
          case "Infestor":
            this.sendMessage(
              "You have unlocked the legendary class, Necro Tyrant. Press '~' to become it!"
            );
            break;
          case "Hexa-Trapper":
          case "Animator":
          case "Constructor":
          case "Skimmer":
          case "Rocketeer":
            this.sendMessage(
              "You have unlocked the legendary class, Flesh. Press '~' to become it!"
            );
            break;
        }
      }
      if (this.team === -3 || c.MODE === "siege") {
        switch (this.label) {
          case "Trilogy of Traps":
          case "Constructionist":
          case "Fragmentor":
          case "Bombarder":
          case "Originator":
          case "Rebounder":
          case "Warzone":
          case "Castle":
            this.sendMessage(
              "You have unlocked the legendary class, Mass Producer. Press '~' to become it!"
            );
            break;
          case "Interceptor":
          case "Auto-Spawner":
          case "Engineer":
          case "Auto-Mech":
            this.sendMessage(
              "You have unlocked the legendary class, Operator. Press '~' to become it!"
            );
            break;
          case "Auto-Cruiser":
          case "Auto-Smasher":
          case "Carrier":
          case "Armor Piercer":
            this.sendMessage(
              "You have unlocked the legendary class, Conductor. Press '~' to become it!"
            );
            break;
          case "Skimmer":
          case "Hardshell Spawner":
          case "Auto-5":
            this.sendMessage(
              "You have unlocked the legendary class, Mechanist. Press '~' to become it!"
            );
            break;
        }
      }
      if (this.team === -4 || c.MODE === "siege") {
        switch (this.label) {
          case "Mortar":
          case "Ordnance":
          case "Poacher":
          case "X-Hunter":
            this.sendMessage(
              "You have unlocked the legendary class, Reaper. Press '~' to become it!"
            );
            break;
        }
      }
      if (this.team === -4 || c.MODE === "siege") {
        switch (this.label) {
          case "Master":
          case "Hexanomaly":
          case "Pulsar":
          case "Overgunner":
            this.sendMessage(
              "You have unlocked the legendary class, Embodiment of Destruction. Press '~' to become it!"
            );
            break;
        }

        if (
          this.team === -100 ||
          (c.MODE === "siege" && this.label === "Master")
        ) {
          if (this.specialEffect === "Legend") return;
          this.sendMessage(
            "You have unlocked the legendary class, Arena Guard. Press '~' to become it(at the cost of score)!"
          );
        }
      }

      this.okGo = true;
    }
    if (
      this.shield.amount > this.shield.max ||
      this.shield.amount === undefined
    ) {
      this.shield.amount = this.shield.max;
    }
    if (
      this.health.amount > this.health.max ||
      this.health.amount === undefined
    ) {
      this.health.amount = this.health.max;
    }
    if (c.stopFoodSpawn && this.type === "food") {
      this.SIZE = 0.1;
      this.alpha = 0;
      this.kill();
      this.destroy();
    }
    if (this.skill.score >= 200000 && c.MODE !== "siege") {
      if (this.specialEffect === "sentryEvolveG") {
        this.specialEffect = "none";

        this.invuln = true;
        setTimeout(() => {
          this.invuln = false;
        }, 10000);

        this.define(Class.elite_destroyer);
        sockets.broadcast(
          "A Destroyer Sentry has evolved into an Elite Destroyer!"
        );
      }

      if (this.specialEffect === "sentryEvolveS") {
        this.specialEffect = "none";
        this.invuln = true;
        setTimeout(() => {
          this.invuln = false;
        }, 10000);
        this.define(Class.elite_swarmer);
        sockets.broadcast(
          "A Swarm Sentry has evolved into the mighty Guardian!"
        );
      }

      if (this.specialEffect === "sentryEvolveT") {
        this.specialEffect = "none";
        this.invuln = true;
        setTimeout(() => {
          this.invuln = false;
        }, 10000);
        this.define(Class.elite_fortress);
        sockets.broadcast(
          "A Trapper Sentry has evolved into an Elite Trap Guard!"
        );
      }
    }

    if (this.skill.score >= 500000 && c.MODE !== "siege") {
      if (this.specialEffect === "palisadeEvolve") {
        this.specialEffect = "none";
        this.define(Class.roguecitadel);
        sockets.broadcast(
          "A Rogue Palisade has reached it's limit and evolved into the mighty Rogue Citadel"
        );
      }
      if (this.specialEffect === "armadaEvolve") {
        this.specialEffect = "none";
        this.define(Class.rogueflagship);
        sockets.broadcast(
          "A Rogue Armada has reached it's limit and evolved into the mighty Rogue Flagship"
        );
      }
    }

    if (c.eventProgress2 && c.MODE === "theExpanse" && this.type === "base") {
      this.kill();
    }
    if (this.zombied && this.color !== this.master.color) {
      setTimeout(() => {
        this.name = "[" + this.master.name + "] Zombie";
        this.color = this.master.color;
        this.team = this.master.team;
      }, 2000);
    }
    if (this.type !== "food" && this.bond == null && this.team !== -101) {
      if (this.isSoccerBall && !room.isInRoom(this)) this.kill();
      if (
        (this.team !== -1 && room.isIn("bas1", loc)) ||
        (this.team !== -4 &&
          (room.isIn("spw4", loc) ||
            room.isIn("bad4", loc) ||
            room.isIn("dbc4", loc)) &&
          c.MODE === "theControlled") ||
        (this.team !== -3 &&
          (room.isIn("spw3", loc) ||
            room.isIn("bad3", loc) ||
            room.isIn("dbc3", loc)) &&
          c.MODE === "theExpanse") ||
        (this.team !== -2 && room.isIn("bas2", loc)) ||
        (this.team !== -3 && room.isIn("bas3", loc)) ||
        (this.team !== -4 && room.isIn("bas4", loc)) ||
        (this.team !== -100 &&
          this.team !== -101 &&
          c.MODE === "siege" &&
          room.isIn("spw0", this)) ||
        (this.team !== -100 && room.isIn("domx", loc)) ||
        (this.team !== -3 && room.isIn("dome", loc)) ||
        (this.team !== -1 && room.isIn("bap1", loc)) ||
        (this.team !== -2 && room.isIn("bap2", loc)) ||
        (this.team !== -3 && room.isIn("bap3", loc)) ||
        (this.team !== -4 && room.isIn("bap4", loc))
      ) {
        if (
          (this.team === -100 && this.ignoreCollision) ||
          this.label === "Spectator" ||
          this.master.impervious ||
          this.godMode ||
          (c.MODE === "siege" && this.master.skill.score >= 1000000) ||
          (c.MODE === "siege" && this.master.specialEffect === "Legend")
        )
          return;
        this.invuln = false;
        this.damageRecieved = this.health.max / 10;
        if (this.isSoccerBall) {
          this.kill();
        }
      }
    }
    if (
      room.isIn("bas" + -this.team, loc) ||
      room.isIn("bap" + -this.team, loc) ||
      (room.isIn("domx", loc) && this.team === -100)
    ) {
      if (this.targetable && this.label !== "Target Dummy") {
        if (
          this.health.amount < this.health.max ||
          this.shield.amount < this.shield.max
        ) {
          this.damageRecieved += -this.health.max / 100;
        }
      }
    }
    if (
      this.label === "Target Dummy" &&
      (this.x !== this.area.x || this.y !== this.area.y) &&
      !this.timeStop
    ) {
      this.timeStop = true;
      setTimeout(() => {
        this.x = this.area.x;
        this.y = this.area.y;
        this.timeStop = false;
      }, 15000);
    }
    let limit = (room.width + room.height) / 2 / 10;
    if (this.SIZE > limit && !c.extinction) {
      this.SIZE = limit;
    }
    if (c.ENCLOSED_ARENA && !this.ignoreCollision && !this.phase) {
      if (!room.isInRoom(this)) {
        if (
          (this.isBot ||
            this.isEnemy ||
            this.isBoss ||
            this.type === "food" ||
            this.targetable) &&
          !this.isPlayer
        ) {
          if (isNaN(this.x) && isNaN(this.y)) return;
          let loc = room.randomType("none");
          this.invuln = true;
          this.x = loc.x;
          this.y = loc.y;
          setTimeout(() => {
            this.invuln = false;
          }, 5000);
        }
      }
    }

    if (c.MODE === "devServer") {
      if (this.isDominator && this.team !== -100) {
        this.kill();
      }
    }
    if (
      this.type === "food" &&
      this.rarityType === undefined &&
      this.continueChance !== false
    ) {
      this.rarity = Math.random() * 1000000;
      if (c.SHINY_GLORY) {
        this.rarity = Math.random() * 100;
      }
      if (this.rarity <= 57 && this.rarity > 37) {
        this.rarityType = "shiny";
        if (this.foodLevel === 0) {
          this.define(Class.shinyEgg);
        }
      }
      if (this.rarity <= 37 && this.rarity > 24) {
        this.rarityType = "albino";
        if (this.foodLevel === 0) {
          this.define(Class.albinoNonagon);
        }
      }
      if (this.rarity <= 24 && this.rarity > 14) {
        this.rarityType = "legendary";
        if (this.foodLevel === 0) {
          this.define(Class.legendaryEgg);
        }
      }
      if (this.rarity <= 14 && this.rarity > 7.5) {
        this.rarityType = "shadow";
        if (this.foodLevel === 0) {
          this.define(Class.shadowEgg);
        }
      }
      if (this.rarity <= 7.5 && this.rarity > 2.5) {
        this.rarityType = "epileptic";
        if (this.foodLevel === 0) {
          this.define(Class.epilepticEgg);
        }
      }
      if (this.rarity <= 2.5 && this.rarity > 1) {
        this.rarityType = "rainbow";
        if (this.foodLevel === 0) {
          this.define(Class.rainbowEgg);
        }
      }
      if (this.rarity <= 1) {
        this.rarityType = "abyssal";
        if (this.foodLevel === 0) {
          this.define(Class.abyssalEgg2);
        }
      }
      this.continueChance = false;
    }
    if (this.rarityType === "albino" && this.foodLevel === 6) {
      this.define(Class.abyssalEgg2);
      this.rarityType = "abyssal";
    }
    if (!this.cannot) {
      if (
        this.isEnemy ||
        this.type === "food" ||
        (this.isBoss && !this.isPlayer)
      ) {
        if (this.master.isRanar) return;
        this.invuln = true;
        this.cannot = true;

        setTimeout(() => {
          if (!this.isRanar) {
            this.invuln = false;
          }
        }, 6000);
        if (this.label === "Health Orb") {
          this.invuln = false;
          this.damage = this.DAMAGE;
        }
      }
    }
  }

  contemplationOfMortality() {
    if (this.bond) {
      return 0;
    }
    if (this.invuln) {
      if (!this.noRestore) {
        this.health.amount = this.health.max;
        this.shield.amount = this.shield.max;
        //this.health.getDamage = 0;
        //this.damageRecieved = 0;
        //this.alpha = 100;
        //this.damage = 1.5;
        this.collisionArray = [];
        //this.damageRecieved = -1;
      }
      return 0;
    }
    // Life-limiting effects
    if (this.settings.diesAtRange) {
      this.range -= 1 / roomSpeed;
      if (this.range < 0) {
        this.kill();
      }
    }
    if (this.settings.diesAtLowSpeed) {
      if (
        !this.collisionArray.length &&
        this.velocity.length < this.topSpeed / 2
      ) {
        this.health.amount -= this.health.getDamage(1 / roomSpeed);
      }
    }
    // Shield regen and damage
    if (this.shield.max) {
      if (this.damageRecieved !== 0) {
        let shieldDamage = this.shield.getDamage(this.damageRecieved);
        this.damageRecieved -= shieldDamage;
        this.shield.amount -= shieldDamage * 1.5;
      }
    }
    // Health damage
    if (this.damageRecieved !== 0) {
      let healthDamage = this.health.getDamage(this.damageRecieved);
      this.blend.amount = 1;
      this.health.amount -= healthDamage;
    }
    this.damageRecieved = 0;

    // Check for death

    if (this.isDead()) {
      let spwn = { x: this.x, y: this.y };
      this.trulyDead = true;
      if (this.deathThroes && this.deathThroes !== "none") {
        this.health.amount = this.health.max;
        this.shield.amount = this.shield.max;
        this.trulyDead = false;
        let skillz = this.SKILL;
        this.define(Class[this.deathThroes]);
        this.range = this.RANGE;
        this.define({
          SKILL: skillz,
        });
        this.refreshBodyAttributes();
        this.deathThroes = "none";
      }
      if (c.MODE === "execution" && c.startingClass === "spectator") {
        c.playerz = 0;
        c.botCount = 0;
        entities.forEach((instance) => {
          if (this.isPlayer && this.type === "tank") c.playerz += 1;
          if (this.isBot && this.type === "tank") c.botCount += 1;
        });
      }
      if (c.MODE === "BossArena" && this.label === "Void Portal") {
        let gridWidth = room.width / room.xgrid;
        let gridHeight = room.height / room.ygrid;
        sockets.broadcast("LET THE GAMES BEGIN!");
        let placeBosses = (loc, team) => {
          let o = new Entity(loc);
          if (team) {
            o.team = -team;
            o.color = [10, 18, 7, 19][team - 1];
          } else {
            o.team = -100;
            o.color = 3;
          }
          switch (o.team) {
            case -1:
              o.define(Class.stfellas);
              //for more bosses...
              for (let i = 0; i < 8; i++) {
                let oh = new Entity(loc);
                oh.team = o.team;
                switch (i) {
                  case 0:
                    oh.define(Class.spectator);
                    break;
                  case 1:
                    oh.define(Class.spectator);
                    break;
                  case 2:
                    oh.define(Class.spectator);
                    break;
                  case 3:
                    oh.define(Class.spectator);
                    break;
                  case 4:
                    oh.define(Class.spectator);
                    break;
                  case 5:
                    oh.define(Class.spectator);
                    break;
                  case 7:
                    oh.define(Class.spectator);
                    break;
                  case 8:
                    oh.define(Class.spectator);
                    break;
                }
              }
              break;
            case -2:
              o.define(Class.ranarAscendantForm);
              //for more bosses...
              for (let i = 0; i < 8; i++) {
                let oh = new Entity(loc);
                oh.team = o.team;
                switch (i) {
                  case 0:
                    oh.define(Class.spectator);
                    break;
                  case 1:
                    oh.define(Class.spectator);
                    break;
                  case 2:
                    oh.define(Class.spectator);
                    break;
                  case 3:
                    oh.define(Class.spectator);
                    break;
                  case 4:
                    oh.define(Class.spectator);
                    break;
                  case 5:
                    oh.define(Class.spectator);
                    break;
                  case 7:
                    oh.define(Class.spectator);
                    break;
                  case 8:
                    oh.define(Class.spectator);
                    break;
                }
              }
              break;
            case -3:
              o.define(Class.spectator);
              //for more bosses...
              for (let i = 0; i < 8; i++) {
                let oh = new Entity(loc);
                oh.team = o.team;
                switch (i) {
                  case 0:
                    oh.define(Class.spectator);
                    break;
                  case 1:
                    oh.define(Class.spectator);
                    break;
                  case 2:
                    oh.define(Class.spectator);
                    break;
                  case 3:
                    oh.define(Class.spectator);
                    break;
                  case 4:
                    oh.define(Class.spectator);
                    break;
                  case 5:
                    oh.define(Class.spectator);
                    break;
                  case 7:
                    oh.define(Class.spectator);
                    break;
                  case 8:
                    oh.define(Class.spectator);
                    break;
                }
              }
              break;
            case -4:
              o.define(Class.spectator);
              //for more bosses...
              for (let i = 0; i < 8; i++) {
                let oh = new Entity(loc);
                oh.team = o.team;
                switch (i) {
                  case 0:
                    oh.define(Class.spectator);
                    break;
                  case 1:
                    oh.define(Class.spectator);
                    break;
                  case 2:
                    oh.define(Class.spectator);
                    break;
                  case 3:
                    oh.define(Class.spectator);
                    break;
                  case 4:
                    oh.define(Class.spectator);
                    break;
                  case 5:
                    oh.define(Class.spectator);
                    break;
                  case 7:
                    oh.define(Class.spectator);
                    break;
                  case 8:
                    oh.define(Class.spectator);
                    break;
                }
              }
              break;
            default:
              util.log("Uhh, your boss failed to load in a proper team...");
          }
          setTimeout(() => {
            if (o.label === "Spectator" || o.label === "Unknown Entity") {
              o.kill();
            }
          }, 1000);
          o.addController(new io_guard1(o));
          o.refreshBodyAttributes();
        };
        for (let i = 0; i < 5; i++) {
          if (room["spw" + i]) {
            room["spw" + i].forEach((loc) => {
              placeBosses(loc, i, {
                x: Math.floor(loc.x / gridWidth),
                y: Math.floor(loc.y / gridHeight),
              });
            });
          }
        }
      }
      if (c.MODE === "theInfestation" && this.isAnubis && !c.vruh) {
        sockets.broadcast(
          "Anubis: I am sorry...it must be destiny...that we can never be found..."
        );
        setTimeout(() => {
          sockets.broadcast(
            "CX: Finally, we can wipe this infection out and resume our tasks!"
          );
          setTimeout(() => {
            sockets.broadcast("The Fallen have lost the game!");
            closeArena();
          }, 5000);
        }, 5000);
      }

      if (c.MODE === "execution") {
        //    if (this.isPlayer || this.isBot) c.thing--;
        if (c.thing <= 1) {
          c.goNow = true;
        }
      }
      if (c.MODE === "theDistance") {
        if (this.label === "Undertaker") {
          console.log("Current lore mode index:", currentState.loreModeIndex);
          serverState.advanceLoreSequence();
          console.log("Lore mode sequence advanced.");
          sockets.broadcast(
            "Stfellas: YOU INSOLENT FOOLS! BE LUCKY VALRAYVN IS TOO BUSY FOR YOU!"
          );
          setTimeout(() => {
            sockets.broadcast(
              "Stfellas: OTHERWISE YOU WOULD HAVE DIED BY HER DIRECTLY. I'LL BE BACK!"
            );
          }, 5000);
          setTimeout(() => {
            sockets.broadcast(
              "Twilight: OK LISTEN UP, IF VAL ISN'T GOING TO LEAVE US ALONE, THEN WE WILL JUST HAVE TO TAKE HER OUT, LETS GO!"
            );
          }, 10000);
          setTimeout(() => {
            sockets.broadcast("Highlord Albatar: Aww I ran out of popcorn...");

            closeArena();
          }, 15000);
        }
        if (this.win) {
          sockets.broadcast(
            "The shrine glows and starts draining energy of neutral forces before disintegrating... "
          );
          c.win += 1;
          //this.trulyDead = false;
          //this.win = false;
        }
      }
      if (this.foodLevel > 4 && c.MODE === "theDenied" && c.wave > 0) {
        let lifeUp = this.foodLevel - 4;
        let plur;
        if (lifeUp === 1) {
          plur = "life";
        } else {
          plur = "lives";
        }
        c.ranarLoseCondition += lifeUp;
        sockets.broadcast(
          "Your team has destroyed a high tier polygon and gained " +
            lifeUp +
            " " +
            plur +
            "."
        );
      }
      if (
        //c.bossWave === 4 &&
        c.MODE === "theInfestation" &&
        this.label === "Anti-Virus"
      ) {
        sockets.broadcast(
          "CX has been defeated...and was revived by Anubis to lead the fallen!"
        );
        sockets.broadcast(
          "The Fallen have won the ga- what the? OH NO, THE PORTAL WAS A TRAP!"
        );
        /*console.log('Current lore mode index:', currentState.loreModeIndex);
  serverState.advanceLoreSequence();
console.log('Lore mode sequence advanced.');*/
        setTimeout(() => {
          c.enableHell = true;
          closeArena();
        }, 5000);
      }
      if (
        this.isPlayer &&
        c.MODE === "theDenied" &&
        c.wave > 0 &&
        !this.godMode
      ) {
        c.ranarLoseCondition -= 1;
        if (!c.denied1) {
          sockets.broadcast(
            "Twilight: You guys have shared lives, if one dies, you all lose a life."
          );
          c.denied1 = true;
        }
        if (c.ranarLoseCondition === 5) {
          sockets.broadcast(
            "Twilight: If the global life count reaches zero, we lose, don't die!"
          );
        }
        if (c.ranarLoseCondition < 1 && !room.closed && c.wave < 15) {
          sockets.broadcast("Twilight: NOOO!!!");
          setTimeout(() => {
            sockets.broadcast(
              "Ranar: NOW NOTHING CAN STOP ME, HAHAHAHAHAAAAHAHAHAHAHAAAA!!"
            );
            sockets.broadcast("Your team has lost the game!");
          }, 4000);
          setTimeout(() => {
            closeArena();
          }, 5000);
        }
      }
      if (c.MODE === "theAwakening") {
        if (this.bossProgress) {
          c.bossStage += 1;
          switch (c.bossStage) {
            case 4:
              sockets.broadcast(
                "Valrayvn: Hurry up! You still have one more to kill!"
              );
              break;
            case 5:
              sockets.broadcast(
                "Valrayvn: Finally, now let us see what lurks farther in."
              );
              makeRepairMen();
              c.bossStage += 1;
              break;
            case 11:
              let o = new Entity(room.type("bos9"));
              o.define(Class.valrayvn);
              o.isPlayer = true;
              o.aiTarget = "structures";
              setTimeout(() => {
                o.controllers = [new io_nearestDifferentMaster(o)];
              }, 10000);
              o.maxChildren = 0.2;
              o.team = -100;
              o.facingType = "looseToTarget";
              sockets.broadcast(
                "Valrayvn: How long does it take to kill a measly outsider?"
              );
              c.SPAWN_SPECIAL_ENEMIES = false;
              entities.forEach((e) => {
                if (e.type === "Aspect") e.kill();
              });
              setTimeout(() => {
                sockets.broadcast(
                  "Valrayvn: OOH, I can make a repair man from this!"
                );
              }, 5000);
              setTimeout(() => {
                sockets.broadcast(
                  "Valrayvn: It should be enough to open the gate, with the help of the switches to the generators."
                );
                makeRepairMen();
              }, 10000);
              setTimeout(() => {
                sockets.broadcast("Valrayvn: There is writing here...");
              }, 20000);
              setTimeout(() => {
                sockets.broadcast(
                  "Valrayvn: 'We have waited for an eternity'."
                );
              }, 25000);
              setTimeout(() => {
                sockets.broadcast("Valrayvn: 'And now we will be reborn'.");
              }, 30000);
              setTimeout(() => {
                sockets.broadcast(
                  "Valrayvn: Hmmm...why don't we try releasing one?"
                );
                c.bossStage += 1;
                c.npcMove = "hmmm";
                o.facingType = "smoothWithMotion";
                o.controllers = [new io_guard1(o)];
                setTimeout(() => {
                  o.spot = null;
                  o.controllers = [new io_nearestDifferentMaster(o)];
                  o.aiTarget = "allies";
                  o.facingType = "looseToTarget";
                }, 22500);
              }, 35000);
              break;
          }
        }
      }
      if (c.MODE === "theExpanse") {
        if (this.bossProgress && c.bossStage <= 2) {
          c.bossStage += 1;
          makeEventBosses();
          makeRepairMen();
          //util.log("GRUH "+c.bossStage);
        } else if (c.bossStage > 2 && this.bossProgress) {
          //Broadcasting for testing.
          setTimeout(() => {
            console.log("Current lore mode index:", currentState.loreModeIndex);
            serverState.advanceLoreSequence();
            console.log("Lore mode sequence advanced.");
            sockets.broadcast(
              "Highlord Akavir: Congrats on clearing out the hostiles, now we just need to clean up this mess!"
            );
          }, 25);
          setTimeout(() => {
            sockets.broadcast(
              "Sardonyx: (You think you are victorious? No, I am in your head now.)"
            );
          }, 5000);
          setTimeout(() => {
            sockets.broadcast(
              "Sardonyx: (You will now join us. Go infiltrate the Highlord Albatar's lab and create more portals so that I may return...)"
            );
          }, 7500);
          closeArena();
        }

        if (this.label === "Void Portal" && c.bossStage <= 3) {
          let o = new Entity(room.type("bos" + c.bossStage));
          o.bossProgress = true;
          o.team = -4;
          o.impervious = true;
          switch (this.deathSpawn) {
            case "abdul":
              o.define(Class[this.deathSpawn]);
              o.name = "Abdul";
              o.noRestore = true;
              o.ignoreCollision = false;
              o.intangibility = true;
              sockets.broadcast(
                "A Horrific being has emerged from the portal..."
              );
              setTimeout(() => {
                sockets.broadcast("Abdul: YOU SHALL BE DEVOURED!");
              }, 2500);
              break;
            case "weakHiveMind":
              o.define(Class[this.deathSpawn]);
              o.name = "Golothess";
              o.noRestore = true;
              setTimeout(() => {
                sockets.broadcast(
                  "Golothess: Shhhhhh...just surrender yourself so that I take you apart..."
                );
              }, 2500);
              break;
            case "weakNulltype":
              o.define(Class[this.deathSpawn]);
              o.name = "Alhazred";
              o.noRestore = true;
              sockets.broadcast(
                "A Horrific being has emerged from the portal..."
              );
              setTimeout(() => {
                sockets.broadcast(
                  "Alhazred: You are unfit to see our master, come so that I may fix that issue."
                );
              }, 2500);
              break;
            case "weakSardonyx":
              o.define(Class[this.deathSpawn]);
              sockets.broadcast(
                "The ship trembles as the shadow of the Dark Fate consumes it..."
              );
              setTimeout(() => {
                sockets.broadcast(
                  "Sardonyx: You have come to keep us out? NO, WE WILL NOT GO BACK!"
                );
              }, 2500);
              break;
          }
        }
      }
      if (c.MODE === "theControlled") {
        if (c.bossProgress >= 4) {
          c.bossProgress = 0;
          console.log("Current lore mode index:", currentState.loreModeIndex);
          serverState.advanceLoreSequence();
          console.log("Lore mode sequence advanced.");
          //Broadcasting for testing.
          setTimeout(() => {
            sockets.broadcast("Highlord Albatar: I am sorry, I have failed!");
          }, 25);
          setTimeout(() => {
            sockets.broadcast(
              "Highlord Dominique: Then we only have one option..."
            );
            setTimeout(() => {
              sockets.broadcast(
                "Highlord Kairo: Activate the cleansing beacon? No! That only forces them from the inside of the ship."
              );
            }, 5000);
            setTimeout(() => {
              sockets.broadcast(
                "Highlord Akavir: It wouldn't even kill them, not to mention with all of the void matter on our systems..."
              );
              setTimeout(() => {
                sockets.broadcast(
                  "Highlord Albatar: What you are suggestion could render our ship inert, and will result in us crashing into an unknown world."
                );
                setTimeout(() => {
                  sockets.broadcast(
                    "Highlord Dominique: I would rather not become 'one with the void'."
                  );
                  setTimeout(() => {
                    sockets.broadcast(
                      "Highlord Albatar: Fine, activating beacon!"
                    );
                    setTimeout(() => {
                      sockets.broadcast(
                        "The ship starts to shake as Void entities start disappearing."
                      );
                      c.fuckYouAnomalies = true;
                      closeArena();
                      setTimeout(() => {
                        sockets.broadcast(
                          "Sardonyx: YOU CAN RUN ALL YOU WANT, BUT THERE IS NO PLACE TO HIDE FROM ME, I'LL BE BACK!."
                        );
                      }, 5000);
                    }, 5000);
                  }, 5000);
                }, 5000);
              }, 5000);
            }, 5000);
          }, 5000);
        }
        if (this.bossProgress) {
          c.bossProgress += 1;
          sockets.broadcast(
            this.name +
              "'s Machine was destroyed, but he managed to escape death."
          );
        }
        if (
          this.label === "Void Portal" &&
          c.bossStage <= 9 &&
          this.team === -3
        ) {
          //util.log("TRIGGERED");
          let o = new Entity(room.type("bos" + c.bossStage));
          o.bossProgress = true;
          o.team = -3;
          o.impervious = true;
          o.myShip = true;
          switch (this.deathSpawn) {
            case "highlordKairo":
              o.define(Class[this.deathSpawn]);
              o.health.max /= 4;
              sockets.broadcast(
                "A powerful being has emerged from the portal..."
              );
              setTimeout(() => {
                sockets.broadcast("Highlord Kairo: We will not lose!");
              }, 2500);
              break;
            case "highlordAkavir":
              o.define(Class[this.deathSpawn]);
              o.health.max /= 3;
              sockets.broadcast(
                "A powerful being has emerged from the portal..."
              );
              setTimeout(() => {
                sockets.broadcast(
                  "Highlord Akavir: Prepare to die, void-scum!"
                );
              }, 2500);
              break;
            case "highlordAidra":
              o.define(Class[this.deathSpawn]);
              o.health.max /= 2;
              sockets.broadcast(
                "A powerful being has emerged from the portal..."
              );
              setTimeout(() => {
                sockets.broadcast(
                  "Highlord Dominique: No one shall mess with Albatar, die!"
                );
              }, 2500);
              break;
            case "weakHighlordAlbatar":
              o.define(Class[this.deathSpawn]);
              sockets.broadcast(
                "The ship trembles as a bright light begins to blind you..."
              );
              setTimeout(() => {
                sockets.broadcast(
                  "Highlord Albatar: You pathetic creatures of darkness, I will send you back to oblivion!"
                );
              }, 2500);
              o.BROADCAST_MESSAGE =
                "Highlord Albatar: Damn it! What the hell are you?";
              break;
            default:
              o.bossProgress = false;
          }
        }
      }
      if (this.specialEffect === "cxShrine" && c.MODE === "theInfestation") {
        c.cxPowerDrain += 1;
      }
      if (c.MODE === "theDenied" && !this.godMode) {
        if (c.wave >= 6 && this.isTwilight) {
          this.invuln = true;
          this.trulyDead = false;
          this.health.amount = 1;
          this.REGEN = 7.5;
          if (this.twiDialog === undefined) this.twiDialog = 0;
          else this.twiDialog += 1;
          switch (this.twiDialog) {
            case 2:
              sockets.broadcast("Twilight: ...");
              break;
            case 4:
              sockets.broadcast(
                "Twilight: ...Some help would be nice, yah know."
              );
              break;
            case 6:
              sockets.broadcast("Twilight: UGH!!!!!!");
              break;
            case 8:
              sockets.broadcast(
                "Twilight: wait.... ARE YOU MAKING ME SOLO RANAR!?"
              );
              break;
            case 9:
              sockets.broadcast(
                "Twilight: Don't tell me you're doing the kill ranar with basic challenge....."
              );
              break;
            case 10:
              sockets.broadcast(
                "Twilight: F*** YOU, I AM OUTTA HERE! I'MA WATCH YOU FIGHT RANAR INSTEAD!"
              );
              this.destroy();
              break;
          }
        }
        if (
          this.team === -101 ||
          (this.team === -100 &&
            this.targetable &&
            this.type !== "food" &&
            !this.isWall &&
            !this.isGate &&
            !this.isProjectile)
        ) {
          let loc = { x: this.x, y: this.y };
          this.rarity = Math.random() * 50;
          if (this.rarity < 5) {
            let o = new Entity(loc);
            o.define(Class.healOrb);
            o.skill.score = 30000;
            o.team = -1;
            setTimeout(() => {
              o.ACCELERATION = 0.015;
              o.SPEED = 0.05;
              o.refreshBodyAttributes;
              o.invuln = false;
            }, 4000);
          }
          if (this.rarity < 0.5) {
            let o = new Entity(room.randomType("norm"));
            o.define(Class.repPod);
            o.color = 10;
            o.team = -1;
            o.invuln = false;
          }
        }
      }

      if (
        (this.enemy && c.MODE === "theDenied") ||
        (this.isBot && c.MODE === "theDenied")
      ) {
        c.enemyCount -= 1;
      }
      if (this.isPlayer && !this.godMode) {
        let dude = this.name;
        if (this.name === "") dude = "An unnamed player";
        util.log(dude + " has died as a " + this.label + ".");
      }
      if (this.isRanar && c.MODE === "theDenied") {
        if (this.label === "Ascendant") {
          c.wave = 15;
          this.trulyDead = false;
          this.runAway = true;
          this.x = room.type("spw0").x;
          this.y = room.type("spw0").y;
          this.health.max = 1000000;
          this.health.amount = this.health.max;
          this.define(Class.basic);
          //this.trulyDead = false;
          this.invuln = true;
          this.color = 10;
          sockets.broadcast("Ranar: Noooooooo!");
          sockets.broadcast("Ranar has been defeated!");
          console.log("Current lore mode index:", currentState.loreModeIndex);
          serverState.advanceLoreSequence();
          console.log("Lore mode sequence advanced.");
        }
        if (this.label === "Disciple") {
          this.define(Class.ranarAscendantForm);
          this.health.amount = this.health.max;
          //this.invuln = true;
          this.trulyDead = false;
          this.goBack = true;
          sockets.broadcast(
            "Ranar: You have forced me to try! Prepare to be erased!"
          );

          c.wave = 6;
          this.haltActions = true;
        }
      }
      if (
        (this.enemy && c.MODE === "theRestless") ||
        (this.isBot && c.MODE === "theRestless")
      ) {
        c.enemyCount -= 1;
      }
      if (this.isPlayer && !this.godMode) {
        let dude = this.name;
        if (this.name === "") dude = "An unnamed player";
        util.log(dude + " has died as a " + this.label + ".");
      }
      if (this.eliteBoss && c.MODE === "theDivided") {
        if (this.label === "Arrasian Lord") {
          c.wave = 6;
          this.trulyDead = true;
          this.runAway = true;
          this.x = room.type("bos0").x;
          this.y = room.type("bos0").y;
          this.health.max = 1000000;
          this.health.amount = this.health.max;
          this.invuln = true;
          sockets.broadcast("Valrayvn: ...");
          sockets.broadcast("Valrayvn has been defeated!");
        }
        c.wave = 6;
        this.haltActions = true;
      }

      if (this.godMode) {
        this.health.amount = this.health.max;
        this.shield.amount = this.shield.max;
        this.trulyDead = false;
      }
      if (this.label === "Shrine" && c.MODE === "theDenied") {
        c.eventProgress = true;
        // Assuming this loop is correctly controlled elsewhere in your code
        /*  for (let i = 0; i < 9; i++) {
    if (room["gte" + i]) {
      
      room["gte" + i].forEach((loc) => {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;
    let a = Class.fortgate;
    let o;

    if (gridWidth > gridHeight) {
      let start = loc.x - gridWidth / 2 + gridHeight / 2;
      let end = loc.x + gridWidth / 2 - gridHeight / 2;
      let x = start;
      for (;;) {
        o = new Entity({
          x: Math.min(x, end),
          y: loc.y,
        });
        o.define(a);
        o.SIZE = gridHeight / 2.25;
        if (x >= end) {
          break;
        }
        x += gridHeight;
      }
    } else if (gridWidth < gridHeight) {
      let start = loc.y + gridWidth / 2 - gridHeight / 2;
      let end = loc.y - gridWidth / 2 + gridHeight / 2;
      let y = start;
      for (;;) {
        o = new Entity({
          x: loc.x,
          y: Math.min(y, end),
        });
        o.define(a);
        o.SIZE = gridWidth / 2.25;
        if (y >= end) {
          break;
        }
        y += gridWidth;
      }
    } else {
      o = new Entity(loc);
      o.define(a);
      o.SIZE = gridWidth / 2.25;
    }

    o.coreSize = o.SIZE;
    o.protect();

    if (i >= 1) {
      o.team = -i;
      o.color = [10, 18, 7, 19][i - 1];
    } else {
      o.team = -100;
      o.color = 3;
    }

    o.refreshBodyAttributes();
    o.grid = {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          }
    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
    o.isGate = true;
      o.spawnLoc = loc;
        });
    
   }
  }*/
        makeFortGates();
        makeTeamedWalls();
        sockets.changeroom();
        let relo = room.type("spw0");
        let o = new Entity(relo);
        o.define(Class.ranarDiscipleForm);
        o.invuln = true;
        o.cannot = true;
        sockets.broadcast(
          "Ranar: WHO THE HELL DARE BREAKS MY SHRINE?! IT WAS A GIFT FROM VALRAYVN"
        );

        setTimeout(() => {
          sockets.broadcast("Ranar: *sigh*");
        }, 6000);
        setTimeout(() => {
          sockets.broadcast("Ranar: Come here so that I may see you child...");
        }, 12000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: Greetings you idiots, I am Ranar, Creator and Ruler of this place."
          );
        }, 24000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: Ever since Twilight's rebellion showed up, Valrayvn has been distracted from a very important task."
          );
        }, 30000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: So I created this server to quarantine you all, like a net."
          );
        }, 36000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: And like a net, it can get full and can't catch anymore."
          );
        }, 42000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: So you must clean the net, or in your case, ERADICATE IT!"
          );
        }, 48000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: You are all the strongest members of your factions, sent by your leaders to stop me."
          );
        }, 54000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: So let me see what their definition of 'strong' is."
          );
        }, 60000);
        setTimeout(() => {
          sockets.broadcast(
            "Ranar: Oh, and no pressure but, once I kill you all, everything in the server dies, like I said, NO PRESSURE! HAHAHAHHAHAAAA!"
          );
          //loc = room.randomType("norm");
          o.isRanar = true;
          /*   o.ignoreCollision = false;
          o.impervious = true;*/
          o.noRestore = true;
          o.invuln = false;
        }, 67000);
        o.team = -100;
      }
      if (this.label === "Shrine" && c.MODE === "theDivided") {
        c.eventProgress = true;
        // Assuming this loop is correctly controlled elsewhere in your code
        /*  for (let i = 0; i < 9; i++) {
    if (room["gte" + i]) {
      
      room["gte" + i].forEach((loc) => {
  let gridWidth = room.width / room.xgrid;
  let gridHeight = room.height / room.ygrid;
    let a = Class.fortgate;
    let o;

    if (gridWidth > gridHeight) {
      let start = loc.x - gridWidth / 2 + gridHeight / 2;
      let end = loc.x + gridWidth / 2 - gridHeight / 2;
      let x = start;
      for (;;) {
        o = new Entity({
          x: Math.min(x, end),
          y: loc.y,
        });
        o.define(a);
        o.SIZE = gridHeight / 2.25;
        if (x >= end) {
          break;
        }
        x += gridHeight;
      }
    } else if (gridWidth < gridHeight) {
      let start = loc.y + gridWidth / 2 - gridHeight / 2;
      let end = loc.y - gridWidth / 2 + gridHeight / 2;
      let y = start;
      for (;;) {
        o = new Entity({
          x: loc.x,
          y: Math.min(y, end),
        });
        o.define(a);
        o.SIZE = gridWidth / 2.25;
        if (y >= end) {
          break;
        }
        y += gridWidth;
      }
    } else {
      o = new Entity(loc);
      o.define(a);
      o.SIZE = gridWidth / 2.25;
    }

    o.coreSize = o.SIZE;
    o.protect();

    if (i >= 1) {
      o.team = -i;
      o.color = [10, 18, 7, 19][i - 1];
    } else {
      o.team = -100;
      o.color = 3;
    }

    o.refreshBodyAttributes();
    o.grid = {
            x: Math.floor(loc.x / gridWidth),
            y: Math.floor(loc.y / gridHeight),
          }
    o.VELOCITY.x = 0;
    o.VELOCITY.y = 0;
    o.ACCEL.x = 0;
    o.ACCEL.y = 0;
    o.isGate = true;
      o.spawnLoc = loc;
        });
    
   }
  }*/
        makeFortGates();
        makeTeamedWalls();
        sockets.changeroom();
        let relo = room.type("spw0");
        let o = new Entity(relo);
        o.define(Class.valrayvn);
        o.invuln = true;
        o.cannot = true;
        sockets.broadcast(
          "Valrayvn: Hello Cubed, Tryi, didn't I tell you to raid the prophecy server?"
        );

        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: We gotta kill them before they find a way out, the Kristaps Ascendant will not last nearly as long."
          );
        }, 6000);
        setTimeout(() => {
          sockets.broadcast(
            "Cubed: Ok Valrayvn, we will put this simply, tell your forces who you really are or we are gonna pound you in to dirt."
          );
        }, 12000);
        setTimeout(() => {
          sockets.broadcast("Valrayvn: ...What?");
        }, 24000);
        setTimeout(() => {
          sockets.broadcast(
            "Tryi: You have created a world of suffering to entertain you, you manipulated people to serve you and caused so much agony."
          );
        }, 30000);
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: You couldn't understand, I suggest you go do your duties before you do something you will horribly regret."
          );
        }, 36000);
        setTimeout(() => {
          sockets.broadcast(
            "Cubed: No, you will be the one that will regret your decisions!"
          );
        }, 42000);
        setTimeout(() => {
          sockets.broadcast(
            "Tryi: We gave you the option Val, now we won't feel bad about this!"
          );
        }, 48000);
        setTimeout(() => {
          sockets.broadcast(
            "Valrayvn: Pathetic! Even without my forces, I can still womp your barrels!"
          );
        }, 54000);
        setTimeout(() => {
          sockets.broadcast("Cubed & Tryi: Show no mercy!");
        }, 60000);
        setTimeout(() => {
          o.eliteBoss = true;
          //o.ignoreCollision = false;
          o.noRestore = true;
          o.invuln = false;
        }, 67000);
        o.team = -100;
      }
      if (c.MODE === "siege" && !this.isProjectile && this.team === -100) {
        c.bossAmount = 0;
        entities.forEach((entity) => {
          if (entity.siegeProgress && entity.team === -100 && !entity.isDead())
            c.bossAmount += 1;
        });
        c.bossAmount -= 1;
        //console.log(c.bossAmount);
        if (this.siegeProgress) {
          if (c.bossAmount <= 0) {
            setTimeout(() => {
              if (c.bossAmount <= 0) {
                c.preparedCounter = c.bossWave * 5 + 50;
                c.bossWave += 1;
                c.continueWave = true;
                c.dontSpam = true;
                c.bossAmount = 1;
                currentState.bossWaves = c.bossWave + 1;
                //     util.log(currentState.bossWaves);
                sockets.broadcast("Wave " + c.bossWave + " has started!");
              }
            }, 5432);
          }
        }
      }
      if (c.PLAGUE || this.infected) {
        if (!this.plagued && !this.godMode) {
          if (this.type === "tank") {
            this.trulyDead = false;
            this.controllers = [
              // new io_moveInCircles(this),
              new io_nearestDifferentMaster(this),
              new io_mapTargetToGoal(this),
            ];
            this.facingType = "toTarget";
            // killer.sendMessage("You have killed " + this.name + "'s " + this.label + "...but he came back to life!");
            this.sendMessage(
              "You have died and became a " + this.label + " zombie!"
            );
            this.died = true;
            // this.id *= -1;
            this.health.max *= 1.25;
            this.health.amount *= 1.25;
            this.REGEN = -1;
            this.spd /= 2;
            this.aiTarget = "general";
            this.health.amount = this.health.max;
            if (c.PLAGUE) {
              this.team = -2;
              this.color = 41;
            }
            this.invuln = true;
            this.isPlayer = false;

            setTimeout(() => {
              this.invuln = false;
            }, 2000);
            // this.isPlayer = false;
            this.plagued = true;
          }
        }
      }
      if (this.specialEffect === "rep") {
        let loc = { x: this.x, y: this.y };
        let o = new Entity(loc);
        o.define(Class.repairMan);
        if (c.MODE === "theExpanse") {
          o.team = -3;
          o.color = 7;
        }
        if (c.MODE === "theAwakening") {
          o.team = -100;
          o.color = 3;
        }
        if (c.MODE === "theControlled") {
          o.team = -4;
          o.color = 19;
        }
        if (c.MODE === "theDenied") {
          o.team = -1;
          o.color = 10;
          o.fov += 50000;
        }
      }
      if (this.godMode) {
        this.health.amount = this.health.max;
        this.shield.amount = this.shield.max;
        this.trulyDead = false;
      }
      if (c.MODE === "theGreatPlague") {
        if (
          this.type !== "food" &&
          this.team !== -2 &&
          this.structure !== true
        ) {
          if (
            this.type === "tank" ||
            this.isEnemy === true ||
            this.isBoss === true
          ) {
            this.spd /= 2;
            this.health.amount = this.health.max;
            this.trulyDead = false;
            this.team = -2;
            this.color = 18;
            this.health.max *= 2;
            this.REGEN = -1;
            this.health.amount = this.health.max;

            this.addController(new io_nearestDifferentMaster(this));
            this.addController(new io_mapTargetToGoal(this));

            //this.addController(new io_guard1(this));

            if ((this.type === "neutralBoss" && this.isBoss) || this.isEnemy) {
              if (this.label === "Lord of Mechanisms") {
                sockets.broadcast(
                  "Pendekot has been defeated...and revived to serve the fallen!"
                );
                sockets.broadcast(
                  "The Fallen have won the game, but the portal colapsed!"
                );
                setTimeout(() => {
                  c.enableHell = true;
                  closeArena();
                }, 5000);
              }
              this.type = "fallenBoss";
            }
          }
        }
      }
      if (this.isSoccerBall && !room.closed) {
        this.trulyDead = false;
        this.health.amount = this.health.max;
        switch (this.lastCollide.team) {
          case -1:
            if (room.isIn("bas" + -this.lastCollide.team, spwn)) {
              sockets.broadcast(
                "The ball got blocked by " +
                  util.getTeam(this.lastCollide.team) +
                  " and was returned to the center!"
              );
            } else {
              c.soccerBlueCount += 1;
              sockets.broadcast(
                "A Goal was scored by " +
                  util.getTeam(this.lastCollide.team) +
                  "!"
              );
            }
            break;
          case -2:
            if (room.isIn("bas" + -this.lastCollide.team, spwn)) {
              sockets.broadcast(
                "The ball got blocked by " +
                  util.getTeam(this.lastCollide.team) +
                  " and was returned to the center!"
              );
            } else {
              c.soccerGreenCount += 1;
              sockets.broadcast(
                "A Goal was scored by " +
                  util.getTeam(this.lastCollide.team) +
                  "!"
              );
            }
            break;
          case -3:
            if (room.isIn("bas" + -this.lastCollide.team, spwn)) {
              sockets.broadcast(
                "The ball got blocked by " +
                  util.getTeam(this.lastCollide.team) +
                  " and was returned to the center!"
              );
            } else {
              c.soccerRedCount += 1;
              sockets.broadcast(
                "A Goal was scored by " +
                  util.getTeam(this.lastCollide.team) +
                  "!"
              );
            }
            break;
          case -4:
            if (room.isIn("bas" + -this.lastCollide.team, spwn)) {
              sockets.broadcast(
                "The ball got blocked by " +
                  util.getTeam(this.lastCollide.team) +
                  " and was returned to the center!"
              );
            } else {
              c.soccerPurpleCount += 1;
              sockets.broadcast(
                "A Goal was scored by " +
                  util.getTeam(this.lastCollide.team) +
                  "!"
              );
            }
            break;
          default:
        }
        let goal = "GOALS: ";
        if (c.TEAMS.includes(1)) {
          goal += util.getTeam(-1) + "|" + c.soccerBlueCount + ", ";
        }
        if (c.TEAMS.includes(2)) {
          goal += util.getTeam(-2) + "|" + c.soccerGreenCount + ", ";
        }
        if (c.TEAMS.includes(3)) {
          goal += util.getTeam(-3) + "|" + c.soccerRedCount + ", ";
        }
        if (c.TEAMS.includes(4)) {
          goal += util.getTeam(-4) + "|" + c.soccerPurpleCount + ", ";
        }
        goal += "You need " + c.goals + " goals to win!";
        sockets.broadcast(goal);
        let relo = room.type("ball");
        this.accel.x = 0;
        this.accel.y = 0;
        this.x = relo.x;
        this.y = relo.y;
        if (c.soccerBlueCount >= c.goals) {
          sockets.broadcast(util.getTeam(-1) + " have won the game!");
          closeArena();
        } else if (c.soccerGreenCount >= c.goals) {
          sockets.broadcast(util.getTeam(-2) + " have won the game!");
          closeArena();
        } else if (c.soccerRedCount >= c.goals) {
          sockets.broadcast(util.getTeam(-3) + " have won the game!");
          closeArena();
        } else if (c.soccerPurpleCount >= c.goals) {
          sockets.broadcast(util.getTeam(-4) + " have won the game!");
          closeArena();
        }
      }

      /*/
      //Shoot on death
      // Initalize message arrays
   /*/ let killers = [],
        killTools = [],
        notJustFood = false;
      if (this.trulyDead) {
        // If I'm a tank, call me a nameless player
        let name =
          this.master.name == ""
            ? this.master.type === "tank"
              ? "a nameless player's " + this.label
              : this.master.type === "neutralBoss"
              ? "a visiting " + this.label
              : this.master.type === "fallenBoss"
              ? "a risen " + this.label
              : this.master.type === "highlordBoss"
              ? "a automated " + this.label
              : this.master.type === "guardianBoss"
              ? "a rebelling " + this.label
              : this.master.type === "voidlordBoss"
              ? "a shifting " + this.label
              : util.addArticle(this.label)
            : this.master.name + "'s " + this.label;
        // Calculate the jackpot
        let jackpot = Math.ceil(
          util.getJackpot(this.skill.score) / this.collisionArray.length
        );
        // Now for each of the things that kill me...
        this.collisionArray.forEach((instance) => {
          if (instance.team == -101 || this.team == instance.team) return 0;
          if (instance.master.settings.acceptsScore) {
            // If it's not food, give its master the score

            notJustFood = true;
            if (instance.damage !== 0)
              if (
                instance.master.type === "tank" ||
                instance.master.type === "deity" ||
                instance.master.isEnemy ||
                instance.master.isBoss
              )
                if (this.skill.score > 0)
                  Math.ceil(
                    (instance.master.skill.score +=
                      jackpot + (this.damageRecieved * 100 + 1))
                  );
          } else if (instance.settings.acceptsScore) {
            if (this.skill.score > 0)
              Math.ceil(
                (instance.kill.score +=
                  jackpot + (this.damageRecieved * 100 + 1))
              );
          }
          killers.push(instance.master); // And keep track of who killed me

          killTools.push(instance); // Keep track of what actually killed me
        });
        // Remove duplicates
        killers = killers.filter(
          (elem, index, self) => index == self.indexOf(elem)
        );
        //    killers = killers.filter((elem, index, self) => {
        // return index == self.indexOf(elem);
        // });

        // If there's no valid killers (you were killed by food), change the message to be more passive
        let killText = notJustFood ? "" : "You have been killed by ",
          dothISendAText = this.settings.givesKillMessage;
        for (let i = 0; i < this.collisionArray.length; i++) {
          let instance = this.collisionArray[i];
          this.killCount.killers.push(instance.index);
          if (this.type === "tank") {
            if (killers.length > 1) instance.killCount.assists++;
            else instance.killCount.solo++;
          }
          if (this.isBoss) instance.killCount.bosses++;
          if (this.type === "food" || this.type === "crasher")
            instance.killCount.polygons++;
        }
        // Add the killers to our death message, also send them a message
        if (notJustFood) {
          //this is not just food. it is a compressed thermonuclear bomb ready to bust open in your mouth
          for (let i = 0; i < killers.length; i++) {
            let instance = killers[i];
            if (instance.name === "" || instance.name === " ") {
              if (killText === "" || killText === " ") {
                killText += "An unnamed player";
              } else {
                killText += "an unnamed player";
              }
            } else {
              killText += instance.name;
            }
            //killText += " and ";
            // killText +=
            // instance.name == ""
            //   ? killText == ""
            //    ? "An unnamed player"
            //     : "an unnamed player"
            //    : instance.name;
            //    killText += " and ";

            //Only if we give messages

            if (dothISendAText) {
              // if (
              //  instance.master.type !== "food" &&
              // instance.master.type !== "crasher"
              // ) {
              //   killText +=
              //     instance.name == ""
              //       ? killText == ""
              //        ? "An unnamed player"
              //         : "an unnamed player"
              //       : instance.name;
              //  killText += " and ";
              // }

              /* if (instance.name === "" || instance.name === " ") {
                if (killText === "" || killText === " ") {
                  killText += "An unnamed player";
                } else {
                  killText += "an unnamed player";
                }
              }*/

              killText += " and ";
              instance.sendMessage(
                "You killed " +
                  name +
                  (killers.length > 1 ? " (with some help)." : ".")
              );
            }
          }
          // Prepare the next part of the text

          killText = killText.slice(0, -4);
          killText += ran.choose([
            "killed you with ",
            "slew you with ",
            "vaporized you using ",
            "nuked you with ",
            "wasted you with ",
            "clapped you using ",
            "vanquished you using ",
          ]);
        }

        // Broadcast
        if (this.settings.broadcastMessage)
          sockets.broadcast(this.settings.broadcastMessage);
        // Add the implements to the message
        for (let i = 0; i < killTools.length; i++) {
          killText += util.addArticle(killTools[i].label) + " and ";
        }
        // Prepare it and clear the collision array.
        killText = killText.slice(0, -5);
        if (killText === "You have been kille")
          killText = ran.choose([
            "You have died a stupid death",
            "You have ceased to exist",
            "You have unintentionally embraced the void...and disintegrated..",
            "You have spontaneously exploded",
            "You have died to literally nothing",
            "You fought a polygon...and the polygon won..",
            "You have been reduced to atoms...",
            "You were utterly eradicated",
            //"You went too LOW and began FADE away into the MASSIVE void", kys - lmfao
          ]);
        this.sendMessage(killText + "!");
      }

      let killer = ran.choose(killers);

      killers.forEach((instance) => {
        if (
          //how do i make a stronger version of this, or well copy this one cuz ik how to make it stronger
          instance.master.voidCreation > 0 &&
          (this.type === "tank" ||
            this.isEnemy ||
            this.isBoss ||
            this.type === "food") &&
          this.skill.score >= 10000
        ) {
          // instance.master.voidLimit = instance.master.skill.score - instance.master.extraMinions;
          let o = new Entity(spwn);
          switch (instance.master.voidCreation) {
            case 1:
              o.define(
                Class[
                  ran.choose([
                    "aoc",
                    "gunnerMechab",
                    "beeMechab",
                    "Mechab",
                    "machinegunMechab",
                    "buildMechab",
                    "trapMechab",
                    "trapMechabarab",
                    "swarmMechab",
                    "anomaly",
                    "hardshellanomaly",
                    "aokaol",
                    "amalgam",
                    "abdul",
                    "hiveMind",
                    "nulltype",
                    "abyssalTetraCrasher",
                    "abyssthrasher",
                    "sardonyx",
                    "Seraphim",
                  ])
                ]
              );
              if (
                this.skill.score > instance.master.skill.score ||
                instance.master.skill.score < instance.master.extraMinions ||
                this.skill.score < o.skill.score
              ) {
                o.define(Class.thrasher);
                o.specialEffect = "none";
                o.ignoreCollision = false;
              }
              break;

            case 2:
              o.define(
                Class[
                  ran.choose([
                    "voidCaller",
                    "voidCaller",
                    "voidCaller",
                    "voidCaller",
                    "voidCaller",
                    "hardshellanomaly",
                    "amalgam",
                    "abdul",
                    "hiveMind",
                    "nulltype",
                    "abyssalTetraCrasher",
                    "abyssthrasher",
                    "trimalgam",
                    "sardonyx",
                    "Seraphim",
                  ])
                ]
              );
              {
                o.define(Class.glitch);
                o.specialEffect = "none";
                o.ignoreCollision = false;
              }
              break;
          }

          if (o.name !== "Sardonyx") o.name = "";
          else o.name = "Sardony";
          o.settings.broadcastMessage = null;

          if (o.label !== "thrasher") {
            o.voidling = true;
            instance.master.extraMinions += o.skill.score;
          }
          if (o.name === "Sardonyx") {
            sockets.broadcast("Sardonyx: Finally, I have been summoned!");
            if (c.MODE === "theDenied") {
              sockets.broadcast(
                "Ranar: Who the heck are you and who said you could talk?!"
              ); //skul
              setTimeout(() => {
                sockets.broadcast(
                  "Sardonyx: I am Sardonyx, The Dark Fate, and I did, come, embrace the void with me..."
                );
                setTimeout(() => {
                  sockets.broadcast(
                    "Ranar: OH F*** NO! WHY DID VALRAYVN NEGLECT TO TELL ME ABOUT CRAP LIKE THIS?!"
                  );
                }, 5000);
              }, 5000);
            }
          }
          if (o.name === "Seraphim") {
            sockets.broadcast("Seraphim: D̶͖̀ō̴̯͕͠ ̴̲̄͝n̵͙̺̈́̌o̷͔̽ͅt̴͈̏̃ ̴͖̈́͗b̸̻͚̿e̷̐ͅ ̴̞̔̊ą̶̈́͝f̵̯̙͌̎r̶̨̝̀a̷̦̩͝i̴̦͇̋̐d̸͍̏̀.̸͈̺͊");
            if (c.MODE === "theDenied") {
              sockets.broadcast("Ranar: Oh... my.."); //skul
              setTimeout(() => {
                sockets.broadcast(
                  "Ranar: Valrayvn the hell is this??? VALRAYVN I DON'T REMEMBER THIS BEING A PART OF THE AGREEMENT??"
                );
                setTimeout(() => {
                  sockets.broadcast(
                    "Ranar: (sigh) Looks like I'm going to kill a god or die trying..."
                  );
                }, 5000);
              }, 5000);
            }
          }
          o.refreshBodyAttributes();
          o.team = instance.team;
          o.color = instance.color;
          o.master = instance.master;
        }
        if (c.MODE === "theInfestation") {
          if (
            this.type !== "food" &&
            this.team !== -2 &&
            this.structure !== true
          ) {
            if (
              this.type === "tank" ||
              this.isEnemy === true ||
              (this.isBoss === true && (this.color === 3 || this.color === 35))
            ) {
              this.spd /= 2;
              this.health.amount = this.health.max;
              this.trulyDead = false;
              this.team = -2;
              this.color = 18;
              this.health.max *= 2;
              this.REGEN = -1;
              this.health.amount = this.health.max;

              this.addController(new io_nearestDifferentMaster(this));
              this.addController(new io_mapTargetToGoal(this));

              //this.addController(new io_guard1(this));

              if (
                (this.type === "neutralBoss" && this.isBoss) ||
                this.isEnemy
              ) {
                if (this.label === "Anti-Virus") {
                  c.vruh = true;
                  sockets.broadcast(
                    "CX has been defeated...and revived to lead the fallen!"
                  );
                  sockets.broadcast(
                    "The Fallen have won the ga- what the? OH NO, THE PORTAL WAS A TRAP!"
                  );
                  setTimeout(() => {
                    c.enableHell = true;
                    closeArena();
                    console.log(
                      "Current lore mode index:",
                      currentState.loreModeIndex
                    );
                    serverState.advanceLoreSequence();
                    console.log("Lore mode sequence advanced.");
                  }, 5000);
                }
                this.type = "fallenBoss";
              }
            }
          }
        }
        if (this.voidling) {
          this.master.extraMinions -= this.skill.score;
        }
        if (this.zombied) {
          this.master.extraMinions -= 50000;
        }

        if (instance.master.plaguebringer && this.type && !this.contaminate) {
          if (
            this.type === "tank" ||
            this.type === "crasher" ||
            this.tier === 1
          ) {
            // instance.master.undeadLimit = instance.master.skill.score - instance.master.extraMinions;
            //instance.master.extraMinions += 50000;
            if (
              // instance.skill.score > instance.master.skill.score ||
              instance.master.skill.score < instance.master.extraMinions &&
              c.MODE !== "hehehehaw"
            ) {
              this.kill();
            } else {
              let dude = this.name;
              if (this.name === "") dude = "An unnamed player";
              instance.sendMessage(
                dude + "'s " + this.label + " was revived under your control!"
              );
              this.sendMessage(
                "You have died and became a " + this.label + " zombie!"
              );

              this.trulyDead = false;
              this.controllers = [
                //  new io_moveInCircles(this),
                new io_nearestDifferentMaster(this),
                new io_mapTargetToGoal(this),
              ];
              this.facingType = "toTarget";
              this.died = true;
              this.health.max *= 1.25;
              this.health.amount *= 1.25;
              this.REGEN = -1;
              this.spd /= 2;
              this.aiTarget = "general";
              this.health.amount = this.health.max;
              this.invuln = true;
              this.isPlayer = false;
              setTimeout(() => {
                this.invuln = false;
              }, 2000);
              this.isPlayer = false;
              this.contaminate = true;
              this.zombied = true;
              this.name = "[" + instance.master.name + "] Zombie";
              this.refreshBodyAttributes();
              this.team = instance.team;
              this.color = instance.color;
              this.master = instance.master;
            }
          }
        }
        if (instance.master.infector && !this.plagued) {
          if (
            this.type === "tank" ||
            this.type === "crasher" ||
            this.specialEffect === "animatable"
          ) {
            // instance.master.undeadLimit = instance.master.skill.score - instance.master.extraMinions;
            //instance.master.extraMinions += 50000;
            if (
              // instance.skill.score > instance.master.skill.score ||
              instance.master.skill.score < instance.master.extraMinions &&
              c.MODE !== "plague"
            ) {
              this.kill();
            } else {
              if (this.type === "tank" || this.specialEffect === "animatable") {
                let dude = this.name;
                if (this.name === "") dude = "An unnamed player";
                instance.sendMessage(
                  dude + "'s " + this.label + " was revived under your control!"
                );
                if (c.MODE === "theDenied") {
                  if (this.label === "Descendant") {
                    setTimeout(() => {
                      sockets.broadcast(
                        ran.choose([
                          "Ranar: " +
                            this.name +
                            " are you alright? Hello? WHAT YOU DO TO THEM!?",
                          "Ranar: " +
                            this.name +
                            "? What the fu-? Dude, get your own minions!",
                          "Ranar: " +
                            this.name +
                            " are you alright? Hello? WHAT YOU DO TO THEM!?",
                          "Ranar: " +
                            this.name +
                            "? " +
                            this.name +
                            "!? " +
                            this.name.toUpperCase() +
                            "!?",
                          "Ranar: Dude, " +
                            this.name +
                            ", chill! Why are you attacking him? Why are you growling!?",
                        ])
                      );
                    }, 5000);
                  }
                }
                this.sendMessage(
                  "You have died and became a " + this.label + " zombie!"
                );
              }
              this.trulyDead = false;
              this.controllers = [
                // new io_moveInCircles(this),
                new io_nearestDifferentMaster(this),
                new io_mapTargetToGoal(this),
              ];
              this.facingType = "toTarget";
              this.died = true;
              this.health.max *= 1.25;
              this.health.amount *= 1.25;
              this.REGEN = -1;
              this.spd /= 2;
              this.aiTarget = "general";
              this.health.amount = this.health.max;
              this.invuln = true;
              this.isPlayer = false;

              setTimeout(() => {
                this.invuln = false;
              }, 2000);
              this.isPlayer = false;
              this.plagued = true;
              this.zombied = true;
              if (this.type === "tank")
                this.name = "[" + instance.master.name + "] Zombie";
              this.refreshBodyAttributes();
              this.team = instance.team;
              this.color = instance.color;
              this.master = instance.master;
            }
          }
        }
      });
      if (this.isWall) {
        if (!isNaN(this.x) || !isNaN(this.y)) {
          var plce = { x: this.x, y: this.y };
        }
        if (c.MODE !== "JJ's RF" && c.MODE !== "test") {
          if (killer) {
            this.team = killer.team;
            switch (this.team) {
              case -1:
                this.color = 10;
                break;
              case -2:
                this.color = 18;
                break;
              case -3:
                this.color = 7;
                break;
              case -4:
                this.color = 19;
                break;
              case -6:
                this.color = 5;
                break;
              case -7:
                this.color = 17;
                break;
              case -8:
                this.color = 20;
                break;
              case -100:
                this.color = 3;
                break;
              case -6:
              default:
                this.color = killer.color;
            }
          }
          this.trulyDead = false;
          this.health.amount = this.health.max;
          this.shield.amount = this.shield.max;
          this.VELOCITY.x = 0;
          this.VELOCITY.y = 0;
          this.ACCEL.x = 0;
          this.ACCEL.y = 0;
          this.refreshBodyAttributes();
          room.setup[this.grid.y][this.grid.x] = "frt" + -this.team;
        } else {
          this.trulyDead = false;
          this.team = -100;
          this.color = 3;
          this.health.amount = this.health.max;
          this.shield.amount = this.shield.max;
          this.VELOCITY.x = 0;
          this.VELOCITY.y = 0;
          this.ACCEL.x = 0;
          this.ACCEL.y = 0;
          this.refreshBodyAttributes();
          room.setup[this.grid.y][this.grid.x] = "frt" + -this.team;
        }
        sockets.changeroom();
      }
      if (this.isGate) {
        if (!isNaN(this.x) || !isNaN(this.y)) {
          var plce = { x: this.x, y: this.y };
        }
        if (killer) {
          if (c.MODE !== "JJ's RF" && c.MODE !== "test") {
            this.team = killer.team;
            switch (this.team) {
              case -1:
                this.color = 10;
                break;
              case -2:
                this.color = 18;
                break;
              case -3:
                this.color = 7;
                break;
              case -4:
                this.color = 19;
                break;
              case -6:
                this.color = 5;
                break;
              case -7:
                this.color = 17;
                break;
              case -8:
                this.color = 20;
                break;

              case -100:
                this.color = 3;
                break;
              case -5:
              default:
                this.color = killer.color;
            }
          }

          this.trulyDead = false;
          this.health.amount = this.health.max;
          this.shield.amount = this.shield.max;
          this.VELOCITY.x = 0;
          this.VELOCITY.y = 0;
          this.ACCEL.x = 0;
          this.ACCEL.y = 0;
          this.refreshBodyAttributes();
          if (c.MODE === "JJ's RF" || c.MODE === "test") return;
          room.setup[this.grid.y][this.grid.x] = "gte" + -this.team;
        } else {
          let o = new Entity(plce);
          o.grid = this.grid;
          o.define(Class[ran.choose(["fortgate"])]);
          o.team = -100;
          o.color = 3;
          o.SIZE = this.SIZE;
          o.coreSize = o.SIZE;
          o.refreshBodyAttributes();
          o.isGate = true;
          o.spawnLoc = loc;
          room.setup[o.grid.y][o.grid.x] = "gte" + -o.team;
        }
        sockets.changeroom();
      }
      if (killers) {
        let killer = ran.choose(killers);
        if (this.markedfordeath) {
          this.markedfordeath = false;
          let loc = { x: this.x, y: this.y };
          let o = new Entity(loc);
          o.rarity = Math.random() * 10000;
          if (o.rarity > 1500) {
            o.define(Class[ran.choose(["minionegg2", "minionegg"])]);
          }
          if (o.rarity <= 1500 && o.rarity > 500) {
            o.define(Class[ran.choose(["minionegg3", "minionegg4"])]);
          }
          if (o.rarity <= 500 && o.rarity > 1) {
            o.define(Class[ran.choose(["minionegg5"])]);
          }
          if (o.rarity <= 1 && o.rarity > 0.01) {
            o.define(Class[ran.choose(["minionegg6"])]);
          }
          if (o.rarity < 0.01) {
            o.define(
              Class[ran.choose(["swarmegg", sockets.broadcast("sus...")])]
            );
          }
          o.refreshBodyAttributes();
          o.team = this.saveMarkedTeam;
          o.color = this.saveMarkedColor;
        }
      }

      if (this.isDominator) {
        /*if (this.isTaken) {
          this.isTaken = false;
          this.died = true;
          this.controllers = [];
          this.addController(new io_Dominator(this));
        }*/
        if (!isNaN(this.x) || !isNaN(this.y)) {
          var loc = { x: this.x, y: this.y };
          // 9;
        }
        if (killer) {
          killers.forEach((instance) => {
            if (c.MODE === "JJ's RF" || c.MODE === "test") return;
            if (this.team === -100 || c.INSTANT_CAPTURE) {
              if (killer.team) {
                this.team = killer.team;
              } else this.team = -100;
            } else this.team = -100;
            switch (this.team) {
              case -1:
                this.color = 10;
                break;
              case -2:
                this.color = 18;
                break;
              case -3:
                this.color = 7;
                break;
              case -4:
                this.color = 19;
                break;
              case -6:
                this.color = 5;
                break;
              case -7:
                this.color = 17;
                break;
              case -8:
                this.color = 20;
                break;
              case -100:
                this.color = 3;
                break;
              case -5:
              default:
                this.color = killer.color;
            }
          });
          this.trulyDead = false;
          this.health.amount = this.health.max;
          this.shield.amount = this.shield.max;
          this.refreshBodyAttributes();
          if (c.MODE === "JJ's RF" || c.MODE === "test") return;
          if (this.team === -100) {
            room.setup[this.grid.y][this.grid.x] = "dom0";
          } else room.setup[this.grid.y][this.grid.x] = "dom" + -this.team;
          if (c.MODE !== "territoryControl") {
            sockets.broadcast(
              "A " +
                this.label +
                " has been captured by " +
                util.getTeam(this.team) +
                "."
            );
          }
        }

        sockets.changeroom();

        let census = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        room.dominators.forEach((o) => {
          if (o.team === -100) {
            census[0]++;
          } else {
            census[-o.team]++;
          }
        });
        if (c.DOMINATION) {
          //💀 tilted skull (fake)
          if (c.SIEGE) {
            for (let i = 0; i < 9; i++) {
              if (i && census[0] >= c.DOMINATOR_COUNT) {
                if (c.MODE !== "siege") {
                  sockets.broadcast(
                    util.getTeam(this.team) + " have lost the game!"
                  );

                  c.DOMINATOR_COUNT = 999999;
                  closeArena();
                }
              }
            }
          } else {
            for (let i = 0; i < 9; i++) {
              if (i && census[i] === c.DOMINATOR_COUNT) {
                sockets.broadcast(
                  util.getTeam(this.team) + " have won the game!"
                );

                c.DOMINATOR_COUNT = 999999;
                closeArena();
              }
            }
          }
        }
      }

      /*/
   /*/ // If I'm the leader, broadcast it:
      if (this.id === room.topPlayerID && this.trulyDead) {
        let usurptText = this.name === "" ? "The leader" : this.name;
        if (notJustFood) {
          usurptText += ran.choose([
            " has been usurped by",
            " has been slain by",
            " has had their soul ripped out by",
            " has been obliterated by",
            " got clapped by",
            " was wasted by",
          ]);
          killers.forEach((instance) => {
            usurptText += " ";
            usurptText +=
              instance.name === "" ? "an unnamed player" : instance.name;
            usurptText += " and";
          });
          usurptText = usurptText.slice(0, -4);
          usurptText += "!";
        } else {
          usurptText += ran.choose([
            " has died a stupid death!",
            " has ceased to exist!",
            " has unintentionally embraced the void...and disintegrated...",
            " has spontaneously exploded!",
            " has died to literally nothing...",
            " has fought a polygon...and the polygon won..",
          ]);
        }
        sockets.broadcast(usurptText);
      }
      if (this.specialEffect === "gravelSpawn") {
        let loc = { x: this.x, y: this.y };
        let o = new Entity(loc);
        o.define(Class.babyObstacle);
        o.team = this.team;
        o.facing = ran.randomAngle();
        o.refreshBodyAttributes();
        o.ACCELERATION = 0.015;
      }
      if (this.specialEffect === "rockSpawn") {
        let loc = { x: this.x, y: this.y };
        let o = new Entity(loc);
        o.define(Class.obstacle);
        o.team = this.team;
        o.facing = ran.randomAngle();
        o.refreshBodyAttributes();
        o.ACCELERATION = 0.015;
      }
      if (this.specialEffect === "fortWallSpawn") {
        let loc = { x: this.x, y: this.y };
        let gridWidth = room.width / room.xgrid;
        let gridHeight = room.height / room.ygrid;
        let a = Class.fortwall;
        if (gridWidth > gridHeight) {
          let start = loc.x - gridWidth / 2 + gridHeight / 2;
          let end = loc.x + gridWidth / 2 - gridHeight / 2;
          let x = start;
          for (;;) {
            let o = new Entity({
              x: Math.min(x, end),
              y: loc.y,
            });
            o.define(a);
            o.SIZE = gridHeight / 2;
            o.coreSize = o.SIZE;
            o.team = this.team;
            o.color = this.color;

            if (x >= end) {
              break;
            }
            x += gridHeight;
          }
        } else if (gridWidth < gridHeight) {
          let start = loc.y + gridWidth / 2 - gridHeight / 2;
          let end = loc.y - gridWidth / 2 + gridHeight / 2;
          let y = start;
          for (;;) {
            let o = new Entity({
              x: loc.x,
              y: Math.min(y, end),
            });
            o.define(a);
            o.SIZE = gridWidth / 2;
            o.coreSize = o.SIZE;
            o.team = this.team;
            o.color = this.color;
            if (y >= end) {
              break;
            }
            y += gridWidth;
          }
        } else {
          let o = new Entity(loc);
          o.define(a);
          o.SIZE = gridWidth / 2;
          o.coreSize = o.SIZE;
          o.team = this.team;
          o.color = this.color;
        }
      }

      if (this.specialEffect === "fortGateSpawn") {
        let loc = { x: this.x, y: this.y };
        let gridWidth = room.width / room.xgrid;
        let gridHeight = room.height / room.ygrid;
        let a = Class.fortgate;
        if (gridWidth > gridHeight) {
          let start = loc.x - gridWidth / 2 + gridHeight / 2;
          let end = loc.x + gridWidth / 2 - gridHeight / 2;
          let x = start;
          for (;;) {
            let o = new Entity({
              x: Math.min(x, end),
              y: loc.y,
            });
            o.define(a);
            o.SIZE = gridHeight / 2;
            o.coreSize = o.SIZE;
            o.team = this.team;
            o.color = this.color;

            if (x >= end) {
              break;
            }
            x += gridHeight;
          }
        } else if (gridWidth < gridHeight) {
          let start = loc.y + gridWidth / 2 - gridHeight / 2;
          let end = loc.y - gridWidth / 2 + gridHeight / 2;
          let y = start;
          for (;;) {
            let o = new Entity({
              x: loc.x,
              y: Math.min(y, end),
            });
            o.define(a);
            o.SIZE = gridWidth / 2;
            o.coreSize = o.SIZE;
            o.team = this.team;
            o.color = this.color;
            if (y >= end) {
              break;
            }
            y += gridWidth;
          }
        } else {
          let o = new Entity(loc);
          o.define(a);
          o.SIZE = gridWidth / 2;
          o.coreSize = o.SIZE;
          o.team = this.team;
          o.color = this.color;
        }
      }

      if (this.specialEffect === "wallSpawn") {
        let loc = { x: this.x, y: this.y };
        let gridWidth = room.width / room.xgrid;
        let gridHeight = room.height / room.ygrid;
        if (gridWidth > gridHeight) {
          let start = loc.x - gridWidth / 2 + gridHeight / 2;
          let end = loc.x + gridWidth / 2 - gridHeight / 2;
          let x = start;
          for (;;) {
            let o = new Entity({
              x: Math.min(x, end),
              y: loc.y,
            });
            o.define(Class.wall);
            o.SIZE = gridHeight / 2;
            o.coreSize = o.SIZE;
            o.protect();
            o.accel.x + 0.0000000000001;
            o.team = -101;

            if (x >= end) {
              break;
            }
            x += gridHeight;
          }
        } else if (gridWidth < gridHeight) {
          let start = loc.y + gridWidth / 2 - gridHeight / 2;
          let end = loc.y - gridWidth / 2 + gridHeight / 2;
          let y = start;
          for (;;) {
            let o = new Entity({
              x: loc.x,
              y: Math.min(y, end),
            });
            o.define(Class.wall);
            o.SIZE = gridWidth / 2;
            o.coreSize = o.SIZE;
            o.protect();
            o.accel.x + 0.0000000000001;
            o.team = -101;

            if (y >= end) {
              break;
            }
            y += gridWidth;
          }
        } else {
          let o = new Entity(loc);
          o.define(Class.wall);
          o.SIZE = gridWidth / 2;
          o.coreSize = o.SIZE;
          o.protect();
          o.accel.x + 0.0000000000001;
          o.team = -101;
        }
      }

      if (this.specialEffect === "bigWallSpawn") {
        let loc = { x: this.x, y: this.y };
        let gridWidth = room.width / room.xgrid;
        let gridHeight = room.height / room.ygrid;
        if (gridWidth > gridHeight) {
          let start = loc.x - gridWidth / 2 + gridHeight / 2;
          let end = loc.x + gridWidth / 2 - gridHeight / 2;
          let x = start;
          for (;;) {
            let o = new Entity({
              x: Math.min(x, end),
              y: loc.y,
            });
            o.define(Class.wall);
            o.SIZE = (gridHeight / 2) * 2;
            o.coreSize = o.SIZE;
            o.protect();
            o.accel.x + 0.0000000000001;
            o.team = -101;

            if (x >= end) {
              break;
            }
            x += gridHeight;
          }
        } else if (gridWidth < gridHeight) {
          let start = loc.y + gridWidth / 2 - gridHeight / 2;
          let end = loc.y - gridWidth / 2 + gridHeight / 2;
          let y = start;
          for (;;) {
            let o = new Entity({
              x: loc.x,
              y: Math.min(y, end),
            });
            o.define(Class.wall);
            o.SIZE = (gridWidth / 2) * 2;
            o.coreSize = o.SIZE;
            o.protect();
            o.accel.x + 0.0000000000001;
            o.team = -101;

            if (y >= end) {
              break;
            }
            y += gridWidth;
          }
        } else {
          let o = new Entity(loc);
          o.define(Class.wall);
          o.SIZE = (gridWidth / 2) * 2;
          o.coreSize = o.SIZE;
          o.protect();
          o.accel.x + 0.0000000000001;
          o.team = -101;
        }
      }

      if (this.specialEffect === "smallWallSpawn") {
        let loc = { x: this.x, y: this.y };
        let gridWidth = room.width / room.xgrid;
        let gridHeight = room.height / room.ygrid;
        if (gridWidth > gridHeight) {
          let start = loc.x - gridWidth / 2 + gridHeight / 2;
          let end = loc.x + gridWidth / 2 - gridHeight / 2;
          let x = start;
          for (;;) {
            let o = new Entity({
              x: Math.min(x, end),
              y: loc.y,
            });
            o.define(Class.wall);
            o.SIZE = gridHeight / 2 / 2;
            o.coreSize = o.SIZE;
            o.protect();
            o.accel.x + 0.0000000000001;
            o.team = -101;

            if (x >= end) {
              break;
            }
            x += gridHeight;
          }
        } else if (gridWidth < gridHeight) {
          let start = loc.y + gridWidth / 2 - gridHeight / 2;
          let end = loc.y - gridWidth / 2 + gridHeight / 2;
          let y = start;
          for (;;) {
            let o = new Entity({
              x: loc.x,
              y: Math.min(y, end),
            });
            o.define(Class.wall);
            o.SIZE = gridWidth / 2 / 2;
            o.coreSize = o.SIZE;
            o.protect();
            o.accel.x + 0.0000000000001;
            o.team = -101;

            if (y >= end) {
              break;
            }
            y += gridWidth;
          }
        } else {
          let o = new Entity(loc);
          o.define(Class.wall);
          o.SIZE = gridWidth / 2 / 2;
          o.coreSize = o.SIZE;
          o.protect();
          o.accel.x + 0.0000000000001;
          o.team = -101;
        }
      }
      if (this.label === "Closed") {
        sockets.broadcast(
          "I am Closing the arena for possible updates, cleaning the server or fixing errors."
        );
        closeArena();
      }

      if (
        this.type === "wall" &&
        this.team === -101 &&
        c.MODE === "theDenied"
      ) {
        let loc = { x: this.x, y: this.y };
        if (this.label === "Rock" && room.isIn("rock", this)) {
          let o = new Entity(room.randomType("rock"));
          o.define(Class.obstacle);
          o.team = this.team;
          o.facing = ran.randomAngle();
          o.refreshBodyAttributes();
        }
        if (this.label === "Rock" && room.isIn("roid", this)) {
          let o = new Entity(room.randomType("roid"));
          o.define(Class.obstacle);
          o.team = this.team;
          o.facing = ran.randomAngle();
          o.refreshBodyAttributes();
        }
        if (this.label === "Gravel" && room.isIn("roid", this)) {
          let o = new Entity(room.randomType("roid"));
          o.define(Class.babyObstacle);
          o.team = this.team;
          o.facing = ran.randomAngle();
          o.refreshBodyAttributes();
        }
      }

      // MEMORY LEAKS ARE BAD!!!!
      if (this.trulyDead) {
        return 1;
      }
    }
    return 0;
  }

  protect() {
    entitiesToAvoid.push(this);
    this.isProtected = true;
  }

  sendMessage(message) {} // Dummy

  kill() {
    if (!this.godMode) {
      this.invuln = false;
      this.health.amount -= this.health.max;
    }
  }

  destroy() {
    // Remove from the protected entities list
    if (this.isProtected)
      util.remove(entitiesToAvoid, entitiesToAvoid.indexOf(this));
    // Remove from minimap
    let i = minimap.findIndex((entry) => {
      return entry[0] === this.id;
    });
    if (i != -1) util.remove(minimap, i);
    // Remove this from views
    views.forEach((v) => v.remove(this));
    // Remove from parent lists if needed
    if (this.parent != null)
      util.remove(this.parent.children, this.parent.children.indexOf(this));
    // Kill all of its children
    this.possiblyChildren.forEach((instance) => {
      if (instance === this) {
        return;
      }
      if (instance.source.id === this.id) {
        if (instance.settings.persistsAfterDeath) {
          instance.source = instance;
        } else {
          instance.kill();
        }
      }
      if (instance.parent && instance.parent.id === this.id) {
        instance.parent = null;
      }
      if (instance.master.id === this.id) {
        instance.kill();
        instance.master = instance;
      }
    });
    // Remove everything bound to it
    this.turrets.forEach((t) => t.destroy());
    // Remove from the collision grid
    keyManager.removeKey(this.key);
    this.guns = [];
  }

  isDead() {
    return this.health.amount <= 0;
  }
}

/*** SERVER SETUP ***/
// Make a speed monitor
var logs = (() => {
  let logger = (() => {
    // The two basic functions
    function set(obj) {
      obj.time = util.time();
    }
    function mark(obj) {
      obj.data.push(util.time() - obj.time);
    }
    function record(obj) {
      let o = util.averageArray(obj.data);
      obj.data = [];
      return o;
    }
    function sum(obj) {
      let o = util.sumArray(obj.data);
      obj.data = [];
      return o;
    }
    function tally(obj) {
      obj.count++;
    }
    function count(obj) {
      let o = obj.count;
      obj.count = 0;
      return o;
    }
    // Return the logger creator
    return () => {
      let internal = {
        data: [],
        time: util.time(),
        count: 0,
      };
      // Return the new logger
      return {
        set: () => set(internal),
        mark: () => mark(internal),
        record: () => record(internal),
        sum: () => sum(internal),
        count: () => count(internal),
        tally: () => tally(internal),
      };
    };
  })();
  // Return our loggers
  return {
    entities: logger(),
    collide: logger(),
    network: logger(),
    minimap: logger(),
    misc2: logger(),
    misc3: logger(),
    physics: logger(),
    life: logger(),
    master: logger(),
    activation: logger(),
    maintainloop: logger(),
    spawner: logger(),
    loops: logger(),
  };
})();

// Essential server requires
var http = require("http"),
  url = require("url"),
  WebSocket = require("ws"),
  //fs = require("fs"),
  mockupJsonData = (() => {
    function rounder(val) {
      if (Math.abs(val) < 0.00001) val = 0;
      return +val.toPrecision(6);
    }
    // Define mocking up functions
    function getMockup(e, positionInfo) {
      return {
        index: e.index,
        name: e.label,
        x: rounder(e.x),
        y: rounder(e.y),
        color: e.color,
        shape: e.shapeData,
        size: rounder(e.size),
        realSize: rounder(e.realSize),
        facing: rounder(e.facing),
        layer: e.layer,
        statnames: e.settings.skillNames,
        position: positionInfo,
        upgrades: e.upgrades.map((r) => ({ tier: r.tier, index: r.index })),
        guns: e.guns.map(function (gun) {
          return {
            offset: rounder(gun.offset),
            direction: rounder(gun.direction),
            length: rounder(gun.length),
            width: rounder(gun.width),
            aspect: rounder(gun.aspect),
            angle: rounder(gun.angle),
          };
        }),
        turrets: e.turrets.map(function (t) {
          let out = getMockup(t, {});
          out.sizeFactor = rounder(t.bound.size);
          out.offset = rounder(t.bound.offset);
          out.direction = rounder(t.bound.direction);
          out.layer = rounder(t.bound.layer);
          out.angle = rounder(t.bound.angle);
          return out;
        }),
      };
    }

    function getDimensions(entities) {
      /* Ritter's Algorithm (Okay it got serious modified for how we start it)
       * 1) Add all the ends of the guns to our list of points needed to be bounded and a couple points for the body of the tank..
       */
      let endpoints = [];
      let pointDisplay = [];
      let pushEndpoints = function (
        model,
        scale,
        focus = { x: 0, y: 0 },
        rot = 0
      ) {
        let s = Math.abs(model.shape);
        let z =
          Math.abs(s) > lazyRealSizes.length ? 1 : lazyRealSizes[Math.abs(s)];
        if (z === 1) {
          // Body (octagon if circle)
          for (let i = 0; i < 2; i += 0.5) {
            endpoints.push({
              x: focus.x + scale * Math.cos(i * Math.PI),
              y: focus.y + scale * Math.sin(i * Math.PI),
            });
          }
        } else {
          // Body (otherwise vertices)
          for (let i = s % 2 ? 0 : Math.PI / s; i < s; i++) {
            let theta = (i / s) * 2 * Math.PI;
            endpoints.push({
              x: focus.x + scale * z * Math.cos(theta),
              y: focus.y + scale * z * Math.sin(theta),
            });
          }
        }
        model.guns.forEach(function (gun) {
          let h =
            gun.aspect > 0
              ? ((scale * gun.width) / 2) * gun.aspect
              : (scale * gun.width) / 2;
          let r = Math.atan2(h, scale * gun.length) + rot;
          let l = Math.sqrt(scale * scale * gun.length * gun.length + h * h);
          let x =
            focus.x +
            scale * gun.offset * Math.cos(gun.direction + gun.angle + rot);
          let y =
            focus.y +
            scale * gun.offset * Math.sin(gun.direction + gun.angle + rot);
          endpoints.push({
            x: x + l * Math.cos(gun.angle + r),
            y: y + l * Math.sin(gun.angle + r),
          });
          endpoints.push({
            x: x + l * Math.cos(gun.angle - r),
            y: y + l * Math.sin(gun.angle - r),
          });
          pointDisplay.push({
            x: x + l * Math.cos(gun.angle + r),
            y: y + l * Math.sin(gun.angle + r),
          });
          pointDisplay.push({
            x: x + l * Math.cos(gun.angle - r),
            y: y + l * Math.sin(gun.angle - r),
          });
        });
        model.turrets.forEach(function (turret) {
          pushEndpoints(
            turret,
            turret.bound.size,
            {
              x: turret.bound.offset * Math.cos(turret.bound.angle),
              y: turret.bound.offset * Math.sin(turret.bound.angle),
            },
            turret.bound.angle
          );
        });
      };
      pushEndpoints(entities, 1);
      // 2) Find their mass center
      let massCenter = { x: 0, y: 0 };
      /*endpoints.forEach(function(point) {
                massCenter.x += point.x;
                massCenter.y += point.y;
            });
            massCenter.x /= endpoints.length;
            massCenter.y /= endpoints.length;*/
      // 3) Choose three different points (hopefully ones very far from each other)
      let chooseFurthestAndRemove = function (furthestFrom) {
        let index = 0;
        if (furthestFrom != -1) {
          let list = new goog.structs.PriorityQueue();
          let d;
          for (let i = 0; i < endpoints.length; i++) {
            let thisPoint = endpoints[i];
            d =
              Math.pow(thisPoint.x - furthestFrom.x, 2) +
              Math.pow(thisPoint.y - furthestFrom.y, 2) +
              1;
            list.enqueue(1 / d, i);
          }
          index = list.dequeue();
        }
        let output = endpoints[index];
        endpoints.splice(index, 1);
        return output;
      };
      let point1 = chooseFurthestAndRemove(massCenter); // Choose the point furthest from the mass center
      let point2 = chooseFurthestAndRemove(point1); // And the point furthest from that
      // And the point which maximizes the area of our triangle (a loose look at this one)
      let chooseBiggestTriangleAndRemove = function (point1, point2) {
        let list = new goog.structs.PriorityQueue();
        let index = 0;
        let a;
        for (let i = 0; i < endpoints.length; i++) {
          let thisPoint = endpoints[i];
          a =
            Math.pow(thisPoint.x - point1.x, 2) +
            Math.pow(thisPoint.y - point1.y, 2) +
            Math.pow(thisPoint.x - point2.x, 2) +
            Math.pow(thisPoint.y - point2.y, 2);
          /* We need neither to calculate the last part of the triangle
           * (because it's always the same) nor divide by 2 to get the
           * actual area (because we're just comparing it)
           */
          list.enqueue(1 / a, i);
        }
        index = list.dequeue();
        let output = endpoints[index];
        endpoints.splice(index, 1);
        return output;
      };
      let point3 = chooseBiggestTriangleAndRemove(point1, point2);
      // 4) Define our first enclosing circle as the one which seperates these three furthest points
      function circleOfThreePoints(p1, p2, p3) {
        let x1 = p1.x;
        let y1 = p1.y;
        let x2 = p2.x;
        let y2 = p2.y;
        let x3 = p3.x;
        let y3 = p3.y;
        let denom = x1 * (y2 - y3) - y1 * (x2 - x3) + x2 * y3 - x3 * y2;
        let xy1 = x1 * x1 + y1 * y1;
        let xy2 = x2 * x2 + y2 * y2;
        let xy3 = x3 * x3 + y3 * y3;
        let x =
          // Numerator
          (xy1 * (y2 - y3) + xy2 * (y3 - y1) + xy3 * (y1 - y2)) / (2 * denom);
        let y =
          // Numerator
          (xy1 * (x3 - x2) + xy2 * (x1 - x3) + xy3 * (x2 - x1)) / (2 * denom);
        let r = Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
        let r2 = Math.sqrt(Math.pow(x - x2, 2) + Math.pow(y - y2, 2));
        let r3 = Math.sqrt(Math.pow(x - x3, 2) + Math.pow(y - y3, 2));
        if (r != r2 || r != r3) {
          //util.log('somethings fucky');
        }
        return { x: x, y: y, radius: r };
      }
      let c = circleOfThreePoints(point1, point2, point3);
      pointDisplay = [
        { x: rounder(point1.x), y: rounder(point1.y) },
        { x: rounder(point2.x), y: rounder(point2.y) },
        { x: rounder(point3.x), y: rounder(point3.y) },
      ];
      let centerOfCircle = { x: c.x, y: c.y };
      let radiusOfCircle = c.radius;
      // 5) Check to see if we enclosed everything
      function checkingFunction() {
        for (var i = endpoints.length; i > 0; i--) {
          // Select the one furthest from the center of our circle and remove it
          point1 = chooseFurthestAndRemove(centerOfCircle);
          let vectorFromPointToCircleCenter = new Vector(
            centerOfCircle.x - point1.x,
            centerOfCircle.y - point1.y
          );
          // 6) If we're still outside of this circle build a new circle which encloses the old circle and the new point
          if (vectorFromPointToCircleCenter.length > radiusOfCircle) {
            pointDisplay.push({ x: rounder(point1.x), y: rounder(point1.y) });
            // Define our new point as the far side of the cirle
            let dir = vectorFromPointToCircleCenter.direction;
            point2 = {
              x: centerOfCircle.x + radiusOfCircle * Math.cos(dir),
              y: centerOfCircle.y + radiusOfCircle * Math.sin(dir),
            };
            break;
          }
        }
        // False if we checked everything, true if we didn't
        return !!endpoints.length;
      }
      while (checkingFunction()) {
        // 7) Repeat until we enclose everything
        centerOfCircle = {
          x: (point1.x + point2.x) / 2,
          y: (point1.y + point2.y) / 2,
        };
        radiusOfCircle =
          Math.sqrt(
            Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
          ) / 2;
      }
      // 8) Since this algorithm isn't perfect but we know our shapes are bilaterally symmetrical, we bind this circle along the x-axis to make it behave better
      return {
        middle: { x: rounder(centerOfCircle.x), y: 0 },
        axis: rounder(radiusOfCircle * 2),
        points: pointDisplay,
      };
    }
    // Save them
    let mockupData = [];
    for (let k in Class) {
      try {
        if (!Class.hasOwnProperty(k)) continue;
        let type = Class[k];
        // Create a reference entities which we'll then take an image of.
        let temptank = new Entity({ x: 0, y: 0 });
        temptank.define(type);
        temptank.name = type.LABEL; // Rename it (for the upgrades menu).
        // Fetch the mockup.
        type.mockup = {
          body: temptank.camera(true),
          position: getDimensions(temptank),
        };
        // This is to pass the size information about the mockup that we didn't have until we created the mockup
        type.mockup.body.position = type.mockup.position;
        // Add the new data to the thing.
        mockupData.push(getMockup(temptank, type.mockup.position));
        // Kill the reference entities.
        temptank.kill();
        temptank.destroy();
      } catch (error) {
        util.error(error);
        util.error(k);
        util.error(Class[k]);
      }
    }
    // Build the function to return
    let writeData = JSON.stringify(mockupData);
    return writeData;
  })();

class View {
  constructor(socket) {
    this.socket = socket;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.lastUpdate = util.time();
    this.lastVisibleUpdate = 0;
    this.lastDowndate = undefined;
    this.fov = 2000;
    this.ping = 0;
    this.nearEntity = new Set();
    this.visibleEntity = new Set();
    this.photos = new Map();
    this.excludedEntityID = [];
    views.push(this);
  }

  reset(socket) {
    this.socket = socket;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.lastUpdate = util.time();
    this.lastVisibleUpdate = 0;
    this.lastDowndate = undefined;
    this.fov = 2000;
    this.ping = 0;
  }

  add(e) {
    if (this.isInView(e)) {
      this.nearEntity.add(e);
    }
  }

  remove(e) {
    if (this.visibleEntity.delete(e)) {
      this.photos.delete(e.id);
      this.nearEntity.delete(e);
      this.excludedEntityID.push(e.id);
    }
  }

  isInView(e) {
    return (
      Math.abs(e.x - this.x) < this.fov * 0.6 + 1.5 * e.size + 100 &&
      Math.abs(e.y - this.y) < this.fov * 0.6 * 0.5625 + 1.5 * e.size + 100
    );
  }

  gazeUpon() {
    logs.network.set();
    let player = this.socket.player;
    // If nothing has changed since the last update, wait (approximately) until then to update
    let rightNow = room.lastCycle;
    if (rightNow === this.lastUpdate) {
      this.socket.update(5 + room.cycleSpeed - util.time() + rightNow);
      logs.network.mark();
      return;
    }
    // ...elseeeeee...
    // Update the record.
    this.lastUpdate = rightNow;
    // Get the socket status
    this.socket.status.receiving++;
    // If we are alive, update the camera
    if (player.body != null) {
      // But I just died...
      if (player.body.isDead() || player.body.died) {
        this.socket.status.deceased = true;
        this.socket.savedScore = player.body.skill.score / 2;
        if (c.PLAGUE === true) {
          /*/ player.body.team = -2;
          player.body.health.max *= 2;
          player.body.spd / 3;
          player.body.health.amount = player.body.health.max;
          player.body.color = 41;/*/
          player.body.addController(new io_mapTargetToGoal(player.body));
          player.body.addController(new io_nearestDifferentMaster(player.body));
          //c.zombieLimit += 1;
          //player.body.trulyDead = false;
        }

        // Let the client know it died
        if (
          //!room.closed ||
          (c.MODE === "siege" && !c.initiateCountdown) ||
          !player.body.bannable
        ) {
          if (player.body.trueDev) {
            this.socket.talk("F", ...player.records(), 100000000);
          } else {
            this.socket.talk("F", ...player.records(), 100000000000);
          }
        } else if (player.body.bannable) {
          c.banList.push(player.body.ip);
          this.socket.kick("Go. Away. Fatman.");
        }
        // Remove the body
        player.body = null;
      } else {
        this.x = player.body.x;
        this.y = player.body.y;
        this.fov = player.body.fov;
        this.vx = player.body.velocity.x;
        this.vy = player.body.velocity.y;
      }
    }
    if (player.body == null) {
      // u dead bro
      this.fov = 2000;
      if (room.closed) {
        this.fov = (room.height + room.width) / 1.5;
      }
    }

    let changed = this.sync(this.socket.player);
    player.gui.update();
    // Send it to the player
    this.socket.talk(
      "u",
      rightNow,
      this.x,
      this.y,
      this.fov,
      this.vx,
      this.vy,
      ...player.gui.publish(),
      -1,
      ...this.excludedEntityID,
      -1,
      ...changed,
      -1
    );
    this.excludedEntityID = [];

    // Queue up some for the front util.log if neededs
    if (this.socket.status.receiving < c.networkFrontlog) {
      this.socket.update(
        Math.max(
          0,
          1000 / c.networkUpdateFactor - (this.lastDowndate - this.lastUpdate),
          this.ping / c.networkFrontlog
        )
      );
    } else {
      this.socket.update(c.networkFallbackTime);
    }
    logs.network.mark();
  }

  sync(player) {
    let syncPhoto = (p1, p2, tur) => {
      let flag = 0;
      let diff = [];

      if (player.body && p2.masterId === player.body.id) {
        //p2.color = player.teamColor;
        if (player.command.autospin) {
          p2.type |= 0x03;
        }
      }

      if (p1.x !== p2.x || p1.y !== p2.y) {
        flag |= 1;
        diff.push(p2.x);
        diff.push(p2.y);
        p1.x = p2.x;
        p1.y = p2.y;
      }
      if (p1.facing !== p2.facing) {
        flag |= 2;
        diff.push(p2.facing);
        p1.facing = p2.facing;
      }
      if (p1.type !== p2.type) {
        flag |= 4;
        diff.push(p2.type);
        p1.type = p2.type;
      }
      if (p1.health !== p2.health) {
        flag |= 8;
        diff.push(p2.health);
        p1.health = p2.health;
      }
      if (p1.shield !== p2.shield) {
        flag |= 16;
        diff.push(p2.shield);
        p1.shield = p2.shield;
      }
      if (p1.alpha !== p2.alpha) {
        flag |= 32;
        diff.push(p2.alpha);
        p1.alpha = p2.alpha;
      }
      if (p1.size !== p2.size) {
        flag |= 64;
        diff.push(p2.size);
        p1.size = p2.size;
      }
      if (p1.score !== p2.score && p2.name) {
        flag |= 128;
        diff.push(p2.score);
        p1.score = p2.score;
      }
      if (p1.name !== p2.name) {
        flag |= 256;
        diff.push(p2.name);
        p1.name = p2.name;
      }
      if (p1.index !== p2.index) {
        flag |= 512;
        diff.push(p2.index);
        p1.index = p2.index;
      }
      if (p1.color !== p2.color) {
        flag |= 1024;
        diff.push(p2.color);
        p1.color = p2.color;
      }
      if (p1.layer !== p2.layer) {
        flag |= 2048;
        diff.push(p2.layer);
        p1.layer = p2.layer;
      }

      if (!p1.guns) {
        p1.guns = [];
      }
      for (let i = 0; i < p2.guns.length; i++) {
        if (!p1.guns[i]) {
          p1.guns.push({});
        }
        let gunFlag = 0;
        let gunDiff = [];
        let gun1 = p1.guns[i];
        let gun2 = p2.guns[i];
        if (gun1.time !== gun2.time) {
          gunFlag |= 1;
          gunDiff.push(gun2.time);
          gun1.time = gun2.time;
        }
        if (gun1.power !== gun2.power) {
          gunFlag |= 2;
          gunDiff.push(gun2.power);
          gun1.power = gun2.power;
        }
        if (gunFlag) {
          flag |= 4096;
          diff.push(i);
          diff.push(gunFlag);
          diff.push(...gunDiff);
        }
      }
      if (flag & 4096) {
        diff.push(-1);
      }

      if (!p1.turrets) {
        p1.turrets = [];
      }
      for (let i = 0; i < p2.turrets.length; i++) {
        if (!p1.turrets[i]) {
          p1.turrets.push({});
        }
        let t1 = p1.turrets[i];
        let t2 = p2.turrets[i];
        let o = syncPhoto(t1, t2, true);
        if (o.flag) {
          flag |= 8192;
          diff.push(i);
          diff.push(o.flag);
          diff.push(...o.diff);
        }
      }
      if (flag & 8192) {
        diff.push(-1);
      }

      return {
        flag: flag,
        diff: diff,
      };
    };

    if (this.lastUpdate - this.lastVisibleUpdate > c.visibleListInterval) {
      this.nearEntity.clear();
      entities.forEach((e) => {
        if (e.valid() && this.isInView(e) && e.bond == null) {
          this.nearEntity.add(e);
        }
      });
      this.visibleEntity.forEach((e) => {
        if (!e.valid() || (!this.isInView(e) && e.alwaysExists | e.isDead())) {
          this.remove(e);
        }
      });
      this.lastVisibleUpdate = this.lastUpdate;
    }

    let changed = [];
    this.nearEntity.forEach((e) => {
      if (e.valid() && e.settings.drawShape) {
        if (
          !e.isDead() &&
          Math.abs(e.x - this.x) < this.fov / 2 + 1.5 * e.size &&
          Math.abs(e.y - this.y) < (this.fov / 2) * (9 / 16) + 1.5 * e.size
        ) {
          this.visibleEntity.add(e);
          if (!this.photos.has(e.id)) {
            this.photos.set(e.id, {});
          }
          let p1 = this.photos.get(e.id); // current photo
          let p2 = e.takePhoto(); // new photo
          let o = syncPhoto(p1, p2, false);
          if (o.flag) {
            changed.push(e.id);
            changed.push(o.flag);
            changed.push(...o.diff);
          }
        } else {
          this.remove(e);
        }
      }
    });

    return changed;
  }
}

// Websocket behavior
const sockets = (() => {
  const protocol = require("./lib/fasttalk");
  let clients = [],
    players = [];
  /*/return {
    broadcast: (message) => {
      clients.forEach((socket) => {
        socket.talk("m", message);
      });
    },/*/
  return {
    clients,
    players,
    broadcast: (message) => {
      for (let client of clients) client.talk("m", message);
    },
    runPunishments: (thing, IP) => {
      clients.forEach((dude) => {
        switch (thing) {
          case "mute":
            if (IP === dude.ip) {
              c.muteList.push(dude.ip);
              util.log(dude.name + " was muted temporarily!");
            }
            break;
          case "unmute":
            if (IP === dude.ip) {
              removeMuted(IP);
              util.log(IP + " was unmuted!");
            }
            break;
          case "kick":
            if (IP === dude.ip) {
              dude.kick(dude.name + " was kicked!");
            }
            break;
          case "ban":
            if (IP === dude.ip) {
              c.banList.push(dude.ip);
              util.log(dude.name + " was banned temporarily!");
            }
            break;
          case "unban":
            if (IP === dude.ip) {
              removeBanned(IP);
              util.log(IP + " was unbanned!");
            }
            break;
        }
      });
    },
    changeroom: () => {
      // room.findType();
      clients.forEach((socket) => {
        socket.talk(
          "R",
          room.width,
          room.height,
          JSON.stringify(room.setup),
          JSON.stringify(util.serverStartTime),
          roomSpeed
        );
      });
    },
    connect: (() => {
      // Define shared functions
      // Closing the socket
      function close(socket) {
        // Figure out who the player was
        let player = socket.player,
          index = players.indexOf(player);
        // Remove the player if one was created
        if (index != -1) {
          // Kill the body if it exists
          if (
            player.body != null &&
            player.body.isDominator !== true &&
            !player.body.trueDev
          ) {
            player.body.invuln = false;
            setTimeout(() => {
              if (player.body.skill.score >= 500000 && c.MODE !== "siege") {
                let o = new Entity(player.body);
                o.define(Class.goldenEgg);
                o.name = player.body.name;
                o.scoreSave = player.body.skill.score;
                o.ip = player.body.ip;
                o.impervious = true;
              }
              player.body.kill();
              if (!player.body.plagued) {
                player.body.destroy();
              }
            }, 10000);
          }
          if (player.body != null && player.body.isDominator) {
            if (player.body.isTaken) {
              player.body.isTaken = false;
              player.body.died = true;
              player.body.controllers = [];
              player.body.addController(new io_Dominator(player.body));
            }
          }
          let updated = players.length - 1;
          // Disconnect everything
          if (!c.socketExitList.includes(socket.ip)) {
            let call = socket.name;
            if (socket.name === "") {
              call = "An unnamed player";
            }
            let exitMessage =
              call + " has left the game! Players: " + updated + ".";

            sockets.broadcast(exitMessage);
            util.log(exitMessage);
            c.socketExitList.push(socket.ip);
          }
          // util.log("[INFO] User " + player.body.name + " disconnected!");
          util.remove(players, index);
        } else {
          util.log("[INFO] A player disconnected before entering the game.");
        }
        //sockets.changeroom();
        if (room.closed === true) {
          if (players.length < 1) {
            util.log("ARENA CLOSED!");
            sockets.broadcast("Closing!");
            process.exit();
          }
        }
        // Free the view
        util.remove(views, views.indexOf(socket.view));
        // Remove the socket
        util.remove(clients, clients.indexOf(socket));
        util.log(
          "[INFO] Socket closed. Views: " +
            views.length +
            ". Clients: " +
            clients.length +
            "."
        );
      }

      // Being kicked
      function kick(socket, reason = "No reason given.") {
        let player = socket.player;
        if (!player.trueDev) {
          util.log(reason + " Kicking.");
          socket.lastWords("K");
        }
      }
      // Handle incoming messages
      function incoming(message, socket) {
        // Only accept binary
        if (!(message instanceof ArrayBuffer)) {
          socket.kick("Non-binary packet.");
          return 1;
        }
        // Decode it
        let m = protocol.decode(message);
        // Make sure it looks legit
        if (m === -1) {
          socket.kick("Malformed packet.");
          return 1;
        }
        // Log the message request
        socket.status.requests++;
        // Remember who we are
        let player = socket.player;
        // Handle the request
        if (m == null) return;
        switch (m.shift()) {
          case "k":
            {
              // key verification
              if (m.length > 1) {
                socket.kick("Ill-sized key request.");
                return 1;
              }
              if (socket.status.verified) {
                socket.kick("Duplicate player spawn attempt.");
                return 1;
              }
              socket.talk("w", true);
              if (m.length === 1) {
                let key = m[0];
                socket.key = key;
                util.log("A Player was verified with the token: " + key);
                // socket.verified = true;
                util.log("Clients: " + clients.length);

                /*if (m.length !== 1) { socket.kick('Ill-sized key request.'); return 1; }
                    // Get data
                    // Verify it
                   if (typeof key !== 'string') { socket.kick('Weird key offered.'); return 1; }
                    if (key.length > 64) { socket.kick('Overly-long key offered.'); return 1; }
                    if (socket.status.verified) { socket.kick('Duplicate player spawn attempt.'); return 1; }
                    // Otherwise proceed to check if it's available.
                    if (keys.indexOf(key) != -1) {
                        // Save the key
                        socket.key = key.substr(0, 64);
                        // Make it unavailable
                        util.remove(keys, keys.indexOf(key));
                        socket.verified = true;
                        // Proceed
                        socket.talk('w', true);
                        util.log('[INFO] A socket was verified with the token: '); util.log(key);
                        util.log('Clients: ' + clients.length);
                    } else {
                        // If not, kick 'em (nicely)
                        util.log('[INFO] Invalid player verification attempt.');
                        socket.lastWords('w', false);
                    }*/
              }
            }
            break;
          case "s":
            {
              // spawn request
              if (!socket.status.deceased) {
                socket.kick("Trying to spawn while already alive.");
                return 1;
              }
              if (m.length !== 2) {
                socket.kick("Ill-sized spawn request.");
                return 1;
              }
              // Get data
              let name;

              if (m[0]) {
                name = m[0];
              } else name = "";
              let needsRoom = m[1];
              // Verify it
              if (typeof name != "string") {
                //guh duh
                socket.kick("Bad spawn request.");
                return 1;
              }
              if (encodeURI(name).split(/%..|./).length > 48) {
                name = ran.chooseBotName();
                return 1;
              }
              if (needsRoom !== -1 && needsRoom !== 0) {
                socket.kick("Bad spawn request.");
                return 1;
              }
              // Bring to life
              socket.status.deceased = false;
              // Define the player.
              if (players.indexOf(socket.player) != -1) {
                util.remove(players, players.indexOf(socket.player));
              }
              socket.player = socket.spawn(name);
              // Reset the view
              if (views.indexOf(socket.view) != -1) {
                socket.view.reset(socket);
              }
              // Give it the room state
              if (!needsRoom) {
                socket.talk(
                  "R",
                  room.width,
                  room.height,
                  JSON.stringify(room.setup),
                  JSON.stringify(util.serverStartTime),
                  roomSpeed
                );
              }
              // Start the update rhythm immediately
              socket.update(0);
              // Log it
              if (!socket.name) {
                socket.name = name;
              }
              if (!c.socketEnterList.includes(socket.ip) && !socket.no) {
                let call = socket.name;
                if (socket.name === "") {
                  call = "An unnamed player";
                }
                let enterMessage =
                  call +
                  " has joined the game! Players: " +
                  c.playerCount +
                  ".";

                sockets.broadcast(enterMessage);
                util.log(enterMessage);
                socket.no = true;
                c.socketEnterList.push(socket.ip);
              }
              if (!c.socketList.includes(socket.ip)) {
                c.socketList.push(socket.ip);
              }
              socket.commandLoopCount = 1;
              socket.creationTeam = -100;
            }
            break;
          case "S":
            {
              // clock syncing
              if (m.length !== 1) {
                socket.kick("Ill-sized sync packet.");
                return 1;
              }
              // Get data
              let synctick = m[0];
              // Verify it
              if (typeof synctick !== "number") {
                socket.kick("Weird sync packet.");
                return 1;
              }
              // Bounce it back
              socket.talk("S", synctick, util.time());
            }
            break;
          case "p":
            {
              // ping
              if (m.length !== 1) {
                socket.kick("Ill-sized ping.");
                return 1;
              }
              // Get data
              let ping = m[0];
              // Verify it
              if (typeof ping !== "number") {
                socket.kick("Weird ping.");
                return 1;
              }
              // Pong
              socket.talk("p", m[0]); // Just pong it right back
              socket.status.lastHeartbeat = util.time();
            }
            break;
          case "d":
            {
              // downlink
              if (m.length !== 1) {
                socket.kick("Ill-sized downlink.");
                return 1;
              }
              // Get data
              let time = m[0];
              // Verify data
              if (typeof time !== "number") {
                socket.kick("Bad downlink.");
                return 1;
              }
              // The downlink indicates that the client has received an update and is now ready to receive more.
              socket.status.receiving = 0;
              socket.view.ping = util.time() - time;
              socket.view.lastDowndate = util.time();
              // Schedule a new update cycle
              // Either fires immediately or however much longer it's supposed to wait per the config.
              socket.update(
                Math.max(
                  0,
                  1000 / c.networkUpdateFactor -
                    (util.time() - socket.view.lastUpdate)
                )
              );
            }
            break;
          case "C":
            {
              // command packet
              if (m.length !== 3) {
                socket.kick("Ill-sized command packet.");
                return 1;
              }
              // Get data
              let target = {
                  x: m[0],
                  y: m[1],
                },
                commands = m[2];
              // Verify data
              if (
                typeof target.x !== "number" ||
                typeof target.y !== "number" ||
                typeof commands !== "number"
              ) {
                socket.kick("Weird downlink.");
                return 1;
              }
              if (commands > 255) {
                socket.kick("Malformed command packet.");
                return 1;
              }
              // Put the new target in
              player.target = target;
              // Process the commands
              if (player.command != null && player.body != null) {
                player.command.up = commands & 1;
                player.command.down = (commands & 2) >> 1;
                player.command.left = (commands & 4) >> 2;
                player.command.right = (commands & 8) >> 3;
                player.command.lmb = (commands & 16) >> 4;
                player.command.mmb = (commands & 32) >> 5;
                player.command.rmb = (commands & 64) >> 6;
              }
              // Update the thingy
              socket.timeout.set(commands);
            }
            break;
          case "t":
            {
              // player toggle
              if (m.length !== 1) {
                socket.kick("Ill-sized toggle.");
                return 1;
              }
              // Get data
              let given = "",
                tog = m[0];
              // Verify request
              if (typeof tog !== "number") {
                socket.kick("Weird toggle.");
                return 1;
              }
              // Decipher what we're supposed to do.
              switch (tog) {
                case 0:
                  given = "autospin";
                  break;
                case 1:
                  given = "autofire";
                  break;
                case 2:
                  given = "override";
                  break;
                case 3:
                  given = "reverseTank";
                  break;
                // Kick if it sent us shit.
                default:
                  // socket.kick("Bad toggle.");
                  return 1;
              }
              // Apply a good request.
              if (player.command != null && player.body != null) {
                player.command[given] = !player.command[given];
                // Send a message.
                player.body.sendMessage(
                  given.charAt(0).toUpperCase() +
                    given.slice(1) +
                    (player.command[given] ? " enabled." : " disabled.")
                );
              }
            }
            break;
          case "U":
            {
              // upgrade request
              if (m.length !== 1) {
                socket.kick("Ill-sized upgrade request.");
                return 1;
              }
              // Get data
              let number = m[0];
              // Verify the request
              if (typeof number != "number" || number < 0) {
                socket.kick("Bad upgrade request.");
                return 1;
              }
              // Upgrade it
              if (player.body != null) {
                player.body.upgrade(number); // Ask to upgrade
              }
            }
            break;
          case "x":
            {
              // skill upgrade request
              if (m.length !== 1) {
                socket.kick("Ill-sized skill request.");
                return 1;
              }
              let number = m[0],
                stat = "";
              // Verify the request
              if (typeof number != "number") {
                socket.kick("Weird stat upgrade request.");
                return 1;
              }
              // Decipher it
              switch (number) {
                case 0:
                  stat = "atk";
                  break;
                case 1:
                  stat = "hlt";
                  break;
                case 2:
                  stat = "spd";
                  break;
                case 3:
                  stat = "str";
                  break;
                case 4:
                  stat = "pen";
                  break;
                case 5:
                  stat = "dam";
                  break;
                case 6:
                  stat = "rld";
                  break;
                case 7:
                  stat = "mob";
                  break;
                case 8:
                  stat = "rgn";
                  break;
                case 9:
                  stat = "shi";
                  break;
                default:
                  socket.kick("Unknown stat upgrade request.");
                  return 1;
              }
              // Apply it
              if (player.body != null) {
                player.body.skillUp(stat); // Ask to upgrade a stat
              }
            }
            break;
          case "L":
            {
              // level up cheat
              if (m.length !== 0) {
                socket.kick("Ill-sized level-up request.");
                return 1;
              }
              // cheatingbois
              if (player.body != null) {
                if (
                  player.body.skill.level < c.SKILL_CHEAT_CAP ||
                  player.body.trueDev
                ) {
                  player.body.skill.score = player.body.skill.levelScore;
                  player.body.skill.maintain();
                  player.body.refreshBodyAttributes();
                }
              }
            }
            break;
          case "0":
            {
              // testbed cheat

              if (m.length !== 0) {
                let key = String.fromCharCode(Math.abs(m[0]));
                if (m[0] >= 0) {
                  util.log(key + " was pressed (Keycode: " + m[0] + ")");
                } else {
                  util.log(key + " was pressed (Keycode: " + m[0] + ")");
                }
                break;
              }
              if (player.body != null) {
                if (!player.body.trueDev) {
                  if (
                    c.ALLOW_SERVER_END &&
                    player.body.skill.score >= 2500000
                  ) {
                    sockets.broadcast(
                      player.body.name +
                        " has closed the arena...and no, they are not a Dev or a hacker."
                    );
                    closeArena();
                    c.ALLOW_SERVER_END = false;
                  }
                  if (
                    player.body.specialEffect !== "Legend" &&
                    player.body.skill.score >= 1000000
                  ) {
                    let dude = player.body.name;
                    if (player.body.name === "") dude = "An unnamed player";
                    if (player.body.team === -1 || c.MODE === "siege") {
                      if (
                        player.body.label === "Spike" ||
                        player.body.label === "Eagle" ||
                        player.body.label === "Surfer" ||
                        player.body.label === "Beekeeper"
                      ) {
                        player.body.upgrades = [];
                        sockets.broadcast(
                          dude +
                            ": Okay, I have taken your crap long enough, time for a barrel-whooping!"
                        );

                        player.body.define(Class.rebel);
                        player.body.maxChildren = 0;
                        player.body.intangibility = false;
                        player.body.invisible = [100, 0];
                        player.body.alpha = 100;
                        player.body.ignoreCollision = false;
                        player.body.skill.setCaps([
                          9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
                        ]);

                        player.body.skill.points += 10;
                      }
                    }

                    if (player.body.team === -2 || c.MODE === "siege") {
                      if (
                        player.body.label === "Necromancer" ||
                        player.body.label === "Enchanter" ||
                        player.body.label === "Infestor" ||
                        player.body.label === "Exorcist"
                      ) {
                        player.body.upgrades = [];
                        sockets.broadcast(
                          //bruh. i think i have dementia
                          dude +
                            ": Minions and servants, tanks and barrels, drones and souls, obey my call!"
                        );

                        player.body.define(Class.necrotyrant);
                        player.body.intangibility = false;
                        player.body.invisible = [100, 0];
                        player.body.alpha = 100;
                        player.body.ignoreCollision = false;
                        player.body.skill.setCaps([
                          9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
                        ]);

                        player.body.skill.points += 10;
                      }
                    }
                    if (player.body.team === -3 || c.MODE === "siege") {
                      if (
                        player.body.label === "Auto-Spawner" ||
                        player.body.label === "Engineer" ||
                        player.body.label === "Interceptor" ||
                        player.body.label === "Auto-Mech"
                      ) {
                        player.body.upgrades = [];

                        sockets.broadcast(
                          dude +
                            ": BE BLINDED BY THE POWER OF SCIENCE YOU EVIL FIENDS!"
                        );
                        player.body.define(Class.operator);
                        player.body.maxChildren = 0;
                        player.body.intangibility = false;
                        player.body.invisible = [100, 0];
                        player.body.alpha = 100;
                        player.body.ignoreCollision = false;
                        player.body.skill.setCaps([
                          9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
                        ]);
                        player.body.skill.points += 10;
                      }
                    }
                    if (player.body.team === -3 || c.MODE === "siege") {
                      if (
                        player.body.label === "Auto-Smasher" ||
                        player.body.label === "Carrier" ||
                        player.body.label === "Auto-Cruiser" ||
                        player.body.label === "Armor Piercer"
                      ) {
                        player.body.upgrades = [];

                        sockets.broadcast(
                          dude +
                            ": I'm gonna have some fun whooping your barrels!"
                        );
                        player.body.define(Class.conductor);
                        player.body.maxChildren = 0;
                        player.body.intangibility = false;
                        player.body.invisible = [100, 0];
                        player.body.alpha = 100;
                        player.body.ignoreCollision = false;
                        player.body.skill.setCaps([
                          9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
                        ]);
                        player.body.skill.points += 10;
                      }
                    }
                    if (player.body.team === -3 || c.MODE === "siege") {
                      if (
                        player.body.label === "Auto-5" ||
                        player.body.label === "Hardshell Spawner" ||
                        player.body.label === "Skimmer"
                      ) {
                        player.body.upgrades = [];

                        sockets.broadcast(
                          dude + ": I bet you can't outrun a few missiles."
                        );
                        player.body.define(Class.mechanist);
                        player.body.maxChildren = 0;
                        player.body.intangibility = false;
                        player.body.invisible = [100, 0];
                        player.body.alpha = 100;
                        player.body.ignoreCollision = false;
                        player.body.skill.setCaps([
                          9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
                        ]);
                        player.body.skill.points += 10;
                      }
                    }

                    if (player.body.team === -1 || c.MODE === "siege") {
                      if (
                        player.body.label === "Collider" ||
                        player.body.label === "Twister" ||
                        player.body.label === "Decimator" ||
                        player.body.label === "Shotgun"
                      ) {
                        player.body.upgrades = [];

                        sockets.broadcast(
                          dude +
                            ": Looks like I'll have to destroy you all myself huh?"
                        );
                        player.body.define(Class.destructionist);
                        player.body.maxChildren = 0;
                        player.body.intangibility = false;
                        player.body.invisible = [100, 0];
                        player.body.alpha = 100;
                        player.body.ignoreCollision = false;
                        player.body.skill.setCaps([
                          9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
                        ]);
                        player.body.skill.points += 10;
                      }
                    }
                    if (player.body.team === -3 || c.MODE === "siege") {
                      if (
                        player.body.label === "Trilogy of Traps" ||
                        player.body.label === "Constructionist" ||
                        player.body.label === "Fragmentor" ||
                        player.body.label === "Bombarder" ||
                        player.body.label === "Originator" ||
                        player.body.label === "Rebounder" ||
                        player.body.label === "Warzone" ||
                        player.body.label === "Castle"
                      ) {
                        player.body.upgrades = [];
                        sockets.broadcast(
                          dude +
                            ": THE POWER OF SCIENCE SHALL DESTROY YOU, SCUM!"
                        );
                        player.body.define(Class.MassProducer);
                        player.body.maxChildren = 0;
                        player.body.intangibility = false;
                        player.body.invisible = [100, 0];
                        player.body.alpha = 100;
                        player.body.ignoreCollision = false;
                        player.body.skill.setCaps([
                          9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
                        ]);

                        player.body.skill.points += 10;
                      }
                    }
                    if (player.body.team === -4 || c.MODE === "siege") {
                      if (
                        player.body.label === "X-Hunter" ||
                        player.body.label === "Mortar" ||
                        player.body.label === "Poacher" ||
                        player.body.label === "Ordnance"
                      ) {
                        player.body.upgrades = [];
                        sockets.broadcast(
                          "Clouds of sinister black mist gather around " +
                            dude +
                            ". Be afraid, VERY AFRAID!"
                        );
                        player.body.define(Class.reaper);
                        player.body.maxChildren = 0;
                        player.body.intangibility = false;
                        player.body.invisible = [100, 0];
                        player.body.alpha = 100;
                        player.body.ignoreCollision = false;
                        player.body.skill.setCaps([
                          9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
                        ]);

                        player.body.skill.points += 10;
                      }
                    }
                    if (player.body.team === -4 || c.MODE === "siege") {
                      if (
                        player.body.label === "Master" ||
                        player.body.label === "Pulsar" ||
                        player.body.label === "Overgunner" ||
                        player.body.label === "Hexanomaly"
                      ) {
                        player.body.upgrades = [];
                        sockets.broadcast(
                          "Clumps of anomalies seem to gather around " +
                            dude +
                            ". You better start running, and fast."
                        );
                        player.body.define(Class.helpme);
                        player.body.maxChildren = 0;
                        player.body.intangibility = false;
                        player.body.invisible = [100, 0];
                        player.body.alpha = 100;
                        player.body.ignoreCollision = false;
                        player.body.skill.setCaps([
                          9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
                        ]);

                        player.body.skill.points += 10;
                      }
                    }
                    if (player.body.team === -2 || c.MODE === "siege") {
                      if (
                        player.body.label === "Hexa-Trapper" ||
                        player.body.label === "Constructor" ||
                        player.body.label === "Rocketeer" ||
                        player.body.label === "Animator"
                      ) {
                        //ranar, here
                        player.body.upgrades = [];
                        sockets.broadcast(
                          "Hoards of the undead gather around " +
                            dude +
                            "... What the hell?"
                        );
                        player.body.define(Class.flesh);
                        player.body.maxChildren = 0;
                        player.body.intangibility = false;
                        player.body.invisible = [100, 0];
                        player.body.alpha = 100;
                        player.body.ignoreCollision = false;
                        player.body.skill.setCaps([
                          9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
                        ]);

                        player.body.skill.points += 10;
                      }
                    }
                    if (
                      player.body.team === -100 ||
                      (c.MODE === "siege" && player.body.label === "Master")
                    ) {
                      player.body.upgrades = [];
                      player.body.define(Class.arenaguardpl);
                      player.body.maxChildren = 0;
                      player.body.intangibility = false;
                      player.body.invisible = [100, 0];
                      player.body.alpha = 100;
                      player.body.ignoreCollision = false;
                      player.body.skill.points += 10;

                      sockets.broadcast(
                        "Valrayvn: " +
                          dude +
                          "! I shall grant you true power! ASCEND!"
                      );
                    }
                  }

                  if (
                    player.body.label !== "Embodiment of Annihilation" &&
                    player.body.skill.score >= 5000000
                  ) {
                    let dude = player.body.name;
                    if (player.body.name === "") dude = "An unnamed player";
                    if (c.MODE === "siege" && c.bossWave === 50) {
                      if (
                        /*
                        player.body.label === "Arena Guard" ||
                        player.body.label === "Reaper" ||
                        player.body.label === "Rebel" ||
                        player.body.label === "Mass Producer" ||
                        player.body.label === "Operator" ||
                        player.body.label === "Necro Tyrant
                        */
                        player.body.specialEffect === "Legend"
                      ) {
                        player.body.upgrades = [];
                        sockets.broadcast(
                          "The ground begins to rumble as a powerful force is unleashed upon the chosen one!"
                        );
                        player.body.define(Class.EOA);
                        player.body.intangibility = false;
                        player.body.invisible = [100, 0];
                        player.body.alpha = 100;
                        player.body.ignoreCollision = false;
                        player.body.skill.setCaps([
                          15, 15, 15, 15, 15, 15, 15, 15, 15, 15,
                        ]);

                        player.body.skill.points += 20;
                      }
                    }
                  }
                }
                if (
                  player.body.trueDev ||
                  (socket.key === "enabled" && socket.isDeveloper)
                ) {
                  player.body.skill.reset();
                  player.body.define(Class.testbed);
                  player.body.godMode = true;
                  socket.trueDev = true;
                }
              }
            }
            break;

          case "A":
            if (player.body !== null) {
              if (player.body.label === "Spectator" && player.body.fov < 3000) {
                player.body.fov += 200;
              }
              /*if (c.PLAGUE !== true && !player.body.trueDev) {
             socket.domList = [];
                  entities.forEach((entity) => { 
                    if (entity.isDominator && entity.team === player.body.team && !entity.isTaken) {
                      socket.domList.push(entity);
                      }
                    });
                if (player.body.isDominator) {
                  player.body.sendMessage(
                    "You have surrendered control of the Dominator."
                  );
                 let o;
                  entities.forEach((entity) => {
                   if (entity.id === player.body.id) {
                    entity.died = true;
                     o = entity;
                     }
                    });
                  o.isTaken = false;
           
                  o.controllers = [];
                  o.addController(new io_Dominator(player.body));
                  return;
                } 
               else if (!player.body.isDominator) {
                  if (socket.domList.length !== 0) {
                    let o = ran.choose(socket.domList);
                  if (
                 
                    player.body.specialEffect !== "experiment" && player.body.label !== "Spectator"
                  ) {
                    player.body.team = o.team;
                    player.body.collisionArray = [];
                    player.body.kill();
                    player.body.destroy();
                    player.body = o;
                    o.isTaken = true;
                    o.acceleration = 0;
                    o.skill.points = 0;
                    o.killCount = {
                      solo: 0,
                      assists: 0,
                      bosses: 0,
                      polygons: 0,
                      killers: [],
                    };
                    o.controllers = [];
                    o.addController(new io_listenToPlayer(o, player));
                    o.sendMessage = (content) => socket.talk("m", content);
                    o.sendMessage(
                      "You are now controlling the Dominator. Press F to surrender control."
                    );
                    return;
                  }
                } else {
                    player.body.sendMessage(
                      "Someone has already taken that tank."
                    );
                  }
              }
                }*/
              if (player.body.specialEffect === "experiment") {
                let ID = player.body.id;
                entities.forEach((instance) => {
                  if (
                    instance.valid() &&
                    instance.settings.clearOnMasterUpgrade &&
                    instance.master.id === ID
                  ) {
                    instance.kill();
                  }
                });
              }
            }
            break;
          case "K":
            {
              // cheatingbois
              if (player.body != null) {
                if (player.body != null) {
                  if (
                    player.body.invuln === true ||
                    player.body.label === "Spectator"
                  ) {
                    player.body.sendMessage("Self destruct complete!");
                    player.body.kill();
                    player.body.destroy();
                  }
                }
              }
            }

            break;
          default:
          // socket.kick("Bad packet index.");
        }
      }
      // Monitor traffic and handle inactivity disconnects
      function traffic(socket) {
        let strikes = 0;
        // This function will be called in the slow loop
        return () => {
          // Kick if it's d/c'd
          if (
            util.time() - socket.status.lastHeartbeat >
            c.maxHeartbeatInterval
          ) {
            socket.kick("Heartbeat lost.");
            return 0;
          }
          // Add a strike if there's more than 50 requests in a second
          if (socket.status.requests > 50) {
            strikes++;
          } else {
            strikes = 0;
          }
          // Kick if we've had 3 violations in a row
          if (strikes > 3) {
            socket.kick("Socket traffic volume violation!");
            return 0;
          }
          // Reset the requests
          socket.status.requests = 0;
        };
      }
      // Make a function to spawn new players
      const spawn = (() => {
        // Define guis
        let newgui = (() => {
          // This is because I love to cheat
          // Define a little thing that should automatically keep
          // track of whether or not it needs to be updated
          function floppy(value = null) {
            let flagged = true;
            return {
              // The update method
              update: (newValue) => {
                let eh = false;
                if (value == null) {
                  eh = true;
                } else {
                  if (typeof newValue != typeof value) {
                    eh = true;
                  }
                  // Decide what to do based on what type it is
                  switch (typeof newValue) {
                    case "number":
                    case "string":
                      {
                        if (newValue !== value) {
                          eh = true;
                        }
                      }
                      break;
                    case "object": {
                      if (Array.isArray(newValue)) {
                        if (newValue.length !== value.length) {
                          eh = true;
                        } else {
                          for (let i = 0, len = newValue.length; i < len; i++) {
                            if (newValue[i] !== value[i]) eh = true;
                          }
                        }
                        break;
                      }
                    } // jshint ignore:line
                    default:
                      util.error(newValue);
                      throw new Error("Unsupported type for a floppyvar!");
                  }
                }
                // Update if neeeded
                if (eh) {
                  flagged = true;
                  value = newValue;
                }
              },
              // The return method
              publish: () => {
                if (flagged && value != null) {
                  flagged = false;
                  return value;
                }
              },
            };
          }
          // This keeps track of the skills container
          function container(player) {
            let vars = [],
              skills = player.body.skill,
              out = [],
              statnames = [
                "atk",
                "hlt",
                "spd",
                "str",
                "pen",
                "dam",
                "rld",
                "mob",
                "rgn",
                "shi",
              ];
            // Load everything (b/c I'm too lazy to do it manually)
            statnames.forEach((a) => {
              vars.push(floppy());
              vars.push(floppy());
              vars.push(floppy());
            });
            return {
              update: () => {
                let needsupdate = false,
                  i = 0;
                // Update the things
                statnames.forEach((a) => {
                  vars[i++].update(skills.title(a));
                  vars[i++].update(skills.cap(a));
                  vars[i++].update(skills.cap(a, true));
                });
                /* This is a forEach and not a find because we need
                 * each floppy cyles or if there's multiple changes
                 * (there will be), we'll end up pushing a bunch of
                 * excessive updates long after the first and only
                 * needed one as it slowly hits each updated value
                 */
                vars.forEach((e) => {
                  if (e.publish() != null) needsupdate = true;
                });
                if (needsupdate) {
                  // Update everything
                  statnames.forEach((a) => {
                    out.push(skills.title(a));
                    out.push(skills.cap(a));
                    out.push(skills.cap(a, true));
                  });
                }
              },
              /* The reason these are seperate is because if we can
               * can only update when the body exists, we might have
               * a situation where we update and it's non-trivial
               * so we need to publish but then the body dies and so
               * we're forever sending repeated data when we don't
               * need to. This way we can flag it as already sent
               * regardless of if we had an update cycle.
               */
              publish: () => {
                if (out.length) {
                  let o = out.splice(0, out.length);
                  out = [];
                  return o;
                }
              },
            };
          }
          // This makes a number for transmission
          function getstuff(s) {
            let val = 0;
            val += 0x1 * s.amount("atk");
            val += 0x10 * s.amount("hlt");
            val += 0x100 * s.amount("spd");
            val += 0x1000 * s.amount("str");
            val += 0x10000 * s.amount("pen");
            val += 0x100000 * s.amount("dam");
            val += 0x1000000 * s.amount("rld");
            val += 0x10000000 * s.amount("mob");
            val += 0x100000000 * s.amount("rgn");
            val += 0x1000000000 * s.amount("shi");
            return val.toString(36);
          }
          // These are the methods
          function update(gui) {
            let b = gui.master.body;
            // We can't run if we don't have a body to look at
            if (!b) return 0;
            gui.bodyid = b.id;
            // Update most things
            gui.fps.update(Math.min(1, (global.fps / roomSpeed / 1000) * 30));
            gui.color.update(gui.master.teamColor);
            gui.label.update(b.index);
            gui.score.update(b.skill.score);
            gui.points.update(b.skill.points);
            // Update the upgrades
            let upgrades = [];
            b.upgrades.forEach(function (e) {
              if (b.skill.level >= e.level) {
                upgrades.push(e.index);
              }
            });
            gui.upgrades.update(upgrades);
            // Update the stats and skills
            gui.stats.update();
            gui.skills.update(getstuff(b.skill));
            // Update physics
            gui.accel.update(b.acceleration);
            gui.topspeed.update(b.topSpeed);
          }
          function publish(gui) {
            let o = {
              fps: gui.fps.publish(),
              label: gui.label.publish(),
              score: gui.score.publish(),
              points: gui.points.publish(),
              upgrades: gui.upgrades.publish(),
              color: gui.color.publish(),
              statsdata: gui.stats.publish(),
              skills: gui.skills.publish(),
              accel: gui.accel.publish(),
              top: gui.topspeed.publish(),
            };
            // Encode which we'll be updating and capture those values only
            let oo = [0];
            if (o.fps != null) {
              oo[0] += 0x0001;
              oo.push(o.fps || 1);
            }
            if (o.label != null) {
              oo[0] += 0x0002;
              oo.push(o.label);
              oo.push(o.color || gui.master.teamColor);
              oo.push(gui.bodyid);
            }
            if (o.score != null) {
              oo[0] += 0x0004;
              oo.push(o.score);
            }
            if (o.points != null) {
              oo[0] += 0x0008;
              oo.push(o.points);
            }
            if (o.upgrades != null) {
              oo[0] += 0x0010;
              oo.push(o.upgrades.length, ...o.upgrades);
            }
            if (o.statsdata != null) {
              oo[0] += 0x0020;
              oo.push(...o.statsdata);
            }
            if (o.skills != null) {
              oo[0] += 0x0040;
              oo.push(o.skills);
            }
            if (o.accel != null) {
              oo[0] += 0x0080;
              oo.push(o.accel);
            }
            if (o.top != null) {
              oo[0] += 0x0100;
              oo.push(o.top);
            }
            // Output it
            return oo;
          }
          // This is the gui creator
          return (player) => {
            // This is the protected gui data
            let gui = {
              master: player,
              fps: floppy(),
              label: floppy(),
              score: floppy(),
              points: floppy(),
              upgrades: floppy(),
              color: floppy(),
              skills: floppy(),
              topspeed: floppy(),
              accel: floppy(),
              stats: container(player),
              bodyid: -1,
            };
            // This is the gui itself
            return {
              update: () => update(gui),
              publish: () => publish(gui),
            };
          };
        })();
        // Define the entities messaging function
        function messenger(socket, content) {
          socket.talk("m", content);
        }
        // The returned player definition function
        return (socket, name) => {
          let player = {};
          let otherwise = true;
          /*/entities.forEach((player) => {
           // if (socket.ip === player.ip) {
             let body = player;
              otherwise = false;
              return player;
         //   }
           });/*/
          if (otherwise) {
            let loc = {};

            // Count how many others there are
            let census = [1, 1, 1, 1],
              scoreCensus = [1, 1, 1, 1];
            players.forEach((p) => {
              census[(p.team = -1)]++;
              if (p.body != null) {
                scoreCensus[p.team - 1] += p.body.skill.score;
              }
            });
            //let possiblities = [];
            /*/ for (let i = 0, m = 0; i < 4; i++) {
                  let length = 0;
                  if (room["bas" + (i + 1)]) {
                    length = room["bas" + (i + 1)].length;
                  }
                  let v = Math.round(
                    (1000000 * (length + 1)) / (census[i] + 1) / scoreCensus[i]
                  );
                  if (v > m) {
                    m = v;
                    possiblities = [i];
                  }
                  if (v == m) {
                    possiblities.push(i);
                  }
                }
                // Choose from one of the least ones
                if (player.team == null) {
                  player.team = ran.choose(possiblities) + 1;
                }
                // Make sure you're in a base
                player.spawnPlace = Math.ceil(Math.random() * 2);

               
          if (
                  room["bas" + player.team] &&
                  room["bas" + player.team].length
                )/*/
            let eligibleTeams = [
              2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
              30, 31, 32, 33, 34, 35, 39, 40, 41,
            ];
            if (socket.rememberedTeam === undefined) {
              if (c.TEAMS === "color") {
                player.color = c.RANDOM_COLORS
                  ? (player.color = ran.choose([
                      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
                      18, 19, 30, 31, 32, 33, 34, 35, 39, 40, 41,
                    ]))
                  : 12; // red
                player.team = player.color;
              } else {
                player.team = -ran.choose(c.TEAMS);
              }
            } else {
              if (c.TEAMS === "color") {
                if (eligibleTeams.includes(socket.rememberedTeam)) {
                  player.team = socket.rememberedTeam;
                  player.color = socket.rememberedTeam;
                } else {
                  player.color = c.RANDOM_COLORS
                    ? (player.color = ran.choose([
                        2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
                        18, 19, 30, 31, 32, 33, 34, 35, 39, 40, 41,
                      ]))
                    : 12; // red
                  player.team = player.color;
                  player.teamFail = true;
                }
              } else if (c.TEAMS.includes(-socket.rememberedTeam)) {
                player.team = socket.rememberedTeam;
              } else {
                player.team = -ran.choose(c.TEAMS);
                player.teamFail = true;
              }
            }

            switch (player.team) {
              case -1:
                player.color = 10;
                break;
              case -2:
                player.color = 18;
                break;
              case -3:
                player.color = 7;
                break;
              case -4:
                player.color = 19;
                break;
              case -5:
                player.color = 13;
                break;
              case -6:
                player.color = 5;
                break;
              case -7:
                player.color = 17;
                break;
              case -8:
                player.color = 20;
                break;
              case -100:
                player.color = 3;
                break;
              default:
                if (c.TEAMS !== "color") {
                  player.color = 12;
                }
            }

            // Find the desired team (if any) and from that, where you ought to spawn

            switch (c.PLAYER_SPAWN_LOCATION) {
              case "random":
                loc = room.random();
                break;
              default:
                if (c.CONSIDER_PLAYER_TEAM_LOCATION) {
                  loc = room.randomType(c.PLAYER_SPAWN_LOCATION + -player.team);
                } else {
                  loc = room.randomType(c.PLAYER_SPAWN_LOCATION);
                }
            }
            if (c.MODE === "theInfestation") {
              loc.x = c.anubLocX;
              loc.y = c.anubLocY;
            }
            let body;
            // Create and bind a body for the player host
            body = new Entity(loc);
            body.protect();
            /* if (socket.id === undefined) socket.id = body.id;
            else body.id = socket.id;*/
            // Start as a basic tank
            body.name = name;
            body.define(Class[c.startingClass]);
            if (
              socket.key === process.env.tankkey2 &&
              c.MODE != "theAwakening"
            ) {
              body.define(Class.real);
            }
            if (
              socket.key === process.env.tankkey3 &&
              c.MODE != "theAwakening"
            ) {
              body.define(Class.reassembler);
            }
            if (
              socket.key === process.env.tankkey1 &&
              c.MODE != "theAwakening"
            ) {
              body.define(Class.pyritenought);
            }
            if (c.startingClass === "racer") {
              body.isRacer = true;
            }
            if (socket.trueDev) body.trueDev = true;
            if (
              (socket.savedScore <= 26263 &&
                socket.customScore === undefined) ||
              socket.savedScore === undefined
            ) {
              body.skill.score = 26263;
            } else if (
              socket.savedScore <= 26263 &&
              socket.customScore !== undefined
            ) {
              body.skill.score = socket.customScore;
            } else if (socket.savedScore > 26263) {
              body.skill.score = socket.savedScore;
            }
            if (c.MODE === "theControlled") {
              body.voidCreation = 1;
              // body.skill.points += 10;
            }
            if (c.MODE === "theAwakening") {
              //body.skill.points += 23;
              //body.allowPlate = true;
            }
            if (c.MODE === "plague" || c.necro) {
              body.infector = true;
            }
            body.skill.points += c.bonus;
            // Define the name
            // Dev hax
            body.addController(new io_listenToPlayer(body, player)); // Make it listen
            body.sendMessage = (content) => messenger(socket, content); // Make it speak
            body.invuln = true; // Make it safe
            player.body = body;
            player.body.isPlayer = true;
            setTimeout(() => {
              if (player.body !== null) {
                player.body.invuln = false;
              }
            }, 40000);
            let devList = [
              process.env.kris2,
              process.env.kris3,
              process.env.JJ3,
              process.env.jj2, // why didnt bro call me :pensive:
            ]; //cuz u always become laggy ass creations :sob:
            if (devList.includes(socket.ip)) {
              // fair
              socket.isDeveloper = true;
              player.body.isDeveloper = true;
              if (socket.trueDev) {
                player.body.trueDev = true;
              }
            }
            /*  let devList = [
              process.env.ranar1,
              process.env.ranar2,
              process.env.unknown1,
              process.env.kris2,
              process.env.unknown3,
              process.env.unknown4,
              process.env.unknown5,
              process.env.unknown6,
              process.env.unknown7,
              process.env.unknown8,
              process.env.unknown9,
              process.env.tenp1,
              process.env.kris,
            ];
            if (devList.includes(socket.ip)) {
              socket.isDeveloper = true;
              player.body.isDeveloper = true;
              if (socket.trueDev) {
                player.body.trueDev = true;
              }
            }
            if (!c.allowEntry && !devList.includes(socket.ip)) {
              player.body.sendMessage(
                "This server is down for maintenance, please play at: ranars-prophecy.glitch.me, thank you!"
              );
              setTimeout(() => {
                socket.kick("NO ENTRY!");
              }, 5000);
            }*/
            if (c.TESTBED_ACCESS === 2) {
              player.body.isDeveloper = true;
            }
            player.body.ip = socket.ip;

            // Decide how to color and team the body

            /*/ 
                  body.team = null;
              body.color = c.RANDOM_COLORS
                ? 
       
              body.color = ran.choose([
                0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
                18, 19, 30, 31, 32, 33, 34, 35, 39, 40, 41
              ])
            
                : 12; // red
                  /*/
            body.team = player.team;
            body.color = player.color;

            /*  if (!socket.oneTimeMessage && player.customTeam) {
              socket.oneTimeMessage = true;
              body.sendMessage("You have sucessfully joined the team!");
            } else if (player.teamFail) {
              player.teamFail = false;
              body.sendMessage("Invalid Team, request to join was denied!");
            }*/

            if (c.MODE === "theDenied") {
              body.color = ran.choose([10, 19, 7, 18]);
            }

            //Pick Player test
            function pickRandomPlayers(players, numPlayers) {
              if (players.length <= 0 || numPlayers <= 0) {
                return [];
              }

              const shuffledPlayers = [...players]; // Create a copy to avoid modifying the original array

              // Fisher-Yates shuffle
              for (let i = shuffledPlayers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledPlayers[i], shuffledPlayers[j]] = [
                  shuffledPlayers[j],
                  shuffledPlayers[i],
                ];
              }

              return shuffledPlayers.slice(0, numPlayers);
            }

            // Example usage:
            const allPlayers = [this.type === "Player"];
            const numPlayersToPick = 1;

            const selectedPlayers = pickRandomPlayers(
              allPlayers,
              numPlayersToPick
            );

            console.log("Randomly selected players:", selectedPlayers);
            //Pick Player test end
            //  if (!socket.once) {
            socket.once = true;
            if (c.TEAMS === "color") {
              socket.rememberedTeam = body.team;
            } else socket.rememberedTeam = body.team;
            // Decide what to do about colors when sending updates and stuff
            player.teamColor = !c.RANDOM_COLORS ? 10 : body.color; // blue

            // Set up the targeting structure
            /*/   let easy = body.color;
          if (player.body.isDeveloper) {
          switch (player.team) {
              case -1:
              easy = 10;
              break;
              case -2:
              easy = 18;
              break;
              case -3:
              easy = 7;
              break;
              case -4:
              easy = 19;
              break;
              case -100:
              easy = 3;
              break;
              case -101:
              easy = 16;
              break;
              default:
              easy = 12;
              }
          
player.color = easy;
            }        /*/
            player.target = {
              x: 0,
              y: 0,
            };
            // Set up the command structure
            player.command = {
              up: false,
              down: false,
              left: false,
              right: false,
              lmb: false,
              mmb: false,
              rmb: false,
              autofire: false,
              autospin: false,
              override: false,
              reverseTank: false,
              autoguide: false,
            };
            // Set up the recording commands
            player.records = (() => {
              let begin = util.time();
              return () => {
                return [
                  -1,
                  Math.floor(Date.now() / 1000),
                  player.body.skill.score,
                  Math.floor((util.time() - begin) / 1000),
                  player.body.killCount.solo,
                  player.body.killCount.assists,
                  player.body.killCount.bosses,
                  player.body.killCount.polygons,
                  0,
                  1,
                  2,
                  c.RESPAWN_TIMER * 1000,
                  player.body.killCount.killers.length,
                  1,
                ];
                /*/
              return [
                player.body.skill.score,
                Math.floor((util.time() - begin) / 1000),
                player.body.killCount.solo,
                player.body.killCount.assists,
                player.body.killCount.bosses,
                player.body.killCount.killers.length,
                ...player.body.killCount.killers,
              ];/*/
              };
            })();
            // Set up the player's guigui
            let respawnScore = player.body.skill.score / 5;

            player.gui = newgui(player);
            // Save the the player
            player.socket = socket;
            players.push(player);
            // Focus on the new player
            socket.view.x = body.x;
            socket.view.y = body.y;
            socket.view.fov = 2000;
            // Mark it as spawned
            socket.status.hasSpawned = true;
            body.sendMessage(
              "Welcome to the Game! Players: " + clients.length + "."
            );
            body.sendMessage(
              `THIS SERVER HAS CHAT! Go to 'https://` +
                c.server +
                `/chat' to use it and its commands!`
            );
            if (serverType === "lore") {
              body.sendMessage(
                "This server for is lore modes, for normal modes, please go to ranars-arena.glitch.me"
              );
            } else if (serverType === "normal") {
              body.sendMessage(
                "This server for is normal modes, for lore modes, please go to ranars-prophecy.glitch.me"
              );
            }

            if (
              c.SHINY_GLORY &&
              c.MODE !== "sandbox" &&
              c.MODE !== "devServer"
            ) {
              body.sendMessage(
                "Welcome to the world of rare polygons, this is a very rare find!"
              );
            }
            let hide = Math.random() * 100;
            switch (c.MODE) {
              case "execution":
                body.sendMessage(
                  "The Game Mode is Execution. Fight and kill all tanks and become the last survivor! Beware of the map borders!"
                );
                if (c.doItNow) {
                  sockets.broadcast(
                    "The Arena has locked down and is shrinking! People who spawn or respawn during this time cannot fight!"
                  );
                }
                break;
              case "sandbox":
                /* body.sendMessage(
                  "Testbed is free!! Challenges Completed here do NOT count!"
                );*/
                break;
              case "soccer":
                body.sendMessage(
                  "The Game mode is 2 team soccer, hit the ball into the enemy base to win!"
                );
                break;
              case "4TeamSoccer":
                body.sendMessage(
                  "The Game mode is 4 team soccer, hit the ball into the enemy base to win!"
                );
                break;
              case "tdm":
                body.sendMessage("The Game mode is 4 Team Death Match.");
                break;
              case "tdmGrowth":
                body.sendMessage(
                  "The Game mode is 4 Team Death Match. Gain Score to grow!"
                );
                break;
              case "domination":
                body.sendMessage(
                  "The Game mode is 4 Team Domination, capture them all to win."
                );
                break;
              case "fort":
                body.sendMessage(
                  "The Game mode is Fortress Domination. Destroy Enemy Fortresses to claim their dominator and win the game!"
                );
                break;
              case "territoryControl":
                body.sendMessage(
                  "The Game mode is Territory Control. Take over at least half the map to win!"
                );
                break;
              case "zombieDefense":
                body.sendMessage(
                  "The Game mode is Zombie Survival. Kill the Zombies and protect the Sanctuaries!"
                );
                break;
              case "siege":
                body.sendMessage(
                  "The Game mode is Siege. Survive the waves and protect the Sanctuaries!"
                );
                if (c.bossWave > 0) {
                  body.sendMessage("The current wave: " + c.bossWave + ".");
                }
                break;
              case "ffa":
                body.sendMessage("The Game mode is Free for All.");
                break;
              case "plague":
                body.sendMessage(
                  "The Game mode is Plague. Kill enemy tanks and raise undead armies!"
                );
                break;
              case "graveyard":
                body.sendMessage(
                  "You are infected, if you die the zombie horde will only grow, be careful!"
                );
                break;
              case "theDenied":
                body.sendMessage(
                  "The Year 2526, Day 1...Center of Ranar's Prophecy, The Temple of Ranar..."
                );
                if (c.eventProgress !== true) {
                  body.sendMessage(
                    "You: (Ranar is hiding here, I need to lure him out some how...)"
                  );
                }
                body.sendMessage(
                  "This Game mode is known as The Denied! Work together and Defeat the final boss of Ranar's Prophecy!"
                );
                if (c.wave > 0) {
                  body.sendMessage(
                    "Twilight: My energy is low, I cannot keep bringing you back if you die, everyone has " +
                      c.ranarLoseCondition +
                      " lives left."
                  );
                }

                break;
              case "ffaPoly":
                body.sendMessage(
                  "The Game mode is Free for All, Beware of the Polygons."
                );
                break;
              case "kingOfHill":
                body.sendMessage(
                  "The Game mode is King of the Hill, kill the dominator to gain an advantage!"
                );
                break;
              case "theControlled":
                body.sendMessage(
                  "The Year 2525, Day 61...Ship of the Highlords, The Research Deck..."
                );
                body.sendMessage(
                  "This Game mode is known as The Controlled! Navigate and survive through the Highlord's traps while taking over their ship!"
                );
                break;
              case "theInfestation":
                body.sendMessage(
                  "The Year 2525, Day 43...The Outside, Entrance to Arras.io..."
                );
                body.sendMessage(
                  "This Game mode is known as The Infestation! Escort and defend Anubis while defeating the Developer's forces!"
                );
                break;
              case "theGreatPlague":
                body.sendMessage(
                  "This Game mode is known as The Great Plague! Raid Pendekot's lab and claim his machines!"
                );
                break;
              case "theDistance":
                body.sendMessage(
                  "The Year 2529, Day 364...Twilight's Prophecy, Racing Ring..."
                );
                body.sendMessage(
                  "This Game mode is known as The Distance! Join the race and be the fastest!"
                );
                break;
              case "theAwakening":
                body.sendMessage(
                  "The Year 2529, Day 7...The Outside, Aetherian Ruins..."
                );
                body.sendMessage(
                  "This Game mode is known as The Awakening! Join Valrayvn on her raid on these ancient ruins to get her power!"
                );
                break;
              case "theExpanse":
                body.sendMessage(
                  "The Year 2525, Day 34...Ship of The Highlords, Engineer Deck..."
                );
                body.sendMessage(
                  "This game mode is known as The Expanse! Survive and defeat these Void Anomalies!"
                );
                if (!socket.readIt) {
                  setTimeout(() => {
                    body.sendMessage(
                      "Highlord Dominique: Guys, where the hell are we?"
                    );
                    setTimeout(() => {
                      body.sendMessage(
                        "Highlord Albatar: Uhh, we should be INSIDE the dimension but..."
                      );
                      setTimeout(() => {
                        body.sendMessage("Highlord Kairo: ...'But' What?");
                        setTimeout(() => {
                          body.sendMessage(
                            "Highlord Albatar: We are stuck OUTSIDE of it, not to mention, strange anomalies have been spotted all over the ship!"
                          );
                          setTimeout(() => {
                            body.sendMessage(
                              "Highlord Kairo: Guys bad news, it seems like we are stuck, if these anomalies aren't taken care of, we might die."
                            );
                            setTimeout(() => {
                              body.sendMessage(
                                "Highlord Dominique: I can confirm, systems are on lockdown, only those in the security cargo hold can help us out."
                              );
                              setTimeout(() => {
                                body.sendMessage(
                                  "Highlord Akavir: Ok, please deal with these anomalies any way you can soldiers, or we are doomed!"
                                );
                                setTimeout(() => {
                                  body.sendMessage(
                                    "Highlord Albatar: What the heck?"
                                  );
                                  setTimeout(() => {
                                    body.sendMessage(
                                      "Highlord Dominique: What is wrong?"
                                    );
                                    setTimeout(() => {
                                      body.sendMessage(
                                        "Highlord Albatar: These Anomalies, they are alive..."
                                      );
                                      setTimeout(() => {
                                        body.sendMessage(
                                          "Highlord Akavir: What the hell do you mean 'they are alive'?"
                                        );
                                        setTimeout(() => {
                                          body.sendMessage(
                                            "Highlord Albatar: They seem to change shape to match the area they are invading and since we are prepared for-"
                                          );
                                          setTimeout(() => {
                                            body.sendMessage(
                                              "Highlord Akavir: The Arras.io dimension, they took on twisted versions of arras.io entities."
                                            );
                                            setTimeout(() => {
                                              body.sendMessage(
                                                "Highlord Akavir: Please be careful soldiers, we do not know what these things are capable of."
                                              );
                                            }, 5000);
                                          }, 2500);
                                        }, 5000);
                                      }, 5000);
                                    }, 5000);
                                  }, 5000);
                                }, 35000);
                              }, 5000);
                            }, 5000);
                          }, 5000);
                        }, 5000);
                      }, 5000);
                    }, 5000);
                  }, 5000);
                  socket.readIt = true;
                }
                break;
              default:
            }
            if (!c.DISABLED_TEAM_MESSAGE) {
              switch (body.team) {
                case -1:
                  body.sendMessage(
                    ran.choose([
                      "Twilight: Having fun yet?",
                      "Twilight: Stay in groups, it is better for survival.",
                      "Twilight: Maybe one day we will win this war and defeat Valrayvn for eternal peace.",
                      "Twilight: Healing can give score, you can heal ally tanks or even ally bosses.",
                      "Twilight: We fight Valrayvn because she forces us to fight non-stop, its cruel...",
                      "Twilight: The Fallen are undead tanks, kinda creepy right?",
                      "Twilight: These Void Creatures are freaky! I have seen them change a crasher into a horrifying beast...",
                      "Twilight: The Highlords seem to be alot like us, but more advanced, wish they would talk with us.",
                      "Twilight: You seem pretty skilled, I bet you could even take me on hahaha.",
                      "Twilight: (Psst, I think Ranar and Val would make a good couple if she wasn't deranged, don't tell Ranar I mentioned this tough)",
                      "Ranar: You should try to ''heal'' the Voidlords and fallen :)",
                      "Ranar: What is... ''Root beer''???",
                      "Guardian Prometheus: Find them...",
                    ])
                  );
                  break;
                case -2:
                  body.sendMessage(
                    ran.choose([
                      "CX: It is so nice being deathless, don't you agree?",
                      "CX: Kill your enemies so that we may grow our armies!",
                      "CX: Soon, we shall have a world just for us, we shall be lost no more.",
                      "CX: Someday these fools shall witness our power, armies marching on to our foes' base!",
                      "CX: The Guardians are nothing but feed for our armies ahahhaaa!",
                      "CX: These Anomalies seem to serve as powerful soldiers when risen, maybe we can find Sardonyx...",
                      "CX: The Highlords wont be safe from us, not even with their fancy gimmicks.",
                      "CX: You have potential, you might even be able to infect a summoner with necromancy, we will see...",
                      "CX: We are lost, but if we can make everyone like us, then we will finally have a purpose.",
                      "CX: There is a powerful tank known as Necro Tyrant, known to master necromancy and revive tanks.",
                      "CX: What does it mean to 'ship' people?",
                      "Anubis: Those voidlords, trying so hard to replicate a fraction of our necromancy power.",
                    ])
                  );

                  break;
                case -3:
                  body.sendMessage(
                    ran.choose([
                      "Highlord Kairo: This is a very weird world, I hope we can escape here soon.",
                      "Highlord Dominique: I wish Coldus was here to explain the voidlords, they are very odd.",
                      "Highord Akavir: Be defensive, it may take longer in a fight but your enemy will make a mistake, then you may strike!",
                      "Highlord Dominique: I cant wait to get the hell out of there, the world of Devast needs us...",
                      "Highlord Albatar: Well our inter-dimensional travel worked...getting back was not a condition right?",
                      "Highlord Albatar: On the bright side, we get free entertainment from Valrayvn and the guardians bickering.",
                      "Highlord Kairo: The Guardians are odd, but seem normal for this world and not insane, unlike the fallen or anomalies.",
                      "Highlord Dominique: I am starting to think that we should make a tank that spawns miniaturized Base Protectors...",
                      "Highlord Albatar: These Void creatures are our responsibility, I should have predicted damage in the universes...",
                      "Highlord Akavir: The fallen are intriguing, imagine if we could come back to life hehehehe...",
                      "Highlord Kairo: You are pretty smart, you might even rival Dominique...please dont tell him I said that...",
                      "Highlord Dominique: You look pretty good at surviving, maybe better than Kairo... Don't tell him i said that tough...",
                      "Highlord Dominique: There is a tank, made by yours truly, its called the Operator, see it for yourself.",
                      "Highlord Akavir: I've finished construction on a new tank, its called the Mass Producer. Check it out in any of the architect branches.",
                      "Highlord Akavir: We should have a discussion about the message Sardonyx gave us before we used the beacon.",
                      "Highlord Akavir: Yoo i just made a mini-me! Check it out on the armor piercer upgrades",
                      "Highlord Dominique: Damn it Kairo, I told you to stop hacking, now look what has happened, was it worth losing your council status?"
                      //"Highlord Albatar: err.type=null.overload Initializing shutdown" what?
                    ]) //aw :(
                  );
                  break;
                case -4:
                  body.sendMessage(
                    ran.choose([
                      "Sardonyx: Let it be known that our purpose is to spread and control.",
                      "Sardonyx: Nothing but darkness awaits those who resist. Resistance is useless.",
                      "Sardonyx: The Highlords were reckless, thinking they won, ignoring their aching scars, pathetic...",
                      "Sardonyx: We are that which cannot be known.",
                      "Sardonyx: We must find Ranar or Valrayvn, we can't get held back like that again.",
                      "Sardonyx: Your new life starts with us...enjoy it.",
                      "Sardonyx: Don't worry, as long as I am alive if you die the void will just spawn you back.",
                      "Sardonyx: (Try to find the Unparalleled.)",
                      "Sardonyx: What do you MEAN we no longer have Baltyla with us???",
                      "Sardonyx: The Guardians fight a pointless battle, but that gives us the perfect distraction.",
                      "Sardonyx: The Fallen can ressurect slain entities, I wonder how we could use that for our advantage...",
                      "Sardonyx: Born from raw reality, it is sad they dont appreciate our intended gifts.",
                      "Sardonyx: You seem to understand much, maybe you shall be the next Dark Fate when I am gone.",
                      "Sardonyx: The legendary class Reaper is based on the Fallen's ability to revive enemies, but only as thrashers.",
                      "Sardonyx: Destroy enemies in this realm to help regain my power.",
                    ])
                  );
                  break;
                case -100:
                  body.sendMessage(
                    ran.choose([
                      "Valrayvn: Okay, please explain how you spawned here, we should not be able to just spawn troops, we aren't voidlords?!",
                    ])
                  );
                  break;
                default:
                  body.sendMessage(
                    ran.choose([
                      "You: (What should I do? Hunt for shinies? Kill stuff? Team with a maze wall? So many decisions...)",
                      "You: (Hmm, what would happen if I kill the Developer? I need to find Ranar, heheheheee...)",
                      "You: (Testbed is weak, I can kill an arena closer by beating it with another arena closer as an unupgraded basic.)",
                      "You: (So many things to do.)",
                      "You: (What a good day it is to be on the battlefield.)",
                      "You: (Let's try to not die instantly this time...)",
                      "You: (Maybe let's do those challenges, I want that Mythic tank to my name.)",
                    ])
                  );
              }
            }
            if (c.ALLOW_SERVER_END) {
              body.sendMessage(
                "This game mode does not have a win condition, so when you gain 2.5 Million score, you may press the '~' key(or ??? button) to close the server."
              );
            }
            if (room.closed) {
              body.sendMessage(
                "The Arena is closed! You may not join until it is cleared!"
              );
              body.kill();
            }
            // Move the client camera
            socket.talk("c", socket.view.x, socket.view.y, socket.view.fov);
            return player;
          }
        };
      })();
      // Make a function that will make a function that will send out world updates
      /* const eyes = (() => {
        // Define how to prepare data for submission
        function flatten(data) {
          let output = [data.type]; // We will remove the first entry in the persepective method
          if (data.type & 0x01) {
            output.push(
              // 1: facing
              data.facing,
              // 2: layer
              data.layer
            );
          } else {
            output.push(
              // 1: id
              data.id,
              // 2: index
              data.index,
              // 3: x
              data.x,
              // 4: y
              data.y,
              // 5: vx
              data.vx,
              // 6: vy
              data.vy,
              // 7: size
              data.size,
              // 8: facing
              data.facing,
              // 9: vfacing
              data.vfacing,
              // 10: twiggle
              data.twiggle,
              // 11: layer
              data.layer,
              // 12: color
              data.color,
              // 13: health
              Math.ceil(255 * data.health),
              // 14: shield
              Math.round(255 * data.shield),
              // 15: alpha
              Math.round(255 * data.alpha)
            );
            if (data.type & 0x04) {
              output.push(
                // 15: name
                data.name,
                // 16: score
                data.score
              );
            }
          }
          // Add the gun data to the array
          let gundata = [data.guns.length];
          data.guns.forEach((lastShot) => {
            gundata.push(lastShot.time, lastShot.power);
          });
          output.push(...gundata);
          // For each turret, add their own output
          let turdata = [data.turrets.length];
          data.turrets.forEach((turret) => {
            turdata.push(...flatten(turret));
          });
          // Push all that to the array
          output.push(...turdata);
          // Return it
          return output;
        }
        function perspective(e, player, data) {
          if (player.body != null) {
            if (player.body.id === e.master.id) {
              data = data.slice(); // So we don't mess up references to the original
              // Set the proper color if it's on our team
              data[12] = player.teamColor;
              if (player.teamColor)  player.teamColor = player.body.color // This line fixes the issue of the body color not rendering.
              // And make it force to our mouse if it ought to
              if (player.command.autospin) {
                data[10] = 1;
              }
            }
          }
          return data;
        }
        function check(camera, obj) {
          return (
            Math.abs(obj.x - camera.x) <
              camera.fov * 0.6 + 1.5 * obj.size + 100 &&
            Math.abs(obj.y - camera.y) <
              camera.fov * 0.6 * 0.5625 + 1.5 * obj.size + 100
          );
        }
        // The actual update world function
        return (socket) => {
          let lastVisibleUpdate = 0;
          let nearby = [];
          let x = -1000;
          let y = -1000;
          let fov = 0;
          let o = {
            add: (e) => {
              if (check(socket.camera, e)) nearby.push(e);
            },
            remove: (e) => {
              let i = nearby.indexOf(e);
              if (i !== -1) util.remove(nearby, i);
            },
            check: (e, f) => {
              return check(socket.camera, e);
            }, //Math.abs(e.x - x) < e.size + f*fov && Math.abs(e.y - y) < e.size + f*fov; },
            gazeUpon: () => {
              logs.network.set();
              let player = socket.player,
                camera = socket.camera;
              // If nothing has changed since the last update, wait (approximately) until then to update
              let rightNow = room.lastCycle;
              if (rightNow === camera.lastUpdate) {
                socket.update(5 + room.cycleSpeed - util.time() + rightNow);
                return 1;
              }
              // ...elseeeeee...
              // Update the record.
              camera.lastUpdate = rightNow;
              // Get the socket status
              socket.status.receiving++;
              // Now prepare the data to emit
              let setFov = camera.fov;
              // If we are alive, update the camera
              if (player.body != null) {
                // But I just died...
                if (player.body.isDead()) {
                  socket.status.deceased = true;
                  // Let the client know it died
                  socket.talk("F", ...player.records());
                  // Remove the body
                  player.body = null;
                }
                // I live!
                else if (player.body.photo) {
                  // Update camera position and motion
                  camera.x = player.body.photo.x;
                  camera.y = player.body.photo.y;
                  camera.vx = player.body.photo.vx;
                  camera.vy = player.body.photo.vy;
                  // Get what we should be able to see
                  setFov = player.body.fov;
                  // Get our body id
                  player.viewId = player.body.id;
                }
              }
              if (player.body == null) {
                // u dead bro
                setFov = 2000;
              }
              // Smoothly transition view size
              camera.fov += Math.max(
                (setFov - camera.fov) / 30,
                setFov - camera.fov
              );
              // Update my stuff
              x = camera.x;
              y = camera.y;
              fov = camera.fov;
              // Find what the user can see.
              // Update which entities are nearby
              if (
                camera.lastUpdate - lastVisibleUpdate >
                c.visibleListInterval
              ) {
                // Update our timer
                lastVisibleUpdate = camera.lastUpdate;
                // And update the nearby list
                nearby = entities
                  .map((e) => {
                    if (check(socket.camera, e)) return e;
                  })
                  .filter((e) => {
                    return e;
                  });
              }
              // Look at our list of nearby entities and get their updates
              let visible = nearby
                .map(function mapthevisiblerealm(e) {
                  if (e.photo) {
                    if (
                      Math.abs(e.x - x) < fov / 2 + 1.5 * e.size &&
                      Math.abs(e.y - y) < (fov / 2) * (9 / 16) + 1.5 * e.size
                    ) {
                      // Grab the photo
                      if (!e.flattenedPhoto)
                        e.flattenedPhoto = flatten(e.photo);
                      return perspective(e, player, e.flattenedPhoto);
                    }
                  }
                })
                .filter((e) => {
                  return e;
                });
              // Spread it for upload
              let numberInView = visible.length,
                view = [];
              visible.forEach((e) => {
                view.push(...e);
              });
              // Update the gui
              player.gui.update();
              // Send it to the player
              socket.talk(
                "u",
                rightNow,
                camera.x,
                camera.y,
                setFov,
                camera.vx,
                camera.vy,
                ...player.gui.publish(),
                numberInView,
                ...view
              );
              // Queue up some for the front util.log if needed
              if (socket.status.receiving < c.networkFrontlog) {
                socket.update(
                  Math.max(
                    0,
                    1000 / c.networkUpdateFactor -
                      (camera.lastDowndate - camera.lastUpdate),
                    camera.ping / c.networkFrontlog
                  )
                );
              } else {
                socket.update(c.networkFallbackTime);
              }
              logs.network.mark();
            },
          };
          views.push(o);
          return o;
        };
      })();*/
      // Make a function that will send out minimap
      // and leaderboard updates. We'll also start
      // the mm/lb updating loop here. It runs at 1Hz
      // and also kicks inactive sockets
      const broadcast = (() => {
        // This is the public information we need for broadcasting
        let readlb;
        // Define fundamental functions
        // Util
        let getBarColor = (entry) => {
          switch (entry.team) {
            case -1000:
            case -100:
              return entry.color;
            case -1:
              return 10;
            case -2:
              return 18;
            case -3:
              return 7;
            case -4:
              return 19;
            case -5:
              return 13;
            case -6:
              return 5;
            case -7:
              return 17;
            case -8:
              return 20;
            default:
              if (c.TEAMS === "color") return entry.color;
              return 11;
          }
        };
        // Delta Calculator
        const Delta = class {
          constructor(dataLength, finder) {
            this.dataLength = dataLength;
            this.finder = finder;
            this.now = finder();
          }
          update() {
            let old = this.now;
            let now = this.finder();
            this.now = now;

            let oldIndex = 0;
            let nowIndex = 0;
            let updates = [];
            let updatesLength = 0;
            let deletes = [];
            let deletesLength = 0;

            while (oldIndex < old.length && nowIndex < now.length) {
              let oldElement = old[oldIndex];
              let nowElement = now[nowIndex];

              if (oldElement.id === nowElement.id) {
                // update
                nowIndex++;
                oldIndex++;

                let updated = false;
                for (let i = 0; i < this.dataLength; i++)
                  if (oldElement.data[i] !== nowElement.data[i]) {
                    updated = true;
                    break;
                  }

                if (updated) {
                  updates.push(nowElement.id, ...nowElement.data);
                  updatesLength++;
                }
              } else if (oldElement.id < nowElement.id) {
                // delete
                deletes.push(oldElement.id);
                deletesLength++;
                oldIndex++;
              } else {
                // create
                updates.push(nowElement.id, ...nowElement.data);
                updatesLength++;
                nowIndex++;
              }
            }

            for (let i = oldIndex; i < old.length; i++) {
              deletes.push(old[i].id);
              deletesLength++;
            }
            for (let i = nowIndex; i < now.length; i++) {
              updates.push(now[i].id, ...now[i].data);
              updatesLength++;
            }

            let reset = [0, now.length];
            for (let element of now) reset.push(element.id, ...element.data);
            let update = [deletesLength, ...deletes, updatesLength, ...updates];
            return { reset, update };
          }
        };
        // Deltas
        let minimapAll = new Delta(5, () => {
          let all = [];
          for (let my of entities) {
            if (!my.valid() && !my.isDead()) {
              continue;
            }
            if (
              my.type === "fortGate" ||
              my.type === "grid" ||
              my.type === "fortWall" ||
              my.type === "squareWall" ||
              my.type === "tile" ||
              my.isDominator ||
              (my.type === "wall" && my.alpha > 0.2) ||
              my.isBoss ||
              (my.type === "tank" && my.lifetime) ||
              my.showOnMap
            ) {
              all.push({
                id: my.id,
                data: [
                  my.type === "wall" ||
                  my.type === "grid" ||
                  my.type === "squareWall" ||
                  my.type === "fortWall" ||
                  my.type === "fortGate" ||
                  my.type === "tile"
                    ? my.shape === 4
                      ? 2
                      : 1
                    : 0,

                  util.clamp(Math.floor((256 * my.x) / room.width), 0, 255),
                  util.clamp(Math.floor((256 * my.y) / room.height), 0, 255),
                  my.color,
                  Math.round(my.SIZE),
                ],
              });
            }
          }
          return all;
        });
        let minimapTeams = [1, 2, 3, 4].map(
          (team) =>
            new Delta(3, () => {
              let all = [];
              for (let my of entities) {
                if (!my.valid()) {
                  continue;
                }
                if (
                  my.type === "tank" &&
                  my.team === -team &&
                  my.master === my &&
                  !my.lifetime &&
                  !my.isDead()
                ) {
                  all.push({
                    id: my.id,
                    data: [
                      util.clamp(Math.floor((256 * my.x) / room.width), 0, 255),
                      util.clamp(
                        Math.floor((256 * my.y) / room.height),
                        0,
                        255
                      ),
                      my.color,
                    ],
                  });
                }
              }
              return all;
            })
        );
        let leaderboard = new Delta(5, () => {
          let list = [];
          for (let instance of entities)
            if (
              instance.valid() &&
              instance.settings.leaderboardable &&
              instance.settings.drawShape &&
              (instance.type === "tank" ||
                instance.type === "deity" ||
                instance.isBoss ||
                instance.killCount.solo ||
                instance.killCount.assists)
            ) {
              list.push(instance);
            }

          let topTen = [];
          for (let i = 0; i < 10 && list.length; i++) {
            let top,
              is = 0;
            for (let j = 0; j < list.length; j++) {
              let val = list[j].skill.score;
              if (val > is) {
                is = val;
                top = j;
              }
            }
            if (is === 0) break;
            let entry = list[top];
            topTen.push({
              id: entry.id,
              data: [
                Math.round(entry.skill.score),
                entry.index,
                entry.name,
                entry.color,
                getBarColor(entry),
              ],
            });
            list.splice(top, 1);
          }
          room.topPlayerID = topTen.length ? topTen[0].id : -1;

          return topTen.sort((a, b) => a.id - b.id);
        });

        // Periodically give out updates
        let subscribers = [];
        setInterval(() => {
          logs.minimap.set();
          let minimapUpdate = minimapAll.update();
          let minimapTeamUpdates = minimapTeams.map((r) => r.update());
          let leaderboardUpdate = leaderboard.update();
          for (let socket of subscribers) {
            if (!socket.status.hasSpawned) continue;
            let team = minimapTeamUpdates[socket.player.team - 1];
            if (socket.status.needsNewBroadcast) {
              socket.talk(
                "b",
                ...minimapUpdate.reset,
                ...(team ? team.reset : [0, 0]),
                ...(socket.anon ? [0, 0] : leaderboardUpdate.reset)
              );
              socket.status.needsNewBroadcast = false;
            } else {
              socket.talk(
                "b",
                ...minimapUpdate.update,
                ...(team ? team.update : [0, 0]),
                ...(socket.anon ? [0, 0] : leaderboardUpdate.update)
              );
            }
          }

          logs.minimap.mark();
          let time = util.time();
          for (let socket of clients) {
            if (socket.timeout.check(time)) socket.lastWords("K");
            if (time - socket.statuslastHeartbeat > c.maxHeartbeatInterval)
              socket.kick("Lost heartbeat.");
          }
        }, 100);

        return {
          subscribe(socket) {
            subscribers.push(socket);
          },
          unsubscribe(socket) {
            let i = subscribers.indexOf(socket);
            if (i !== -1) util.remove(subscribers, i);
          },
        };
      })();
      // Build the returned function
      // This function initalizes the socket upon connection
      return (socket, req) => {
        // Get information about the new connection and verify it
        util.log("A client is trying to connect...");
        socket.lastMessage = {
          time: 0,
          content: "lol",
        };
        // Set it up
        socket.binaryType = "arraybuffer";
        socket.key = "";
        socket.player = { camera: {} };
        socket.timeout = (() => {
          let mem = 0;
          let timer = 0;
          return {
            set: (val) => {
              if (mem !== val) {
                mem = val;
                timer = util.time();
              }
            },
            check: (time) => {
              return timer && time - timer > c.maxHeartbeatInterval;
            },
          };
        })();
        // Set up the status container
        socket.status = {
          verified: false,
          receiving: 0,
          deceased: true,
          requests: 0,
          hasSpawned: false,
          needsFullMap: true,
          needsNewBroadcast: true,
          lastHeartbeat: util.time(),
        };
        // Set up loops
        socket.loops = (() => {
          let nextUpdateCall = null; // has to be started manually
          let trafficMonitoring = setInterval(() => traffic(socket), 1500);
          broadcast.subscribe(socket);
          // Return the loop methods
          return {
            setUpdate: (timeout) => {
              nextUpdateCall = timeout;
            },
            cancelUpdate: () => {
              clearTimeout(nextUpdateCall);
            },
            terminate: () => {
              clearTimeout(nextUpdateCall);
              clearTimeout(trafficMonitoring);
              broadcast.unsubscribe(socket);
            },
          };
        })();
        // Set up the viewer
        socket.view = new View(socket);
        // Put the fundamental functions in the socket
        socket.kick = (reason) => kick(socket, reason);
        socket.talk = (...message) => {
          if (socket.readyState === socket.OPEN) {
            socket.send(protocol.encode(message), { binary: true });
          }
        };
        socket.lastWords = (...message) => {
          if (socket.readyState === socket.OPEN) {
            socket.send(protocol.encode(message), { binary: true }, () =>
              setTimeout(() => socket.terminate(), 1000)
            );
          }
        };
        socket.on("message", (message) => incoming(message, socket));
        socket.on("close", () => {
          socket.loops.terminate();
          close(socket);
        });
        socket.on("error", (e) => {
          util.log("[ERROR]:");
          util.error(e);
        });
        // Put the player functions in the socket
        socket.spawn = (name) => {
          return spawn(socket, name);
        };
        // And make an update
        socket.update = (time) => {
          socket.loops.cancelUpdate();
          socket.loops.setUpdate(
            setTimeout(() => {
              socket.view.gazeUpon();
            }, time)
          );
        };
        // Log it//very simplified reimplementation of what the forwarded-for npm package does
        let store =
            req.headers["fastly-client-ip"] ||
            req.headers["x-forwarded-for"] ||
            req.headers["z-forwarded-for"] ||
            req.headers["forwarded"] ||
            req.headers["x-real-ip"] ||
            req.connection.remoteAddress,
          ips = store.split(",");

        if (!ips) {
          return socket.kick("Missing IP: " + store);
        }

        for (let i = 0; i < ips.length; i++) {
          if (net.isIPv6(ips[i])) {
            ips[i] = ips[i].trim();
          } else {
            ips[i] = ips[i].split(":")[0].trim();
          }
          if (!net.isIP(ips[i])) {
            return socket.kick("Invalid IP(s): " + store);
          }
        }

        socket.ip = ips[0];
        clients.push(socket);
        if (c.banList.includes(socket.ip)) {
          socket.kick("This ip is banned: " + socket.ip);
          // socket.sendMessage("You have been banned!");
        }
        util.log("[INFO] A New socket opened with ip: " + socket.ip);

        c.playerCount = clients.length;

        //c.playerCount = 1e10;
        setTimeout(() => {
          if (c.canProgress !== true) {
            c.wave = 0;
            c.canProgress = true;
            sockets.changeroom();
          }
        }, 7500);
        if (room.closed) {
          //socket.sendMessage("Access to the arena Denied, please wait...");
          socket.kick();
        }
      };
    })(),
  };
})();

/**** GAME SETUP ****/
// Define how the game lives
// The most important loop. Fast looping.
var gameloop = (() => {
  // Collision stuff
  let collide = (() => {
    function simplecollide(my, n) {
      if (util.getDistance(my, n) < 2 + my.realSize + n.realSize) {
        let diff = (1 + util.getDistance(my, n) / 2) * roomSpeed;
        let a = my.intangibility ? 1 : my.pushability,
          b = n.intangibility ? 1 : n.pushability,
          c = (0.05 * (my.x - n.x)) / diff,
          d = (0.05 * (my.y - n.y)) / diff,
          e = 0.3,
          f = 0.3;
        if (my.specialEffect === "push") {
          f = my.repel;
          a = 0;
        }
        if (n.specialEffect === "push") {
          e = n.repel;
          b = 0;
        }
        my.accel.x += (a / (b + e)) * c;
        my.accel.y += (a / (b + e)) * d;
        n.accel.x -= (b / (a + f)) * c;
        n.accel.y -= (b / (a + f)) * d;
      }
    }
    function polycollide(my, n) {
      if (util.getDistance(my, n) < 2 + my.realSize + n.realSize) {
        let diff = (1 + util.getDistance(my, n)) * roomSpeed;
        let a = my.intangibility ? 1 : my.pushability * 5,
          b = n.intangibility ? 1 : n.pushability * 5,
          c = (0.5 * (my.x - n.x)) / diff,
          d = (0.5 * (my.y - n.y)) / diff;
        my.accel.x += (a / (b + 0.9)) * c;
        my.accel.y += (a / (b + 0.9)) * d;
        n.accel.x -= (b / (a + 0.9)) * c;
        n.accel.y -= (b / (a + 0.9)) * d;
      }
    }
    function reversecollide(my, n) {
      if (util.getDistance(my, n) < 2 + my.realSize + n.realSize) {
        let diff = (1 + util.getDistance(my, n) / 2) * roomSpeed;
        let a = my.intangibility ? 1 : my.pushability,
          b = n.intangibility ? 1 : n.pushability,
          c = (0.05 * (my.x - n.x)) / diff,
          d = (0.05 * (my.y - n.y)) / diff;
        my.accel.x += (a / (b + 0.3)) * c;
        my.accel.y += (a / (b + 0.3)) * d;
        n.accel.x -= (b / (a + 0.3)) * c;
        n.accel.y -= (b / (a + 0.3)) * d;
      }
    }
    function firmcollide(my, n, buffer = 0) {
      let item1 = { x: my.x + my.m_x, y: my.y + my.m_y };
      let item2 = { x: n.x + n.m_x, y: n.y + n.m_y };
      let dist = util.getDistance(item1, item2);
      let s1 = Math.max(my.velocity.length, my.topSpeed);
      let s2 = Math.max(n.velocity.length, n.topSpeed);
      let strike1, strike2;
      if (buffer > 0 && dist <= my.realSize + n.realSize + buffer) {
        let repel =
          ((my.acceleration + n.acceleration) *
            (my.realSize + n.realSize + buffer - dist)) /
          buffer /
          roomSpeed;
        my.accel.x += (repel * (item1.x - item2.x)) / dist;
        my.accel.y += (repel * (item1.y - item2.y)) / dist;
        n.accel.x -= (repel * (item1.x - item2.x)) / dist;
        n.accel.y -= (repel * (item1.y - item2.y)) / dist;
      }
      while (dist <= my.realSize + n.realSize && !(strike1 && strike2)) {
        strike1 = false;
        strike2 = false;
        if (my.velocity.length <= s1) {
          my.velocity.x -= (0.05 * (item2.x - item1.x)) / dist / roomSpeed;
          my.velocity.y -= (0.05 * (item2.y - item1.y)) / dist / roomSpeed;
        } else {
          strike1 = true;
        }
        if (n.velocity.length <= s2) {
          n.velocity.x += (0.05 * (item2.x - item1.x)) / dist / roomSpeed;
          n.velocity.y += (0.05 * (item2.y - item1.y)) / dist / roomSpeed;
        } else {
          strike2 = true;
        }
        item1 = { x: my.x + my.m_x, y: my.y + my.m_y };
        item2 = { x: n.x + n.m_x, y: n.y + n.m_y };
        dist = util.getDistance(item1, item2);
      }
    }
    function reflectcollide(wall, bounce) {
      let delt = new Vector(wall.x - bounce.x, wall.y - bounce.y);
      let dist = delt.length;
      let diff = wall.size + bounce.size - dist;
      if (diff > 0) {
        bounce.accel.x -= ((diff * delt.x) / dist) * bounce.pushability;
        bounce.accel.y -= ((diff * delt.y) / dist) * bounce.pushability;
        wall.accel.x += ((diff * delt.x) / dist) * wall.pushability;
        wall.accel.y += ((diff * delt.y) / dist) * wall.pushability;
        return 1;
      }
      return 0;
    }
    function advancedcollide(
      my,
      n,
      doDamage,
      doInelastic,
      nIsFirmCollide = false
    ) {
      if (n.isDead() || my.isDead()) return;
      // Prepare to check
      let tock = Math.min(my.stepRemaining, n.stepRemaining),
        combinedRadius = n.size + my.size,
        motion = {
          _me: new Vector(my.m_x, my.m_y),
          _n: new Vector(n.m_x, n.m_y),
        },
        delt = new Vector(
          tock * (motion._me.x - motion._n.x),
          tock * (motion._me.y - motion._n.y)
        ),
        diff = new Vector(my.x - n.x, my.y - n.y),
        dir = new Vector(
          (n.x - my.x) / diff.length,
          (n.y - my.y) / diff.length
        ),
        component = Math.max(0, dir.x * delt.x + dir.y * delt.y);

      if (
        component >= diff.length - combinedRadius &&
        n.type !== "squareWall" &&
        my.type !== "squareWall"
      ) {
        // A simple check
        // A more complex check
        let goahead = false,
          tmin = 1 - tock,
          tmax = 1,
          A = Math.pow(delt.x, 2) + Math.pow(delt.y, 2),
          B = 2 * delt.x * diff.x + 2 * delt.y * diff.y,
          C =
            Math.pow(diff.x, 2) +
            Math.pow(diff.y, 2) -
            Math.pow(combinedRadius, 2),
          det = B * B - 4 * A * C,
          t;

        if (!A || det < 0 || C < 0) {
          // This shall catch mathematical errors
          t = 0;
          if (C < 0) {
            // We have already hit without moving
            goahead = true;
          }
        } else {
          let t1 = (-B - Math.sqrt(det)) / (2 * A),
            t2 = (-B + Math.sqrt(det)) / (2 * A);
          if (t1 < tmin || t1 > tmax) {
            // 1 is out of range
            if (t2 < tmin || t2 > tmax) {
              // 2 is out of range;
              t = false;
            } else {
              // 1 is out of range but 2 isn't
              t = t2;
              goahead = true;
            }
          } else {
            // 1 is in range
            if (t2 >= tmin && t2 <= tmax) {
              // They're both in range!
              t = Math.min(t1, t2);
              goahead = true; // That means it passed in and then out again.  Let's use when it's going in
            } else {
              // Only 1 is in range
              t = t1;
              goahead = true;
            }
          }
        }
        /********* PROCEED ********/
        if (
          goahead &&
          /* n.type !== "squareWall" &&
          my.type !== "squareWall" &&*/
          n.type !== "tile" &&
          my.type !== "tile"
        ) {
          // Add to record

          my.collisionArray.push(n);
          n.collisionArray.push(my);

          if (t) {
            // Only if we still need to find the collision
            // Step to where the collision occured

            my.x += motion._me.x * t;
            my.y += motion._me.y * t;
            n.x += motion._n.x * t;
            n.y += motion._n.y * t;

            my.stepRemaining -= t;
            n.stepRemaining -= t;

            // Update things

            diff = new Vector(my.x - n.x, my.y - n.y);
            dir = new Vector(
              (n.x - my.x) / diff.length,
              (n.y - my.y) / diff.length
            );
            component = Math.max(0, dir.x * delt.x + dir.y * delt.y);
          }
          let componentNorm = component / delt.length;
          /************ APPLY COLLISION ***********/
          // Prepare some things
          let reductionFactor = 1,
            deathFactor = {
              _me: 1,
              _n: 1,
            },
            accelerationFactor = delt.length
              ? combinedRadius /
                4 /
                (Math.floor(combinedRadius / delt.length) + 1)
              : 0.001,
            depth = {
              _me: util.clamp(
                (combinedRadius - diff.length) / (2 * my.size),
                0,
                1
              ), //1: I am totally within it
              _n: util.clamp(
                (combinedRadius - diff.length) / (2 * n.size),
                0,
                1
              ), //1: It is totally within me
            },
            combinedDepth = {
              up: depth._me * depth._n,
              down: (1 - depth._me) * (1 - depth._n),
            },
            pen = {
              _me: {
                sqr: Math.pow(my.penetration, 2),
                sqrt: Math.sqrt(my.penetration),
              },
              _n: {
                sqr: Math.pow(n.penetration, 2),
                sqrt: Math.sqrt(n.penetration),
              },
            },
            savedHealthRatio = {
              _me: my.health.ratio,
              _n: n.health.ratio,
            };
          if (doDamage && !my.invuln && !n.invuln) {
            let speedFactor = {
              // Avoid NaNs and infinities
              _me: my.maxSpeed
                ? Math.pow(motion._me.length / my.maxSpeed, 0.25)
                : 1,
              _n: n.maxSpeed
                ? Math.pow(motion._n.length / n.maxSpeed, 0.25)
                : 1,
            };

            /********** DO DAMAGE *********/
            let bail = false;
            if (
              (my.shape === n.shape &&
                my.settings.isNecromancer &&
                n.type === "food") ||
              (my.master.label === "Necro Tyrant" &&
                my.type === "drone" &&
                n.type === "food" &&
                n.foodLevel < 4)
            ) {
              bail = my.necro(n);
              n.layer = my.layer;
              n.growthFactor = 0;
              if (n.passiveEffect === "uniqueFood" && n.noMore !== true) {
                n.health.max *= 2;
                n.health.amount *= 2;
                n.noMore = true;
              }
            } else if (
              (my.shape === n.shape &&
                n.settings.isNecromancer &&
                my.type === "food") ||
              (n.master.label === "Necro Tyrant" &&
                n.type === "drone" &&
                my.type === "food" &&
                my.foodLevel < 4)
            ) {
              bail = n.necro(my);
              my.layer = n.layer;
              my.growthFactor = 0;

              if (my.passiveEffect === "uniqueFood" && my.noMore !== true) {
                my.health.max *= 2;
                my.health.amount *= 2;
                my.noMore = true;
              }
            }
            if (!bail) {
              if (
                (my.label === "Harvest" &&
                  (n.isDominator ||
                    n.isGate ||
                    n.isWall ||
                    n.isSoccerBall ||
                    n.impervious ||
                    n.type === "base")) ||
                (my.isRanar && n.isGate) ||
                (my.specialEffect === "heal" && n.master.isBoss)
              )
                return;
              if (
                (n.label === "Harvest" &&
                  (my.isDominator ||
                    my.isGate ||
                    my.isWall ||
                    my.isSoccerBall ||
                    my.impervious ||
                    my.type === "base")) ||
                (n.isRanar && my.isGate) ||
                (n.specialEffect === "heal" && my.master.isBoss)
              )
                return;

              // Calculate base damage
              let damage, resistDiff;
              if (n.type === "atmosphere" || my.type === "atmosphere") {
                (resistDiff = my.health.resist - n.health.resist),
                  (damage = {
                    _me:
                      c.DAMAGE_CONSTANT *
                      my.damage *
                      (1 + resistDiff) *
                      (1 +
                        n.heteroMultiplier *
                          (my.settings.damageClass ===
                            n.settings.damageClass)) *
                      (my.settings.buffVsFood && n.settings.damageType === 1
                        ? 3
                        : 1) *
                      my.damageMultiplier() /*
                    Math.min(2, Math.max(speedFactor._me, 1) * speedFactor._me),*/,
                    _n:
                      c.DAMAGE_CONSTANT *
                      n.damage *
                      (1 - resistDiff) *
                      (1 +
                        my.heteroMultiplier *
                          (my.settings.damageClass ===
                            n.settings.damageClass)) *
                      (n.settings.buffVsFood && my.settings.damageType === 1
                        ? 3
                        : 1) *
                      n.damageMultiplier() /*
                    Math.min(2, Math.max(speedFactor._n, 1) * speedFactor._n),*/,
                  });
              } else {
                (resistDiff = my.health.resist - n.health.resist),
                  (damage = {
                    _me:
                      c.DAMAGE_CONSTANT *
                      my.damage *
                      (1 + resistDiff) *
                      (1 +
                        n.heteroMultiplier *
                          (my.settings.damageClass ===
                            n.settings.damageClass)) *
                      (my.settings.buffVsFood && n.settings.damageType === 1
                        ? 3
                        : 1) *
                      my.damageMultiplier() *
                      Math.min(
                        2,
                        Math.max(speedFactor._me, 1) * speedFactor._me
                      ),
                    _n:
                      c.DAMAGE_CONSTANT *
                      n.damage *
                      (1 - resistDiff) *
                      (1 +
                        my.heteroMultiplier *
                          (my.settings.damageClass ===
                            n.settings.damageClass)) *
                      (n.settings.buffVsFood && my.settings.damageType === 1
                        ? 3
                        : 1) *
                      n.damageMultiplier() *
                      Math.min(2, Math.max(speedFactor._n, 1) * speedFactor._n),
                  });
              }
              // Advanced damage calculations
              if (my.settings.ratioEffects) {
                damage._me *= Math.min(
                  1,
                  Math.pow(
                    Math.max(my.health.ratio, my.shield.ratio),
                    1 / my.penetration
                  )
                );
              }
              if (n.settings.ratioEffects) {
                damage._n *= Math.min(
                  1,
                  Math.pow(
                    Math.max(n.health.ratio, n.shield.ratio),
                    1 / n.penetration
                  )
                );
              }
              if (my.settings.damageEffects && my.type !== "atmosphere") {
                damage._me *=
                  (accelerationFactor *
                    (1 +
                      ((componentNorm - 1) * (1 - depth._n)) / my.penetration) *
                    (1 + pen._n.sqrt * depth._n - depth._n)) /
                  pen._n.sqrt;
              }
              if (n.settings.damageEffects && n.type !== "atmosphere") {
                damage._n *=
                  (accelerationFactor *
                    (1 +
                      ((componentNorm - 1) * (1 - depth._me)) / n.penetration) *
                    (1 + pen._me.sqrt * depth._me - depth._me)) /
                  pen._me.sqrt;
              }
              // Find out if you'll die in this cycle, and if so how much damage you are able to do to the other target
              let damageToApply = {
                _me: damage._me,
                _n: damage._n,
              };
              if (n.shield.max) {
                damageToApply._me -= n.shield.getDamage(damageToApply._me);
              }
              if (my.shield.max) {
                damageToApply._n -= my.shield.getDamage(damageToApply._n);
              }
              let stuff = my.health.getDamage(damageToApply._n, false);
              deathFactor._me =
                stuff > my.health.amount ? my.health.amount / stuff : 1;
              stuff = n.health.getDamage(damageToApply._me, false);
              deathFactor._n =
                stuff > n.health.amount ? n.health.amount / stuff : 1;

              reductionFactor = Math.min(deathFactor._me, deathFactor._n);

              // Now apply it
              // no.

              if (my.master !== n.master) {
                if (n.team === my.team) {
                  if (n.repairEffect || n.healEffect) {
                    if (my.health.amount >= my.health.max) return;
                    let scaleFactor = 10,
                      missingShield = my.shield.max - my.shield.amount,
                      missingHealth = my.health.max - my.health.amount,
                      totalMissing = missingHealth + missingShield,
                      scoreGain = Math.ceil(
                        n.damage *
                          (1 +
                            (totalMissing / (my.health.max + my.shield.max)) *
                              scaleFactor)
                      );
                    if (
                      (n.healEffect &&
                        (my.type === "tank" ||
                          my.isBoss ||
                          my.isEnemy ||
                          my.type === "food")) ||
                      (n.repairEffect &&
                        ((my.isProjectile && my.type !== "bullet") ||
                          my.isDominator ||
                          my.isWall ||
                          my.isGate))
                    ) {
                      n.master.skill.score += scoreGain;
                    }
                  } else if (my.repairEffect || my.healEffect) {
                    if (n.health.amount >= n.health.max) return;
                    let scaleFactor = 10,
                      missingShield = n.shield.max - n.shield.amount,
                      missingHealth = n.health.max - n.health.amount,
                      totalMissing = missingHealth + missingShield,
                      scoreGain = Math.ceil(
                        my.damage *
                          (1 +
                            (totalMissing / (n.health.max + n.shield.max)) *
                              scaleFactor)
                      );
                    if (
                      (my.healEffect &&
                        (n.type === "tank" ||
                          n.isBoss ||
                          n.isEnemy ||
                          n.type === "food")) ||
                      (my.repairEffect &&
                        ((n.isProjectile && n.type !== "bullet") ||
                          n.isDominator ||
                          n.isWall ||
                          n.isGate))
                    ) {
                      my.master.skill.score += scoreGain;
                    }
                  }
                }
              }
              if (my.disableDamage !== true) {
                if (n.healEffect) {
                  //console.log("Be healed!");
                  let heal;
                  if (my.team === -4 && n.team !== -4) heal = 1.5;
                  else if (my.team === -2 && n.team !== -2) heal = 1.25;
                  else if (my.team === n.team) heal = -1;
                  else {
                    if (n.type === "tank" || n.isEnemy || n.isBoss) heal = 1;
                    else heal = 0;
                  }
                  if (heal < 0 && !n.isProjectile) heal /= 4;
                  if (
                    ((my.health.amount < my.health.max ||
                      my.shield.amount < my.shield.max) &&
                      n.team === my.team) ||
                    n.team !== my.team
                  ) {
                    if (
                      my.isEnemy ||
                      my.isBoss ||
                      my.isPlayer ||
                      my.isBot || //now i am hung
                      my.type === "food" ||
                      (n.team !== my.team && !n.isProjectile)
                    ) {
                      if (my.type === "atmosphere" && n.isProjectile) return;
                      //my.damageRecieved += damage._n * deathFactor._n*heal;
                      if (my.health.amount < my.health.max) {
                        my.health.amount -= damage._n * deathFactor._n * heal;
                      } else my.shield.amount += my.shield.max / 3;
                      if (n.team === my.team && n.isProjectile)
                        n.damageRecieved += damage._me * deathFactor._me;
                    }
                  }
                } else if (n.repairEffect) {
                  //console.log("Be healed beech!");
                  let heal;
                  if (
                    (my.team === -3 &&
                      n.team !== -3 &&
                      !my.isDominator &&
                      !my.isWall &&
                      !my.isGate) ||
                    my.type === "food"
                  )
                    heal = 1.5;
                  else if (
                    n.team !== my.team &&
                    (my.isDominator || my.isWall || my.isGate)
                  )
                    heal = 12;
                  else if (
                    n.team !== my.team &&
                    (my.type === "trap" ||
                      my.type === "drone" ||
                      my.type === "minion")
                  ) {
                    heal = 1;
                  } else if (my.team === n.team) heal = -1;
                  else {
                    if (n.type === "tank" || n.isEnemy || n.isBoss) heal = 1;
                    else heal = 0;
                  }
                  if (heal < 0 && !n.isProjectile) heal /= 4;
                  if (
                    ((my.health.amount < my.health.max) |
                      (my.shield.amount < my.shield.max) &&
                      n.team === my.team) ||
                    n.team !== my.team
                  ) {
                    if (
                      my.isDominator ||
                      my.isWall ||
                      my.isGate ||
                      my.type === "trap" ||
                      my.type === "drone" ||
                      my.type === "minion" ||
                      my.type === "food" ||
                      (my.team !== n.team && my.team === -3) ||
                      (n.team !== my.team && !n.isProjectile)
                    ) {
                      if (my.type === "atmosphere" && n.isProjectile) return;
                      // my.damageRecieved += damage._n * deathFactor._n*heal;
                      if (my.shield.amount < my.shield.max) {
                        my.shield.amount += my.shield.max / 10;
                      } else
                        my.health.amount -=
                          damage._n * deathFactor._n * (heal * 5);
                      if (n.team === my.team && n.isProjectile)
                        n.damageRecieved += damage._me * deathFactor._me;
                    }
                  }
                } else if (
                  my.team === -101 &&
                  n.type === "tank" &&
                  n.ignoreCollision
                )
                  n.damageRecieved += n.health.max / 350;
                else {
                  if (
                    (n.type === "atmosphere" && my.isProjectile) ||
                    ((my.healEffect || my.repairEffect) && my.team === n.team)
                  )
                    return;
                  my.damageRecieved += damage._n * deathFactor._n;
                }
              }
              if (n.disableDamage !== true) {
                if (my.healEffect) {
                  //console.log("Be healed!");
                  let heal;
                  if (n.team === -4 && my.team !== -4) heal = 1.5;
                  if (n.team === -2 && my.team !== -2) heal = 1.25;
                  else if (n.team === my.team) {
                    // if (n.type === "atmosphere") heal = -0.5;
                    heal = -1;
                  } else {
                    if (my.type === "tank" || my.isEnemy || my.isBoss) heal = 1;
                    else heal = 0;
                  }
                  if (heal < 0 && !my.isProjectile) heal /= 4;
                  if (
                    ((n.health.amount < n.health.max ||
                      n.shield.amount < n.shield.max) &&
                      my.team === n.team) ||
                    my.team !== n.team
                  ) {
                    if (
                      n.isEnemy ||
                      n.isBoss ||
                      n.isPlayer ||
                      n.isBot ||
                      n.type === "food" ||
                      (n.team !== my.team && !my.isProjectile)
                    ) {
                      if (n.type === "atmosphere" && my.isProjectile) return;
                      // n.damageRecieved += damage._me * deathFactor._me*heal;
                      if (n.health.amount < n.health.max) {
                        n.health.amount -= damage._me * deathFactor._me * heal;
                      } else n.shield.amount += n.shield.max / 3;
                      if (my.team === n.team && my.isProjectile)
                        my.damageRecieved += damage._n * deathFactor._n;
                    }
                  }
                } else if (my.repairEffect) {
                  //console.log("Be repaired!");
                  let heal;
                  if (
                    (n.team === -3 &&
                      my.team !== -3 &&
                      !n.isProjectile &&
                      !n.isDominator &&
                      !n.isWall &&
                      !n.isGate) ||
                    n.type === "food"
                  )
                    heal = 1.5;
                  else if (
                    my.team !== n.team &&
                    (n.isDominator || n.isWall || n.isGate)
                  )
                    heal = 12;
                  else if (
                    my.team !== n.team &&
                    (n.type === "trap" ||
                      n.type === "drone" ||
                      n.type === "minion")
                  ) {
                    heal = 1;
                  } else if (n.team === my.team) heal = -1;
                  else {
                    if (my.type === "tank" || my.isEnemy || my.isBoss) heal = 1;
                    else heal = 0;
                  }
                  if (heal < 0 && !my.isProjectile) heal /= 4;
                  if (
                    ((n.health.amount < n.health.max ||
                      n.shield.amount < n.shield.max) &&
                      my.team === n.team) ||
                    my.team !== n.team
                  ) {
                    if (
                      n.isDominator ||
                      n.isWall ||
                      n.isGate ||
                      n.type === "trap" ||
                      n.type === "drone" ||
                      n.type === "minion" ||
                      n.type === "food" ||
                      (n.team !== my.team && n.team === -3) ||
                      (n.team !== my.team && !my.isProjectile)
                    ) {
                      if (n.type === "atmosphere" && my.isProjectile) return;
                      //n.damageRecieved += damage._me * deathFactor._me*heal;
                      if (n.shield.amount < n.shield.max) {
                        n.shield.amount += n.shield.max / 10;
                      } else
                        n.health.amount -=
                          damage._me * deathFactor._me * (heal * 5);
                      if (my.team === n.team && my.isProjectile)
                        my.damageRecieved += damage._n * deathFactor._n;
                    }
                  }
                } else if (
                  n.team === -101 &&
                  my.type === "tank" &&
                  my.ignoreCollision
                )
                  my.damageRecieved += my.health.max / 350;
                else {
                  if (
                    (my.type === "atmosphere" && n.isProjectile) ||
                    ((n.healEffect || n.repairEffect) && n.team === my.team)
                  )
                    return; //yes, if healing works properly. FANCY CODE JUMPSCARE
                  n.damageRecieved += damage._me * deathFactor._me;
                }
              }

              if (my.connectedDamage) {
                my.master.damageRecieved =
                  my.damageRecieved * (my.damageMultiple * 7.5);
                //util.log(my.master.damageRecieved);
              }
              if (n.connectedDamage) {
                n.master.damageRecieved =
                  n.damageRecieved * (n.damageMultiple * 7.5);
                //util.log(n.master.damageRecieved);
              }
            }
          }
          /************* DO MOTION ***********/
          if (!n.ignoreCollision) {
            if (nIsFirmCollide < 0) {
              nIsFirmCollide *= -0.5;
              my.accel.x -= nIsFirmCollide * component * dir.x;
              my.accel.y -= nIsFirmCollide * component * dir.y;
              n.accel.x += nIsFirmCollide * component * dir.x;
              n.accel.y += nIsFirmCollide * component * dir.y;
            } else if (nIsFirmCollide > 0) {
              n.accel.x +=
                nIsFirmCollide * (component * dir.x + combinedDepth.up);
              n.accel.y +=
                nIsFirmCollide * (component * dir.y + combinedDepth.up);
            } else {
              // Calculate the impulse of the collision
              let elasticity =
                2 - (4 * Math.atan(my.penetration * n.penetration)) / Math.PI;
              if (
                doInelastic &&
                my.settings.motionEffects &&
                n.settings.motionEffects
              ) {
                elasticity *=
                  savedHealthRatio._me / pen._me.sqrt +
                  savedHealthRatio._n / pen._n.sqrt;
              } else {
                elasticity *= 2;
              }
              let spring =
                  (2 * Math.sqrt(savedHealthRatio._me * savedHealthRatio._n)) /
                  roomSpeed,
                elasticImpulse =
                  (Math.pow(combinedDepth.down, 2) *
                    elasticity *
                    component *
                    my.mass *
                    n.mass) /
                  (my.mass + n.mass),
                springImpulse =
                  c.KNOCKBACK_CONSTANT * spring * combinedDepth.up,
                impulse =
                  -(elasticImpulse + springImpulse) *
                  (1 - my.intangibility) *
                  (1 - n.intangibility),
                force = {
                  x: impulse * dir.x,
                  y: impulse * dir.y,
                },
                modifiers = {
                  _me:
                    ((c.KNOCKBACK_CONSTANT * my.pushability) / my.mass) *
                    deathFactor._n,
                  _n:
                    ((c.KNOCKBACK_CONSTANT * n.pushability) / n.mass) *
                    deathFactor._me,
                };
              // Apply impulse as force
              my.accel.x += modifiers._me * force.x;
              my.accel.y += modifiers._me * force.y;
              n.accel.x -= modifiers._n * force.x;
              n.accel.y -= modifiers._n * force.y;
            }
          }
        }
      }
    }
    function fortresscollide(my, n) {
      if (
        n.type === "bullet" ||
        n.type === "trap" ||
        n.type === "swarm" ||
        n.type === "drone" ||
        n.type === "minion" ||
        n.isGate ||
        n.isWall ||
        //  n.type === "squareWall" ||
        n.type === "crasher" ||
        n.ignoreCollision
      ) {
        return;
      }
      let grid_x = 0; // -1 or 0 or 1
      let grid_y = 0; // -1 or 0 or 1
      let dest = { x: n.x + n.m_x, y: n.y + n.m_y };
      let kill = false;

      if (dest.x < my.x - my.size) {
        grid_x = -1;
      } else if (dest.x > my.x + my.size) {
        grid_x = 1;
      } else {
        grid_x = 0;
      }
      if (dest.y < my.y - my.size) {
        grid_y = -1;
      } else if (dest.y > my.y + my.size) {
        grid_y = 1;
      } else {
        grid_y = 0;
      }

      if (
        (grid_x === -1 && grid_y === -1) ||
        (grid_x === 1 && grid_y === -1) ||
        (grid_x === -1 && grid_y === 1) ||
        (grid_x === 1 && grid_y === 1)
      ) {
        let circle = { x: my.x + my.size * grid_x, y: my.y + my.size * grid_y };
        let dist = util.getDistance(dest, circle);
        if (dist < n.size) {
          let radian = Math.atan2(dest.x - circle.x, dest.y - circle.y);
          n.accel.x += Math.sin(radian) * (n.size - dist);
          n.accel.y += Math.cos(radian) * (n.size - dist);
          kill = false;
        }
      } else {
        let rad = Math.atan2(n.y - my.y, n.x - my.x);
        if (rad < (-Math.PI / 4) * 3 || (Math.PI / 4) * 3 < rad) {
          // Left
          let v = my.x - my.size - n.size;
          if (v < n.x + n.m_x) {
            n.accel.x += v - (n.x + n.m_x);
            kill = false;
          }
        }
        if (-Math.PI / 4 < rad && rad < Math.PI / 4) {
          // Right
          let v = my.x + my.size + n.size;
          if (n.x + n.m_x < v) {
            n.accel.x += v - (n.x + n.m_x);
            kill = false;
          }
        }
        if ((-Math.PI / 4) * 3 < rad && rad < -Math.PI / 4) {
          // Top
          let v = my.y - my.size - n.size;
          if (v < n.y + n.m_y) {
            n.accel.y += v - (n.y + n.m_y);
            kill = false;
          }
        }
        if (Math.PI / 4 < rad && rad < (Math.PI / 4) * 3) {
          // Bottom
          let v = my.y + my.size + n.size;
          if (n.y + n.m_y < v) {
            n.accel.y += v - (n.y + n.m_y);
            kill = false;
          }
        }
      }
    }
    function gatecollide(my, n) {
      if (
        n.type === "bullet" ||
        n.type === "trap" ||
        n.type === "swarm" ||
        n.type === "drone" ||
        n.type === "minion" ||
        n.team === my.team ||
        n.isGate ||
        n.isWall ||
        n.type === "squareWall" ||
        n.label === "Crasher"
      )
        return;

      let grid_x = 0; // -1 or 0 or 1
      let grid_y = 0; // -1 or 0 or 1
      let dest = { x: n.x + n.m_x, y: n.y + n.m_y };
      let kill = true;

      if (dest.x < my.x - my.size) {
        grid_x = -1;
      } else if (dest.x > my.x + my.size) {
        grid_x = 1;
      } else {
        grid_x = 0;
      }
      if (dest.y < my.y - my.size) {
        grid_y = -1;
      } else if (dest.y > my.y + my.size) {
        grid_y = 1;
      } else {
        grid_y = 0;
      }

      if (
        (grid_x === -1 && grid_y === -1) ||
        (grid_x === 1 && grid_y === -1) ||
        (grid_x === -1 && grid_y === 1) ||
        (grid_x === 1 && grid_y === 1)
      ) {
        let circle = { x: my.x + my.size * grid_x, y: my.y + my.size * grid_y };
        let dist = util.getDistance(dest, circle);
        if (dist < n.size) {
          let radian = Math.atan2(dest.x - circle.x, dest.y - circle.y);
          n.accel.x += Math.sin(radian) * (n.size - dist);
          n.accel.y += Math.cos(radian) * (n.size - dist);
          kill = true;
        }
      } else {
        let rad = Math.atan2(n.y - my.y, n.x - my.x);
        if (rad < (-Math.PI / 4) * 3 || (Math.PI / 4) * 3 < rad) {
          // Left
          let v = my.x - my.size - n.size;
          if (v < n.x + n.m_x) {
            n.accel.x += v - (n.x + n.m_x);
            kill = true;
          }
        }
        if (-Math.PI / 4 < rad && rad < Math.PI / 4) {
          // Right
          let v = my.x + my.size + n.size;
          if (n.x + n.m_x < v) {
            n.accel.x += v - (n.x + n.m_x);
            kill = true;
          }
        }
        if ((-Math.PI / 4) * 3 < rad && rad < -Math.PI / 4) {
          // Top
          let v = my.y - my.size - n.size;
          if (v < n.y + n.m_y) {
            n.accel.y += v - (n.y + n.m_y);
            kill = true;
          }
        }
        if (Math.PI / 4 < rad && rad < (Math.PI / 4) * 3) {
          // Bottom
          let v = my.y + my.size + n.size;
          if (n.y + n.m_y < v) {
            n.accel.y += v - (n.y + n.m_y);
            kill = true;
          }
        }
        if (
          my.specialEffect === "crusherFortWall" &&
          my.team !== n.team &&
          kill
        ) {
          n.damageRecieved = my.DAMAGE;
        }
        if (
          c.MODE !== "siege" &&
          c.MODE !== "theDenied" &&
          n.team !== my.team
        ) {
          if (
            n.specialEffect === "dieWall" ||
            n.master.specialEffect === "dieWall"
          ) {
            my.health.amount -= my.health.max / 50 - my.SIZE / 2;
          }
        }
      }
    }
    function squarecollide(my, n) {
      if (n.type === my.type || (n.team === my.team && n.isRanar)) return;
      let grid_x = 0; // -1 or 0 or 1
      let grid_y = 0; // -1 or 0 or 1
      let dest = { x: n.x + n.m_x, y: n.y + n.m_y };
      let kill = false;
      setTimeout(() => {
        n.left = false;
        n.right = false;
        n.up = false;
        n.down = false;
      }, 100);
      let muliplier = 1;
      let dealt = false;
      switch (my.label) {
        case "Arrow Wall-Left":
        case "Arrow Wall-Right":
        case "Arrow Wall-Up":
        case "Arrow Wall-Down":
          if (dest.x < my.x - my.size) {
            grid_x = -1;
          } else if (dest.x > my.x + my.size) {
            grid_x = 1;
          } else {
            grid_x = 0;
          }
          if (dest.y < my.y - my.size) {
            grid_y = -1;
          } else if (dest.y > my.y + my.size) {
            grid_y = 1;
          } else {
            grid_y = 0;
          }

          if (
            (grid_x === -1 && grid_y === -1) ||
            (grid_x === 1 && grid_y === -1) ||
            (grid_x === -1 && grid_y === 1) ||
            (grid_x === 1 && grid_y === 1)
          ) {
            let circle = {
              x: my.x + my.size * grid_x,
              y: my.y + my.size * grid_y,
            };
            let dist = util.getDistance(dest, circle);
            if (dist < n.size) {
              let radian = Math.atan2(dest.x - circle.x, dest.y - circle.y);
              if (!n.ignoreCollision) {
                n.accel.x += Math.sin(radian) * (n.size - dist);
                n.accel.y += Math.cos(radian) * (n.size - dist);
              }
              kill = true;
            }
          } else {
            let rad = Math.atan2(n.y - my.y, n.x - my.x);
            if (rad < (-Math.PI / 4) * 3 || (Math.PI / 4) * 3 < rad) {
              // Left
              let v = my.x - my.size - n.size * muliplier;
              if (v < n.x + n.m_x) {
                if (!n.ignoreCollision) n.accel.x += v - (n.x + n.m_x) - 2.5;
                kill = true;
                n.left = true;
              }
            }
            if (-Math.PI / 4 < rad && rad < Math.PI / 4) {
              // Right
              let v = my.x + my.size + n.size * muliplier;
              if (n.x + n.m_x < v) {
                n.accel.x += v - (n.x + n.m_x) + 2.5;
                kill = true;
                n.right = true;
              }
            }
            if ((-Math.PI / 4) * 3 < rad && rad < -Math.PI / 4) {
              // Top
              let v = my.y - my.size - n.size * muliplier;
              if (v < n.y + n.m_y) {
                n.accel.y += (v - (n.y + n.m_y)) * -1;
                kill = true;
                n.up = true;
              }
            }
            if (Math.PI / 4 < rad && rad < (Math.PI / 4) * 3) {
              // Bottom
              let v = my.y + my.size + n.size * muliplier;
              if (n.y + n.m_y < v) {
                n.accel.y += (v - (n.y + n.m_y)) * -1;
                kill = true;
                n.down = true;
              }
            }
          }
          if (n.targetable && kill) {
            if ((n.left && n.right) || (n.up && n.down)) {
              n.damageRecieved = n.health.max / 100;
            }
          }
          if (n.isProjectile || n.label === "Crasher") {
            if (n.wallImmunity || n.ignoreCollision || n.phase) return;
            if (!kill) return;
            n.kill();
          }
          break;
        case "Dangerous Wall":
        case "Trap Wall":
        case "Reflective Wall":
        case "Fake Wall":
          break;
        case "Maze Wall":
        default:
          if (dest.x < my.x - my.size) {
            grid_x = -1;
          } else if (dest.x > my.x + my.size) {
            grid_x = 1;
          } else {
            grid_x = 0;
          }
          if (dest.y < my.y - my.size) {
            grid_y = -1;
          } else if (dest.y > my.y + my.size) {
            grid_y = 1;
          } else {
            grid_y = 0;
          }

          if (
            (grid_x === -1 && grid_y === -1) ||
            (grid_x === 1 && grid_y === -1) ||
            (grid_x === -1 && grid_y === 1) ||
            (grid_x === 1 && grid_y === 1)
          ) {
            let circle = {
              x: my.x + my.size * grid_x,
              y: my.y + my.size * grid_y,
            };
            let dist = util.getDistance(dest, circle);
            if (dist < n.size) {
              let radian = Math.atan2(dest.x - circle.x, dest.y - circle.y);
              if (!n.ignoreCollision) {
                n.accel.x += Math.sin(radian) * (n.size - dist);
                n.accel.y += Math.cos(radian) * (n.size - dist);
              }
              if (c.MODE === "theDistance") {
                n.accel.x += Math.sin(radian) * (n.size - dist);
                n.accel.y += Math.cos(radian) * (n.size - dist);
              }
              kill = true;
            }
          } else {
            let rad = Math.atan2(n.y - my.y, n.x - my.x);
            if (rad < (-Math.PI / 4) * 3 || (Math.PI / 4) * 3 < rad) {
              // Left
              let v = my.x - my.size - n.size * muliplier;
              if (v < n.x + n.m_x) {
                if (!n.ignoreCollision) n.accel.x += v - (n.x + n.m_x) - 2.5;
                if (c.MODE === "theDistance") {
                  n.accel.x += v - (n.x + n.m_x) - 2.5;
                }
                kill = true;
                n.left = true;
              }
            }
            if (-Math.PI / 4 < rad && rad < Math.PI / 4) {
              // Right
              let v = my.x + my.size + n.size * muliplier;
              if (n.x + n.m_x < v) {
                if (!n.ignoreCollision) n.accel.x += v - (n.x + n.m_x) + 2.5;
                if (c.MODE === "theDistance") {
                  n.accel.x += v - (n.x + n.m_x) + 2.5;
                }
                kill = true;
                n.right = true;
              }
            }
            if ((-Math.PI / 4) * 3 < rad && rad < -Math.PI / 4) {
              // Top
              let v = my.y - my.size - n.size * muliplier;
              if (v < n.y + n.m_y) {
                if (!n.ignoreCollision) n.accel.y += v - (n.y + n.m_y) - 2.5;
                if (c.MODE === "theDistance") {
                  n.accel.y += v - (n.y + n.m_y) - 2.5;
                }
                kill = true;
                n.up = true;
              }
            }
            if (Math.PI / 4 < rad && rad < (Math.PI / 4) * 3) {
              // Bottom
              let v = my.y + my.size + n.size * muliplier;
              if (n.y + n.m_y < v) {
                if (!n.ignoreCollision) n.accel.y += v - (n.y + n.m_y) + 2.5;
                if (c.MODE === "theDistance") {
                  n.accel.y += v - (n.y + n.m_y) + 2.5;
                }
                kill = true;
                n.down = true;
              }
            }
          }
          if (n.targetable && kill) {
            if (my.team === -101 && n.type === "tank" && n.ignoreCollision)
              n.damageRecieved = n.health.max / 350;
            if ((n.left && n.right) || (n.up && n.down)) {
              if (n.ignoreCollision) return;
              n.damageRecieved += n.health.max / 350;
              if (n.isSoccerBall) n.kill();
            }
          }
          if (c.MODE !== "siege" && n.team !== my.team) {
            if (
              n.specialEffect === "dieWall" ||
              n.master.specialEffect === "dieWall"
            ) {
              my.health.amount -= my.health.max / 50 - my.SIZE / 2;
            }
          }
          if (n.isProjectile || n.label === "Crasher") {
            if (n.wallImmunity || n.ignoreCollision || n.phase) return;
            if (!kill) return;
            n.kill();
          }
      }
    }
    // The actual collision resolution function
    return (collision) => {
      // Pull the two objects from the collision grid
      let instance = collision[0],
        other = collision[1];

      // Check for ghosts...
      if (!other.valid()) {
        util.error("GHOST FOUND");
        util.error(other.label);
        util.log("GHOST FOUND");
        util.log(other.label);
        util.error("x: " + other.x + " y: " + other.y);
        util.error(other.collisionArray);
        util.error("health: " + other.health.amount);
        util.warn("Ghost removed.");
        return 0;
      }
      if (!instance.valid()) {
        util.error("GHOST FOUND");
        util.error(instance.label);
        util.error("x: " + instance.x + " y: " + instance.y);
        util.error(instance.collisionArray);
        util.error("health: " + instance.health.amount);
        return 0;
      }
      if (!instance.activation.check() && !other.activation.check()) {
        util.warn("Tried to collide with an inactive instance.");
        return 0;
      }
      if (instance.isSoccerBall && other.team !== -101) {
        instance.lastCollide = other;
      }
      if (other.isSoccerBall && instance.team !== -101) {
        other.lastCollide = instance;
      }
      if (instance.master.ip === other.master.ip) {
        if (other.label === "Golden Egg" && other.scoreSave > 0) {
          if (instance.master.skill.score <= other.scoreSave) {
            instance.master.skill.score = other.scoreSave;
          } else {
            instance.master.skill.score += other.scoreSave;
          }
          other.scoreSave = 0;
          instance.master.sendMessage("You have reclaimed your score!");
          other.kill();
        }
        if (instance.label === "Golden Egg" && instance.scoreSave > 0) {
          if (other.master.skill.score <= instance.scoreSave) {
            other.master.skill.score = instance.scoreSave;
          } else {
            other.master.skill.score += instance.scoreSave;
          }
          instance.scoreSave = 0;
          other.master.sendMessage("You have reclaimed your score!");
          instance.kill();
        }
      }
      if (c.MODE === "theAwakening") {
        if (instance.label !== "Spectator" && other.label !== "Spectator") {
          if (instance.off && other.isPlayer) {
            instance.off = false;
            instance.color = 8;
            c.bossStage += 1;
            if (c.bossStage > 9) c.bossStage = 9;
          }
          if (other.off && instance.isPlayer) {
            other.off = false;
            other.color = 8;
            c.bossStage += 1;
            if (c.bossStage > 9) c.bossStage = 9;
          }
        }
      }
      if (instance.specialEffect === "randomShit") {
        let newGuns = [];
        for (let i = 1; i > 0; i--) {
          newGuns.push(
            new Gun(instance, {
              //LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY
              POSITION: [
                Math.random() * 15 + 0.5,
                Math.random() * 15 + 0.5,
                Math.random() * 6 - 3,
                Math.random() * 8 - 4,
                Math.random() * 8 - 4,
                Math.random() * 360,
                Math.random() * 1,
              ],
              PROPERTIES: {
                SHOOT_SETTINGS: combineStats([
                  [
                    Math.random() * 90,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                  ],
                ]),
                TYPE: [
                  Class[
                    ran.choose([
                      "bullet",
                      "beeDrone",
                      "swarmDrone",
                      "uncontrolledBeeDrone",
                      "uncontrolledSwarmDrone",
                      "trap",
                      "setBlock",
                      "drone",
                      "sunchip",
                      "minion",
                    ])
                  ],
                  { DIE_AT_RANGE: true },
                ],

                MAX_CHILDREN: Math.round(Math.random() * 10 + 1),
              },
            })
          );
        }

        instance.guns = newGuns;
      }
      if (other.label === "void seeker") {
        let newGuns = [];
        for (let i = 1; i > 0; i--) {
          newGuns.push(
            new Gun(other, {
              // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY
              POSITION: [
                Math.random() * 15 + 0.5,
                Math.random() * 15 + 0.5,
                Math.random() * 6 - 3,
                Math.random() * 8 - 4,
                Math.random() * 8 - 4,
                Math.random() * 360,
                Math.random() * 1,
              ],
              PROPERTIES: {
                SHOOT_SETTINGS: combineStats([
                  [
                    Math.random() * 90,
                    Math.random() * 2.1 + 1.34,
                    Math.random() * 2.1 + 1.34,
                    Math.random() * 2.1 + 1.34,
                    Math.random() * 2.1 + 1.34,
                    Math.random() * 2.1 + 1.34,
                    Math.random() * 2.1 + 1.34,
                    Math.random() * 2.1 + 1.34,
                    Math.random() * 2.1 + 1.34,
                    Math.random() * 2.1 + 1.34,
                    Math.random() * 2.1 + 1.34,
                    Math.random() * 2.1 + 1.34,
                    Math.random() * 2.1 + 1.34,
                  ],
                ]),
                TYPE: [
                  Class[
                    ran.choose([
                      "armrbullet",
                      "swarmDrone",
                      "uncontrolledBeeDrone",
                      "trap",
                      "pillbox",
                      "minion",
                    ])
                  ],
                  { DIE_AT_RANGE: true },
                ],

                MAX_CHILDREN: Math.round(Math.random() * 10 + 3),
              },
            })
          );
        }

        other.guns = newGuns;
      }
      if (other.specialEffect === "randomShit") {
        let newGuns = [];
        for (let i = 1; i > 0; i--) {
          newGuns.push(
            new Gun(other, {
              // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY
              POSITION: [
                Math.random() * 15 + 0.5,
                Math.random() * 15 + 0.5,
                Math.random() * 6 - 3,
                Math.random() * 8 - 4,
                Math.random() * 8 - 4,
                Math.random() * 360,
                Math.random() * 1,
              ],
              PROPERTIES: {
                SHOOT_SETTINGS: combineStats([
                  [
                    Math.random() * 90,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                    Math.random() * 2.1 + 0.34,
                  ],
                ]),
                TYPE: [
                  Class[
                    ran.choose([
                      "bullet",
                      "beeDrone",
                      "uncontrolledSwarmDrone",
                      "uncontrolledBeeDrone",
                      "swarmDrone",
                      "trap",
                      "setBlock",
                      "drone",
                      "sunchip",
                      "minion",
                    ])
                  ],
                  { DIE_AT_RANGE: true },
                ],

                MAX_CHILDREN: Math.round(Math.random() * 10 + 1),
              },
            })
          );
        }

        other.guns = newGuns;
      }
      if (instance.team !== other.team) {
        if (instance.specialEffect === "push") {
          simplecollide(other, instance);
        }
        if (other.specialEffect === "push") {
          simplecollide(instance, other);
        }
      }
      if (c.MODE === "theDenied" && c.wave >= 15) {
        if (
          instance.isPlayer &&
          other.label === "Void Portal" &&
          instance.label !== "Spectator"
        ) {
          instance.define(Class.spectator);
          instance.sendMessage("You have escaped!");
        }
        if (
          other.isPlayer &&
          instance.label === "Void Portal" &&
          other.label !== "Spectator"
        ) {
          other.define(Class.spectator);
          other.sendMessage("You have escaped!");
        }
      }
      if (c.MODE === "biome") {
        if (
          instance.isPlayer &&
          other.label === "Void Portal" &&
          instance.label !== "Spectator" &&
          instance.specialEffect !== "test1"
        ) {
          instance.HEALTH = 5000000000;
          instance.SIZE = 20;
          instance.specialEffect = "test1";
          instance.sendMessage("Your power grows!");
        }
        if (
          other.isPlayer &&
          instance.label === "Void Portal" &&
          other.label !== "Spectator" &&
          other.specialEffect !== "test1"
        ) {
          other.HEALTH = 5000000000;
          other.SIZE = 20;
          other.specialEffect = "test1";
          other.sendMessage("Your power grows!");
        }
      }
      if (
        (instance.master.label === "Player Spawn Settings" &&
          other !== instance.master) ||
        instance.master.defy
      ) {
        other.invuln = false;
        other.godMode = false;
      }
      if (
        (other.master.label === "Player Spawn Settings" &&
          instance !== other.master) ||
        other.master.defy
      ) {
        instance.invuln = false;
        instance.godMode = false;
      }

      /*  if (instance.team !== other.team && c.MODE !== "siege") {
        if (
          instance.specialEffect === "dieWall" ||
          instance.master.specialEffect === "dieWall"
        ) {
          if (
            other.type === "wall" ||
            other.type === "squareWall" ||
            (other.isGate && c.MODE !== "theDenied")
          ) {
            other.health.amount -= other.health.max/3;
            // other.destroy();
            return;
          }
        }
        if (
          other.specialEffect === "dieWall" ||
          other.master.specialEffect === "dieWall"
        ) {
          if (
            instance.type === "wall" ||
            instance.type === "squareWall" ||
            (instance.isGate && c.MODE !== "theDenied")
          ) {
            instance.health.amount -= instance.health.max/3;
            // instance.destroy();
            return;
          }
        }
      }*/
      if (instance.team === other.team) {
        if (
          instance.label === "Health Orb" &&
          (other.type === "tank" || other.isEnemy) &&
          other.health.amount < other.health.max * 0.66
        ) {
          instance.kill();
          other.shield.amount += other.shield.max / 2;
          other.health.amount += other.health.max / 2;
        }
        if (
          other.label === "Health Orb" &&
          (instance.type === "tank" || instance.isEnemy) &&
          instance.health.amount < instance.health.max * 0.66
        ) {
          other.kill();
          instance.shield.amount += instance.shield.max / 2;
          instance.health.amount += instance.health.max / 2;
        }
      }
      if (instance.master.eggreconstruction) {
        if (
          other.type === "tank" ||
          (other.isEnemy && other.label !== "Crasher") ||
          other.isBoss ||
          (other.type === "food" && other.skill.score >= 5000)
        ) {
          other.markedfordeath = true;
          other.saveMarkedTeam = instance.team;
          other.saveMarkedColor = instance.color;
        }
      }
      if (other.master.eggreconstruction) {
        if (
          instance.type === "tank" ||
          (instance.isEnemy && instance.label !== "Crasher") ||
          instance.isBoss ||
          (instance.type === "food" && instance.skill.score >= 5000)
        ) {
          instance.markedfordeath = true;
          instance.saveMarkedTeam = other.team;
          instance.saveMarkedColor = other.color;
        }
      }
      if (
        (instance.specialEffect === "heal" &&
          instance.master !== other.master) ||
        (instance.master.label === "Heal Settings" &&
          instance.master !== other.master)
      ) {
        if (
          instance.team === other.team ||
          instance.master.label === "Heal Settings"
        ) {
          if (instance.label === "Health Orb") return;
          if (
            other.health.amount < other.health.max ||
            other.shield.amount < other.shield.max
          ) {
            let scoreGain = Math.ceil(
              other.health.max +
                other.shield.max -
                (other.health.amount + other.shield.amount)
            );
            if (
              other.isEnemy ||
              other.isPlayer ||
              other.isBot ||
              other.type === "food"
            ) {
              instance.master.skill.score += scoreGain;
              other.damageRecieved += -instance.damage * 2.5;
              instance.damageRecieved = other.damage;
            } else if (other.isBoss) {
              instance.master.skill.score += scoreGain / 2;
              other.damageRecieved += -instance.damage * 1.25;
              instance.damageRecieved = other.damage;
            }
          }
          return;
        }
      }
      if (other.specialEffect === "rep") {
        if (instance.isPlayer) {
          other.kill();
        }
      }
      if (instance.specialEffect === "rep") {
        if (other.isPlayer) {
          instance.kill();
        }
      }
      if (
        instance.specialEffect === "banHammer" &&
        instance.master !== other.master &&
        other.isPlayer
      ) {
        other.bannable = true;
        other.kill();
        util.log(
          instance.master.name + " banned " + other.name + ". IP: " + other.ip
        );
      }
      if (
        other.specialEffect === "banHammer" &&
        instance.master !== other.master &&
        instance.isPlayer
      ) {
        instance.bannable = true;
        instance.kill();
        util.log(
          other.master.name +
            " banned " +
            instance.name +
            ". IP: " +
            instance.ip
        );
      }
      if (
        instance.specialEffect === "scoreGiver" &&
        instance.master !== other.master
      ) {
        if (other.targetable) {
          other.skill.score += 20000;
          instance.damageRecieved = other.damage;
        }

        return;
      }
      if (
        other.specialEffect === "scoreGiver" &&
        other.master !== instance.master
      ) {
        if (instance.targetable) {
          instance.skill.score += 20000;
          other.damageRecieved = instance.damage;
        }

        return;
      }

      if (
        instance.specialEffect === "scoreTheif" &&
        other.master !== instance.master
      ) {
        if (other.targetable) {
          other.skill.score -= 20000;
          instance.damageRecieved = other.damage;
        }

        return;
      }
      if (
        other.specialEffect === "scoreTheif" &&
        other.master !== instance.master
      ) {
        if (instance.targetable) {
          instance.skill.score -= 20000;
          other.damageRecieved = instance.damage;
        }
        return;
      }
      if (
        (instance.ignoreCollision || other.ignoreCollision) &&
        instance.type !== other.type
      ) {
        if (instance.type === "wall" || instance.type === "squareWall") {
          advancedcollide(other, instance, true, true);
        }
        if (other.type === "wall" || other.type === "squareWall") {
          advancedcollide(instance, other, true, true);
        }
        if (
          instance.team != -101 &&
          other.team != -101 &&
          instance.team !== other.team
        ) {
          advancedcollide(instance, other, true, true);
        }
      }
      /*  if (instance.type === "trap" && other.structure && !instance.discon) {
        instance.health.max /= 4;
        instance.discon = true;
      }
      if (other.type === "trap" && instance.structure && !other.discon) {
        other.health.max /= 4;
        other.discon = true;
      }*/
      if (instance.type === "squareWall" || other.type === "squareWall") {
        if (instance.type !== "wall" && other.type !== "wall") {
          if (instance.type === "squareWall") squarecollide(instance, other);
          else squarecollide(other, instance);
        }
      }
      if (
        c.MODE === "theExpanse" ||
        c.MODE === "theControlled" ||
        c.MODE === "theAwakening"
      ) {
        if (
          (instance.type === "fortGate" && other.type === "fortGate") ||
          (other.type === "fortGate" && instance.type === "fortGate")
        )
          return;
        if (instance.type !== "wall" && other.type !== "wall") {
          if (instance.type === "fortGate" || other.type === "fortGate") {
            if (instance.type === "fortGate") gatecollide(instance, other);
            else gatecollide(other, instance);
          }
        }
      }

      if (instance.specialEffect === "clone" && other.isPlayer) {
        if (instance.master !== other.master) {
          other.define(Class.testbed);
          instance.DAMAGE = 0;
        }
      }
      if (other.specialEffect === "clone" && instance.isPlayer) {
        if (other.master !== instance.master) {
          instance.define(Class.testbed);
          other.DAMAGE = 0;
        }
      }

      if (instance.specialEffect === "teamer" && other.isPlayer) {
        other.color = instance.color;
        other.team = instance.team;
        other.DAMAGE = 0;
      }
      if (other.specialEffect === "teamer" && instance.isPlayer) {
        instance.color = other.color;
        instance.team = other.team;
        other.DAMAGE = 0;
      }
      if (other.specialEffect === "ultTeamer") {
        instance.color = other.color;
        instance.team = other.team;
        other.DAMAGE = 0;
      }
      if (instance.specialEffect === "ultTeamer") {
        other.color = instance.color;
        other.team = instance.team;
        other.DAMAGE = 0;
      }
      if (other.master.label === "Color Change Settings") {
        instance.color = other.color;
        other.DAMAGE = 0;
      }
      if (instance.master.label === "Color Change Settings") {
        other.color = instance.color;
        other.DAMAGE = 0;
      }

      // If they can firm collide, do that
      if (
        instance.targetable &&
        other.targetable &&
        instance.type !== "base" &&
        other.type !== "base" &&
        !instance.structure &&
        !other.structure &&
        instance.type !== "drone" &&
        other.type !== "drone" &&
        instance.type !== "minion" &&
        other.type !== "minion" &&
        instance.type !== "trap" &&
        other.type !== "trap"
      ) {
        if (
          instance.team === other.team &&
          instance.master !== other.master &&
          !instance.intangibility &&
          !other.intangibility
        ) {
          polycollide(instance, other, false, false);
        }
      }

      if (instance.team === other.team) {
        if (
          (instance.repairEffect || instance.healEffect) &&
          instance.master !== other.master
        ) {
          advancedcollide(other, instance, true, true);
        } else if (
          (other.repairEffect || other.healEffect) &&
          instance.master !== other.master
        ) {
          advancedcollide(instance, other, true, true);
        } else {
          if (
            (other.type === "food" && instance.type === "food") ||
            (other.type === "crasher" && instance.type === "crasher") ||
            (other.type === "food" && instance.type === "crasher") ||
            (other.type === "crasher" && instance.type === "food")
          ) {
            polycollide(instance, other);
          }
          if (
            (other.type === "food" && instance.type === "food") ||
            (other.type === "crasher" && instance.type === "crasher") ||
            (other.type === "food" && instance.type === "crasher") ||
            (other.type === "crasher" && instance.type === "food")
          ) {
            polycollide(other, instance);
          }
        }
      }
      // Handle walls
      else if (instance.type === "wall" || other.type === "wall") {
        if (
          c.MODE === "theInfestation" &&
          ((instance.type === "wall" && other.isBoss) ||
            (other.type === "wall" && instance.isBoss))
        )
          return;
        let a =
          instance.type === "bullet" || other.type === "bullet"
            ? 1 +
              10 /
                (Math.max(instance.velocity.length, other.velocity.length) + 10)
            : 1;

        if (instance.type === "wall") {
          advancedcollide(instance, other, false, false, a);
          if (c.MODE !== "siege") {
            if (
              other.specialEffect === "dieWall" ||
              other.master.specialEffect === "dieWall"
            ) {
              instance.health.amount -=
                instance.health.max / 50 - instance.SIZE / 2;
            }
          }
        } else {
          advancedcollide(other, instance, false, false, a);
          if (c.MODE !== "siege") {
            if (
              instance.specialEffect === "dieWall" ||
              instance.master.specialEffect === "dieWall"
            ) {
              other.health.amount -=
                instance.health.max / 50 - instance.SIZE / 2;
            }
          }
        }
      }
      // Otherwise, collide normally if they're from different teams
      else if (instance.team !== other.team) {
        if (
          (instance.type === "fortGate" ||
            instance.type === "fortWall" ||
            (instance.type === "squareWall" && other.type !== "tank")) &&
          (other.type === "fortGate" ||
            other.type === "fortWall" ||
            (other.type === "squareWall" && instance.type !== "tank"))
        )
          return;
        advancedcollide(instance, other, true, true);
      }
      if (instance.team !== other.team) {
        if (instance.master.myShip && other.isGate) {
          other.destroy();
        }
        if (other.master.myShip && instance.isGate === "fortGate") {
          instance.destroy();
        }
        if (
          instance.specialEffect === "man" ||
          instance.master.specialEffect === "man"
        ) {
          if (other.isGate || other.isWall) {
            other.health.amount = 0.011;
            other.dont = false;
            if (serverType === "lore") other.kill();
          }
        }
        if (
          other.specialEffect === "man" ||
          other.master.specialEffect === "man"
        ) {
          if (instance.isGate || instance.isWall) {
            instance.health.amount = 0.011;
            instance.dont = false;
            if (serverType === "lore") instance.kill();
          }
        }
      }
      if (instance.type === "fortWall" || other.type === "fortWall") {
        if (instance.type !== "wall" && other.type !== "wall") {
          if (
            c.MODE === "theInfestation" &&
            ((instance.type === "fortWall" && other.isBoss) ||
              (other.type === "fortWall" && instance.isBoss))
          )
            return;
          if (instance.type === "fortWall") fortresscollide(instance, other);
          else fortresscollide(other, instance);
        }
      }
      if (
        !instance.isProjectile &&
        ((other.label === "Zombie Giant" && c.MODE === "theInfestation") ||
          (other.isRacer && c.MODE === "theDistance")) &&
        other.damageRecieved > 0
      )
        other.damageRecieved /= 10;
      if (
        !other.isProjectile &&
        ((instance.label === "Zombie Giant" && c.MODE === "theInfestation") ||
          (instance.isRacer && c.MODE === "theDistance")) &&
        instance.damageRecieved > 0
      )
        instance.damageRecieved /= 10;
      /* if (instance.team !== other.team) {
        if (instance.type === "atmosphere") {
          if (
            other.isEnemy ||
            other.isBoss ||
            other.type === "tank" ||
            other.type === "food"
          ) {
            advancedcollide(instance, other, true, true);
          }
        }
        if (other.type === "atmosphere") {
          if (
            instance.isEnemy ||
            instance.isBoss ||
            instance.type === "tank" ||
            instance.type === "food"
          ) {
            advancedcollide(other, instance, true, true);
          }
        }
      }*/
      // base
      else if (instance.type === "base" || other.type === "base") {
        if (instance.targetable && other.targetable) {
          if (instance.type === "base") {
            advancedcollide(instance, other, false, false, 1);
          } else {
            advancedcollide(other, instance, false, false, 1);
          }
        }
      }

      // Ignore them if either has asked to be
      else if (
        instance.settings.hitsOwnType == "never" ||
        other.settings.hitsOwnType == "never"
      ) {
        // Do jack
      }
      // Standard collision resolution
      else if (
        instance.settings.hitsOwnType === other.settings.hitsOwnType &&
        instance.team === other.team &&
        instance.master.id === other.master.id
      ) {
        switch (instance.settings.hitsOwnType) {
          case "push":
            advancedcollide(instance, other, false, false);
            break;
          case "hard":
            firmcollide(instance, other);
            break;
          case "tankcollide":
            reflectcollide(instance, other);
            break;
          case "collision":
            reflectcollide(instance, other, 30);
            break;
          case "hardWithBuffer":
            firmcollide(instance, other, 30);
            break;
          case "repel":
            simplecollide(instance, other);
            break;
          case "polyrepel":
            polycollide(instance, other);
            break;
          case "merge":
            advancedcollide(instance, other, true, true);
            break;
        }
      }
    };
  })();
  let activationIteration = () => {
    let check = soaEntity.activationCheck;
    let timer = soaEntity.activationTimer;
    if (c.ACTIVATION_MODE === undefined || c.ACTIVATION_MODE === "normal") {
      for (let i = 0; i < entities.length; i++) {
        if (!check[i]) {
          // Remove bullets and swarm
          // if (entities[i].settings.diesAtRange) entities[i].kill();
          if (!timer[i]--) check[i] = true;
        } else {
          timer[i] = 15;
          if (entities[i].valid()) {
            check[i] = views.some((v) => v.isInView(entities[i]));
          }
        }
      }
    } else if (c.ACTIVATION_MODE === "distance") {
      const range = 1.0;
      for (let i = 0; i < entities.length; i++) {
        check[i] = false;
      }
      if (views.length > 0) {
        let x = soaEntity.x;
        let y = soaEntity.y;
        for (let i = 0; i < entities.length; i++) {
          let minDistance = 4;
          views.forEach((view) => {
            let distance = Math.max(
              Math.abs(view.x - x[i]),
              Math.abs(view.y - y[i])
            );
            minDistance = Math.min(
              minDistance,
              distance / ((view.fov * range) / 2)
            );
          });
          timer[i] += Math.max(0, Math.min(2 - minDistance, 1));
          if (timer[i] >= 1) {
            timer[i] -= 1;
            check[i] = true;
          }
        }
      }
    } else if (c.ACTIVATION_MODE === "alwaysTrue") {
      for (let i = 0; i < entities.length; i++) {
        check[i] = true;
      }
    } else if (c.ACTIVATION_MODE === "alwaysFalse") {
      for (let i = 0; i < entities.length; i++) {
        check[i] = false;
      }
    } else {
      throw new Error("Activation mode settings error!");
    }

    activeEntities = [];
    for (let i = 0; i < entities.length; i++) {
      if (check[i]) {
        let e = entities[i];
        if (e.valid() && e.bond == null) {
          activeEntities.push(e);
        }
      }
    }
  };

  let collisionIteration = () => {
    let x1, y1, x2, y2;
    activeAabb = activeEntities.map((e) => {
      x1 = Math.min(e.x, e.x + e.velocity.x + e.accel.x) - e.realSize - 5;
      y1 = Math.min(e.y, e.y + e.velocity.y + e.accel.y) - e.realSize - 5;
      x2 = Math.max(e.x, e.x + e.velocity.x + e.accel.x) + e.realSize + 5;
      y2 = Math.max(e.y, e.y + e.velocity.y + e.accel.y) + e.realSize + 5;
      return [x1, y1, x2, y2];
    });
    let e1, e2;
    boxIntersect(activeAabb, (i, j) => {
      e1 = activeEntities[i];
      e2 = activeEntities[j];
      if (
        e1.valid() &&
        e1.bond == null &&
        e1.activation.check() &&
        e2.valid() &&
        e2.bond == null &&
        e2.activation.check()
      ) {
        collide([e1, e2]);
      }
    });
  };

  let physicsIteration = () => {
    let x = soaEntity.x;
    let y = soaEntity.y;
    let velocityX = soaEntity.velocityX;
    let velocityY = soaEntity.velocityY;
    let accelX = soaEntity.accelX;
    let accelY = soaEntity.accelY;
    let stepRemaining = soaEntity.stepRemaining;
    let check = soaEntity.activationCheck;

    for (let i = 0; i < entities.length; i++) {
      if (c.ACTIVATION_MODE === "distance" && !check[i]) continue;
      velocityX[i] += accelX[i];
      velocityY[i] += accelY[i];
      accelX[i] = 0;
      accelY[i] = 0;
      stepRemaining[i] = 1;
      x[i] += velocityX[i] / roomSpeed;
      y[i] += velocityY[i] / roomSpeed;
    }
  };

  let liveIteration = () => {
    entities.forEach((e) => {
      if (e.valid()) {
        // Consider death.
        if (e.contemplationOfMortality()) {
          e.destroy();
        } else if (e.activation.check()) {
          logs.entities.tally();
          // Think about my actions.
          logs.life.set();
          e.life();
          logs.life.mark();
          // Apply friction.
          e.friction();
          e.confinementToTheseEarthlyShackles();
        }
        // Update collisions.

        e.collisionArray = [];
        if (!c.cooldown) {
          setTimeout(() => {
            c.socketEnterList = [];
            c.socketExitList = [];
            c.cooldown = false;
          }, 10000);
          c.cooldown = true;
        }
      }
    });
  };

  // Return the loop function
  return () => {
    logs.loops.tally();
    logs.master.set();

    logs.activation.set();
    activationIteration();
    logs.activation.mark();

    // Do collisions
    logs.collide.set();
    collisionIteration();
    logs.collide.mark();

    logs.physics.set();
    physicsIteration();
    logs.physics.mark();

    // Do entities life
    logs.entities.set();
    liveIteration();
    logs.entities.mark();

    logs.master.mark();
    room.lastCycle = util.time();
  };
  //let expected = 1000 / c.gameSpeed / 30;
  //let alphaFactor = (delta > expected) ? expected / delta : 1;
  //roomSpeed = c.gameSpeed * alphaFactor;
  //setTimeout(moveloop, 1000 / roomSpeed / 30 - delta);
})();
// A less important loop. Runs at an actual 5Hz regardless of game speed.
var maintainloop = (() => {
  // Place obstacles
  function placeRoids() {
    function placeRoid(type, entityClass) {
      let x = 0;
      let position;
      do {
        position = room.randomType(type);
        if (!position) return 0;
        x++;
        if (x > 200) {
          util.warn("Could not place some roids.");
          return 0;
        }
      } while (dirtyCheck(position, 10 + entityClass.SIZE));
      let o = new Entity(position);
      o.define(entityClass);
      o.team = -101;
      o.facing = ran.randomAngle();
      o.protect();
      o.life();
    }
    // Start placing them
    let roidcount = 0;
    if (room.roid) {
      roidcount =
        (room.roid.length * room.width * room.height) /
        room.xgrid /
        room.ygrid /
        50000 /
        1.2;
    }
    let rockcount = 0;
    if (room.rock) {
      rockcount =
        (room.rock.length * room.width * room.height) /
        room.xgrid /
        room.ygrid /
        250000;
    }

    let count = 0;
    for (let i = Math.ceil(roidcount); i; i--) {
      count++;
      placeRoid("roid", Class.obstacle);
    }
    for (let i = Math.ceil(roidcount * 0.5); i; i--) {
      count++;
      placeRoid("roid", Class.babyObstacle);
    }
    for (let i = Math.ceil(rockcount * 1.25); i; i--) {
      count++;
      placeRoid("rock", Class.obstacle);
    }
    for (let i = Math.ceil(rockcount * 0.75); i; i--) {
      count++;
      placeRoid("rock", Class.obstacle);
    }
    util.log("Placing " + count + " obstacles!");
  }
  placeRoids();
  // Spawning functions
  let spawnSpecialBosses = (() => {
    let timer = 0;
    let time = 7500;
    let boss = (() => {
      let i = 0,
        names = [],
        bois = [Class.egg],
        n = 0,
        begin = "yo some shit is about to move to a lower position",
        arrival =
          "Something happened lol u should probably let Neph know this broke",
        loc = "norm";
      let spawn = () => {
        let spot,
          m = 0;
        do {
          spot = room.randomType(loc);
          if (!spot) return;
          m++;
        } while (dirtyCheck(spot, 500) && m < 30);
        let o = new Entity(spot);
        o.define(ran.choose(bois));
        o.team = -100;
        o.name = names[i++];
        o.refreshBodyAttributes();
      };
      return {
        prepareToSpawn: (
          classArray,
          number,
          nameClass,
          typeOfLocation = "norm"
        ) => {
          n = number;
          bois = classArray;
          loc = typeOfLocation;
          names = ran.chooseBossName(nameClass, number);
          i = 0;
          let warning = "A Boss is coming!";
          let warnings = "Bosses are coming!";
          let anounce1 = " has arrived.";
          let anounce2 = " have arrived.";
          switch (c.MODE) {
            case "theExample":
              warning = "guh?!";
              warnings = "duh?!";
              anounce1 = "guh duh?!";
              anounce2 = "duh guh?!";
              time = 100.00000000000000000001;
              break;
            default:
          }
          if (n === 1) {
            begin = warning;
            arrival = names[0] + anounce1;
          } else {
            begin = warnings;
            arrival = "";
            for (let i = 0; i < n - 2; i++) arrival += names[i] + ", ";
            arrival += names[n - 2] + " and " + names[n - 1] + anounce2;
          }
        },
        spawn: () => {
          sockets.broadcast(begin);
          for (let i = 0; i < n; i++) {
            setTimeout(spawn, ran.randomRange(3500, 5000));
          }
          // Wrap things up.
          setTimeout(() => sockets.broadcast(arrival), 5000);
          util.log("[SPAWN] " + arrival);
        },
      };
    })();

    return (census) => {
      if (timer > time && ran.dice(50 - timer)) {
        util.log("[SPAWN] Preparing to spawn...");
        timer = 0;
        let choice1 = [];
        switch (ran.chooseChance(10)) {
          case 0:
            choice1 = [[Class.elite_swarmer], 1, "elite", "nest"];
            sockets.broadcast("The Guardian has awakened...");
            break;
        }
        boss.prepareToSpawn(...choice1);
        setTimeout(boss.spawn, 30);
        // Set the timeout for the spawn functions
      } else if (census.neutralBoss < 1) timer++;
    };
  })();
  let spawnNeutral = (() => {
    let timer = 0;
    let boss = (() => {
      let i = 0,
        names = [],
        bois = [Class.egg],
        n = 0,
        begin = "yo some shit is about to move to a lower position",
        arrival =
          "Something happened lol u should probably let Neph know this broke",
        loc = "norm";
      let spawn = () => {
        let spot,
          m = 0;
        do {
          spot = room.randomType(loc);
          if (!spot) return;
          m++;
        } while (dirtyCheck(spot, 500) && m < 30);
        let o = new Entity(spot);
        o.define(ran.choose(bois));
        o.team = -100;
        o.name = names[i++];
        o.refreshBodyAttributes();
      };
      return {
        prepareToSpawn: (
          classArray,
          number,
          nameClass,
          typeOfLocation = "norm"
        ) => {
          n = number;
          bois = classArray;
          loc = typeOfLocation;
          names = ran.chooseBossName(nameClass, number);
          i = 0;
          if (n === 1) {
            begin = "A visitor is coming.";
            arrival = names[0] + " has arrived.";
          } else {
            begin = "Visitors are coming.";
            arrival = "";
            for (let i = 0; i < n - 2; i++) arrival += names[i] + ", ";
            arrival += names[n - 2] + " and " + names[n - 1] + " have arrived.";
          }
        },
        spawn: () => {
          sockets.broadcast(begin);
          for (let i = 0; i < n; i++) {
            setTimeout(spawn, ran.randomRange(3500, 5000));
          }
          // Wrap things up.
          setTimeout(() => sockets.broadcast(arrival), 5000);
          util.log("[SPAWN] " + arrival);
        },
      };
    })();
    return (census) => {
      if (timer > 750 && ran.dice(240 - timer)) {
        util.log("[SPAWN] Preparing to spawn...");
        timer = 0;
        let choice1 = [];
        switch (
          ran.chooseChance(
            10,
            10,
            10,
            20,
            20,
            20,
            20,
            20,
            10,
            20,
            20,
            20,
            2,
            2,
            10
          )
        ) {
          case 0:
            choice1 = [[Class.elite_swarmer], 1, "elite", "nest"];
            sockets.broadcast("The Guardian has awakened...");
            break;
          case 1:
            choice1 = [[Class.defender], 1, "castle", "nest"];
            sockets.broadcast("The Defender has awakened...");
            break;
          case 2:
            choice1 = [[Class.nestkeep], 1, "castle", "nest"];
            sockets.broadcast("A strange trembling...");
            break;
          case 3:
            choice1 = [[Class.elite_battleship], 1, "elite", "nest"];
            break;
          case 4:
            choice1 = [[Class.elite_destroyer], 1, "elite", "nest"];
            break;
          case 5:
            choice1 = [[Class.elite_machine], 1, "elite", "norm"];
            break;
          case 6:
            choice1 = [[Class.summoner], 1, "Mystic", "norm"];
            sockets.broadcast("A strange trembling...");
            break;
          case 7:
            choice1 = [[Class.enchantress], 1, "Mystic", "norm"];
            sockets.broadcast("A strange trembling...");
            break;
          case 8:
            choice1 = [[Class.exorcistor], 1, "Mystic", "norm"];
            sockets.broadcast("A strange trembling...");
            break;
          case 9:
            choice1 = [[Class.elite_spawner], 1, "elite", "norm"];
            break;

          case 10:
            choice1 = [[Class.sorcerer], 1, "Mystic", "norm"];
            sockets.broadcast("A strange trembling...");
            break;
          case 11:
            choice1 = [[Class.elite_skimmer], 1, "castle", "nest"];
            sockets.broadcast("A strange trembling...");
            break;
          case 12:
            choice1 = [
              [Class[ran.choose(["sorcerer", "summoner", "enchantress"])]],
              Math.ceil(Math.random() * 5 + 1),
              "Mystic",
              "norm",
            ];
            sockets.broadcast(
              "The server starts to quake...the polygons are angry!"
            );
            break;
          case 13:
            choice1 = [
              [
                Class[
                  ran.choose([
                    "elite_machine",
                    "elite_battleship",
                    "elite_spawner",
                    "elite_gunner",
                    "elite_destroyer",
                  ])
                ],
              ],
              Math.ceil(Math.random() * 3 + 1),
              "elite",
              "norm",
            ];
            sockets.broadcast(
              "The server starts to quake...the crashers are angry!"
            );
            break;
          case 14:
            choice1 = [[Class.Pawn], 1, "castle", "nest"];
            sockets.broadcast("A strange trembling...");
            break;
        }
        boss.prepareToSpawn(...choice1);
        setTimeout(boss.spawn, 30);
        // Set the timeout for the spawn functions
      } else if (census.neutralBoss < 2) timer++;
    };
  })();
  let spawnGuardian = (() => {
    let timer = 0;
    let ally = (() => {
      let i = 0,
        names = [],
        bois = [Class.egg],
        n = 0,
        begin = "yo some shit is about to move to a lower position",
        arrival =
          "Something happened lol u should probably let Neph know this broke",
        loc = "norm";
      let spawn = () => {
        let spot,
          m = 0;
        do {
          spot = room.randomType(loc);
          if (!spot) return;
          m++;
        } while (dirtyCheck(spot, 500) && m < 30);
        let o = new Entity(spot);
        o.define(ran.choose(bois));
        if (c.MODE === "siege") {
          o.impervious = true;
        }
        o.team = -1;
        o.name = names[i++];
      };
      return {
        prepareToSpawn: (
          classArray,
          number,
          nameClass,
          typeOfLocation = "norm"
        ) => {
          n = number;
          bois = classArray;
          loc = typeOfLocation;
          names = ran.chooseBossName(nameClass, number);
          i = 0;
          if (n === 1) {
            begin = "A Rebel Boss is coming.";
            arrival = names[0] + " has arrived and joined your team!";
          } else {
            begin = "Rebel Bosses are coming.";
            arrival = "";
            for (let i = 0; i < n - 2; i++) arrival += names[i] + ", ";
            arrival +=
              names[n - 2] +
              " and " +
              names[n - 1] +
              " have arrived and joined your team!";
          }
        },
        spawn: () => {
          sockets.broadcast(begin);
          for (let i = 0; i < n; i++) {
            setTimeout(spawn, ran.randomRange(3500, 5000));
          }
          // Wrap things up.
          setTimeout(() => sockets.broadcast(arrival), 5000);
          util.log("[SPAWN] " + arrival);
        },
      };
    })();
    return (census) => {
      if (timer > 1500 && ran.dice(240 - timer)) {
        util.log("[SPAWN] Preparing to spawn...");
        timer = 0;
        let choice2 = [];
        switch (ran.chooseChance(50, 50, 25, 8, 10, 2, 2)) {
          case 0:
            choice2 = [
              [Class.roguepalisade],
              Math.ceil(Math.random() * 2),
              "castle",
              "norm",
            ];
            sockets.broadcast("A Strange Trembling...");
            break;
          case 1:
            choice2 = [
              [Class.roguarmada],
              Math.ceil(Math.random() * 2),
              "castle",
              "norm",
            ];
            sockets.broadcast("A Strange Trembling...");
            break;
          case 2:
            choice2 = [
              [Class.roguepalisade],
              Math.ceil(Math.random() * 2),
              "castle",
              "norm",
            ];
            sockets.broadcast("A Strange Trembling...");
            break;
          case 3:
            choice2 = [
              [Class.RogueLibor],
              Math.ceil(Math.random() * 2),
              "castle",
              "norm",
            ];
            sockets.broadcast("A mysterious quake...");
            break;
          case 4:
            choice2 = [[Class.roguemothership], 1, "castle", "norm"];
            sockets.broadcast(
              "Many Drones seem to be gathering...could it be...?"
            );
            break;
          case 5:
            choice2 = [[Class.castaway], 3, "castle", "norm"];
            sockets.broadcast(
              "The ground cracks open as rebel bosses arrive from an underground tunnel..."
            );
            break;
          case 6:
            choice2 = [[Class.twilight], 1, "Guardian", "norm"];
            sockets.broadcast(
              "???: Seems like you guys need help, lets kick some barrels!"
            );
            break;
        }

        ally.prepareToSpawn(...choice2);
        setTimeout(ally.spawn, 70);
        // Set the timeout for the spawn functions
      } else if (census.guardianBoss < c.BOSS_LIMIT.GUARDIANS) timer++;
    };
  })();
  let spawnFallen = (() => {
    let timer = 0;
    let undead = (() => {
      let i = 0,
        names = [],
        bois = [Class.egg],
        n = 0,
        begin = "yo some shit is about to move to a lower position",
        arrival =
          "Something happened lol u should probably let Neph know this broke",
        loc = "norm";
      let spawn = () => {
        let spot,
          m = 0;
        do {
          spot = room.randomType(loc);
          if (!spot) return;
          m++;
        } while (dirtyCheck(spot, 500) && m < 30);
        let o = new Entity(spot);
        o.define(ran.choose(bois));
        o.team = -2;
        o.name = names[i++];
        o.refreshBodyAttributes();
      };
      return {
        prepareToSpawn: (
          classArray,
          number,
          nameClass,
          typeOfLocation = "bos2"
        ) => {
          n = number;
          bois = classArray;
          loc = typeOfLocation;
          names = ran.chooseBossName(nameClass, number);
          i = 0;
          if (n === 1) {
            begin = "The dead are rising.";
            arrival = names[0] + " has arrived!";
          } else {
            begin = "The Risen Dead are coming.";
            arrival = "";
            for (let i = 0; i < n - 2; i++) arrival += names[i] + ", ";
            arrival += names[n - 2] + " and " + names[n - 1] + " have arrived!";
          }
        },
        spawn: () => {
          sockets.broadcast(begin);
          for (let i = 0; i < n; i++) {
            setTimeout(spawn, ran.randomRange(3500, 5000));
          }
          // Wrap things up.
          setTimeout(() => sockets.broadcast(arrival), 5000);
          util.log("[SPAWN] " + arrival);
        },
      };
    })();
    return (census) => {
      if (timer > 400 && ran.dice(400 - timer)) {
        util.log("[SPAWN] Preparing to spawn...");
        timer = 0;
        let choice3 = [];
        switch (ran.chooseChance(10, 10, 20, 20, 20, 20, 20, 20)) {
          case 0:
            choice3 = [[Class.fallenbooster], 1, "undead", "norm"];
            break;

          case 1:
            choice3 = [[Class.fallenoverlord], 1, "undead", "norm"];

            break;
          case 2:
            choice3 = [[Class.fallenanni], 1, "undead", "norm"];

            break;
          case 3:
            choice3 = [[Class.fallenflankguard], 1, "undead", "norm"];

            break;
          case 4:
            choice3 = [[Class.fallenhybrid], 1, "undead", "norm"];

            break;
          case 5:
            choice3 = [[Class.fallenfalcon], 1, "undead", "norm"];

            break;
          case 6:
            choice3 = [[Class.enslaver], 1, "undead", "norm"];
            sockets.broadcast("The Vengeful Dead Arise...");
            break;
          case 7:
            choice3 = [[Class.plaguedoc], 1, "undead", "norm"];
            sockets.broadcast("The Vengeful Dead Arise...");
            break;

          case 8:
            choice3 = [[Class.fallenautodouble], 1, "undead", "norm"];
            break;
        }

        undead.prepareToSpawn(...choice3);
        setTimeout(undead.spawn, 70);
        // Set the timeout for the spawn functions
      } else if (census.fallenBoss < 1) timer++;
    };
  })();
  let spawnCrasher = (census) => {
    if (
      ran.chance(
        1 - (15 * census.crasher * c.ENEMY_INTENSITY.CRASHERS) / room.maxFood
      )
    ) {
      let spot,
        i = 30;
      do {
        spot = room.randomType("nest");
        i--;
        if (!i || !spot) return 0;
      } while (dirtyCheck(spot, 100));
      let o = new Entity(spot);
      o.rarity = Math.random() * 1000000;
      if (c.SHINY_GLORY) {
        o.rarity = Math.random() * 100;
      }
      if (o.rarity > 50000) {
        o.define(Class[ran.choose(["eggCrasher"])]);
      }
      if (o.rarity <= 50000 && o.rarity > 20000) {
        o.define(
          Class[
            ran.choose([
              "squareCrasher",
              "eggSorcererSentry",
              "eggAutoSentry",
              "eggBasicSentry",
            ])
          ]
        );
      }
      if (o.rarity <= 20000 && o.rarity > 10000) {
        o.define(
          Class[
            ran.choose([
              "triangleCrasher",
              "squareTwinSentry",
              "squareAuto2Sentry",
              "squareSniperSentry",
            ])
          ]
        );
      }
      if (o.rarity <= 10000 && o.rarity > 2000) {
        o.define(
          Class[
            ran.choose([
              "triangleSwarmSentry",
              "trianglePounderSentry",
              "triangleTrapperSentry",
              "pentagonCrasher",
            ])
          ]
        );
      }
      if (o.rarity <= 2000 && o.rarity > 250) {
        o.define(
          Class[
            ran.choose([
              "shinyEggCrasher",
              "hexagonCrasher",
              "pentagonSwarmerSentry",
              "pentagonHunterSentry",
              "pentagonTriAngleSentry",
              "skimmerSentinel",
              "crossbowSentinel",
              "minigunSentinel",
            ])
          ]
        );
      }
      if (o.rarity <= 250 && o.rarity > 125) {
        o.define(
          Class[ran.choose(["shinySquareCrasher", "legendaryEggCrasher"])]
        );
      }
      if (o.rarity <= 125 && o.rarity > 65) {
        o.define(
          Class[
            ran.choose([
              "shadowEggCrasher",
              "legendarySquareCrasher",
              "shinyTriangleCrasher",
            ])
          ]
        );
      }
      if (o.rarity <= 65 && o.rarity > 35) {
        o.define(
          Class[
            ran.choose([
              "rainbowEggCrasher",
              "shadowSquareCrasher",
              "legendaryTriangleCrasher",
              "shinyPentagonCrasher",
              "shinyTriangleSwarmSentry",
              "shinyTriangleArtillerySentry",
              "shinyTriangleBarricadeSentry",
            ])
          ]
        );
      }
      if (o.rarity <= 35 && o.rarity > 18) {
        o.define(
          Class[
            ran.choose([
              "abyssalSphereCrasher",
              "rainbowSquareCrasher",
              "shadowTriangleCrasher",
              "legendaryPentagonCrasher",
              "shinyHexagonCrasher",
            ])
          ]
        );
      }
      if (o.rarity <= 18 && o.rarity > 9) {
        o.define(
          Class[
            ran.choose([
              "abyssalCubeCrasher",
              "rainbowTriangleCrasher",
              "shadowPentagonCrasher",
              "legendaryHexagonCrasher",
            ])
          ]
        );
      }
      if (o.rarity <= 9 && o.rarity > 5) {
        o.define(
          Class[
            ran.choose([
              "abyssalTetraCrasher",
              "rainbowPentagonCrasher",
              "shadowHexagonCrasher",
            ])
          ]
        );
      }
      if (o.rarity <= 5 && o.rarity > 1) {
        o.define(
          Class[ran.choose(["abyssalDodecaCrasher", "rainbowHexagonCrasher"])]
        );
      }
      if (o.rarity <= 1) {
        o.define(Class[ran.choose(["abyssalHexaCrasher"])]);
        sockets.broadcast(
          "Vile Darkness Cloaks the arena, something terrifying has been summoned in the nest!"
        );
      }
      o.team = -100;
      o.facing = ran.randomAngle();
    }
  };

  let spawnSentinel = (census) => {
    if (
      ran.chance(
        1 - (25 * census.crasher * c.ENEMY_INTENSITY.SENTINELS) / room.maxFood
      )
    ) {
      let spot,
        i = 30;
      do {
        spot = room.randomType("norm");
        i--;
        if (!i || !spot) return 0;
      } while (dirtyCheck(spot, 100));

      let o = new Entity(spot);
      o.rarity = Math.random() * 350;
      if (o.rarity > 96) {
        o.define(
          Class[ran.choose(["auto3Guard", "bansheeGuard", "spawnerGuard"])]
        );
      }
      if (o.rarity <= 96 && o.rarity > 24) {
        o.define(
          Class[
            ran.choose([
              "swarmerProtector",
              "cruiserProtector",
              "beekeeperProtector",
            ])
          ]
        );
      }
      if (o.rarity <= 24) {
        o.define(
          Class[ran.choose(["commanderKeeper", "directorKeeper", "overKeeper"])]
        );
      }
      o.accel.x + Math.random * 0.1 - 0.2;
      o.accel.y + Math.random * 0.1 - 0.2;
      o.facing = ran.randomAngle();
      o.team = -100;
    }
  };

  let spawnSpecialEnemies = (census) => {
    let amount = 30;
    let thing = "crasher";
    switch (c.MODE) {
      case "theExample":
        amount = 2; //Lower number = more will spawn, idk why, but thats how it works.
        thing = "craher";
        break;
      case "theAwakening":
        amount = 100;
        thing = "Aspect";
        break;
    }
    if (ran.chance(1 - (amount * census[thing]) / room.maxFood)) {
      let spot,
        i = 30;
      do {
        spot = room.random();
        switch (c.MODE) {
          case "theExample":
            spot = "whar";
            break;
          case "theAwakening":
            spot = "gard";
            break;
        }
        i--;
        if (!i || !spot) return 0;
      } while (dirtyCheck(spot, 100));

      let o = new Entity(spot);
      switch (c.MODE) {
        case "theExample":
          o.rarity = Math.random() * 100;
          if (o.rarity > 96) {
            o.define(Class[ran.choose(["shitBrick"])]);
          }
          if (o.rarity <= 96 && o.rarity > 24) {
            o.define(Class[ran.choose(["gaynar", "profishy"])]);
          }
          if (o.rarity <= 24) {
            o.define(Class[ran.choose(["doYouUnderStand?"])]);
            sockets.broadcast("Maybe anounce it if its a rare spawn?");
          }
          o.accel.x + Math.random * 0.1 - 0.2;
          o.accel.y + Math.random * 0.1 - 0.2;
          o.facing = ran.randomAngle();
          o.team = -100;
          break;
        case "theAwakening":
          o.define(
            Class[ran.choose(["Unawakened1", "Unawakened2", "Unawakened3"])]
          );

          o.accel.x + Math.random * 0.1 - 0.2;
          o.accel.y + Math.random * 0.1 - 0.2;
          o.facing = ran.randomAngle();
          o.team = -5;
          break;
      }
    }
  };
  let spawnpentaSentinels = (census) => {
    if (ran.chance(1 - census.crasher / room.maxFood)) {
      let spot,
        i = 30;
      do {
        spot = room.randomType("nest");
        //}
        i--;
        if (!i || !spot) return 0;
      } while (dirtyCheck(spot, 100));

      let o = new Entity(spot);
      o.define(
        Class[
          ran.choose([
            "minigunSentinel",
            "crossbowSentinel",
            "skimmerSentinel",
            "autoSwarmSentinel",
            "trapperSwarmSentinel",
            "gunnerSwarmSentinel",
            "skimmerSwarmSentinel",
          ])
        ]
      );
      o.accel.x + Math.random * 0.1 - 0.2;
      o.accel.y + Math.random * 0.1 - 0.2;
      o.facing = ran.randomAngle();
      o.team = -100;
    }
  };
  let spawnThrasher = (census) => {
    if (
      ran.chance(
        0.5 -
          (3.5 * census.thrasher * c.ENEMY_INTENSITY.THRASHERS) /
            room.maxFood /
            room.nestFoodAmount /
            (c.playerCount * 2.5 + 2.5)
      )
    ) {
      let spot,
        i = 30;
      do {
        spot = room.randomType("norm");
        if (c.MODE === "sandbox") {
          spot = room.randomType("bos1");
        }
        i--;
        if (!i || !spot) return 0;
      } while (dirtyCheck(spot, 100));

      let o = new Entity(spot);
      o.rarity = Math.random() * 10000;
      if (o.rarity > 3000) {
        o.define(Class[ran.choose(["thrasher"])]);
      }
      if (o.rarity <= 3000 && o.rarity > 1000) {
        o.define(Class[ran.choose(["glitch"])]);
      }
      if (o.rarity <= 1000 && o.rarity > 100) {
        o.define(
          Class[
            ran.choose([
              "aoc",
              "gunnerMechab",
              "beeMechab",
              "machinegunMechab",
              "buildMechab",
              "trapMechab",
              "trapMechabarab",
              "swarmMechab",
              "aokaol",
            ])
          ]
        );
      }
      if (o.rarity <= 100 && o.rarity > 1) {
        o.define(Class[ran.choose(["anomaly"])]);
      }
      if (o.rarity <= 1 && o.rarity > 0.01) {
        o.define(Class[ran.choose([/*/"abdul",/*/ "AlfabuildMechab"])]);
      }
      if (o.rarity <= 0.01) {
        o.define(
          Class[
            ran.choose([
              "abyssalTetraCrasher",
              "abyssthrasher",
              sockets.broadcast(
                "Vile Darkness Cloaks the arena, something terrifying has been summoned!"
              ),
            ])
          ]
        );
      }
      o.team = -4;
    }
  };
  let spawnLasher = (census) => {
    if (
      ran.chance(
        0.5 -
          (0.5 * census.thrasher) /
            room.maxFood /
            room.nestFoodAmount /
            (c.playerCount * 1.5 + 2.5)
      )
    ) {
      let spot,
        i = 30;
      do {
        spot = room.randomType("port");
        i--;
        if (!i || !spot) return 0;
      } while (dirtyCheck(spot, 100));

      let o = new Entity(spot);
      o.rarity = Math.random() * 10000;
      if (o.rarity > 3000) {
        o.define(Class[ran.choose(["Lasher"])]);
      }
      if (o.rarity <= 3000 && o.rarity > 1000) {
        o.define(Class[ran.choose(["Crusher"])]);
      }
      if (o.rarity <= 1000 && o.rarity > 100) {
        o.define(Class[ran.choose(["Leaper", "Lunger", "peliser"])]);
      }
      if (o.rarity <= 100 && o.rarity > 1) {
        o.define(Class[ran.choose(["Lunger"])]);
      }
      if (o.rarity <= 1 && o.rarity > 0.01) {
        o.define(Class[ran.choose([/*/"abdul",/*/ "acoa"])]);
      }
      if (o.rarity <= 0.01) {
        o.define(
          Class[
            ran.choose([
              "abyssCrasher",
              "abyssthrasher",
              sockets.broadcast(
                "Vile Darkness Cloaks the arena, something terrifying has been summoned!"
              ),
            ])
          ]
        );
      }
      o.team = -4;
    }
  };
  let spawnSpark = (census) => {
    if (
      ran.chance(
        0.5 -
          (3.5 * census.thrasher) /
            room.maxFood /
            room.nestFoodAmount /
            (c.playerCount * 1.5 + 2.5)
      )
    ) {
      let spot,
        i = 30;
      do {
        spot = room.randomType("roid");
        i--;
        if (!i || !spot) return 0;
      } while (dirtyCheck(spot, 100));

      let o = new Entity(spot);
      o.rarity = Math.random() * 10000;
      if (o.rarity > 3000) {
        o.define(Class[ran.choose(["spark"])]);
      }
      if (o.rarity <= 3000 && o.rarity > 1000) {
        o.define(Class[ran.choose(["flame"])]);
      }
      if (o.rarity <= 1000 && o.rarity > 100) {
        o.define(Class[ran.choose(["torch", "torch", "torch"])]);
      }
      if (o.rarity <= 100 && o.rarity > 1) {
        o.define(Class[ran.choose(["cursedflame"])]);
      }
      if (o.rarity <= 1 && o.rarity > 0.01) {
        o.define(Class[ran.choose(["campfire2", "campfire"])]);
      }
      if (o.rarity <= 0.01) {
        o.define(
          Class[
            ran.choose([
              "abyssCrasher",
              "abyssthrasher",
              sockets.broadcast(
                "Vile Darkness Cloaks the arena, something terrifying has been summoned!"
              ),
            ])
          ]
        );
      }
      o.team = -1;
    }
  };
  let spawnVoidlord = (census) => {
    if (
      ran.chance(
        0.5 -
          (3.5 * census.thrasher) /
            room.maxFood /
            room.nestFoodAmount /
            (c.playerCount * 7.5 + 4.5)
      )
    ) {
      let spot,
        i = 30;
      do {
        spot = room.randomType("port");
        if (c.MODE === "theDistance") {
          spot = room.randomType("norm");
        }
        i--;
        if (!i || !spot) return 0;
      } while (dirtyCheck(spot, 100));

      let o = new Entity(spot);
      o.rarity = Math.random() * 10000;
      if (o.rarity > 1000) {
        o.define(
          Class[
            ran.choose([
              "thrasher",
              "aoc",
              "gunnerMechab",
              "beeMechab",
              "machinegunMechab",
              "buildMechab",
              "trapMechab",
              "trapMechabarab",
              "swarmMechab",
              "aokaol",
              "glitch",
            ])
          ]
        );
      }
      if (o.rarity <= 1000 && o.rarity > 500) {
        o.define(
          Class[
            ran.choose([
              "abdul",
              "abundul",
              "lessereldurk",
              "hiveMind",
              "nulltype",
              "alfabuildmechab",
            ])
          ]
        );
      }
      if (o.rarity <= 500 && o.rarity > 100) {
        o.define(
          Class[
            ran.choose([
              "lessereldurk",
              "Mechabooster",
              "MechaRifle",
              "eldun",
              "eldurk",
            ])
          ]
        );
      }
      if (o.rarity <= 100 && o.rarity > 1) {
        o.define(Class[ran.choose(["bossnulltype"])]);
      }
      if (o.rarity <= 1 && o.rarity > 0.01) {
        o.define(
          Class[ran.choose([/*/"abdul",/*/ "amalgam", "elderHiveMind"])]
        );
      }
      if (o.rarity <= 0.01) {
        o.define(
          Class[
            ran.choose([
              "abyssalTetraCrasher",
              "abyssthrasher",
              "elite_Shadowgunner",
              "sardonyx",
              sockets.broadcast(
                "Vile Darkness Cloaks the arena, something terrifying has been summoned!"
              ),
            ])
          ]
        );
      }
      o.team = -4;
    }
  };
  let spawnUndead = (census) => {
    if (
      ran.chance(
        0.5 - (3.5 * census.zombie) / room.maxFood / room.nestFoodAmount / 2.5
      )
    ) {
      let spot,
        i = 30;
      do {
        spot = room.randomType("norm");
        if (c.MODE === "biome") {
          spot = room.randomType("bos2");
        }
        i--;
        if (!i || !spot) return 0;
      } while (dirtyCheck(spot, 100));

      let o = new Entity(spot);
      o.define(
        Class[
          ran.choose([
            "zombieBarricade",
            "zombieTrapper",
            "zombieEngineer",
            "zombieConstructor",
            "zombieBuilder",
            "zombiePounder",
            "zombieBoomer",
            "zombieHexaTrapper",
            "zombieSkimmer",
            "zombieAnnihilator",
            "zombieStreamliner",
            "zombieBigCheese",
            "zombieRifle",
            "zombieCruiser",
            "zombieOverlord",
            "zombieSwarmer",
            "zombieRocketeer",
            "zombieAnimator",
          ])
        ]
      );
      o.infector = true;
      o.team = -2;
      o.skill.set([4, 6, 4, 4, 4, 4, 4, 4, 4, 4]);
    }
  };
  c.KNOCKBACK_CONSTANT += 0.75;
  if (c.MAZE_GENERATION === true) {
    createMaze();
  }

  if (c.MODE !== "siege") {
    setInterval(() => {
      c.timeLeft += 1000;
    }, 1000);
    setTimeout(() => {
      closeArena();
    }, 7200000);
  }
  // The NPC function
  let makenpcs = (() => {
    room.dominators = [];
    makeTiling();
    if (c.MODE === "theDistance") racingTiles();
    if (c.MODE === "theAwakening") makeCasings();
    if (c.MODE === "theInfestation") makeAnubis();
    makeMazeWalls();
    makepentagonWorkbench();
    makeBaseProtectors();
    if (c.MODE === "theDenied" || c.MODE === "theInfestation") makeShrine();
    //makeRepairMen();
    makeEventBosses();
    makeBall();
    if (c.SPAWN_REAPER) makeReaper();
    makeAntiTanks();
    makeNiceAntiTanks();
    makeDominators();
    makePortals();
    makepentarifts();
    makecubedrifts();
    makeDummies();
    makeTeamedWalls();
    makeFortGates();
    makepentFortWalls();
    makeFortWalls();
    makeTrapFortWalls();
    makeCrusherFortWalls();
    makeAutoFortWalls();
    makepentagonAutoFortWalls();
    makepentagontrapperFortWalls();
    // Return the spawning function
    let bots = [];
    return () => {
      let census = {
        crasher: 0,
        thrasher: 0,
        Aspect: 0,
        zombie: 0,
        neutralBoss: 0,
        voidlordBoss: 0,
        highlordBoss: 0,
        guardianBoss: 0,
        fallenBoss: 0,
        tank: 0,
      };
      let npcs = entities
        .map(function npcCensus(instance) {
          if (instance.valid()) {
            if (census[instance.type] != null) {
              census[instance.type]++;
              return instance;
            }
            if (census[instance.specialEffect] != null) {
              census[instance.specialEffect]++;
              return instance;
            }
          }
        })
        .filter((e) => {
          return e;
        });
      let ruh;
      if (c.REDUCE_BOTS_PER_PLAYER) ruh = c.playerCount;
      else ruh = 0;
      // Bots
      if (bots.length < c.BOTS - ruh && c.botSpawn === true) {
        c.botCount = bots.length;
        let position;
        let team;
        switch (c.BOT_TEAMS) {
          case "none":
          case "color":
            break;
          default:
            team = -ran.choose(c.BOT_TEAMS);
        }
        switch (c.BOT_SPAWN_LOCATION) {
          case "random":
            position = room.random();
            break;
          default:
            if (c.CONSIDER_BOT_TEAM_LOCATION) {
              position = room.randomType(c.BOT_SPAWN_LOCATION + -team);
            } else {
              position = room.randomType(c.BOT_SPAWN_LOCATION);
            }
        }
        if (!room.isIn("wall", position)) {
          let o = new Entity(position);

          let rand = Math.random() * 100;
          let tierOne = Math.random() * 50;
          o.isBot = true;
          o.addController(new io_fleeAtLowHealth(o));
          o.define(Class["bot" + Math.round(Math.random() * 7)]);
          o.name += ran.chooseBotName();
          if (c.MODE === "plague" || c.necro) {
            o.infector = true;
          }
          o.skill.score =
            Math.round(Math.random() * 1250000) -
            Math.round(Math.random() * 1250000) +
            26263;
          if (o.skill.score < 26263 || c.MODE === "theDistance") {
            o.skill.score = 26263;
          }
          o.define(Class[c.startingClass]);
          if (c.MODE === "theDistance" && c.startingClass === "racer") {
            o.isRacer = true;
          }
          if (c.MODE === "theDenied") o.impervious = true;
          o.invuln = true;
          o.leftoverUpgrades = ran.chooseChance(1, 5, 20, 37, 37);
          if (o.facingType !== "autospin") {
            o.facingType = ran.choose([
              "smoothToTarget",
              "looseWithMotion",
              "toTarget",
              "withTarget",
              "looseToTarget",
              "looseWithTarget",
            ]);
          }
          o.aiTarget = ran.choose([
            "mostDeadly",
            "allies",
            "leastDeadly",
            "general",
          ]);
          setTimeout(() => {
            o.wan = Math.random() * 2;
            if (o.wan <= 1) {
              if (c.MODE !== "theDistance") {
                o.addController(new io_wanderAroundMap(o));
              }
            }
            o.invuln = false;
            if (
              o.skill.score >= 1000000 &&
              o.team === -4 &&
              c.MODE !== "theControlled"
            ) {
              o.skill.points += 10;
              o.name = "[LORD]_";
              o.aiTarget = "general";
              o.name += ran.chooseBossBotName();
              o.rando = Math.ceil(Math.random() * 2);
              switch (o.rando) {
                case 1:
                default:
                  setTimeout(() => {
                    sockets.broadcast(
                      "Clouds of sinister black mist gather around " +
                        o.name +
                        ". be afraid, VERY AFRAID!"
                    );
                  }, 10);
                  o.define(Class.reaper);
                  break;
              }
              o.maxChildren = 0;
              o.intangibility = false;
              o.invisible = [100, 0];
              o.alpha = 100;
              o.ignoreCollision = false;
            }
            if (
              o.skill.score >= 1000000 &&
              o.team === -3 &&
              c.MODE !== "theExpanse" &&
              c.MODE !== "theControlled"
            ) {
              o.skill.points += 10;
              o.name = "[LORD]_";
              o.aiTarget = "general";
              o.name += ran.chooseBossBotName();
              o.rando = Math.ceil(Math.random() * 2);
              switch (o.rando) {
                case 1:
                  setTimeout(() => {
                    sockets.broadcast(
                      o.name +
                        ": BE BLINDED BY THE POWER OF SCIENCE YOU EVIL FIENDS!"
                    );
                  }, 10);
                  o.define(Class.operator);
                  break;
                case 2:
                  setTimeout(() => {
                    sockets.broadcast(
                      o.name + ": THE POWER OF SCIENCE SHALL DESTROY YOU, SCUM!"
                    );
                  }, 10);
                  o.define(Class.MassProducer);
                  break;
              }
              o.maxChildren = 0;
              o.intangibility = false;
              o.invisible = [100, 0];
              o.alpha = 100;
              o.ignoreCollision = false;
            }
            if (
              o.skill.score >= 1000000 &&
              o.team === -2 &&
              c.MODE !== "theInfestation"
            ) {
              o.skill.points += 10;
              o.name = "[LORD]_";
              o.aiTarget = "general";
              o.name += ran.chooseBossBotName();
              o.rando = Math.ceil(Math.random() * 2);
              switch (o.rando) {
                case 1:
                  setTimeout(() => {
                    sockets.broadcast(
                      o.name +
                        ": Minions and servants, tanks and barrels, drones and souls, obey my call!"
                    );
                  }, 10);
                  o.define(Class.necrotyrant);
                  break;
                case 2:
                  setTimeout(() => {
                    sockets.broadcast(
                      "Hoards of the undead gather around " +
                        o.name +
                        "... What the hell?"
                    );
                  }, 10);
                  o.define(Class.flesh);
                  break;
              }
              o.intangibility = false;
              o.invisible = [100, 0];
              o.alpha = 100;
              o.ignoreCollision = false;
            }
            if (
              o.skill.score >= 1000000 &&
              o.team === -1 &&
              c.MODE !== "theDenied" &&
              c.MODE !== "siege"
            ) {
              o.skill.points += 10;
              o.name = "[LORD]_";
              o.aiTarget = "general";
              o.name += ran.chooseBossBotName();
              setTimeout(() => {
                sockets.broadcast(
                  o.name +
                    ": Okay, I have taken your crap long enough, time for a barrel-whooping!"
                );
              }, 10);
              o.define(Class.rebel);
              o.maxChildren = 0;
              o.intangibility = false;
              o.invisible = [100, 0];
              o.alpha = 100;
              o.ignoreCollision = false;
            }
            if (
              (o.skill.score >= 1000000 &&
                o.team === -100 &&
                c.MODE !== "theAwakening" &&
                c.MODE !== "siege") ||
              (o.skill.score >= 1000000 &&
                c.MODE === "siege" &&
                o.maxChildren > 0)
            ) {
              o.skill.points += 10;
              o.name = "[LORD]_";
              o.aiTarget = "general";
              o.name += ran.chooseBossBotName();
              setTimeout(() => {
                sockets.broadcast(
                  "Valrayvn: " +
                    o.name +
                    "! I shall grant you true power! ASCEND!"
                );
              }, 10);
              o.define(Class.arenaguardpl);
              o.maxChildren = 0;
              o.intangibility = false;
              o.invisible = [100, 0];
              o.alpha = 100;
            }
            if (
              o.skill.score >= 2500000 &&
              c.MODE === "siege" &&
              o.label !== "Spectator"
            ) {
              o.skill.points += 10;
              o.maxChildren = 0;
              o.intangibility = false;
              o.invisible = [100, 0];
              o.ignoreCollision = false;
              o.alpha = 100;
              o.name = "[LORD]_";
              o.aiTarget = "general";
              o.name += ran.chooseBossBotName();
              o.define(Class.legendaryClassList);
            }
            if (
              // c.MODE === "theInfestation" ||
              c.MODE === "siege"
            ) {
              o.addController(new io_guard1(o));
            }
            if (c.MODE === "theDistance") {
              o.addController(new io_pathFinder(o));
              o.addController(new io_alwaysFire(o));
              o.facingType = "smoothWithMotion";
              o.aiTarget = "general";
            }
          }, 12500);
          setTimeout(() => {
            if (room.isIn("bas" + -o.team, o)) {
              o.kill();
            }
          }, 100000);
          o.refreshBodyAttributes();
          if (c.RANDOM_COLORS === true) {
            o.color = ran.choose([
              0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
              19, 30, 31, 32, 33, 34, 35, 39, 40, 41,
            ]);
          }

          o.team = team;
          if (c.BOT_TEAMS === "color") {
            o.team = o.color;
          } else {
            switch (team) {
              case -1:
                o.color = 10;
                break;
              case -2:
                o.color = 18;
                break;
              case -3:
                o.color = 7;
                break;
              case -4:
                o.color = 19;
                break;
              case -5:
                o.color = 13;
                break;
              case -6:
                o.color = 5;
                break;
              case -7:
                o.color = 17;
                break;
              case -8:
                o.color = 20;
                break;
              case -100:
                o.color = 3;
                break;
              default:
                o.color = 12;
            }
          }
          bots.push(o);
        }
      }
      // Remove dead ones
      bots = bots.filter((e) => {
        return !e.isDead();
      });

      for (let i = 0; i < bots.length; i++) {
        let o = bots[i];
        o.skill.maintain();
        o.skillUp(
          [
            "atk",
            "hlt",
            "spd",
            "str",
            "pen",
            "dam",
            "rld",
            "mob",
            "rgn",
            "shi",
          ][ran.chooseChance(1, 1, 3, 4, 4, 4, 4, 2, 1, 1)]
        );
        if (
          o.leftoverUpgrades &&
          o.upgrade(
            ran.irandomRange(Math.ceil(Math.random() * 10), o.upgrades.length)
          )
        )
          o.leftoverUpgrades--;
        if (o.team !== o.id) {
          if (o.label === "Healer" && !o.stopReppeat) {
            o.name = "[SUPPORT]_";
            o.name += ran.chooseBotName();
            o.aiTarget = "healAllies";
            if (c.MODE === "theDenied" || c.MODE === "siege") {
              o.addController(new io_guard1(o));
            } else {
              o.addController(new io_wanderAroundMap(o));
            }
            o.stopReppeat = true;
          }
          if (o.label === "Mechanic" && !o.stopReppeat2) {
            o.aiTarget = "structures";
            if (c.MODE === "theDenied" || c.MODE === "siege") {
              o.addController(new io_guard1(o));
            } else {
              o.addController(new io_wanderAroundMap(o));
            }
            o.stopReppeat2 = true;
          }
          if (o.specialEffect === "Legend" && !o.stopReppeat3) {
            //o.name = "[]_";
            // o.name += ran.chooseBotName();
            o.controllers = [
              new io_nearestDifferentMaster(o),
              new io_minion(o),
              new io_fleeAtLowHealth(o),
            ];
            if (c.MODE === "theDenied" || c.MODE === "siege") {
              o.addController(new io_guard1(o));
            } else {
              o.addController(new io_wanderAroundMap(o));
            }
            o.stopReppeat3 = true;
          }
        }
        if (o.label === "Spectator") {
          o.kill();
        }
      }
      // Spawning
      if (c.SPAWN_SENTINEL) spawnSentinel(census);
      if (c.SPAWN_PENTAGON_SENTINELS) spawnpentaSentinels(census);
      if (c.SPAWN_CRASHER) spawnCrasher(census);
      if (c.SPAWN_VOIDLORD_ENEMIES) spawnThrasher(census);
      if (c.SPAWN_SPARKS) spawnSpark(census);
      if (c.SPAWN_DESCENDED_ENEMIES) spawnLasher(census);
      if (c.SPAWN_FALLEN_ENEMIES) spawnUndead(census);
      if (c.SPAWN_VOIDLORD_BOSSES_AND_ENEMIES) spawnVoidlord(census);
      if (c.SPAWN_NEUTRAL_BOSSES) spawnNeutral(census);
      if (c.SPAWN_GUARDIAN_BOSSES) spawnGuardian(census);
      if (c.SPAWN_FALLEN_BOSSES) spawnFallen(census);
      if (c.SPAWN_SPECIAL_BOSSES) spawnSpecialBosses(census);
      if (c.SPAWN_SPECIAL_ENEMIES) spawnSpecialEnemies(census);
    };
  })();
  // The big food function
  let makefood = (() => {
    let food = [],
      foodSpawners = [];
    // The two essential functions:
    function getNormalFoodClass(level) {
      let a = {};

      a = Class.egg;
      switch (level) {
        case 0:
          a = Class.egg;
          break;
        case 1:
          a = Class.square;
          break;

        case 2:
          a = Class.triangle;
          break;
        case 3:
          a = Class.pentagon;

          break;
        case 4:
          a = Class.hexagon;

          break;
        case 5:
          a = Class.septagon;
          break;
        case 6:
          a = Class.octagon;
          break;

        case 7:
          a = Class.nonagon;
          break;
        default:
          a = Class.egg;
      }
      if (a !== {}) {
        a.BODY.ACCELERATION = 0.015 / (a.FOOD.LEVEL + 1);
      }
      return a;
    }
    function getShinyFoodClass(level) {
      let a = {};

      a = Class.shinyEgg;
      switch (level) {
        case 0:
          a = Class.shinyEgg;
          break;
        case 1:
          a = Class.shinySquare;
          break;

        case 2:
          a = Class.shinyTriangle;
          break;
        case 3:
          a = Class.shinyPentagon;

          break;
        case 4:
          a = Class.shinyHexagon;

          break;
        case 5:
          a = Class.shinySeptagon;

          break;
        case 6:
          a = Class.shinyOctagon;
          break;
        case 6:
          a = Class.shinyNonagon;
          break;

        default:
          a = Class.shinyEgg;
      }
      if (a !== {}) {
        a.BODY.ACCELERATION = 0.015 / (a.FOOD.LEVEL + 1);
      }
      return a;
    }
    function getAlbinoFoodClass(level) {
      let a = {};

      a = Class.albinoNonagon;

      switch (level) {
        case 0:
          a = Class.albinoNonagon;
          break;
        case 1:
          a = Class.albinoOctagon;
          break;
        case 2:
          a = Class.albinoSeptagon;
          break;

        case 3:
          a = Class.albinoHexagon;
          break;
        case 4:
          a = Class.albinoPentagon;

          break;
        case 5:
          a = Class.albinoTriangle;

          break;
        case 6:
          a = Class.albinoSquare;

          break;
        case 7:
          a = Class.abyssalEgg1;
          break;

        default:
          a = Class.albinoNonagon;
      }
      if (a !== {}) {
        a.BODY.ACCELERATION = 0.015 / (a.FOOD.LEVEL + 1);
      }
      return a;
    }
    function getLegendaryFoodClass(level) {
      let a = {};

      a = Class.legendaryEgg;
      switch (level) {
        case 0:
          a = Class.legendaryEgg;
          break;
        case 1:
          a = Class.legendarySquare;
          break;

        case 2:
          a = Class.legendaryTriangle;
          break;
        case 3:
          a = Class.legendaryPentagon;

          break;
        case 4:
          a = Class.legendaryHexagon;

          break;
        case 5:
          a = Class.legendarySeptagon;

          break;
        case 6:
          a = Class.legendaryOctagon;
          break;
        case 7:
          a = Class.legendaryNonagon;
          break;
        default:
          a = Class.legendaryEgg;
      }
      if (a !== {}) {
        a.BODY.ACCELERATION = 0.015 / (a.FOOD.LEVEL + 1);
      }
      return a;
    }
    function getShadowFoodClass(level) {
      let a = {};

      a = Class.shadowEgg;
      switch (level) {
        case 0:
          a = Class.shadowEgg;
          break;
        case 1:
          a = Class.shadowSquare;
          break;

        case 2:
          a = Class.shadowTriangle;
          break;
        case 3:
          a = Class.shadowPentagon;

          break;
        case 4:
          a = Class.shadowHexagon;

          break;
        case 5:
          a = Class.shadowSeptagon;

          break;
        case 6:
          a = Class.shadowOctagon;
          break;
        case 7:
          a = Class.shadowNonagon;
          break;

        default:
          a = Class.shadowEgg;
      }
      if (a !== {}) {
        a.BODY.ACCELERATION = 0.015 / (a.FOOD.LEVEL + 1);
      }
      return a;
    }
    function getEpilepticFoodClass(level) {
      let a = {};

      a = Class.epilepticEgg;
      switch (level) {
        case 0:
          a = Class.epilepticEgg;
          break;
        case 1:
          a = Class.epilepticSquare;
          break;

        case 2:
          a = Class.epilepticTriangle;
          break;
        case 3:
          a = Class.epilepticPentagon;

          break;
        case 4:
          a = Class.epilepticHexagon;

          break;
        case 5:
          a = Class.epilepticSeptagon;

          break;
        case 6:
          a = Class.epilepticOctagon;
          break;
        case 7:
          a = Class.epilepticNonagon;
          break;

        default:
          a = Class.epilepticEgg;
      }
      if (a !== {}) {
        a.BODY.ACCELERATION = 0.015 / (a.FOOD.LEVEL + 1);
      }
      return a;
    }
    function getRainbowFoodClass(level) {
      let a = {};

      a = Class.rainbowEgg;

      switch (level) {
        case 0:
          a = Class.rainbowEgg;
          break;
        case 1:
          a = Class.rainbowSquare;
          break;

        case 2:
          a = Class.rainbowTriangle;
          break;
        case 3:
          a = Class.rainbowPentagon;

          break;
        case 4:
          a = Class.rainbowHexagon;

          break;
        case 5:
          a = Class.rainbowSeptagon;

          break;
        case 6:
          a = Class.rainbowOctagon;
          break;
        case 7:
          a = Class.rainbowNonagon;
          break;

        default:
          a = Class.rainbowEgg;
      }
      if (a !== {}) {
        a.BODY.ACCELERATION = 0.015 / (a.FOOD.LEVEL + 1);
      }
      return a;
    }
    function getAbyssalFoodClass(level) {
      let a = {};

      a = Class.abyssalEgg2;

      switch (level) {
        case 0:
          a = Class.abyssalEgg2;
          break;
        case 1:
          a = Class.abyssalSquare;
          break;

        case 2:
          a = Class.abyssalTriangle;
          break;
        case 3:
          a = Class.abyssalPentagon;

          break;
        case 4:
          a = Class.abyssalHexagon;

          break;
        case 5:
          a = Class.abyssalSeptagon;

          break;
        case 6:
          a = Class.abyssalOctagon;
          break;
        case 7:
          a = Class.abyssalNonagon;
          break;

        default:
          a = Class.abyssalEgg2;
      }
      if (a !== {}) {
        a.BODY.ACCELERATION = 0.015 / (a.FOOD.LEVEL + 1);
      }
      return a;
    }
    let placeNewFood = (position, scatter, level, allowInNest = false) => {
      let o = nearest(food, position);
      let mitosis = false;
      let seed = false;
      // Find the nearest food and determine if we can do anything with it
      if (o != null) {
        for (let i = 50; i > 0; i--) {
          if (scatter == -1 || util.getDistance(position, o) < scatter) {
            if (ran.dice((o.foodLevel + 1) * (o.foodLevel + 1))) {
              mitosis = true;
              break;
            } else {
              seed = true;
              break;
            }
          }
        }
      }
      // Decide what to do
      if (scatter != -1 || mitosis || seed) {
        // Splitting
        if (
          o != null &&
          (mitosis || seed) &&
          room.isIn("nest", o) === allowInNest
        ) {
          let levelToMake = mitosis ? o.foodLevel : level,
            place = {
              x: o.x + o.size * Math.cos(o.facing),
              y: o.y + o.size * Math.sin(o.facing),
            };
          let new_o = new Entity(place);
          switch (new_o.rarityType) {
            case "shiny":
              new_o.define(getShinyFoodClass(levelToMake));
              break;
            case "albino":
              new_o.define(getAlbinoFoodClass(levelToMake));
              break;
            case "legendary":
              new_o.define(getLegendaryFoodClass(levelToMake));
              break;
            case "shadow":
              new_o.define(getShadowFoodClass(levelToMake));
              break;
            case "epileptic":
              new_o.define(getEpilepticFoodClass(levelToMake));
              break;
            case "rainbow":
              new_o.define(getRainbowFoodClass(levelToMake));
              break;
            case "abyssal":
              new_o.define(getAbyssalFoodClass(levelToMake));
              break;
            default:
              new_o.define(getNormalFoodClass(levelToMake));
              new_o.continueChance = true;
          }
          new_o.team = -100;
          new_o.invuln = true;
          setTimeout(() => {
            new_o.invuln = false;
          }, 5000);
          new_o.facing = o.facing + ran.randomRange(Math.PI / 2, Math.PI);
          food.push(new_o);
          return new_o;
        }
        // Brand new
        else if (room.isIn("nest", position) === allowInNest) {
          if (!dirtyCheck(position, 20)) {
            o = new Entity(position);

            switch (o.rarityType) {
              case "shiny":
                o.define(getShinyFoodClass(level));
                break;
              case "albino":
                o.define(getAlbinoFoodClass(level));
                break;
              case "legendary":
                o.define(getLegendaryFoodClass(level));
                break;
              case "shadow":
                o.define(getShadowFoodClass(level));
                break;
              case "epileptic":
                o.define(getEpilepticFoodClass(level));
                break;
              case "rainbow":
                o.define(getRainbowFoodClass(level));
                break;
              case "abyssal":
                o.define(getAbyssalFoodClass(level));
                break;
              default:
                o.define(getNormalFoodClass(level));
                o.continueChance = true;
            }
            o.team = -100;
            o.invuln = true;
            setTimeout(() => {
              o.invuln = false;
            }, 5000);
            o.facing = ran.randomAngle();
            food.push(o);
            return o;
          }
        }
      }
    };
    // Define foodspawners
    class FoodSpawner {
      constructor() {
        this.foodToMake = Math.ceil(
          Math.abs(ran.gauss(0, room.scale.linear * 80))
        );
        this.size = Math.sqrt(this.foodToMake) * 25;

        // Determine where we ought to go
        let position = {};
        let o;
        do {
          position = room.gaussRing(1 / 3, 20);
          o = placeNewFood(position, this.size, 0);
        } while (o == null);

        // Produce a few more
        for (let i = Math.ceil(Math.abs(ran.gauss(0, 4))); i <= 0; i--) {
          placeNewFood(o, this.size, 0);
        }

        // Set location
        this.x = o.x;
        this.y = o.y;
        //util.debug('FoodSpawner placed at ('+this.x+', '+this.y+'). Set to produce '+this.foodToMake+' food.');
      }
      rot() {
        if (--this.foodToMake < 0) {
          //util.debug('FoodSpawner rotted, respawning.');
          util.remove(foodSpawners, foodSpawners.indexOf(this));
          foodSpawners.push(new FoodSpawner());
        }
      }
    }
    // Add them
    if (c.SPAWN_FOOD !== false) {
      foodSpawners.push(new FoodSpawner());
      foodSpawners.push(new FoodSpawner());
      foodSpawners.push(new FoodSpawner());
      foodSpawners.push(new FoodSpawner());
    }
    // Food making functions
    let makeGroupedFood = () => {
      // Create grouped food
      // Choose a location around a spawner
      let spawner = foodSpawners[ran.irandom(foodSpawners.length - 1)],
        bubble = ran.gaussRing(spawner.size, 1 / 4);
      placeNewFood({ x: spawner.x + bubble.x, y: spawner.y + bubble.y }, -1, 0);
      spawner.rot();
    };
    let makeDistributedFood = () => {
      // Distribute food everywhere
      //util.debug('Creating new distributed food.');
      let spot = {};
      do {
        spot = room.gaussRing(1 / 2, 2);
        if (!spot) return false;
      } while (room.isInNorm(spot));
      placeNewFood(spot, 0.01 * room.width, 0);
      return true;
    };
    let makeCornerFood = () => {
      // Distribute food in the corners
      let spot = {};
      do {
        spot = room.gaussInverse(5);
        if (!spot) return false;
      } while (room.isInNorm(spot));
      placeNewFood(spot, 0.05 * room.width, 0);
      return true;
    };
    let makeNestFood = () => {
      // Make nest pentagons
      let spot = room.randomType("nest");
      if (!spot) return false;
      placeNewFood(spot, 0.01 * room.width, 3, true);

      return true;
    };
    // Return the full function
    return () => {
      // Find and understand all food
      let census = {
        [0]: 0, // Egg
        [1]: 0, // Square
        [2]: 0, // Triangle
        [3]: 0, // Penta
        [4]: 0, // Beta
        [5]: 0, // Alpha
        [6]: 0,
        [7]: 0,
        [8]: 0,
        [9]: 0,
        tank: 0,
        sum: 0,
      };
      let censusNest = {
        [0]: 0, // Egg
        [1]: 0, // Square
        [2]: 0, // Triangle
        [3]: 0, // Penta
        [4]: 0, // Beta
        [5]: 0, // Alpha
        [6]: 0, //Hexagon
        [7]: 0, //Heptagon
        [8]: 0, //Octogon

        [9]: 0, //Nonagon
        sum: 0,
      };
      // Do the censusNest
      food = entities
        .map((instance) => {
          if (!instance.valid()) {
            return;
          }
          try {
            if (instance.type === "tank") {
              census.tank++;
              c.tankCount = census.tank;
            } else if (instance.foodLevel > -1) {
              if (room.isIn("nest", { x: instance.x, y: instance.y })) {
                censusNest.sum++;
                censusNest[instance.foodLevel]++;
              } else {
                census.sum++;
                census[instance.foodLevel]++;
              }
              return instance;
            }
          } catch (err) {
            util.error(instance.label);
            util.error(err);
            instance.kill();
          }
        })
        .filter((e) => {
          return e;
        });
      // Sum it up
      let maxFood = room.maxFood / 7;
      let maxNestFood = room.maxFood / 25;

      let foodAmount = census.sum;
      let nestFoodAmount = censusNest.sum;
      /*********** ROT OLD SPAWNERS **********/
      foodSpawners.forEach((spawner) => {
        if (ran.chance(1 - foodAmount / maxFood)) spawner.rot();
      });
      /************** MAKE FOOD **************/
      while (
        ran.chance(0.8 * (1 - (foodAmount * foodAmount) / maxFood / maxFood))
      ) {
        switch (ran.chooseChance(10, 2, 1)) {
          case 0:
            makeGroupedFood();
            break;
          case 1:
            makeDistributedFood();
            break;
          case 2:
            makeCornerFood();
            break;
        }
      }
      while (
        ran.chance(
          0.25 *
            (1 - (nestFoodAmount * nestFoodAmount) / maxNestFood / maxNestFood)
        )
      )
        makeNestFood();
      /************* UPGRADE FOOD ************/
      if (!food.length) return 0;
      for (let i = Math.ceil(food.length / 100); i > 0; i--) {
        let randomFood = food[ran.irandom(food.length - 1)]; // A random food instance
        if (randomFood === undefined) return;
        let range = 400;

        let nearEntities = getEntitiesFromRange(randomFood, range)
          .map((e) => {
            if (util.getDistance(randomFood, e) < range) {
              return e;
            }
          })
          .filter((e) => {
            return e;
          });
        sortByDistance(nearEntities, { x: randomFood.x, y: randomFood.y });
        // Bounce 6 times
        for (let j = 0; j < 6; j++) {
          let o = nearEntities[j];
          if (o === undefined) break;
          if (o.foodLevel < 0) continue;
          // Configure for the nest if needed
          let proportions = c.FOOD,
            cens = census,
            amount = foodAmount;
          if (room.isIn("nest", o)) {
            proportions = c.FOOD_NEST;
            cens = censusNest;
            amount = nestFoodAmount * 50;
          }
          // Upgrade stuff
          o.foodCountup += Math.ceil(
            Math.abs(ran.gauss(0, 25 - o.foodLevel * 3))
          );
          while (o.foodCountup >= (o.foodLevel + 1) * 100) {
            o.foodCountup -= (o.foodLevel + 1) * 100;
            if (
              ran.chance(
                1 -
                  cens[o.foodLevel + 1] / amount / proportions[o.foodLevel + 1]
              )
            ) {
              o.declined = Math.round(Math.random() * (o.foodLevel * 1.25));
              if (o.declined === 0) {
                switch (o.rarityType) {
                  case "shiny":
                    o.define(getShinyFoodClass(o.foodLevel + 1));
                    break;
                  case "albino":
                    o.define(getAlbinoFoodClass(o.foodLevel + 1));
                    break;
                  case "legendary":
                    o.define(getLegendaryFoodClass(o.foodLevel + 1));
                    break;
                  case "shadow":
                    o.define(getShadowFoodClass(o.foodLevel + 1));
                    break;
                  case "epileptic":
                    o.define(getEpilepticFoodClass(o.foodLevel + 1));
                    break;
                  case "rainbow":
                    o.define(getRainbowFoodClass(o.foodLevel + 1));
                    break;
                  case "abyssal":
                    o.define(getAbyssalFoodClass(o.foodLevel + 1));
                    break;
                  default:
                    o.define(getNormalFoodClass(o.foodLevel + 1));
                    o.continueChance = true;
                }
                o.invuln = true;
                setTimeout(() => {
                  o.invuln = false;
                }, 5000);
              }
            }
          }
        }
      }
    };
  })();
  /*/ //Rare food function
/*/
  // Define food and food spawning

  return () => {
    logs.maintainloop.set();
    // Do stuff
    makenpcs();
    if (c.SPAWN_FOOD !== false) makefood();
    // Regen health and update the grid
    entities.forEach((instance) => {
      if (instance.health.amount > 0 || instance.health.max > 0) {
        if (instance.valid()) {
          if (
            instance.shield.max &&
            !instance.isProjectile &&
            instance.type !== "food" &&
            instance.REGEN > 0 &&
            instance.regenType !== "healthOnly"
          ) {
            instance.shield.regenerate();
          }
          if (
            instance.health.amount &&
            !instance.isProjectile &&
            instance.type !== "food" &&
            instance.REGEN > 0 &&
            instance.regenType !== "shieldOnly"
          ) {
            instance.health.regenerate(
              instance.shield.max &&
                instance.shield.max === instance.shield.amount
            );
          }
        }
      }
    });

    logs.maintainloop.mark();
  };
})();

// This is the checking loop. Runs at 1Hz.
var speedcheckloop = (() => {
  let fails = 0;
  // Return the function
  return () => {
    let activationtime = logs.activation.sum(),
      collidetime = logs.collide.sum(),
      movetime = logs.entities.sum(),
      playertime = logs.network.sum(),
      maptime = logs.minimap.sum(),
      physicstime = logs.physics.sum(),
      lifetime = logs.life.sum(),
      maintainloop = logs.maintainloop.sum(),
      spawner = logs.spawner.sum();
    let sum = logs.master.record();
    let loops = logs.loops.count(),
      active = logs.entities.count();
    global.fps = (1000 / sum).toFixed(2);
    if (sum > 1000 / roomSpeed / 30) {
      //fails++;
      /*/  util.warn(
        "~~ LOOPS: " +
          loops +
          ". ENTITY #: " +
          entities.length +
          "//" +
          Math.round(active / loops) +
          ". VIEW #: " +
          views.length +
          ". BACKLOGGED :: " +
          (sum * roomSpeed * 3).toFixed(3) +
          "%! ~~"
      );
      util.warn("Total activation time: " + activationtime);
      util.warn("Total collision time: " + collidetime);
      util.warn("Total cycle time: " + movetime);
      util.warn("Total player update time: " + playertime);
      util.warn("Total lb+minimap processing time: " + maptime);
      util.warn("Total entity physics calculation time: " + physicstime);
      util.warn("Total entity life+thought cycle time: " + lifetime);
      util.warn("Total maintainloop time: " + maintainloop);
      util.warn("Total spawner time: " + spawner);
      util.warn(
        "Total time: " +
          (activationtime +
            collidetime +
            movetime +
            playertime +
            maptime +
            physicstime)
      );
      /*/
      if (fails > 60) {
        util.error("FAILURE!");
        //process.exit(1);
      }
    } else {
      fails = 0;
    }
  };
})();

/** BUILD THE SERVERS **/
// Turn the server on

let message = "Send a message here to chat!",
  redirectLink = "/chat";
if (c.MODE === "execution") {
  setTimeout(() => {
    c.doItNow = true;
    sockets.broadcast(
      "The Arena has locked down and is shrinking! People who spawn or respawn cannot fight!"
    );
  }, 90000);
}
// Create an HTTP server
const server = http.createServer((req, res) => {
  // Receiving the data:
  let { pathname, query } = url.parse(req.url, true),
    totalSeconds = (7200000 - c.timeLeft) / 1000,
    hours = Math.floor(totalSeconds / 3600),
    minutes = Math.floor((totalSeconds % 3600) / 60),
    hourLabel = hours === 1 ? "hour" : "hours",
    minuteLabel = minutes === 1 ? "minute" : "minutes",
    timeString = `${hours} ${hourLabel} and ${minutes} ${minuteLabel}`,
    title = "Unknown",
    extra = "Unknown";
  switch (serverType) {
    case "lore":
      title = "Ranar's Prophecy";
      extra = "The Lore Server";
      break;
    case "normal":
      title = "Ranar's Arena";
      extra = "The Combat Server";
      break;
    default:
      title = "Ranar's Testing Server";
      extra = "Unknown";
      break;
  }
  switch (pathname) {
    case "/":
      res.writeHead(200);
      res.end(
        `
             <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>` +
          title +
          `</title>

  <!-- Favicon -->
  <link rel="icon" href="https://cdn.glitch.global/5f27ad97-07cd-4f67-922e-41dfb3ef64a5/grgagegu.webp?v=1713072716793" />

  </head>
<style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 20px;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-around;
      background-image: url('https://cdn.glitch.global/5f27ad97-07cd-4f67-922e-41dfb3ef64a5/Screenshot%202024-04-15%2012.19.10%20AM%20(1).png?v=1713162098381');
      background-size: 100%;
      background-position: center;
      color: white; /* Setting text color to white for better contrast */
    }
    h1, h2, h3 {
      text-align: center;
      width: 100%;
    }
    ul {
      list-style-type: none;
      padding: 0;
    }
    li {
      margin-bottom: 10px;
    }
    .game-modes {
      width: 45%;
      background-color: rgba(0, 0, 0, 0.5); /* Adding a semi-transparent background to game modes for better readability */
      padding: 10px;
    }
    .changelog {
      width: 45%; /* Full width */
      margin-bottom: 20px;
      background-color: rgba(0, 0, 0, 0.5); /* Adding a semi-transparent background for better readability */
      padding: 10px;
      overflow-y: auto; /* Enable vertical scrolling */
      max-height: 400px; /* Set a max height for the scrollable area */
    }
    .button-container {
      text-align: center;
      width: 100%;
      margin-top: 20px;
    }
    .button-container button {
      padding: 10px 20px;
      font-size: 16px;
      background-color: #3498db;
      color: white;
      border: none;
      cursor: pointer;
    }
    .button-container button:hover {
      background-color: #2980b9;
    }
  </style>
</head>
<body>


  <div class="game-modes">
  <h1>${title}</h1>
  <h2>${extra}</h2>
    <h4>Server Data:</h4>
    <p>
    <b>Current Game Mode:</b> ` +
          chosenMode +
          `.<br>
    <b>Players:</b> ` +
          c.playerCount +
          `.<br>
<b>Estimated Time Before Server Refreshes:</b> ${timeString}.<br><br>
You must have the chat site and the game site open at the same time for your chats to be sent.
    </p>
    </div>
  <div class="button-container">
    <button onclick="location.href = 'https://arras.cx/#host=' + location.host">Join Game</button>
  </div>
  <div class="button-container">
  <button onclick="window.open('https://' + location.host + '/chat', '_blank')">Open Chat Site</button>
</div>

  <div class="changelog">
  <!-- Prophecy Version 0.0.8 -->
<section id="prophecy-v0-0-8">
  <h2># Prophecy Version 0.0.8</h2>
  <p>NEW UPDATE!</p>
  <ul>
    <li>Nerfed Animator's Reload, as well as similar entities such as Enslaver, Flesh, and Anubis.</li>
    <li>Added Semi-Auto to tier 4 of Octo-Tank and Auto-5.</li>
    <li>It's just 4 basic barrels and 4 auto turrets.</li>
    <li>Buffed the damage that walls deal when something is in between them or a player/bot is phasing into them.</li>
    <li>
      Rebalanced the Awakening:
      <ul>
        <li>The Unawakened enemies are now much weaker overall.</li>
        <li>The Unawakened bosses will now scale with player count, meaning they will be weaker by default.</li>
      </ul>
    </li>
    <li>Nerfed all rare crasher variants, including making shadow crashers unable to phase through walls.</li>
    <li>Fixed Ranar in the Denied from sitting in his base for an extended period of time...</li>
    <li>Also made Ranar's summoned crashers not be delayed by invulnerability.</li>
    <li>Also made Ranar's orbs spawn much more often.</li>
    <li>Nerfed Physicist traps from their turrets.</li>
    <li>Nerfed overall body damage of the turrets from the Experimenter branch.</li>
    <li>Made the swear filter more lenient to allow words such as 'crap' and 'god' while also being able to crack down on filter bypass attempts.</li>
    <li>Nerfed score gained from healing/repairing.</li>
    <li>Deific Ranar no longer spawns anti-tanks and arena closers, but instead spawns in all 4 corners.</li>
    <li>Changed Hive Centaurion's bees to be hexagon instead of square.</li>
    <li>Nerfed Ranar's health but buffed his orbs.</li>
    <li>Buffed Twin and upgrades that use Twin (primarily Double Twin and Bulwark).</li>
    <li>Buffed Sprayer and its branch (except Focal).</li>
    <li>Removed the ability to possess Dominators for now, it took me hours upon hours to try and fix this and nothing is working.</li>
    <li>Added in Execution game mode, it's an FFA arena that will eventually shrink, the last survivor wins!</li>
    <li>The Distance is back in rotation, I had stupidly forgotten to actually add it in.</li>
    <li>Renamed Deific Ranar to 'Living Apocalypse'.</li>
    <li>Made healer symbol spin if it's on a smasher.</li>
    <li>Added more spawn messages!</li>
    <li>Increased the score requirement for each tier.</li>
    <li>Moved Replicator to tier 4 of Spawner and Booster.</li>
    <li>Moved Quad-Spawner to tier 4 of Avenger.</li>
    <li>Moved Tri-Spawner to tier 5 of Quad-Spawner.</li>
    <li>Moved Penta-Spawner to tier 6 of Tri-Spawner.</li>
    <li>Moved Hexa-Spawner to tier 6 of Tri-Spawner and Big Cheese.</li>
    <li>Buffed Quad/Tri/Penta/Hexa Spawners.</li>
    <li>Added Auto-Poly Fear and Poly Terror to Poly Fear tier 4.</li>
    <li>Added Mutant to tier 4 of Poly Fear and Hybrid.</li>
    <li>Added Poly Lord, tier 5 Poly Fear and Polymancer.</li>
    <li>Added Poly Tyrant, tier 5 Big Cheese and Polymancer.</li>
    <li>Added The true versions of the smashersphere variants.</li>
    <li>  The true variant gets some visual changes and a 4 atmosphere layer.</li>
    <li>  Each of the true versions can be found on the T4 of their regular variant.</li>
    <li>Renamed Pulsar Core to Neutron.</li>
    <li>Renamed Beenade to Beenade Chucker.</li>
    <li>Added Lobber to tier 4 of Fieldgun and Fighter.</li>
    <li>Added Splatterer to tier 4 of Shotgun and Fighter.</li>
    <li>Bastion was renamed to Clockwork.</li>
    <li>Stronghold was renamed to Steam Punk.</li>
    <li>Added Condor to tier 5 of Vulture.</li>
    <li>Added Wood Pecker to tier 5 of Falcon, Musket, and Fighter.</li>
    <li>Added Cloner to tier 4 of Spawner and Fighter.</li>
    <li>Added Spitter to tier 4 of Phoenix and Fighter.</li>
    <li>Added Tri-Wark, Hewn-Wark, Auto-Bulwark, Bent Bulwark, Hewn Bulwark, and Frontier to tier 4 of Bulwark.</li>
    <li>Added Syphon to tier 4 of Hybrid.</li>
    <li>Added Hyper Skimmer to tier 4 of Skimmer.</li>

<li>Added Conjurer to Siege and natural boss spawns.</li>
<li>Added Ruiner to Siege and natural boss spawns.</li>
    <li>Added the Fallen Tyrant boss to Siege.</li>
    <li>...Something told me to say this..."God is Watching"...</li>
  </ul>
</section>
</ul><!-- Prophecy Version 0.0.7 -->
<section id="prophecy-v0-0-7">
  <h2># Prophecy Version 0.0.7</h2>
  <p>NEW UPDATE!</p>
  <ul>
    <li>RE-ADDED BREAKER AND IT'S BRANCH!</li>
    <li>Breaker is a trapper tank that has traps that explode into 5 traps when the traps die.</li>
    <li>Auto-Breaker</li>
    <li>Wrecker, Builder/Breaker combo</li>
    <li>Demolitionist, Tri-Trapper/Breaker combo</li>
    <li>Shatterer, Flinger/Breaker combo</li>
    <li>Cracker, Mech/Breaker combo</li>
    <li>Burster, same as Breaker but shoots 10 on death instead</li>
    <li>
      Added Grenadier, it is a Launcher branch tank that has an exploding bullet.
      <ul>
        <li>Additional grenadier branch upgrades:</li>
        <li>Pulsar core: splits into 10 mini launcher missiles upon death</li>
        <li>Beenade: plits into 7 bees upon death.</li>
      </ul>
    </li>
    <li>Fixed the bug that caused Ancients to randomly crash the server.</li>
    <li>Fixed the bug that made Rogue Armadas turn into fidget spinners.</li>
    <li>Fixed some bugs revolving around healing and repairing.</li>
    <li>Fixed 1st and 2nd tier of upgrades having the wrong level requirment (1st tier: 10 → 15, 2nd tier: 25 → 30)</li>
    <li>
      Added a T2 boss - Cultist Centaurion
      <ul>
        <li>cultist centaurion is a hexagon boss</li>
        <li>it spawns 12 hexagon drones, which makes it the last polygon spawner boss to be added</li>
      </ul>
    </li>
    <li>
      Added a T4 boss - Trimalgam
      <ul>
        <li>you might recognize the name from the example suggestion</li>
        <li>Trimalgam is a voidlord boss, combining all triangle bosses into one (Enchantress, Witch, Defender, Elite skimmer, Defector)</li>
      </ul>
    </li>
    <li>
      Buffed novice and it's direct upgrades (adept, advanced, expert, elite, master) to have slightly better gun stats and better body stats.
      <ul>
        <li>Novice has the same gun stats as basic but slight increase to all body stats.</li>
        <li>Adept is the same as Novice but has better gun stats.</li>
        <li>Advanced is the same as Adept but better body stats.</li>
        <li>Expert is the same as Advanced but better gun stats.</li>
        <li>Elite is the same as Expert but has better body stats.</li>
        <li>Master is the same as Elite but has better gun stats.</li>
      </ul>
    </li>
    <li>
      Re-added the Domination Turret branch, plus some more!
      <ul>
        <li>Novice Domination Turret is the base upgrade, which upgrades to:
          <ul>
            <li>Adept Domination Turret</li>
            <li>Tri-Novice Domination Turret</li>
            <li>Nailer Domination Turret</li>
            <li>Destroyer Domination Turret</li>
            <li>Trapper Domination Defense</li>
            <li>Drone Domination Turret</li>
          </ul>
        </li>
      </ul>
    </li>
    <li>
      There are now tiers to nailer, destroyer and trapper turrets!
      <ul>
        <li>The first tier upgrade is from domination to sanctuary, which adds a sanctuary healer, minor improvements to stats and growth in size!</li>
        <li>The second tier upgrade is from sanctuary to Anti-Boss, which adds a sanctuary repairer, additional minor improvements to stats and growth in size.</li>
      </ul>
    </li>
    <li>
      The drone domination turret also has tiers!
      <ul>
        <li>The first tier upgrade is from domination to commander which makes the 3 drone spawners also get 3 swarm spawners, as well as minor improvement in damage and size</li>
        <li>The second tier upgrade is from commander to Boss Destroyer, adding an additional swarm spawner and a big cheese drone spawner, with further improvement in damage and size</li>
      </ul>
    </li>
    <li>
      Renamed and modified mech without the auto turret, making it a new branch!
      <ul>
        <li>Auto-Mech</li>
        <li>Mechanism, shoots twin-turretted traps!</li>
        <li>Mechanizer, shoots spinning flank traps!</li>
        <li>Also added a drive symbol Engineer to keep consistency.</li>
      </ul>
    </li>
    <li>
      Added a Bulwark branch!
      <br>the bulwark branch is exactly the same as double twin branch but themed around having trappers in the backside, as opposed to normal bullet barrels
    </li>
    <li>
      Added Hewn Bulwark
      <br>a mix between bulwark and double twin!, upgrades from both.
    </li>
    <li>
      Spectre, Poltergeist and Arena Guard classes now slowly take damage while inside of rocks and maze walls,
      <br>to prevent people from hiding and being almost unkillable.
    </li>
    <li>
      Did some branch reorganization to stay within my rules of 10 tanks at most in each branch:
      <ul>
        <li>Moved barricade from Trapper to Tri-Trapper, It still makes sense if you think about it.</li>
        <li>Moved Quad-Builder out of Tri-Trapper, making it exclusive to builder.</li>
      </ul>
    </li>
    <li>
      Added Hardshell Spawner
      <ul>
        <li>a spawner branch upgrade, which spawns 3 strong hardshells</li>
        <li>hardshells are basically just spheres with a smasher shell.</li>
      </ul>
    </li>
    <li>
      Added auto-constructer
      <ul>
        <li>auto-constructer is a stepping block for getting ~~Alex~~ Roadblocker (pun intended)</li>
      </ul>
    </li>
    <li>Roadblocker is a upgrade which throws out 3 massive, and hard to kill blocks.</li>
    <li>
      Added a Mettasphere branch
      <ul>
        <li>added Healersphere and Repairsphere to the Healer branch, each have a healing and repair aura respectively</li>
        <li>added Dualist to branch off Healersphere and Smashersphere, it has a healing and a damage aura</li>
        <li>added Irradiator to branch off Repairsphere and Smashersphere, it has a repair and a damage aura</li>
        <li>added Supportsphere to branch off Healersphere and Repairsphere, it has a healing and a repair aura</li>
        <li>added Mettasphere, it branches off of Dualist, Irradiator and Supportsphere, it has 3 of each auras.</li>
      </ul>
    </li>
    <li>Adjusted Collider and Ascendant's Orbs.</li>
    <li><strong>Changes to legendary classes (there's a few)</strong></li>
    <li>Flesh now requires Constructor, Animator, Rocketeer and Hexa-Trapper</li>
    <li>Slightly nerfed Mass producer</li>
    <li>Rearranged the required classes for Operator, it now requires 1 mil as Auto-Mech, Interceptor, Auto-Spawner or Engineer.</li>
    <li>
      Added Destructionist
      <ul>
        <li>A guardian legendary class!</li>
        <li>Available to get if on guardian faction, and have 1 mil score while playing: Collider, Shotgun, Twister or Decimator.</li>
      </ul>
    </li>
    <li>
      Added Embodiment of Destruction
      <ul>
        <li>A voidlord legendary class!</li>
        <li>Available to get if on voidlord faction, and have 1 mil score while playing: Master, Hexanomaly, Pulsar or Overgunner.</li>
      </ul>
    </li>
    <li>
      Added Mechanist
      <ul>
        <li>A highlord legendary class!</li>
        <li>Available to get if on highlord faction and have 1 mil score while playing: Hardshell Spawner, Auto-5, or Skimmer.</li>
      </ul>
    </li>
    <li>
      Added Conductor
      <ul>
        <li>A highlord legendary class!</li>
        <li>Available to get if on highlord faction have have 1 mil score while playing: Armor Piercer (Mortar upgrade), Auto-Cruiser, Carrier or Auto-Smasher.</li>
      </ul>
    </li>
    <li>
      READDED RACING MODE!
      <ul>
        <li>Race physics now apply!</li>
        <li>More consistent lore (yes It is a lore mode)</li>
      </ul>
    </li>
  </ul>
</section>

<!-- Prophecy Version 0.0.6 -->
<section id="prophecy-v0-0-6">
  <h2># Prophecy Version 0.0.6</h2>
  <ul>
    <li>Added Flesh and Mass Producer to the Legendary class node!</li>
    <li>
      Additionally, You can now become Flesh in normal modes!
      <ul>
        <li>Gain 1 Mil as a Annihilator, Hexa Trapper, Rocketeer, Skimmer or Animator on the fallen team or during siege!</li>
      </ul>
    </li>
    <li>Removed Arena Guard from the Denied boss fight due to lore confliction.</li>
    <li>
      Added Maze Domination
      <ul>
        <li>Just like normal domination but this time in a maze!</li>
      </ul>
    </li>
    <li>Fixed dominators a bit, they can be controlled.</li>
    <li>
      Reworked Siege some more:
      <ul>
        <li>During waves 10 and 20, Epic waves will spawn (like before),</li>
        <li>then during waves 30 and 40, Epic waves will spawn along side normal waves.</li>
        <li>Then during waves 50 and every 10 waves beyond that, a Final boss wave will appear, and good luck surviving it.</li>
      </ul>
    </li>
    <li>Additionally, I have (hopefully) fixed the rare wave skipping glitch.</li>
    <li>
      Reworked Traps and Blocks!
      <ul>
        <li>They now last longer and have more health, but have less penetration.</li>
      </ul>
    </li>
    <li>Buffed Barricade</li>
    <li>
      Reworked Lurker:
      <ul>
        <li>removed the sideguns, but buffed the swarm drones speed of the normal guns, it is now alot more deadly in a sneak attack!</li>
      </ul>
    </li>
    <li>Fixed Revenants drones from phasing through eachother.</li>
    <li>
      FIXED DAMAGE AURAS!!
      <ul>
        <li>meaning, I READDED SMASHERSPHERE AND YOU NO LONGER HAVE TO SUFFER FROM THE INCONSISTENT DAMAGE!</li>
        <li>by extension of both healing and damage auras being fixed, we could expect healing auras coming soon.</li>
      </ul>
    </li>
    <li>
      Made healing/repairing alot more smooth, also adding some additional effects:
      <ul>
        <li>Healing and repairing deal no damage to enemies UNLESS:</li>
        <li>If you are a healer and you are attacking a fallen or voidlord entity.</li>
        <li>If you are a Mechanic (or other repair-based class) and you are attacking a structure (fort gate, wall or dominator), trap, drone, minion, polygon or someone from the highlord team.</li>
      </ul>
    </li>
    <li>
      Buffed rogue mothership
      <ul>
        <li>Mothership is now a T4 boss, similar to Disciple.</li>
      </ul>
    </li>
    <li>
      Rogue Armada changes:
      <ul>
        <li>Buffed</li>
        <li>Reworked appearence to be more similar to base arras.io</li>
      </ul>
    </li>
  </ul>
</section>

<!-- Prophecy Version 0.0.5 -->
<section id="prophecy-v0-0-5">
  <h2># Prophecy Version 0.0.5</h2>
  <p>Sorry we take so long, we have been too busy!</p>
  <ul>
    <li>THE INFESTATION MODE HAS BEEN REWORKED AND READDED!!!!</li>
    <li>the map was altered slightly (thank you JJ).</li>
    <li>You now have to escort anubis and keep him alive!</li>
    <li>Arena closer bosses now cannot leave through maze walls (in this mode only).</li>
    <li>Now only the arena closer bosses are guaranteed to be infected, to reduce lag.</li>
    <li>Also added basic to miniboss branch and on legendary class lists.</li>
    <li>
      Also reworked fort gates/walls and dominators slightly:
      <ul>
        <li>Dominators, Gates and fort walls now give score!</li>
        <li>gates and fort walls are now full sized!</li>
        <li>also gave them a slight appearance change to differentiate them from colored maze walls.</li>
      </ul>
    </li>
  </ul>
</section>

<!-- Prophecy Version 0.0.4 -->
<section id="prophecy-v0-0-4">
  <h2># Prophecy Version 0.0.4</h2>
  <ul>
    <li>
      - Added a ton of new Architect classes:
      <br><br>
      Sheller:<br>
      Architect but with mini trap turrets attached to the main barrels<br><br>
      Trilogy of traps:<br>
      Sheller but with added mega trapper turrets on top<br><br>
      Bombarder:<br>
      Sheller but with double the side cannons.<br><br>
      Fragmentor:<br>
      The side turrets are now full sized trappers<br><br>
      auto architect:<br>
      Self explanatory<br><br>
      Originator:<br>
      Architect but with engineer-like traps<br><br>
      Auto sheller:<br>
      Also self explanatory.<br><br>
      Mastertact:<br>
      Architect but with 5 barrels<br><br>
      Castle:<br>
      Architect but has a swarmer between the barrels<br><br>
      Warzone:<br>
      Sheller but with swarmers between the barrels<br><br>
      Constructionist:<br>
      Shoots constructer traps out of the architect guns<br><br>
    </li>
    <li>
      - Added a new legendary class: Mass Producer<br>
      - It has one of every new architect gun.<br>
      - Branches off every architect
    </li>
    <p>This may be the last update for a while.</p>
  </ul>
</section>

<!-- Prophecy Version 0.0.3 -->
<section id="prophecy-v0-0-3">
  <h2># Prophecy Version 0.0.3</h2>
  <h4>- Did a minor rework of The Denied:</h4>
  <ul>
    <li>Buffed Ascendant Health.</li>
    <li>Nerfed the Wrathful Shiny Crasher Speed.</li>
    <li>Fort Gates no longer damage Ranar.</li>
    <li>Health Orbs are now rarer and no longer get damaged by enemies and no longer damage enemies.</li>
    <li>Health Orbs now always heal = to half of your max hp and shields.</li>
    <li>Ranar's Spheres have been changed to knockback enemies.</li>
    <li>The walls no longer instantly break, now you can hide behind them for a brief amount of time.</li>
    <li>Added a Fort Gate to Twilight's resting point.</li>
    <li>Made the Descendants revivable by Necro Tyrant.</li>
    <li>Added more dialog for certain situations.</li>
  </ul>
  <h4>- Nerfed Arena Guard and its branches.</h4>
  <ul>
    <li>Temporarily removed The Infestation and The Distance modes from the lore server; they will make a comeback, new and improved, in the next update.</li>
    <li>Made AI of bots, bosses, and enemies SLIGHTLY smarter.</li>
  </ul>
  <h4>- AND BECAUSE IT'S THE MONTH OF OCTOBER, WE INITIATED THE HALLOWEEN EVENT!:</h4>
  <ul>
    <li>The Maze Walls are now painted in black, purple, and orange!</li>
    <li>Death now roams Ranar's Arena; he will hunt you down, he cannot die, and cannot be escaped, he is inevitable, all you can do is delay death.</li>
  </ul>
</section>

<!-- Prophecy Version 0.0.2 -->
<section id="prophecy-v0-0-2">
  <h2># Prophecy Version 0.0.2</h2>
  <ul>
    <li>adjusted siege to stop creating normal waves along side 'Epic' waves</li>
    <li>Nerfed the Sardonyx Epic Wave.</li>
    <li>fixed several bugs, including the graveyard/plague mode one.</li>
    <li>found a pipe bomb in my closet</li>
    <li>added Racer(from The Distance lore mode) to Adept.</li>
    <li>The Guardians repainted the rogue bosses to blue, no more shall they be viewed as potential baddies.</li>
    <li>
      - Added The Awakening
      <ul>
        <li>Fight off enemies to reach end</li>
        <li>(this lore mode is very important to Ranar's prophecy)</li>
      </ul>
    </li>
    <li>
      and because of this, we added Arena Guard as a legendary class!:
      <ul>
        <li>Obtain this by either getting 1 Mil on the Neutral Alliance OR obtaining 1 Mil as a Master in Siege.</li>
        <li>When you become it, your score is divided by 10, why?</li>
        <li>Because it has a BUNCH of branches! Yep, thanks to J.J., this class has a good amount of choices, and you get more upgrades as you gain score!</li>
      </ul>
    </li>
    <li>also added the Aetherian Enemies and Bosses to siege.</li>
  </ul>
</section>

<!-- Prophecy Version 0.0.1 -->
<section id="prophecy-v0-0-1">
  <h2># Prophecy Version 0.0.1</h2>
  <h4>-Siege</h4>
  <ul>
    <li>Fixed the multiple waves glitch and the instant loss.</li>
    <li>You now spawn with 3 extra skill points per 10 waves.</li>
    <li>On the 50th wave and every 10 waves beyond that, EVERY epic wave boss will spawn.</li>
  </ul>
  <h4>-New Tanks:</h4>
  <ul>
    <li>Added Skulker, the Invisible Hunter. Branches off Hunter and Creeper.</li>
    <li>Added Lordtrapper, yea, just...add 2 Drone spawners. Branches off Overtrapper and Overlord.</li>
    <li>Added Octo-Builder, Builder X 8. Branches off Quad-Builder.</li>
    <li>Added Shade, the Ultimate Nightmare. Branches off Creeper.</li>
  </ul>
</section>

<!-- Prophecy Version 0.0.0 -->
<section id="prophecy-v0-0-0">
  <h2># Prophecy Version 0.0.0</h2>
  <h3>Twilight's Prophecy (new era introduction).</h3>
  <h4>- Added a new racing lore mode, The Distance.</h4>
  <ul>
    <li>In this mode, you play as a unique tank called The Racer.</li>
    <li>Reach lap 7 to win the race, but be cautious, something is there with you.</li>
    <li>Reworked Siege with boss events and more rebel bosses.</li>
    <li>Balanced bosses in The Controlled, making them killable.</li>
    <li>Added new tanks: Collider and Smashersphere.</li>
    <li>Split the server into two: ranars-prophecy.glitch.me and ranars-arena.glitch.me.</li>
  </ul>
</section>

  </div>


 
              <div class="game-modes">
    <h2>Possible Game Modes</h2>
    <h2>(Chosen randomly on server starts and restarts):</h2>
    <ul>` +
          modeList.join(`<br><br>`) +
          /*<li>FFA Maze</li>
      <li>Open 4TDM</li>
      <li>Open 4TDM Growth</li>
      <li>4TDM Maze</li>
      <li>Open 3TDM Graveyard</li>
      <li>3TDM Graveyard</li>
      <li>FFA (Maze) Polygons Fight Back</li>
      <li>King of the Hill</li>
      <li>4TDM Open Domination</li>
      <li>4TDM Maze Domination</li>
      <li>4TDM Fortress Domination</li>
      <li>4TDM Maze Fortress Domination</li>
      <li>Territory Control</li>
      <li>2TDM Soccer</li>
      <li>4TDM Soccer</li>
      <li>Siege</li>
      <li>Maze Plague</li>
      <li>Open Plague</li>
      */
          `</ul>
    
  </div>


  <div class="game-modes">
  <h1>Contributors:</h1>
  <ul>
    <li style="color: purple">Main Developers:</li>
    <br>
      <li>Ranar</li>
      <li>Kris</li>
      <li>J.J.</li>
    <br>
    <li style="color: red">Testers: </li>
    <br>
      <li>Ranar</li>
      <li>J.J.</li>
      <li>Kris</li>
    <br>
    <li style="color: green">Special Thanks: </li>
    <br>
    <li>Alex, The Good Gamer: Helped Test for a while.</li>
    <li>Sebalonian: Helped Test for a while.</li>
    <li>Twilight: Helped me Develop for the longest time.</li>
    <li>Annoying Dog: Was my advisor and helps test occasionally.</li>
    <li>O'Chunks: For making a video on my server.</li>
    <li>Ryan, The Tiny King: For making a couple of videos on my server.</li>
    <li>BED_NOOB: Helping with server security.</li>
    <li>Ino(but real): one of my first testers, he has helped alot.</li>
    <li>Neko: Helped me alot in my early days for coding and gave me this very neat template.</li>
    <li>Taureon: Helped me in my early days with coding.</li>
    <li>ChatGPT and It's Creators: Overall just very helpful tool, got Kris trough 9 assignments</li>
  </ul>
    </div>
</body>
</html>

  `
      );
      break;
    case "/mockups.json":
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.writeHead(200);
      res.end(mockupJsonData);
      break;
    case "/chat":
      // Handle chat requests here
      if (query.chat) {
        let ip = req.headers["x-forwarded-for"].split(",")[0];
        let socket = sockets.clients.filter((s) => {
          return s.ip == ip;
        })[0];

        if (!socket) {
          message = " You must first connect to the game!";
        } else {
          if (
            Date.now() - socket.lastMessage.time < c.messageLimit &&
            !socket.isDeveloper
          ) {
            message = `You must wait ${Math.floor(
              c.messageLimit / 1000
            )} seconds before sending another message!`;
          } else {
            let chat = decodeHTML(query.chat);
            if (typeof chat == "string") {
              if (chat.length > 100) {
                chat = chat.slice(0, 100);
              }
              let tag = "[PLAYER]";
              if (socket) {
                let player = socket.player;
                if (socket.isDeveloper) tag = "[DEV]";
                if (
                  chat.trim().replace(" ", "") == socket.lastMessage.content &&
                  !socket.isDeveloper
                ) {
                  message = "You can't send the same message twice!";
                } else {
                  c.recentMessage10 = c.recentMessage9;
                  c.recentMessage9 = c.recentMessage8;
                  c.recentMessage8 = c.recentMessage7;
                  c.recentMessage7 = c.recentMessage6;
                  c.recentMessage6 = c.recentMessage5;
                  c.recentMessage5 = c.recentMessage4;
                  c.recentMessage4 = c.recentMessage3;
                  c.recentMessage3 = c.recentMessage2;
                  c.recentMessage2 = c.recentMessage1;
                  c.recentMessage1 = cleanText(
                    tag +
                      " " +
                      `${
                        socket.name && socket.name.replace(" ", "") !== ""
                          ? socket.name
                          : "unnamed"
                      }: ${chat}`
                  );

                  // Check if the message is a command
                  for (let i = 0; i < socket.commandLoopCount; i++) {
                    if (chat.startsWith("/")) {
                      const command = chat.slice(1);
                      message = "Command Initiated!";
                      if (command === "help") {
                        message = `
<!DOCTYPE html>
<html lang="en">
<p>Here is the list of commands:</p>
<li>help, (displays this message).</li>
<li>vote [mode name], (the next mode will be the highest voted one, if voting is allowed).</li>
<li>mode list, (shows the list of what modes exist in this server).</li>
<li>player list, (shows # of players and their data(if you are a dev)).</li>
<li>set team [team ID], (changes your team to the ID when you respawn).</li>
<li>reset, (your score, skill points, tank and special effects are set to the default).</li>
<li>self destruct, (kills you)</li>
<li>score cheat [number between 0 and 26263], (if your score is lower or equal to 26263 when you respawn, you will respawn as the selected score).</li>
<li>tda [password], (grants some boons and access to dev commands and testbed, FOR DEVS ONLY!)."</li>`;
                      } else if (command.includes("set team")) {
                        socket.rememberedTeam =
                          command.slice(command.indexOf("m") + 2) * 1;
                        let goof;
                        if (c.TEAMS === "color") {
                          goof = socket.rememberedTeam;
                        } else goof = -socket.rememberedTeam;
                        message =
                          "When you spawn your team ID will be: " + goof + ".";
                      } else if (command.includes("score cheat")) {
                        socket.customScore =
                          command.slice(command.indexOf("t") + 2) * 1;
                        if (socket.customScore > 26263 && !socket.trueDev) {
                          message = "Your base score cannot exceed 26263!";
                          socket.customScore = 26263;
                        }
                      } else if (command.includes("player list")) {
                        let list = [];
                        let goof,
                          thing1 = "",
                          thing2 = "";
                        sockets.clients.forEach((dude) => {
                          if (socket.trueDev)
                            thing1 =
                              ", ID: " + dude.ID + ", IP: " + dude.ip + "</li>";

                          if (dude.name === "") {
                            goof = "Unnamed Player";
                          } else goof = dude.name;
                          list.push("<li>" + goof + thing1 + "</li>");
                        });
                        let playerList = "<ul>" + list.join("") + "</ul>"; // Join elements without separator
                        message =
                          "There are " +
                          c.playerCount +
                          " players online:\n" +
                          playerList;
                      } else if (command.includes("mode list")) {
                        message =
                          `Here is the list of modes, type as they are for voting, if you are allowed to: <br><br>` +
                          modeList.join(`<br><br>`);
                      } else if (command.includes("vote")) {
                        if (serverType === "normal") {
                          let vote = command.slice(command.indexOf("e") + 2);
                          if (!c.voteList.includes(socket.ip)) {
                            let re = 1;
                            if (socket.trueDev) re = 100;
                            for (let i = 0; i < re; i++) {
                              if (modeList.includes(vote)) {
                                currentState.modeVotes.push(vote);
                                message =
                                  "You have successfully voted on " +
                                  vote +
                                  "!";
                              } else
                                message =
                                  "That isn't a valid mode, try using /mode list!";
                            }
                          } else message = "You cannot vote again!";
                        } else
                          message = "You cannot vote on modes in this server!";
                      } else if (command.includes("reset")) {
                        if (player.body) {
                          if (
                            room.isIn("bas" + -player.body.team, player.body) ||
                            (player.body.invuln &&
                              player.body.label !== "Spectator") ||
                            socket.trueDev
                          ) {
                            player.body.upgrades = [];
                            player.body.define(Class[c.startingClass]);
                            player.body.skill.setCaps([
                              9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
                            ]);
                            player.body.skill.reset();
                            player.body.skill.score = 26263;
                            player.body.skill.set([
                              0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                            ]);

                            player.body.maxChildren = 0;
                            player.body.intangibility = false;
                            player.body.invisible = [100, 0];
                            player.body.alpha = 100;
                            player.body.specialEffect = "none";
                            player.body.invuln = true;
                            player.body.ignoreCollision = false;

                            message = "Your stats and tank have been reset!";
                          } else
                            message =
                              "You must be in your team's base or be invulnerable to reset! You cannot reset as a spectator!";
                        } else
                          message =
                            "You need to spawn for this command to work!";
                      } else if (command.includes("self destruct")) {
                        if (player.body) {
                          if (
                            room.isIn("bas" + -player.body.team, player.body) ||
                            player.body.invuln ||
                            player.body.label === "Spectator" ||
                            socket.trueDev
                          ) {
                            message = "You have successfully self destructed.";
                            player.body.godMode = false;
                            player.body.kill();
                          } else
                            message =
                              "You must be in either your team's base, invulnerable, or a Spectator in order to use this command.";
                        } else
                          message =
                            "You need to spawn for this command to work!";
                      } else if (command.includes("tda")) {
                        let parts = command.split(" "),
                          password = parts[1],
                          devList = [
                            process.env.ranar,
                            process.env.jj,
                            process.env.kris,
                          ];

                        if (devList.includes(password))
                          socket.isDeveloper = true;
                        if (socket.isDeveloper) {
                          if (!socket.trueDev) {
                            message =
                              "Developer Access enabled! Try using /dev help!";
                            setTimeout(() => {
                              socket.trueDev = true;
                              if (player.body) player.body.trueDev = true;
                            }, 1000);
                          } else {
                            message = "Developer Access disabled!";
                            setTimeout(() => {
                              socket.trueDev = false;
                              if (player.body) player.body.trueDev = false;
                            }, 1000);
                          }
                        } else
                          message =
                            "You do not have permission to use this command!";
                      } else if (socket.trueDev) {
                        if (command.includes("dev help")) {
                          //hey ranar. I cant talk in discord rn.//AYE, NEITHER CAN I LOL.
                          message = `
<!DOCTYPE html>
<html lang="en">
<p>Here is the list of commands:</p>
<li>dev help, (displays this message).</li>
<li>spawn [entity export name, x and y coordinates], (spawns a entity at selected co-ordinates).</li>
<li>team [team id], (your team and color will become the id).</li>
<li>define x [number 0 or greater]/define y [number 0 or greater], (defines your co-ordinates for your other commands).</li>
<li>define ID [some sort of 4 digit number], (defines the team for your other commands).</li>
<li>toggle AI, (enables or disables AI across the server).</li>
<li>tgm, (enables or disables god mode for yourself).</li>
<li>transform [projectiles, bots, bosses, enemies, polygons, walls, misc, self, players or player ID and entity name], (completely transforms everything).</li>
<li>team [projectiles, bots, bosses, enemies, polygons, walls, misc, self, players or player ID and any number], (completely teams everything).</li>
<li>see team, (see what team you are on).</li>
<li>find loc, (your location will be shown in a x, y format).</li>
<li>kill [projectiles, bots, bosses, enemies, polygons, walls, misc, players or player ID], (kills everything).</li>
<li>obliterate [projectiles, bots, bosses, enemies, polygons, walls, misc, players or player ID], (deletes everything).</li>
<li>heal [projectiles, bots, bosses, enemies, polygons, walls, misc, self, players or player ID], (completely heals everything).</li>
<li>color [projectiles, bots, bosses, enemies, polygons, walls, misc, self, players or player ID and a number between 0 and 50], (completely colors everything).</li>
<li>size [projectiles, bots, bosses, enemies, polygons, walls, misc, self, players or player ID and a number above 0], (completely changes the size of everything).</li>
<li>score [projectiles, bots, bosses, enemies, polygons, walls, misc, self, players or player ID and any number], (gives score).</li>
<li>team setup [ffa, tdm, 1 team, 2 teams, 3 teams], (changes the mode's teams).</li>
<li>broadcast [message], (anounces to the server whatever you write).</li>
<li>propertize entity [projectiles, bots, bosses, enemies, polygons, walls, misc, self, players or player ID and a property and a value], (changes the property of the entity).</li>
<li>propertize global [c or room, and a property and a value], (changes the property of the server or room configuration).</li>
<li>creation team [number], (entities created by spawn command shall be on that team).</li>
<li>points [number], (give that entity skill points)</li>
<li>repeat [number], (Your commands will trigger multiple times).</li>
<li>set wave [number], (Sets the siege wave to the number).</li>
<li>pMute [player's ip], (mutes the player, also disables commands).</li>
<li>pKick [player's ip], (kicks the player).</li>
<li>pBan [player's ip], (temporarily bans the player).</li>
<li>pUnmute [player's ip (use /player list to see them)], (unmutes the player).</li>
<li>pUnban [player's ip (use /player list to see them)], (unbans the player).</li>
`;
                        } else if (command.includes("team setup")) {
                          let load = command.slice(command.indexOf("p") + 2);
                          switch (load) {
                            case "tdm":
                              c.TEAMS = [1, 2, 3, 4];
                              c.BOT_TEAMS = [1, 2, 3, 4];
                              message = "Teams changed to tdm!";
                              break;
                            case "1 team":
                              c.TEAMS = [1];
                              c.BOT_TEAMS = [1];
                              message = "Teams changed to 1 team!";
                              break;
                            case "2 teams":
                              c.TEAMS = [2];
                              c.BOT_TEAMS = [2];
                              message = "Teams changed to 2 teams!";
                              break;
                            case "3 teams":
                              c.TEAMS = [3];
                              c.BOT_TEAMS = [3];
                              message = "Teams changed to 3 teams!";
                              break;
                            case "ffa":
                            default:
                              c.TEAMS = "color";
                              c.BOT_TEAMS = "color";
                              message = "Teams changed to ffa!";
                          }
                        } else if (command.includes("broadcast")) {
                          let load = command.slice(command.indexOf("t") + 2);
                          sockets.broadcast(load);
                        } else if (command.includes("see team")) {
                          if (player.body) {
                            message =
                              "Your team ID is: " + player.body.team + ".";
                          } else
                            message =
                              "You need to spawn for this command to work!";
                        } else if (command.includes("close server")) {
                          message = "You have closed the server!";
                          closeArena();
                          util.log(socket.name + " has closed the arena!");
                        } else if (command.includes("define ID")) {
                          let parts = command.split(" ");
                          ID = parts[2] * 1; // Join
                        } else if (command.includes("toggle AI")) {
                          if (c.globalAIDisable) {
                            message = "AI enabled!";
                            setTimeout(() => {
                              c.globalAIDisable = false;
                            }, 1000);
                          } else if (!c.globalAIDisable) {
                            message = "AI disabled!";
                            setTimeout(() => {
                              c.globalAIDisable = true;
                            }, 1000);
                          }
                        } else if (command.includes("creation team")) {
                          let parts = command.split(" ");
                          socket.creationTeam = parts[2] * 1;
                        } else if (command.includes("spawn")) {
                          let parts = command.split(" ");
                          let entity = parts[1]; // This should be "polygons", "players", etc.
                          let ex = parts[2] * 1; // Join
                          let wy = parts[3] * 1; // The last part is the additional parameter (e.g., "3")
                          util.log(ex + ", " + wy);
                          let o = new Entity({ x: ex, y: wy });
                          o.define(Class[entity]);
                          o.team = socket.creationTeam;

                          //console.log(entity);
                        } else if (command.includes("propertize entity")) {
                          let parts = command.split(" ");
                          let entity = parts[2]; // This should be "polygons", "players", etc.
                          let property = parts[3];
                          let value;
                          if (parseInt(parts[4])) value = parts[4] * 1;
                          else value = parts[4];

                          entities.forEach((instance) => {
                            if (
                              (entity === "projectiles" &&
                                instance.isProjectile) ||
                              (entity === "polygons" &&
                                instance.type === "food") ||
                              (entity === "enemies" && instance.isEnemy) ||
                              (entity === "players" && instance.isPlayer) ||
                              (entity === "bots" && instance.isBot) ||
                              (entity === "bosses" && instance.isBoss) ||
                              (entity === "walls" &&
                                (instance.type === "wall" ||
                                  instance.type === "squareWall")) ||
                              (entity === "misc" &&
                                (instance.structure ||
                                  instance.type === "base")) ||
                              (entity === "self" &&
                                instance.ip === socket.ip) ||
                              (entity === "ID" && instance.id === ID) ||
                              entity === "all"
                            ) {
                              instance[property] = value;
                            }
                          });
                        } else if (command.includes("propertize global")) {
                          let parts = command.split(" ");
                          let global = parts[2];
                          let property = parts[3];
                          let value;
                          if (parseInt(parts[4])) value = parts[4] * 1;
                          else value = parts[4];
                          if (global === "room") {
                            room[property] = value;
                          } else {
                            c[property] = value;
                          }
                          sockets.changeroom();
                        } else if (command.includes("find loc")) {
                          if (player.body) {
                            message =
                              "Your location is: x; " +
                              Math.round(player.body.x) +
                              " y; " +
                              Math.round(player.body.y) +
                              ".";
                          } else
                            message =
                              "You need to spawn for this command to work!";
                        } else if (command.includes("pMute")) {
                          let parts = command.split(" ");
                          let playerIP = parts[1];
                          sockets.runPunishments("mute", playerIP);
                        } else if (command.includes("pKick")) {
                          let parts = command.split(" ");
                          let playerIP = parts[1];
                          sockets.runPunishments("kick", playerIP);
                        } else if (command.includes("pBan")) {
                          let parts = command.split(" ");
                          let playerIP = parts[1];
                          sockets.runPunishments("kick", playerIP);
                          sockets.runPunishments("ban", playerIP);
                        } else if (command.includes("pUnmute")) {
                          let parts = command.split(" ");
                          let playerIP = parts[1];
                          sockets.runPunishments("unmute", playerIP);
                        } else if (command.includes("pUnban")) {
                          let parts = command.split(" ");
                          let playerIP = parts[1];
                          sockets.runPunishments("unban", playerIP);
                        } else if (command.includes("kill")) {
                          let parts = command.split(" ");
                          let entity = parts[1]; // This should be "polygons", "players", etc.
                          let color = parts.slice(2).join(" "); // Join
                          entities.forEach((instance) => {
                            if (
                              (entity === "projectiles" &&
                                instance.isProjectile) ||
                              (entity === "polygons" &&
                                instance.type === "food") ||
                              (entity === "enemies" && instance.isEnemy) ||
                              (entity === "players" && instance.isPlayer) ||
                              (entity === "bots" && instance.isBot) ||
                              (entity === "bosses" && instance.isBoss) ||
                              (entity === "walls" &&
                                (instance.type === "wall" ||
                                  instance.type === "squareWall")) ||
                              (entity === "misc" &&
                                (instance.structure ||
                                  instance.type === "base")) ||
                              (entity === "self" &&
                                instance.ip === socket.ip) ||
                              (entity === "ID" && instance.id === ID) ||
                              entity === "all"
                            ) {
                              instance.godMode = false;
                              instance.kill();
                            }
                          });
                        } else if (command.includes("set wave")) {
                          let parts = command.split(" ");
                          let wave = parts[2]; // This should be "polygons", "players", etc.
                          c.bossWave = wave * 1;
                          currentState.bossWaves = wave * 1;
                        } else if (command.includes("obliterate")) {
                          let parts = command.split(" ");
                          let entity = parts[1]; // This should be "polygons", "players", etc.
                          let color = parts.slice(2).join(" "); // Join
                          entities.forEach((instance) => {
                            if (
                              (entity === "projectiles" &&
                                instance.isProjectile) ||
                              (entity === "polygons" &&
                                instance.type === "food") ||
                              (entity === "enemies" && instance.isEnemy) ||
                              (entity === "players" && instance.isPlayer) ||
                              (entity === "bots" && instance.isBot) ||
                              (entity === "bosses" && instance.isBoss) ||
                              (entity === "walls" &&
                                (instance.type === "wall" ||
                                  instance.type === "squareWall")) ||
                              (entity === "misc" &&
                                (instance.structure ||
                                  instance.type === "base")) ||
                              (entity === "self" &&
                                instance.ip === socket.ip) ||
                              (entity === "ID" && instance.id === ID) ||
                              entity === "all"
                            ) {
                              instance.kill();
                              instance.destroy();
                            }
                          });
                        } else if (command.includes("size")) {
                          let parts = command.split(" ");
                          let entity = parts[1]; // This should be "polygons", "players", etc.
                          let size = parts.slice(2).join(" "); // Join
                          entities.forEach((instance) => {
                            if (
                              (entity === "projectiles" &&
                                instance.isProjectile) ||
                              (entity === "polygons" &&
                                instance.type === "food") ||
                              (entity === "enemies" && instance.isEnemy) ||
                              (entity === "players" && instance.isPlayer) ||
                              (entity === "bots" && instance.isBot) ||
                              (entity === "bosses" && instance.isBoss) ||
                              (entity === "walls" &&
                                (instance.type === "wall" ||
                                  instance.type === "squareWall")) ||
                              (entity === "misc" &&
                                (instance.structure ||
                                  instance.type === "base")) ||
                              (entity === "self" &&
                                instance.ip === socket.ip) ||
                              (entity === "ID" && instance.id === ID) ||
                              entity === "all"
                            ) {
                              instance.SIZE = size;
                            }
                          });
                        } else if (command.includes("points")) {
                          let parts = command.split(" ");
                          let entity = parts[1]; // This should be "polygons", "players", etc.
                          let skill = parts[2] * 1; // Join
                          entities.forEach((instance) => {
                            if (
                              (entity === "projectiles" &&
                                instance.isProjectile) ||
                              (entity === "polygons" &&
                                instance.type === "food") ||
                              (entity === "enemies" && instance.isEnemy) ||
                              (entity === "players" && instance.isPlayer) ||
                              (entity === "bots" && instance.isBot) ||
                              (entity === "bosses" && instance.isBoss) ||
                              (entity === "walls" &&
                                (instance.type === "wall" ||
                                  instance.type === "squareWall")) ||
                              (entity === "misc" &&
                                (instance.structure ||
                                  instance.type === "base")) ||
                              (entity === "self" &&
                                instance.ip === socket.ip) ||
                              (entity === "ID" && instance.id === ID) ||
                              entity === "all"
                            ) {
                              instance.skill.points = skill;
                            }
                          });
                        } else if (command.includes("score")) {
                          let parts = command.split(" ");
                          let entity = parts[1]; // This should be "polygons", "players", etc.
                          let score = parts[2] * 1; // Join
                          entities.forEach((instance) => {
                            if (
                              (entity === "projectiles" &&
                                instance.isProjectile) ||
                              (entity === "polygons" &&
                                instance.type === "food") ||
                              (entity === "enemies" && instance.isEnemy) ||
                              (entity === "players" && instance.isPlayer) ||
                              (entity === "bots" && instance.isBot) ||
                              (entity === "bosses" && instance.isBoss) ||
                              (entity === "walls" &&
                                (instance.type === "wall" ||
                                  instance.type === "squareWall")) ||
                              (entity === "misc" &&
                                (instance.structure ||
                                  instance.type === "base")) ||
                              (entity === "self" &&
                                instance.ip === socket.ip) ||
                              (entity === "ID" && instance.id === ID) ||
                              entity === "all"
                            ) {
                              instance.skill.score = score;
                            }
                          });
                        } else if (command.includes("heal")) {
                          let parts = command.split(" ");
                          let entity = parts[1]; // This should be "polygons", "players", etc.
                          entities.forEach((instance) => {
                            if (
                              (entity === "projectiles" &&
                                instance.isProjectile) ||
                              (entity === "polygons" &&
                                instance.type === "food") ||
                              (entity === "enemies" && instance.isEnemy) ||
                              (entity === "players" && instance.isPlayer) ||
                              (entity === "bots" && instance.isBot) ||
                              (entity === "bosses" && instance.isBoss) ||
                              (entity === "walls" &&
                                (instance.type === "wall" ||
                                  instance.type === "squareWall")) ||
                              (entity === "misc" &&
                                (instance.structure ||
                                  instance.type === "base")) ||
                              (entity === "self" &&
                                instance.ip === socket.ip) ||
                              (entity === "ID" && instance.id === ID) ||
                              entity === "all"
                            ) {
                              instance.shield.amount = instance.shield.max;
                              instance.health.amount = instance.health.max;
                            }
                          });
                        } else if (command.includes("color")) {
                          let parts = command.split(" ");
                          let entity = parts[1]; // This should be "polygons", "players", etc.
                          let color = parts[2] * 1; // Join
                          entities.forEach((instance) => {
                            if (
                              (entity === "projectiles" &&
                                instance.isProjectile) ||
                              (entity === "polygons" &&
                                instance.type === "food") ||
                              (entity === "enemies" && instance.isEnemy) ||
                              (entity === "players" && instance.isPlayer) ||
                              (entity === "bots" && instance.isBot) ||
                              (entity === "bosses" && instance.isBoss) ||
                              (entity === "walls" &&
                                (instance.type === "wall" ||
                                  instance.type === "squareWall")) ||
                              (entity === "misc" &&
                                (instance.structure ||
                                  instance.type === "base")) ||
                              (entity === "self" &&
                                instance.ip === socket.ip) ||
                              (entity === "ID" && instance.id === ID) ||
                              entity === "all"
                            ) {
                              instance.color = color;
                            }
                          });
                        } else if (command.includes("team")) {
                          let parts = command.split(" ");
                          let entity = parts[1]; // This should be "polygons", "players", etc.
                          let myTeam = parts[2] * 1; // Join
                          entities.forEach((instance) => {
                            if (
                              (entity === "projectiles" &&
                                instance.isProjectile) ||
                              (entity === "polygons" &&
                                instance.type === "food") ||
                              (entity === "enemies" && instance.isEnemy) ||
                              (entity === "players" && instance.isPlayer) ||
                              (entity === "bots" && instance.isBot) ||
                              (entity === "bosses" && instance.isBoss) ||
                              (entity === "walls" &&
                                (instance.type === "wall" ||
                                  instance.type === "squareWall")) ||
                              (entity === "misc" &&
                                (instance.structure ||
                                  instance.type === "base")) ||
                              (entity === "self" &&
                                instance.ip === socket.ip) ||
                              (entity === "ID" && instance.id === ID) ||
                              entity === "all"
                            ) {
                              instance.team = myTeam;
                              if (c.TEAMS === "color" && instance.team >= 0) {
                                instance.color = instance.team;
                              } else {
                                switch (instance.team) {
                                  case -1:
                                    instance.color = 10;
                                    break;
                                  case -2:
                                    instance.color = 18;
                                    break;
                                  case -3:
                                    instance.color = 7;
                                    break;
                                  case -4:
                                    instance.color = 19;
                                    break;
                                  case -5:
                                    instance.color = 13;
                                    break;
                                  case -6:
                                    instance.color = 5;
                                    break;
                                  default:
                                    instance.color = 12;
                                }
                              }
                              if (instance.team === -100) {
                                instance.color = 3;
                              }
                              if (instance.team === -101) {
                                instance.color = 16;
                              }
                            }
                          });
                        } else if (command.includes("transform")) {
                          let parts = command.split(" ");
                          let entity = parts[1]; // This should be "polygons", "players", etc.
                          let become = parts.slice(2).join(" "); // Join
                          entities.forEach((instance) => {
                            if (
                              (entity === "projectiles" &&
                                instance.isProjectile) ||
                              (entity === "polygons" &&
                                instance.type === "food") ||
                              (entity === "enemies" && instance.isEnemy) ||
                              (entity === "players" && instance.isPlayer) ||
                              (entity === "bots" && instance.isBot) ||
                              (entity === "bosses" && instance.isBoss) ||
                              (entity === "walls" &&
                                (instance.type === "wall" ||
                                  instance.type === "squareWall")) ||
                              (entity === "misc" &&
                                (instance.structure ||
                                  instance.type === "base")) ||
                              (entity === "self" &&
                                instance.ip === socket.ip) ||
                              (entity === "ID" && instance.id === ID) ||
                              entity === "all"
                            ) {
                              instance.define(Class[become]);
                            }
                          });
                        } else if (command.includes("toggle graveyard")) {
                          if (c.PLAGUE) {
                            message = "Graveyard disabled!";
                            setTimeout(() => {
                              c.PLAGUE = false;
                            }, 1000);
                          } else if (!c.PLAGUE) {
                            message = "Graveyard enabled!";
                            setTimeout(() => {
                              c.PLAGUE = true;
                            }, 1000);
                          }
                        } else if (command.includes("toggle plague")) {
                          if (c.necro) {
                            message = "Plague disabled!";
                            setTimeout(() => {
                              c.necro = false;
                            }, 1000);
                          } else if (!c.necro) {
                            message = "Plague enabled!";
                            setTimeout(() => {
                              c.necro = true;
                            }, 1000);
                          }
                        } else if (command.includes("toggle growth")) {
                          if (c.GROWTH) {
                            message = "Growth disabled!";
                            setTimeout(() => {
                              c.GROWTH = false;
                            }, 1000);
                          } else if (!c.GROWTH) {
                            message = "Growth enabled!";
                            setTimeout(() => {
                              c.GROWTH = true;
                            }, 1000);
                          }
                        } else if (command.includes("repeat")) {
                          let parts = command.split(" ");
                          socket.commandLoopCount = parts[1];
                        } else if (command.includes("tgm")) {
                          if (player.body) {
                            if (player.body.godMode) {
                              message = "God Mode disabled!";
                              setTimeout(() => {
                                player.body.godMode = false;
                              }, 1000);
                            } else if (!player.body.godMode) {
                              message = "God Mode enabled!";
                              setTimeout(() => {
                                player.body.godMode = true;
                              }, 1000);
                            }
                          } else
                            message =
                              "You need to spawn for this command to work!";
                        } else {
                          if (socket.isDeveloper) {
                            message =
                              "Unknown Command! Try using /help or /dev help!";
                          } else {
                            message = "Unknown Command! Try using /help!";
                          }
                        }
                      } else
                        message =
                          "You do not have permission to use this command!";
                      c.recentMessage1 = "";
                    } else {
                      if (c.muteList.includes(socket.ip)) {
                        message = "You have been muted, message was not sent!";
                        c.recentMessage1 = "";
                      } else {
                        sockets.broadcast(c.recentMessage1);
                        util.log(c.recentMessage1);
                        message = "Chat message sent successfully!";
                      }
                    }
                  }
                  socket.lastMessage = {
                    time: Date.now(),
                    content: chat,
                  };
                }
              }
              res.writeHead(302, { Location: redirectLink });
            }
          }
        }
      }
      res.end(
        `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>` +
          title +
          ` Chat</title>
    <link rel="icon" type="image/png" href="https://cdn.glitch.global/5f27ad97-07cd-4f67-922e-41dfb3ef64a5/grgagegu.webp?v=1713072716793
    " sizes="128x128">
    <meta name="description" content="Website for chatting in the arras Private server; Ranar's Prophecy.">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * {
        box-sizing: border-box;
      }
      [hidden] {
        display: none !important;
      }
      body {
        font-family: Arial, sans-serif;
        /* background-color: #f2f2f2; */
      }
      input[type="text"] {
        padding: 8px;
        width: 100%;
        margin-bottom: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      p {
        font-size: 16px;
      }
    </style>
  </head>
  <body>
    <p>${message}</p>
    <p>${c.recentMessage1}</p>
    <p>${c.recentMessage2}</p>
    <p>${c.recentMessage3}</p>
    <p>${c.recentMessage4}</p>
    <p>${c.recentMessage5}</p>
    <p>${c.recentMessage6}</p>
    <p>${c.recentMessage7}</p>
    <p>${c.recentMessage8}</p>
    <p>${c.recentMessage9}</p>
    <p>${c.recentMessage10}</p>
    <form>
      <input type="text" name="chat" placeholder="Insert message ..." />
    </form>
  </body>
</html>
`
      );
      break;
    default:
      res.writeHead(404);
      res.end();
  }
});
process.on("SIGINT", () => {
  cleanup();
});

process.on("SIGTERM", () => {
  cleanup();
});

function cleanup() {
  console.log("Shutting down server gracefully.");
  sockets.broadcast(
    "Server Shutting Down! Possible Error May have occurred, please rejoin in 30 seconds!"
  );
  room.closed = true;
  c.extinction = true;
  c.DEADLY_BORDERS = true;
  server.close(() => {
    console.log("Server closed.");
    // Remove lock file
    fs.unlinkSync(lockFilePath);
    setTimeout(() => {
      sockets.broadcast("Closing!");
      process.exit(0);
    }, 15000);
  });
}
let websockets = (() => {
  // Configure the websocketserver
  let config = { server: server };
  server.listen(process.env.PORT || 8080, function httpListening() {
    util.log(
      new Date() +
        ". Joint HTTP+Websocket server turned on, listening on port " +
        server.address().port +
        "."
    );
  });

  // Build it
  return new WebSocket.Server(config);
})().on("connection", sockets.connect);

// Bring it to life
setInterval(gameloop, room.cycleSpeed);
setInterval(maintainloop, 200);
setInterval(speedcheckloop, 1000);
