"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const start = source.indexOf("function normalizeChatCommand(rawCommand) {");
const end = source.indexOf("const PUBLIC_COMMAND_GROUPS = [", start);
assert.ok(start >= 0 && end > start, "normalizer must exist before the catalog");
const sandbox = {};
vm.runInNewContext(source.slice(start, end) + "\nglobalThis.api = { normalizeChatCommand, normalizeEntitySelector, commandMatches, getCommandUsageError };", sandbox, { timeout: 3000 });
const normalize = sandbox.api.normalizeChatCommand;
const cases = [
  ["players", "player list"],
  ["TEAM ME", "see team"],
  ["teams setup 2 teams", "team setup 2 teams"],
  ["team next 3", "set team 3"],
  ["team spawn -4", "creation team -4"],
  ["wave set 7", "set wave 7"],
  ["server announce Hello World", "broadcast Hello World"],
  ["server id 12", "define ID 12"],
  ["entity spawn eliteSentry 100 200", "spawn eliteSentry 100 200"],
  ["entity set all INTELLECT 0.1", "propertize entity all INTELLECT 0.1"],
  ["world set config SOME_FLAG false", "propertize global config SOME_FLAG false"],
  ["player ban 127.0.0.1", "pBan 127.0.0.1"],
  ["score set enemies 0", "score enemies 0"],
  ["points set all 15", "points all 15"],
  ["old LegacyClass ArgumentCase", "old LegacyClass ArgumentCase"],
];
for (const [input, expected] of cases) assert.strictEqual(normalize(input), expected, input);
assert.strictEqual(sandbox.api.normalizeEntitySelector("kill ID"), "kill ID");
assert.strictEqual(sandbox.api.normalizeEntitySelector("kill ENEMIES"), "kill enemies");
assert.strictEqual(sandbox.api.commandMatches("team setup ffa", "team setup"), true);
assert.strictEqual(sandbox.api.commandMatches("teamsetup ffa", "team setup"), false);
console.log("Canonical command aliases and argument-preservation tests passed.");

assert.strictEqual(sandbox.api.getCommandUsageError("spawn basic 10 20", true), null);
assert.match(sandbox.api.getCommandUsageError("spawn", true), /^Usage:/);
assert.match(sandbox.api.getCommandUsageError("team setup nonsense", true), /^Usage:/);
assert.match(sandbox.api.getCommandUsageError("kill dragon", true), /^Unknown entity group:/);
assert.strictEqual(sandbox.api.getCommandUsageError("propertize entity all INTELLECT 0.1", true), null);
assert.match(sandbox.api.getCommandUsageError("propertize global", true), /^Usage:/);

assert.strictEqual(sandbox.api.getCommandUsageError("score cheat 1000", true), null);
assert.match(sandbox.api.getCommandUsageError("score cheat", true), /^Usage:/);

assert.strictEqual(sandbox.api.getCommandUsageError("team setup ffa", true), null);
assert.strictEqual(sandbox.api.getCommandUsageError("team setup 2 teams", true), null);
