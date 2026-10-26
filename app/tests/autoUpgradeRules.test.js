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

// Global, unscoped rules remain tank-only by default, rather than transforming
// arbitrary non-tank entities just because they happen to have a Skill object.
entity = makeEntity({ type: "crasher" });
result = autoUpgrades.update(entity, Class, {
  mode: "siege",
  rules: [{ id: "unscoped-global", score: 1, exports: ["automataA"] }],
  random: () => 0,
});
assert.strictEqual(result, false);
assert.strictEqual(entity.index, 1);

// A global rule can intentionally target a non-tank class through `from`.
const ScopedClass = Object.assign({}, Class, { sourceCrasher: { index: 1, LABEL: "Source Crasher" } });
entity = makeEntity({ type: "crasher", index: ScopedClass.sourceCrasher.index });
result = autoUpgrades.update(entity, ScopedClass, {
  mode: "siege",
  rules: [{ id: "scoped-global", score: 1, exports: ["automataA"], from: ["sourceCrasher"] }],
  random: () => 0,
});
assert.strictEqual(result.upgraded, true);
assert.strictEqual(result.exportName, "automataA");


// An exact source definition without rules must not borrow rules from an alias
// that happens to share its index. Runtime source tracking is more specific than
// the reverse index map and should remain authoritative even when empty.
const aliasSource = { index: 7, LABEL: "No Rule Source" };
const aliasedRule = {
  index: 7,
  LABEL: "Aliased Rule Source",
  AUTO_UPGRADE_RULES: { id: "aliased-rule", score: 1, exports: ["automataA"] },
};
const aliasClass = {
  sourceWithoutRules: aliasSource,
  aliasWithRules: aliasedRule,
  automataA: makeClass(8, "Automata A"),
};
entity = makeEntity({ index: 7, _autoUpgradeSourceDefinition: aliasSource });
result = autoUpgrades.update(entity, aliasClass, { mode: "siege", rules: [], random: () => 0 });
assert.strictEqual(result, false, "known source definitions without rules must not inherit a same-index alias rule");
assert.strictEqual(entity.index, 7);

// Optional spawn messages broadcast only when an automated entity upgrades, with placeholders expanded.
let broadcasts = [];
entity = makeEntity({ name: "Test Automaton" });
result = autoUpgrades.update(entity, Class, {
  mode: "siege",
  rules: [{ id: "message-rule", score: 1000, exports: ["automataA"], spawnMessage: "{name} upgraded to {label} ({export}) at {score}!" }],
  random: () => 0,
  broadcastMessage: (message) => broadcasts.push(message),
});
assert.strictEqual(result.upgraded, true);
assert.deepStrictEqual(broadcasts, ["Test Automaton upgraded to Automata A (automataA) at 1000!"]);

// Missing spawnMessage keeps the default behavior silent.
broadcasts = [];
entity = makeEntity();
result = autoUpgrades.update(entity, Class, {
  mode: "siege",
  rules: [{ id: "silent-rule", score: 1000, exports: ["automataA"] }],
  random: () => 0,
  broadcastMessage: (message) => broadcasts.push(message),
});
assert.strictEqual(result.upgraded, true);
assert.deepStrictEqual(broadcasts, []);

// Export-based rules can omit an explicit ID and use the selected export names for tracking.
assert.strictEqual(autoUpgrades.getRuleId({ exports: ["automataA"] }), "automataA");
assert.strictEqual(autoUpgrades.getRuleId({ exports: ["automataB", "automataA"] }), "automataA+automataB");
entity = makeEntity();
result = autoUpgrades.update(entity, Class, {
  mode: "siege",
  rules: [{ score: 1000, exports: ["automataA"] }],
  random: () => 0,
});
assert.strictEqual(result.ruleId, "automataA");
assert.strictEqual(autoUpgrades.isCompleted(entity, "automataA"), true);

console.log("Automatic score-based upgrade tests passed.");
