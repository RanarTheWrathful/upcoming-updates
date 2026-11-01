"use strict";
const assert = require("assert");
const autoUpgrades = require("../lib/autoUpgradeRules/autoUpgradeRules");
const Class = require("../lib/definitions");

// Match server.js class indexing so this tests the real definitions as loaded.
let nextIndex = 0;
for (const key in Class) {
  if (Object.prototype.hasOwnProperty.call(Class, key) && Class[key] && typeof Class[key] === "object") {
    Class[key].index = nextIndex++;
  }
}

function makeEntity(exportName, overrides = {}) {
  const definition = Class[exportName];
  return Object.assign({
    // These configured source definitions inherit TYPE: "crasher" in the
    // actual server. Keeping that runtime type is important: it exposed the
    // old update() guard that rejected every real source before rules ran.
    type: "crasher",
    index: definition.index,
    _autoUpgradeSourceDefinition: definition,
    label: definition.LABEL || definition.label || exportName,
    isPlayer: false,
    isBot: true,
    skill: { score: 250000, level: 0 },
    upgrades: [],
    master: null,
    define(target) {
      this.index = target.index;
      this.label = target.LABEL || target.label || this.label;
      this.type = target.TYPE || "tank";
    },
  }, overrides);
}

// Bots receive actual source-specific upgrade options instead of auto-transforming.
let entity = makeEntity("triangleSwarmSentry");
let result = autoUpgrades.update(entity, Class, { mode: "siege", random: () => 0 });
assert.strictEqual(result, false, "bots should receive a choice rather than transform automatically");
assert.deepStrictEqual(
  entity.upgrades.map((option) => option.class.index).sort((a, b) => a - b),
  [Class.elite_battleship.index, Class.elite_swarmer.index].sort((a, b) => a - b),
);
assert.strictEqual(entity.index, Class.triangleSwarmSentry.index);

// A non-bot NPC still uses the automatic transformation fallback.
entity = makeEntity("triangleSwarmSentry", { isBot: false });
result = autoUpgrades.update(entity, Class, { mode: "siege", random: () => 0 });
assert.strictEqual(result.upgraded, true, "unmanaged NPC auto-upgrade should remain supported");
assert.strictEqual(result.exportName, "elite_swarmer");
assert.strictEqual(entity.index, Class.elite_swarmer.index);
assert.strictEqual(autoUpgrades.isCompleted(entity, "elite_battleship+elite_swarmer"), true);

// Single-target embedded rule becomes a bot choice.
entity = makeEntity("trianglePounderSentry");
result = autoUpgrades.update(entity, Class, { mode: "ffa", random: () => 0 });
assert.strictEqual(result, false);
assert.deepStrictEqual(entity.upgrades.map((option) => option.class.index), [Class.elite_destroyer.index]);

// A source class's rule must not accidentally apply to another class.
entity = makeEntity("triangleSentry");
result = autoUpgrades.update(entity, Class, { mode: "siege", random: () => 0 });
assert.strictEqual(result, false);
assert.strictEqual(entity.index, Class.triangleSentry.index);

// Real class-level rule should become selectable options for a player body.
const playerMessages = [];
entity = makeEntity("triangleTrapperSentry", {
  isPlayer: true,
  isBot: false,
  sendMessage: (message) => playerMessages.push(message),
});
result = autoUpgrades.update(entity, Class, { mode: "siege", random: () => 0 });
assert.strictEqual(result, false, "player should not auto-transform");
assert.deepStrictEqual(
  entity.upgrades.map((option) => option.index).sort((a, b) => a - b),
  [Class.elite_fortress.index, Class.elite_gunner.index].sort((a, b) => a - b),
);
assert.ok(entity.upgrades.every((option) => option.level === 0));
assert.strictEqual(playerMessages.length, 1, "unlock notice should be sent once");
autoUpgrades.update(entity, Class, { mode: "siege", random: () => 0 });
assert.strictEqual(entity.upgrades.length, 2, "options should not duplicate every update");
assert.strictEqual(playerMessages.length, 1, "notice should not repeat every update");

// The previously misnamed target is repaired to a real export and added for bots.
entity = makeEntity("auto3Guard");
result = autoUpgrades.update(entity, Class, { mode: "siege", random: () => 0 });
assert.strictEqual(result, false);
assert.deepStrictEqual(entity.upgrades.map((option) => option.class.index), [Class.Pawn.index]);
entity = makeEntity("auto3Guard", { isBot: false });
result = autoUpgrades.update(entity, Class, { mode: "siege", random: () => 0 });
assert.strictEqual(result.upgraded, true);
assert.strictEqual(result.exportName, "Pawn");

console.log("Automatic upgrade integration tests passed against real class definitions.");
