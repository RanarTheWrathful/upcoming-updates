"use strict";
const assert = require("assert");
const autoUpgrades = require("../lib/autoUpgradeRules");

function makeClass(index, label) {
  return { index, LABEL: label };
}
function makeEntity(overrides = {}) {
  return Object.assign({
    type: "tank",
    index: 1,
    isPlayer: false,
    isBot: true,
    skill: { score: 1000, level: 0 },
    upgrades: [],
    master: null,
    define(target) { this.index = target.index; this.label = target.LABEL; },
  }, overrides);
}
const Class = {
  genericEntity: makeClass(0, "Generic Entity"),
  automataA: makeClass(2, "Automata A"),
  automataB: makeClass(3, "Automata B"),
  playerOnly: makeClass(4, "Player Only"),
};
const rules = [{ id: "test-automata", score: 1000, exports: ["automataA", "automataB"] }];

// Unmet score does not transform an automated entity.
let entity = makeEntity({ skill: { score: 999, level: 0 } });
assert.strictEqual(autoUpgrades.update(entity, Class, { mode: "siege", rules, random: () => 0.75 }), false);
assert.strictEqual(entity.index, 1);

// At threshold, a non-player-controlled entity randomly chooses one export.
entity = makeEntity();
let result = autoUpgrades.update(entity, Class, { mode: "siege", rules, random: () => 0.75 });
assert.strictEqual(result.upgraded, true);
assert.strictEqual(result.exportName, "automataB");
assert.strictEqual(entity.index, Class.automataB.index);
assert.strictEqual(autoUpgrades.isCompleted(entity, "test-automata"), true);

// Player bodies receive every target as a choice, not an automatic transform.
let messages = [];
entity = makeEntity({ isPlayer: true, isBot: false, sendMessage: (message) => messages.push(message) });
result = autoUpgrades.update(entity, Class, { mode: "siege", rules, random: () => 0.5 });
assert.strictEqual(result, false);
assert.strictEqual(entity.index, 1);
assert.deepStrictEqual(entity.upgrades.map((upgrade) => upgrade.class.index), [2, 3]);
assert.ok(entity.upgrades.every((upgrade) => upgrade.autoUpgradeRuleIds.includes("test-automata")));
assert.strictEqual(messages.length, 1);

// Marking an option as selected consumes the rule so it is not re-offered.
autoUpgrades.markCompleted(entity, entity.upgrades[0].autoUpgradeRuleIds[0]);
entity.upgrades = [];
autoUpgrades.update(entity, Class, { mode: "siege", rules, random: () => 0 });
assert.strictEqual(entity.upgrades.length, 0);

// A player-controlled automated minion is not automatically transformed.
const playerMaster = makeEntity({ isPlayer: true, master: null });
entity = makeEntity({ master: playerMaster });
assert.strictEqual(autoUpgrades.update(entity, Class, { mode: "siege", rules, random: () => 0 }), false);
assert.strictEqual(entity.index, 1);

// Optional mode and source restrictions are respected.
entity = makeEntity();
result = autoUpgrades.update(entity, Class, { mode: "ffa", rules: [{ id: "siege-only", score: 1, exports: ["automataA"], modes: ["siege"] }] });
assert.strictEqual(result, false);
assert.strictEqual(entity.index, 1);

console.log("Automatic score-based upgrade tests passed.");
