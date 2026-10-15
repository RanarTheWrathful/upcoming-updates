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

// Sustained low measured run speed pauses spawns only after its duration expires.
{
  const test = makeProtection();
  test.protection.reportCycle(110, []);
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), true);
  assert.strictEqual(test.protection.getSnapshot().lagPolicy100Triggered, false);
  test.setNow(9999);
  test.protection.sample();
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), true);
  test.setNow(10000);
  test.protection.sample();
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), false);
  assert.strictEqual(test.protection.getSnapshot().lagPolicy100Triggered, true);
}

// A brief low-speed interval is cancelled when the server resumes a healthy cadence.
{
  const test = makeProtection();
  test.protection.reportCycle(110, []);
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), true);
  test.setNow(50);
  test.protection.reportCycle(20, []);
  test.setNow(84);
  test.protection.reportCycle(5, []);
  assert(test.protection.getSnapshot().runSpeedPercent > 50);
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), true);
  test.setNow(10000);
  test.protection.sample();
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), true);
}

// Extreme lag bypasses every grace timer and triggers all protocols immediately.
{
  const test = makeProtection();
  test.protection.reportCycle(260, []);
  const snapshot = test.protection.getSnapshot();
  assert.strictEqual(snapshot.criticalLagConfirmed, true);
  assert.strictEqual(snapshot.loadSuspensionElapsedMs, 0);
  assert.strictEqual(snapshot.naturalSpawnsPaused, true);
  assert.strictEqual(snapshot.lagPolicy100Triggered, true);
  assert.strictEqual(snapshot.lagPolicy150Triggered, true);
  assert.strictEqual(snapshot.lagPolicy200Triggered, true);
  assert.strictEqual(snapshot.emergencyMitigation, true);
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), false);
}

// Emergency mode immediately starts suspension and the full cleanup sweep.
{
  const makeEntity = (overrides = {}) => Object.assign({
    type: "tank",
    label: "Enemy",
    name: "Enemy",
    alpha: 1,
    health: { amount: 100, max: 100 },
    size: 10,
    alive: true,
    destroyed: false,
    valid() { return this.alive; },
    isDead() { return false; },
    destroy() { this.destroyed = true; this.alive = false; },
  }, overrides);
  const candidate = makeEntity();
  const unknown = makeEntity({ label: "Unknown Class", name: "Unknown Class" });
  const projectile = makeEntity({ type: "bullet", isProjectile: true, label: "Bullet" });
  const offscreenFood = makeEntity({ type: "food", label: "Food", foodLevel: 1 });
  const onscreenFood = makeEntity({ type: "food", label: "Food", foodLevel: 1 });
  const all = [candidate, unknown, projectile, offscreenFood, onscreenFood];
  const test = makeProtection({ options: { isEntityOnScreen: (entity) => entity === onscreenFood } });
  test.protection.reportCycle(260, all);
  assert.strictEqual(candidate._loadDisabled, true, "emergency should suspend an eligible entity immediately");
  assert.strictEqual(unknown.destroyed, true, "emergency should trigger unknown-entity cleanup immediately");
  assert.strictEqual(projectile.destroyed, true, "emergency should trigger projectile cleanup immediately");
  assert.strictEqual(offscreenFood.destroyed, true, "emergency should trigger off-screen cleanup immediately");
  assert.strictEqual(onscreenFood.destroyed, true, "emergency should trigger on-screen natural-entity cleanup immediately");
}

// Critical memory pressure can also force all protocols without waiting for the lag timer.
{
  const test = makeProtection({
    options: {
      sampleProvider: () => ({
        memoryRatio: 0.95,
        rssMb: 900,
        heapUsedMb: 500,
        heapLimitMb: 512,
        externalMb: 0,
        eventLoopP95Ms: 0,
        eventLoopMaxMs: 0,
        memoryGrowthMb: 0,
        memoryTrendReady: false,
      }),
    },
  });
  test.protection.sample();
  const snapshot = test.protection.getSnapshot();
  assert.strictEqual(snapshot.naturalSpawnsPaused, true);
  assert.strictEqual(snapshot.lagPolicy100Triggered, true);
  assert.strictEqual(snapshot.lagPolicy150Triggered, true);
  assert.strictEqual(snapshot.lagPolicy200Triggered, true);
  assert.strictEqual(snapshot.criticalLagConfirmed, true);
}

// A severe-but-not-extreme lag incident still observes the critical persistence window.
{
  const test = makeProtection({ env: { RANAR_LOAD_EXTREME_LAG_MS: "500" } });
  test.protection.reportCycle(260, []);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
  assert.strictEqual(test.protection.getSnapshot().loadSuspensionElapsedMs, 0);
  test.setNow(14999);
  test.protection.sample();
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
  test.setNow(15000);
  test.protection.sample();
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, true);
}

// Recovery before the persistence window cancels the pending critical episode.
{
  const test = makeProtection({ env: { RANAR_LOAD_EXTREME_LAG_MS: "500" } });
  test.protection.reportCycle(260, []);
  test.setNow(50);
  test.protection.reportCycle(20, []);
  test.setNow(84);
  test.protection.reportCycle(5, []);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
  test.setNow(20000);
  // Pass a normal start-to-start interval; the long test-clock jump is not a real
  // simulation gap in this recovery-window scenario.
  test.protection.reportCycle(260, [], 114);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
}

// Run speed reflects cycle cadence, not just the duration of the latest callback.
{
  const test = makeProtection();
  test.protection.reportCycle(5, []);
  assert.strictEqual(test.protection.getSnapshot().runSpeedPercent, 100);
  test.setNow(34);
  test.protection.reportCycle(5, []);
  assert(test.protection.getSnapshot().runSpeedPercent >= 95);
  assert.strictEqual(test.protection.getSnapshot().observedCycleIntervalMs, 34);
}

// The legacy millisecond-based scheduler slowdown remains independent.
{
  const test = makeProtection();
  test.protection.reportCycle(110, []);
  assert(test.protection.getRunSpeedMultiplier() > 1);
  assert(test.protection.getSnapshot().runSpeedPercent < 40);
  // The following tick begins after the slower scheduler's added wait.
  test.setNow(16);
  test.protection.reportCycle(5, [], 11);
  assert(test.protection.getSnapshot().runSpeedPercent < 40);
  // Once a few subsequent cycles return to cadence, measured speed recovers.
  test.setNow(52.7);
  test.protection.reportCycle(5, [], 47.7);
  assert(test.protection.getSnapshot().runSpeedPercent > 50);
}

console.log("loadProtection tests passed");
