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
  test.protection.reportCycle(600, []);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
  assert.strictEqual(test.protection.getSnapshot().loadSuspensionElapsedMs, 0);
  test.setNow(14999);
  test.protection.reportCycle(600, []);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
  test.setNow(15000);
  test.protection.reportCycle(600, []);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, true);
}

// Recovery before the persistence window cancels the pending critical episode.
{
  const test = makeProtection();
  test.protection.reportCycle(600, []);
  test.setNow(5000);
  test.protection.reportCycle(20, []);
  test.setNow(20000);
  test.protection.reportCycle(600, []);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
}

// A dip below the true emergency threshold breaks the pre-episode persistence
// window; 400–499ms hysteresis only applies after an emergency episode starts.
{
  const test = makeProtection();
  test.protection.reportCycle(600, []);
  test.setNow(5000);
  test.protection.reportCycle(450, []);
  test.setNow(15000);
  test.protection.reportCycle(450, []);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
  assert.strictEqual(test.protection.getSnapshot().loadDisabledEntityCount, 0);
}

// One ordinary critical-threshold frame does not immediately set the system to maximum.
{
  const test = makeProtection();
  test.protection.reportCycle(260, []);
  const snapshot = test.protection.getSnapshot();
  assert.strictEqual(snapshot.cycleStage, 0);
  assert.strictEqual(snapshot.runSpeedLevel, 0);
  assert.strictEqual(test.protection.shouldSpawnFood(), true);
  assert.strictEqual(snapshot.criticalLagConfirmed, false);
}

// Sustained high lag increases scheduler pacing a notch at a time, then recovery
// returns a notch only after the configured quiet period.
{
  const test = makeProtection({ env: { RANAR_LOAD_RUN_SPEED_ESCALATION_MS: "1000", RANAR_LOAD_RUN_SPEED_RECOVERY_MS: "5000" } });
  test.protection.reportCycle(200, []);
  assert.strictEqual(test.protection.getSnapshot().runSpeedLevel, 0);
  test.setNow(1249);
  test.protection.reportCycle(200, []);
  assert.strictEqual(test.protection.getSnapshot().runSpeedLevel, 0);
  test.setNow(1250);
  test.protection.reportCycle(200, []);
  assert.strictEqual(test.protection.getSnapshot().runSpeedLevel, 1);
  test.protection.reportCycle(20, []);
  assert.strictEqual(test.protection.getSnapshot().runSpeedLevel, 1);
  test.setNow(6250);
  test.protection.reportCycle(20, []);
  assert.strictEqual(test.protection.getSnapshot().runSpeedLevel, 0);
}

// Only extreme latency jumps directly to critical pacing/stage.
{
  const test = makeProtection();
  test.protection.reportCycle(600, []);
  const snapshot = test.protection.getSnapshot();
  assert.strictEqual(snapshot.cycleStage, 3);
  assert.strictEqual(snapshot.runSpeedLevel, 5);
  assert.strictEqual(snapshot.criticalLagConfirmed, false);
}

// Sustained-but-not-extreme 250ms lag enters the elevated tier gradually.
{
  const test = makeProtection();
  test.protection.reportCycle(260, []);
  test.setNow(5999);
  test.protection.reportCycle(260, []);
  assert.strictEqual(test.protection.getSnapshot().cycleStage, 0);
  test.setNow(6000);
  test.protection.reportCycle(260, []);
  assert.strictEqual(test.protection.getSnapshot().cycleStage, 1);
  assert.notStrictEqual(test.protection.getSnapshot().runSpeedLevel, 5);
}

// Moderate lag may pause natural spawns, but must not trigger the destructive
// unknown-class sweep; unknown cleanup waits for its own severe-lag threshold.
{
  let alive = true;
  const unknown = {
    id: 1,
    label: "Unknown Class",
    type: "tank",
    settings: {},
    valid: () => alive,
    destroy: () => { alive = false; },
  };
  const test = makeProtection({
    env: { RANAR_LAG_100_DURATION_MS: "1000", RANAR_LAG_UNKNOWN_DURATION_MS: "1000" },
    options: { getEntities: () => [unknown] },
  });
  test.protection.reportCycle(110, [unknown]);
  test.setNow(1000);
  test.protection.reportCycle(110, [unknown]);
  assert.strictEqual(alive, true);
  test.setNow(2000);
  test.protection.reportCycle(110, [unknown]);
  assert.strictEqual(alive, true);
}


// Recovery restores suspended entities in a queue instead of making every
// disabled entity respawn during the same simulation cycle.
{
  let now = 0;
  const entities = ["first", "second"].map((name, id) => ({
    id,
    name,
    label: "Test Unit",
    type: "tank",
    alpha: 1,
    settings: {},
    controllers: [],
    guns: [],
    turrets: [],
    children: [],
    valid: () => true,
  }));
  const protection = createLoadProtection({
    env: {
      RANAR_LOAD_SAMPLE_MS: "2000",
      RANAR_LOAD_ENTITY_FADE_MS: "100",
      RANAR_LOAD_SUSPEND_INTERVAL_MS: "2500",
      RANAR_LOAD_RESTORE_INTERVAL_MS: "1000",
      RANAR_LAG_CRITICAL_DURATION_MS: "15000",
    },
    nowProvider: () => now,
    sampleProvider: () => ({
      memoryRatio: 0, rssMb: 100, heapUsedMb: 50, heapLimitMb: 512,
      externalMb: 0, eventLoopP95Ms: 0, eventLoopMaxMs: 0,
      memoryGrowthMb: 0, memoryTrendReady: false,
    }),
    getEntities: () => entities,
    delayMonitor: { enable() {}, disable() {}, percentile() { return 0; }, reset() {} },
  });
  protection.reportCycle(600, entities);
  now = 15000;
  protection.reportCycle(600, entities); // Suspend first entity.
  now = 17500;
  protection.reportCycle(600, entities); // Suspend second entity.
  assert.strictEqual(entities.filter(entity => entity.name === "[Disabled]").length, 2);

  now = 18000;
  protection.reportCycle(20, entities); // Recovery starts only the first restore.
  assert.strictEqual(entities.filter(entity => entity.name === "[Respawning...]").length, 1);
  assert.strictEqual(entities.filter(entity => entity.name === "[Disabled]").length, 1);

  now = 18100;
  protection.reportCycle(20, entities); // First finishes; second is still queued.
  assert.strictEqual(entities.filter(entity => entity.name === "[Disabled]").length, 1);
  assert.strictEqual(entities.filter(entity => entity.name === "[Respawning...]").length, 0);

  now = 19000;
  protection.reportCycle(20, entities); // Second restore can now begin.
  assert.strictEqual(entities.filter(entity => entity.name === "[Respawning...]").length, 1);
}

console.log("loadProtection tests passed");
