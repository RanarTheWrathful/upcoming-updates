"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createUpdateScoreRecovery } = require("../lib/serverLifecycle/updateScoreRecovery");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ranar-score-recovery-"));
const filename = path.join(directory, "scores.json");
let now = 1000;
const store = createUpdateScoreRecovery(filename, () => now);

assert.strictEqual(store.load(), 0);
assert.strictEqual(store.capture([
  { key: "ip-a\\0name-a", ip: "ip-a", name: "Name A", score: 125000 },
  { key: "ip-b\\0name-b", ip: "ip-b", name: "Name B", score: 50000 },
], now + 300000), true);
assert.strictEqual(store.size, 2);

const restartedStore = createUpdateScoreRecovery(filename, () => now);
assert.strictEqual(restartedStore.load(), 2, "recovery entries must survive a process restart");
const restored = restartedStore.consume("ip-a\\0name-a");
assert.strictEqual(restored.score, 125000);
assert.strictEqual(restartedStore.consume("ip-a\\0name-a"), null, "a recovered entry can only be used once");
assert.strictEqual(restartedStore.size, 1);

now += 300001;
assert.strictEqual(restartedStore.prune(), true);
assert.strictEqual(restartedStore.size, 0, "all unclaimed entries must expire after five minutes");
assert.strictEqual(fs.existsSync(filename), false);

fs.rmSync(directory, { recursive: true, force: true });
console.log("Update score recovery tests passed.");
