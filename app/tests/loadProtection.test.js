"use strict";

const assert = require("assert");
const createLoadProtection = require("../lib/loadProtection");

let metrics = {
  memoryRatio: 0.1,
  rssMb: 100,
  heapUsedMb: 50,
  heapLimitMb: 1024,
  externalMb: 5,
  memoryLimitMb: 512,
  eventLoopP95Ms: 5,
  eventLoopMaxMs: 10,
};
const transitions = [];
const protection = createLoadProtection({
  env: {},
  memoryLimitBytes: 512 * 1024 * 1024,
  sampleProvider: () => Object.assign({}, metrics),
  onStageChange: (from, to) => transitions.push([from, to]),
});

function sample(times) {
  for (let i = 0; i < times; i++) protection.sample();
}

sample(3);
assert.strictEqual(protection.stage, 0, "normal metrics remain in normal stage");

metrics = Object.assign({}, metrics, { memoryRatio: 0.8 });
sample(3);
assert.strictEqual(protection.stage, 1, "elevated stage requires sustained warning pressure");
let minimapUpdates = 0;
for (let i = 0; i < 4; i++) if (protection.shouldUpdateMinimap()) minimapUpdates++;
assert.strictEqual(minimapUpdates, 2, "elevated stage halves minimap cadence");

metrics = Object.assign({}, metrics, { memoryRatio: 0.9 });
sample(3);
assert.strictEqual(protection.stage, 2, "high stage requires sustained high pressure");
assert.deepStrictEqual(
  [protection.shouldSpawnFood(), protection.shouldSpawnFood(), protection.shouldSpawnFood(), protection.shouldSpawnFood()],
  [false, true, false, true],
  "high stage reduces optional food spawning by half"
);
assert.deepStrictEqual(
  [protection.shouldSpawnBot(), protection.shouldSpawnBot()],
  [false, true],
  "high stage reduces optional bot spawning by half"
);

metrics = Object.assign({}, metrics, { memoryRatio: 0.96 });
sample(2);
assert.strictEqual(protection.stage, 3, "critical stage responds after two critical samples");
assert.strictEqual(protection.isCritical(), true);
assert.strictEqual(protection.shouldSpawnFood(), false, "critical stage pauses optional food spawning");
assert.strictEqual(protection.shouldSpawnBot(), false, "critical stage pauses optional bot spawning");

metrics = Object.assign({}, metrics, { memoryRatio: 0.1, eventLoopP95Ms: 5 });
sample(10);
assert.strictEqual(protection.stage, 2, "recovery lowers only one stage at a time");
sample(10);
assert.strictEqual(protection.stage, 1);
sample(10);
assert.strictEqual(protection.stage, 0);
assert.deepStrictEqual(transitions, [[0, 1], [1, 2], [2, 3], [3, 2], [2, 1], [1, 0]]);

assert.strictEqual(
  createLoadProtection.detectMemoryLimitBytes({ RANAR_MEMORY_LIMIT_MB: "512" }),
  512 * 1024 * 1024,
  "memory cap can be explicitly configured for hosts without cgroup metadata"
);

let increasingRssMb = 100;
const trendProtection = createLoadProtection({
  env: {}, memoryLimitBytes: 1024 * 1024 * 1024,
  sampleProvider: () => {
    increasingRssMb += 5;
    return {
      memoryRatio: 0.1,
      rssMb: increasingRssMb,
      heapUsedMb: 50,
      heapLimitMb: 1024,
      externalMb: 5,
      memoryLimitMb: 1024,
      eventLoopP95Ms: 5,
      eventLoopMaxMs: 10,
    };
  },
});
for (let i = 0; i < 32; i++) trendProtection.sample();
assert.strictEqual(trendProtection.stage, 2, "sustained RSS growth triggers high stage before the hard limit");
assert.ok(trendProtection.getSnapshot().memoryGrowthMb >= 128, "memory trend is exposed in telemetry");
trendProtection.stop();

const faultProtection = createLoadProtection({
  env: {}, memoryLimitBytes: null,
  sampleProvider: () => { throw new Error("simulated telemetry failure"); },
});
assert.doesNotThrow(() => faultProtection.sample(), "monitoring failures must not crash the server");
faultProtection.stop();

protection.stop();
console.log("Load protection tests passed.");
