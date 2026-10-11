"use strict";

const assert = require("assert");
const createLoadProtection = require("../lib/loadProtection");

function makeProtection(overrides = {}) {
  let now = 0;
  const env = Object.assign({
    RANAR_LOAD_SAMPLE_MS: "2000",
    RANAR_LAG_100_DURATION_MS: "10000",
    RANAR_LAG_150_DURATION_MS: "15000",
    RANAR_LAG_200_DURATION_MS: "15000",
    RANAR_LAG_CRITICAL_DURATION_MS: "15000",
  }, overrides.env || {});
  const changes = [];
  const protection = createLoadProtection(Object.assign({
    env,
    nowProvider: () => now,
    sampleProvider: () => ({
      memoryRatio: 0,
      rssMb: 100,
      heapUsedMb: 50,
      heapLimitMb: 512,
      externalMb: 0,
      eventLoopP95Ms: 0,
      eventLoopMaxMs: 0,
      memoryGrowthMb: 0,
      memoryTrendReady: false,
    }),
    getEntities: () => [],
    onEntityChange: (_entity, _disabled, details) => changes.push(details || {}),
    delayMonitor: { enable() {}, disable() {}, percentile() { return 0; }, reset() {} },
  }, overrides.options || {}));
  return {
    protection,
    changes,
    setNow(value) { now = value; },
  };
}

// A short 100ms spike must not pause spawns or trigger the unknown-entity sweep.
{
  const test = makeProtection();
  test.protection.reportCycle(110, []);
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), true);
  assert.strictEqual(test.protection.getSnapshot().lagPolicy100Triggered, false);
  test.setNow(9999);
  test.protection.reportCycle(110, []);
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), true);
  test.setNow(10000);
  test.protection.reportCycle(110, []);
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), false);
  assert.strictEqual(test.protection.getSnapshot().lagPolicy100Triggered, true);
}

// Critical entity suspension is deferred until critical lag has persisted.
{
  const test = makeProtection();
  test.protection.reportCycle(260, []);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
  assert.strictEqual(test.protection.getSnapshot().loadSuspensionElapsedMs, 0);
  test.setNow(14999);
  test.protection.reportCycle(260, []);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
  test.setNow(15000);
  test.protection.reportCycle(260, []);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, true);
}

// Recovery before the persistence window cancels the pending critical episode.
{
  const test = makeProtection();
  test.protection.reportCycle(260, []);
  test.setNow(5000);
  test.protection.reportCycle(20, []);
  test.setNow(20000);
  test.protection.reportCycle(260, []);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
}

console.log("loadProtection tests passed");
