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
const ordinaryBullet = { type: "bullet", master: tank, source: tank, guns: [], turrets: [] };
assert.strictEqual(infection.findInfectingGun(ordinaryBullet, square), localGun,
  "ordinary bullets should inherit infection capability from their owning tank's matching drone gun");
const unrelatedDrone = { type: "drone", master: tank, source: tank, guns: [], turrets: [] };
assert.strictEqual(infection.findInfectingGun(unrelatedDrone, square), localGun,
  "a non-infectious drone should convert food when its owner can produce the matching infected type");
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
const doomedDrone = { type: "drone", master: tank, source: tank, parent: tank };
tank.possiblyChildren.add(doomedDrone);
assert.strictEqual(infection.countOwnedDrones(tank), 4);
assert.strictEqual(infection.hasDroneCapacity(tank), false,
  "all guns should share the same tank-wide drone limit");
infection.detachOwnedEntity(doomedDrone);
assert.strictEqual(infection.countOwnedDrones(tank), 3,
  "destroying a drone must unregister it from the tank-wide count");
assert.strictEqual(infection.hasDroneCapacity(tank), true,
  "a freed drone slot should allow replacement drones or infections");

// Destruction must detach from every independent ownership registry, not only
// the parent.children array, because master/source/parent may differ.
const masterOwner = { possiblyChildren: new Set() };
const sourceOwner = { possiblyChildren: new Set() };
const parentOwner = { possiblyChildren: new Set() };
const multiOwnedEntity = {
  master: masterOwner,
  source: sourceOwner,
  parent: parentOwner,
};
for (const owner of [masterOwner, sourceOwner, parentOwner]) {
  owner.possiblyChildren.add(multiOwnedEntity);
}
infection.detachOwnedEntity(multiOwnedEntity);
for (const owner of [masterOwner, sourceOwner, parentOwner]) {
  assert.strictEqual(owner.possiblyChildren.has(multiOwnedEntity), false,
    "destroyed entities must be removed from every owning set");
}

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
  null,
  "Necro Tyrant must use the same shape-matching infection rules as every class"
);
assert.strictEqual(
  infection.findInfectingGun(deniedTank, { type: "food", shape: 4, foodLevel: 2 }),
  localGun,
  "Necro Tyrant can still infect food matching its drone's produced shape"
);


// Exercise the actual Gun infection method from server.js without booting the
// full server, so the tank-wide cap and gun-cap bypass are regression-tested.
const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
assert(serverSource.includes("droneInfection.detachOwnedEntity(this)"),
  "Entity.destroy must unregister itself from drone ownership tracking");
assert(!serverSource.includes("allowMismatch"),
  "all class-specific infection shape-mismatch bypasses should be removed");
assert(serverSource.includes("droneInfection.findInfectingGun(my, n)"),
  "food collisions should consult the owning tank's infectious guns for any attacker type");
assert(!serverSource.includes("my.settings.isNecromancer"),
  "infection should use the shared gun capability lookup rather than ram-only class checks");
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
assert.strictEqual(fakeGun.canInfectFood({ type: "food", shape: 3 }), false,
  "infection guns must reject food with a mismatched shape");
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

console.log("Drone infection tests passed");
