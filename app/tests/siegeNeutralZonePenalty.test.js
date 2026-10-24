"use strict";
const assert = require("assert");
const penalty = require("../lib/siegeNeutralZonePenalty");

function makeRoom() {
  return {
    isIn(type, entity) {
      if (type === "nest") return entity.area === "nest";
      if (type === "spw0") return entity.area === "spw0";
      if (type === "edge") return entity.area === "edge";
      return false;
    },
    isInRoom(entity) { return entity.area !== "outside"; },
  };
}
function makeEntity(overrides = {}) {
  return Object.assign({
    team: -100,
    type: "tank",
    health: { max: 1000, amount: 1000 },
    area: "nest",
    valid: () => true,
    isDead: () => false,
  }, overrides);
}

const room = makeRoom();
let entity = makeEntity();
penalty.update(entity, { mode: "siege", room, now: 1000 });
assert.strictEqual(entity.health.amount, 1000, "starting the timer must not damage the entity");
penalty.update(entity, { mode: "siege", room, now: 30_999 });
assert.strictEqual(entity.health.amount, 1000, "no damage before 30 seconds");
penalty.update(entity, { mode: "siege", room, now: 32_000 });
assert.strictEqual(entity.health.amount, 900, "after grace, 1s should drain 10% maximum health");

entity = makeEntity({ area: "spw0" });
penalty.update(entity, { mode: "siege", room, now: 2000 });
penalty.update(entity, { mode: "siege", room, now: 33000 });
assert.strictEqual(entity.health.amount, 900, "the outer Siege spawn border is monitored");

entity = makeEntity();
penalty.update(entity, { mode: "siege", room, now: 1000 });
entity.area = "normal";
penalty.update(entity, { mode: "siege", room, now: 25_000 });
entity.area = "nest";
penalty.update(entity, { mode: "siege", room, now: 40_000 });
assert.strictEqual(entity.health.amount, 1000, "leaving and re-entering must reset continuous residence");

entity = makeEntity({ isProjectile: true });
penalty.update(entity, { mode: "siege", room, now: 1000 });
penalty.update(entity, { mode: "siege", room, now: 90_000 });
assert.strictEqual(entity.health.amount, 1000, "projectiles are not subject to the zone penalty");

entity = makeEntity({ team: -1 });
penalty.update(entity, { mode: "siege", room, now: 1000 });
penalty.update(entity, { mode: "siege", room, now: 90_000 });
assert.strictEqual(entity.health.amount, 1000, "non-neutral entities are not subject to the zone penalty");

entity = makeEntity();
penalty.update(entity, { mode: "ffa", room, now: 1000 });
penalty.update(entity, { mode: "siege", room, now: 90_000 });
assert.strictEqual(entity.health.amount, 1000, "timer state from another mode must not carry into Siege");

console.log("Siege neutral-zone penalty tests passed.");
