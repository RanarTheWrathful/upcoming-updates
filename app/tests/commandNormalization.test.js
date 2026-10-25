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
  ["entity spawn eliteSentry", "spawn eliteSentry"],
  ["entity spawn eliteSentry random", "spawn eliteSentry random"],
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
assert.strictEqual(sandbox.api.getCommandUsageError("spawn basic", true), null, "a missing location should request random spawning");
assert.strictEqual(sandbox.api.getCommandUsageError("spawn basic random", true), null, "random location should be an explicit option");
assert.match(sandbox.api.getCommandUsageError("spawn basic 10", true), /^Usage:/, "x without y should be rejected");
assert.match(sandbox.api.getCommandUsageError("spawn", true), /^Usage:/);
assert.match(sandbox.api.getCommandUsageError("team setup nonsense", true), /^Usage:/);
assert.match(sandbox.api.getCommandUsageError("kill dragon", true), /^Unknown entity group:/);
assert.strictEqual(sandbox.api.getCommandUsageError("propertize entity all INTELLECT 0.1", true), null);
assert.match(sandbox.api.getCommandUsageError("propertize global", true), /^Usage:/);

assert.strictEqual(sandbox.api.getCommandUsageError("score cheat 1000", true), null);
assert.match(sandbox.api.getCommandUsageError("score cheat", true), /^Usage:/);

assert.strictEqual(sandbox.api.getCommandUsageError("team setup ffa", true), null);
assert.strictEqual(sandbox.api.getCommandUsageError("team setup 2 teams", true), null);

const helperStart = source.indexOf("function getRandomDeveloperSpawnPosition() {");
const helperEnd = source.indexOf("function getCommandUsageError(", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "random spawn helper should be available for tests");
const spawnSandbox = { room: {
  random: (() => { let call = 0; return () => (++call === 1 ? { x: 10, y: 20 } : { x: 30, y: 40 }); })(),
  isIn: (type, point) => type === "wall" && point.x === 10,
  randomType: () => ({ x: 50, y: 60 }),
} };
vm.runInNewContext(source.slice(helperStart, helperEnd) + "\nglobalThis.getSpawn = getRandomDeveloperSpawnPosition;", spawnSandbox, { timeout: 3000 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(spawnSandbox.getSpawn())), { x: 30, y: 40 }, "random spawn helper should reject wall locations");
