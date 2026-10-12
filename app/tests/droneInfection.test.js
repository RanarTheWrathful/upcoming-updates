"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const infection = require("../lib/droneInfection");
const definitions = require("../lib/definitions");

const genericTank = { SHAPE: 0 };
const drone = { PARENT: [genericTank], TYPE: "drone", SHAPE: 3 };
const sunchip = { PARENT: [drone], NECRO: true, SHAPE: 4 };
const eggChip = { PARENT: [sunchip], SHAPE: 0 };
const sterileSunchip = { PARENT: [sunchip], NECRO: false };

assert.strictEqual(infection.getInfectiousShape([sunchip]), 4,
  "NECRO and SHAPE should inherit from the produced drone definition");
assert.strictEqual(infection.getInfectiousShape([eggChip]), 0,
  "a child definition's shape should override its parent's shape");
assert.strictEqual(infection.getInfectiousShape([sterileSunchip]), undefined,
  "NECRO:false should override an infectious parent");
assert.strictEqual(
  infection.getInfectiousShape([sunchip, { SHAPE: 5 }]),
  5,
  "later projectile overrides should determine the produced shape"
);


assert.strictEqual(infection.getInfectiousShape(definitions.necromancer.GUNS[0].PROPERTIES.TYPE), 4,
  "the real Necromancer should be recognized as producing square-infecting drones");
assert.strictEqual(infection.getInfectiousShape(definitions.infestor.GUNS[0].PROPERTIES.TYPE), 0,
  "the real Infestor should be recognized as producing egg-infecting drones");
assert.strictEqual(infection.getInfectiousShape(definitions.maleficitor.GUNS[0].PROPERTIES.TYPE), 4,
  "the real Maleficitor should inherit infection behavior from Sunchip");
assert.strictEqual(infection.getInfectiousShape(definitions.polymancer.GUNS[0].PROPERTIES.TYPE), undefined,
  "ordinary drones should not make a tank an infection rammer without NECRO:true");

const square = { type: "food", shape: 4, foodLevel: 2 };
const triangle = { type: "food", shape: 3, foodLevel: 2 };
const tank = {
  type: "tank",
  label: "Necromancer",
  maxChildren: 4,
  master: null,
  source: null,
  guns: [],
  turrets: [],
  children: [],
  possiblyChildren: new Set(),
};
tank.master = tank;
tank.source = tank;
const localGun = { bulletTypes: [sunchip], countsOwnKids: 1 };
tank.guns.push(localGun);
assert.strictEqual(infection.findInfectingGun(tank, square), localGun,
  "the tank should find a gun that can produce a drone for this food shape");
assert.strictEqual(infection.findInfectingGun(tank, triangle), null,
  "uninfectable shapes should not be selected for conversion");

const turret = { type: "tank", master: tank, source: tank, guns: [{ bulletTypes: [eggChip], countsOwnKids: 2 }], turrets: [] };
tank.turrets.push(turret);
assert.strictEqual(infection.findInfectingGun(tank, { type: "food", shape: 0, foodLevel: 1 }), turret.guns[0],
  "infection checks should include guns mounted on turrets");
assert.strictEqual(infection.getTankOwner(turret), tank,
  "turret guns should resolve the owning tank for total-cap accounting");

const existingDrone = { type: "drone", health: { amount: 10 } };
const existingMinion = { type: "minion", health: { amount: 10 } };
const bullet = { type: "bullet" };
const food = { type: "food", shape: 4 };
tank.possiblyChildren.add(existingDrone);
tank.possiblyChildren.add(existingMinion);
tank.possiblyChildren.add(bullet);
tank.possiblyChildren.add(food);
assert.strictEqual(infection.countOwnedDrones(tank), 2,
  "tank-wide counting should include drones/minions but exclude bullets and food");
assert.strictEqual(infection.getTankDroneLimit(tank), 4,
  "a positive tank MAX_CHILDREN value should override gun-local caps");
assert.strictEqual(infection.hasDroneCapacity(tank), true,
  "capacity remains available below the total limit");
tank.possiblyChildren.add({ type: "drone" });
tank.possiblyChildren.add({ type: "drone" });
assert.strictEqual(infection.countOwnedDrones(tank), 4);
assert.strictEqual(infection.hasDroneCapacity(tank), false,
  "all guns should share the same tank-wide drone limit");

const legacyTank = {
  type: "tank",
  maxChildren: 0,
  master: null,
  source: null,
  guns: [
    { bulletTypes: [sunchip], countsOwnKids: 3 },
    { bulletTypes: [drone], countsOwnKids: 2 },
    { bulletTypes: [{ TYPE: "bullet" }], countsOwnKids: 10 },
  ],
  turrets: [],
  children: [],
  possiblyChildren: new Set(),
};
legacyTank.master = legacyTank;
legacyTank.source = legacyTank;
assert.strictEqual(infection.getTankDroneLimit(legacyTank), 5,
  "legacy tanks without a body cap should fall back to the sum of configured drone-gun caps");

const deniedTank = {
  type: "tank", label: "Necro Tyrant", maxChildren: 5,
  master: null, source: null, guns: [localGun], turrets: [],
  children: [], possiblyChildren: new Set(),
};
deniedTank.master = deniedTank;
deniedTank.source = deniedTank;
assert.strictEqual(
  infection.findInfectingGun(deniedTank, { type: "food", shape: 3, foodLevel: 2 }),
  localGun,
  "Necro Tyrant's legacy lower-tier food exception should remain available"
);


// Exercise the actual Gun infection method from server.js without booting the
// full server, so the tank-wide cap and gun-cap bypass are regression-tested.
const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const gunStart = serverSource.indexOf("class Gun {");
const gunEnd = serverSource.indexOf("\nclass KeyManager {", gunStart);
assert(gunStart !== -1 && gunEnd > gunStart, "Gun class source should be available");
const gunContext = { module: { exports: {} }, exports: {}, droneInfection: infection, util: { remove: (arr, index) => arr.splice(index, 1) } };
vm.runInNewContext(
  serverSource.slice(gunStart, gunEnd) + "\nmodule.exports = { Gun };\n",
  gunContext,
  { filename: path.join(__dirname, "..", "server.js") }
);
const { Gun } = gunContext.module.exports;
const cappedOwner = {
  type: "tank", label: "Necromancer", maxChildren: 2,
  master: null, source: null, guns: [], turrets: [], children: [],
  possiblyChildren: new Set(), color: 9, team: -7,
};
cappedOwner.master = cappedOwner;
cappedOwner.source = cappedOwner;
const existingOwnedDrone = { type: "drone" };
cappedOwner.possiblyChildren.add(existingOwnedDrone);
const fakeGun = Object.create(Gun.prototype);
fakeGun.body = cappedOwner;
fakeGun.infectiousShape = 4;
fakeGun.countsOwnKids = 1; // This local gun cap must not limit infections.
fakeGun.children = [existingOwnedDrone]; // This gun is already at its local cap.
let bulletInitOptions = null;
fakeGun.bulletInit = (host, options) => {
  bulletInitOptions = options;
  host.type = "drone";
  host.parent = options.owner;
  host.master = options.owner;
  options.owner.possiblyChildren.add(host);
};
const infectedFood = {
  type: "food", shape: 4, foodLevel: 2, facing: 1.25, SIZE: 7,
  health: { max: 5, amount: 1 },
};
assert.strictEqual(fakeGun.infect(infectedFood, cappedOwner), true,
  "an infectious gun can convert compatible food below the tank-wide cap");
assert.strictEqual(bulletInitOptions.countTowardTank, true,
  "converted food must be registered against the tank, not the producing gun");
assert.strictEqual(infectedFood.parent, cappedOwner,
  "converted drones should be parented to the owning tank");
assert.strictEqual(infection.countOwnedDrones(cappedOwner), 2,
  "the converted drone should consume one slot in the tank-wide cap");
const atCapFood = {
  type: "food", shape: 4, foodLevel: 2, facing: 0, SIZE: 7,
  health: { max: 5, amount: 5 },
};
assert.strictEqual(fakeGun.infect(atCapFood, cappedOwner), false,
  "infection must stop at the owning tank's total drone cap");

// The real class definition stores STAT_CALCULATOR as numeric ID 7. When
// normalized, its four 5-drone spawners share one reload-scaled limit with
// infected squares rather than allowing infection to bypass the stat.
const calculatorTools = require("../lib/gunCalculator");
const necromancerDef = definitions.necromancer;
function makeNecromancer(reloadScale) {
  const owner = {
    type: "tank", label: "Necromancer", maxChildren: necromancerDef.MAX_CHILDREN,
    settings: { skillNames: necromancerDef.STAT_NAMES },
    skill: { rld: reloadScale },
    master: null, source: null, children: [], possiblyChildren: new Set(), turrets: [],
    guns: necromancerDef.GUNS.map((definition) => ({
      calculator: calculatorTools.normalizeStatCalculator(definition.PROPERTIES.STAT_CALCULATOR),
      countsOwnKids: definition.PROPERTIES.MAX_CHILDREN,
      bulletTypes: definition.PROPERTIES.TYPE,
      spawnedEntityType: infection.getSpawnedEntityType(definition.PROPERTIES.TYPE),
    })),
  };
  owner.master = owner;
  owner.source = owner;
  return owner;
}
const baseStatNecro = makeNecromancer(1);
assert.strictEqual(infection.getTankDroneLimit(baseStatNecro), 20,
  "zero Max Drone Limit stat should respect the sum of four 5-drone spawner caps");
assert.strictEqual(infection.canGunSpawnDrone(baseStatNecro, baseStatNecro.guns[0]), true);
for (let i = 0; i < 20; i++) baseStatNecro.possiblyChildren.add({ type: "drone" });
assert.strictEqual(infection.hasDroneCapacity(baseStatNecro), false,
  "infected/normal drones collectively use the base Max Drone Limit");
assert.strictEqual(infection.canGunSpawnDrone(baseStatNecro, baseStatNecro.guns[0]), false,
  "normal spawners must stop when infected drones have filled the shared limit");

const maxStatNecro = makeNecromancer(0.5);
assert.strictEqual(infection.getTankDroneLimit(maxStatNecro), 40,
  "investing in the Max Drone Limit stat doubles the necromantic cap, up to MAX_CHILDREN");
for (let i = 0; i < 39; i++) maxStatNecro.possiblyChildren.add({ type: "drone" });
assert.strictEqual(infection.canGunSpawnDrone(maxStatNecro, maxStatNecro.guns[0]), true,
  "the stat-scaled capacity remains available just below the upgraded cap");
maxStatNecro.possiblyChildren.add({ type: "drone" });
assert.strictEqual(infection.canGunSpawnDrone(maxStatNecro, maxStatNecro.guns[0]), false,
  "both spawners and infection stop at the upgraded cap");

// Exercise Gun.live itself: numeric calculator ID 7 must behave as "necro",
// and ordinary spawning must stop when infected drones fill the shared limit.
function makeLiveNecroGun(owner, cycle) {
  const gun = Object.create(Gun.prototype);
  Object.assign(gun, {
    body: owner, canShoot: true, bulletStats: "master", calculator: calculatorTools.normalizeStatCalculator(7),
    spawnedEntityType: "drone", countsOwnKids: 5, children: [], waitToCycle: false, cycle, delay: 0,
    settings: { reload: 1, size: 1 }, autofire: true, altFire: false,
    offset: 0, length: 1, width: 1,
    recoil() {},
  });
  gun.shots = 0;
  gun.fire = () => {
    gun.shots++;
    const child = { type: "drone" };
    gun.children.push(child);
    owner.possiblyChildren.add(child);
  };
  return gun;
}
const liveNecro = makeNecromancer(1);
for (let i = 0; i < 19; i++) liveNecro.possiblyChildren.add({ type: "drone" });
liveNecro.master = liveNecro;
liveNecro.invuln = false;
liveNecro.control = { fire: false, alt: false };
liveNecro.size = 12;
liveNecro.facing = 0;
const lastSlotGun = makeLiveNecroGun(liveNecro, 1);
lastSlotGun.live();
assert.strictEqual(lastSlotGun.shots, 1, "a necromantic spawner may fill the final shared drone slot");
assert.strictEqual(infection.countOwnedDrones(liveNecro), 20);
const blockedGun = makeLiveNecroGun(liveNecro, 1);
blockedGun.live();
assert.strictEqual(blockedGun.shots, 0, "a necromantic spawner may not exceed the shared drone limit");

console.log("Drone infection tests passed");
