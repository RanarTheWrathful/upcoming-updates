"use strict";

const assert = require("assert");
const createLoadProtection = require("../lib/loadProtection");

function makeProtection(overrides = {}) {
  let now = 0;
  const emptyEntities = [];
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
    getEntities: () => emptyEntities,
    onEntityChange: (_entity, _disabled, details) => changes.push(details || {}),
    delayMonitor: { enable() {}, disable() {}, percentile() { return 0; }, reset() {} },
  }, overrides.options || {}));
  return {
    protection,
    changes,
    setNow(value) { now = value; },
  };
}

// Sustained expensive cycles, rather than one noisy tick, activate the reduced population cap.
{
  const test = makeProtection();
  let start = 0;
  for (let i = 0; i < 7; i++) {
    test.setNow(start + 110);
    test.protection.reportCycle(110, [], start);
    start += 110;
  }
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), true);
  assert.strictEqual(test.protection.getSnapshot().lagPolicy100Triggered, false);
  test.setNow(10659);
  test.protection.sample();
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), true);
  test.setNow(10660);
  test.protection.sample();
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), true,
    "ordinary sustained lag should reduce the cap without globally pausing all natural spawning");
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

// Natural population caps use the last healthy population as a stable baseline,
// destroy only a small batch at a time, and prefer off-screen entities before visible ones.
{
  const makeNaturalEntity = (index, onScreen) => ({
    type: "tank", label: "Natural Enemy " + index, name: "Natural Enemy " + index,
    _loadProtectionNaturalSpawn: true, onScreen, alpha: 1, size: 10,
    health: { amount: 100, max: 100 }, alive: true, destroyed: false,
    valid() { return this.alive; }, isDead() { return false; },
    destroy() { this.destroyed = true; this.alive = false; },
  });
  const naturalEntities = Array.from({ length: 10 }, (_, i) => makeNaturalEntity(i, i >= 2));
  const boundTurret = makeNaturalEntity(99, false);
  boundTurret.bond = {};
  naturalEntities.push(boundTurret);
  const test = makeProtection({
    env: { RANAR_LAG_CLEANUP_DESTROY_BATCH_SIZE: "1" },
    options: {
      getEntities: () => naturalEntities,
      isEntityOnScreen: (entity) => entity.onScreen,
    },
  });

  // Learn the baseline while healthy.
  test.protection.reportCycle(5, naturalEntities, 0);
  assert.strictEqual(test.protection.getSnapshot().naturalPopulationBaseline, 10);

  // Degrade the simulation. The smoothed estimate engages the cap after repeated costly cycles.
  test.setNow(33);
  test.protection.reportCycle(110, naturalEntities, 33);
  test.setNow(66);
  test.protection.reportCycle(110, naturalEntities, 66);
  test.setNow(99);
  test.protection.reportCycle(110, naturalEntities, 99);
  assert.strictEqual(naturalEntities[0].destroyed, true, "first batch targets an off-screen entity");
  assert.strictEqual(naturalEntities[1].destroyed, false, "cleanup respects the per-cycle destroy quota");
  assert.strictEqual(naturalEntities[2].destroyed, false, "visible entities are not chosen while off-screen candidates suffice");
  assert.strictEqual(boundTurret.destroyed, false, "bonded turrets remain under parent lifecycle control");
  assert.strictEqual(test.protection.getSnapshot().naturalPopulationCap, 8,
    "the elevated-lag cap is a ratio of the stable healthy baseline");

  test.setNow(132);
  test.protection.reportCycle(110, naturalEntities, 132);
  assert.strictEqual(naturalEntities[1].destroyed, true, "the next cycle continues the active sweep");
  assert.strictEqual(naturalEntities[2].destroyed, false);
  assert.strictEqual(test.protection.getSnapshot().naturalPopulationCount, 8);
  assert.strictEqual(test.protection.canSpawnNaturalEntity(), false,
    "natural spawning is refused when the reduced cap has been reached");

  // Ten healthy-cadence cycles clear the transient elevated stage; the natural cap restores.
  let start = 165;
  for (let i = 0; i < 10; i++) {
    test.setNow(start);
    test.protection.reportCycle(5, naturalEntities, start);
    start += 33;
  }
  assert.strictEqual(test.protection.canSpawnNaturalEntity(), true,
    "natural spawn allowance returns as the simulation recovers");
}


// Large natural-population recounts are sliced across cycles rather than scanning the full world at once.
{
  let validChecks = 0;
  const population = Array.from({ length: 1200 }, (_, i) => ({
    type: "tank",
    label: "Natural " + i,
    name: "Natural " + i,
    _loadProtectionNaturalSpawn: true,
    alive: true,
    valid() { validChecks++; return this.alive; },
    isDead() { return false; },
  }));
  const test = makeProtection({
    env: { RANAR_LAG_POPULATION_RECOUNT_BATCH_SIZE: "100" },
    options: { getEntities: () => population },
  });

  test.protection.reportCycle(5, population, 0);
  assert(validChecks <= 100, "a single cycle should not validate the full population");
  assert.strictEqual(test.protection.getSnapshot().naturalPopulationRecounting, true);

  let start = 33;
  for (let i = 0; i < 12; i++) {
    test.setNow(start + 5);
    test.protection.reportCycle(5, population, start);
    start += 33;
  }
  const snapshot = test.protection.getSnapshot();
  assert.strictEqual(snapshot.naturalPopulationCacheReady, true);
  assert.strictEqual(snapshot.naturalPopulationCount, 1200);
  assert.strictEqual(snapshot.naturalPopulationBaseline, 1200);
  assert(validChecks >= 1200 && validChecks < 1400,
    "the population is counted once, in bounded batches");
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
  const naturalBot = makeEntity({
    label: "Bot", name: "Bot", type: "tank", isBot: true,
    _loadProtectionNaturalSpawn: true,
  });
  const projectile = makeEntity({
    type: "bullet", isProjectile: true, label: "Bullet", source: naturalBot,
  });
  const aura = makeEntity({
    type: "atmosphere", isProjectile: false, label: "Aura", source: naturalBot,
  });
  const offscreenFood = makeEntity({ type: "food", label: "Food", foodLevel: 1 });
  const onscreenFood = makeEntity({ type: "food", label: "Food", foodLevel: 1 });
  const all = [candidate, unknown, projectile, aura, naturalBot, offscreenFood, onscreenFood];
  const test = makeProtection({ options: { isEntityOnScreen: (entity) => entity === onscreenFood } });
  test.protection.reportCycle(260, all);
  assert.strictEqual(candidate._loadDisabled, true, "emergency should suspend an eligible entity immediately");
  assert.strictEqual(unknown.destroyed, true, "emergency should trigger unknown-entity cleanup immediately");
  assert.strictEqual(projectile.destroyed, false, "lag cleanup must leave transient lifetime decisions to the visibility-aware timer");
  assert.strictEqual(aura.destroyed, false, "lag cleanup must not destroy auras directly");
  assert.strictEqual(naturalBot.destroyed, true, "naturally spawned bots are eligible when the population exceeds the cap");
  assert.strictEqual(offscreenFood.destroyed, true, "off-screen natural entities should be cleaned first");
  assert.strictEqual(onscreenFood.destroyed, false, "on-screen natural entities should be spared while enough off-screen entities can satisfy the cap");
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
  let start = 0;
  let criticalStartedAt = null;
  for (let i = 0; i < 12; i++) {
    test.setNow(start + 260);
    test.protection.reportCycle(260, [], start);
    const currentSnapshot = test.protection.getSnapshot();
    if (criticalStartedAt === null && currentSnapshot.runSpeedPercent <= currentSnapshot.runSpeedThresholds.critical) {
      criticalStartedAt = start + 260;
    }
    start += 260;
  }
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
  assert.strictEqual(test.protection.getSnapshot().loadSuspensionElapsedMs, 0);
  assert(Number.isFinite(criticalStartedAt), "sustained slow cycles should start the critical persistence clock");
  test.setNow(criticalStartedAt + 14999);
  test.protection.sample();
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
  test.setNow(criticalStartedAt + 15000);
  test.protection.sample();
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, true);
}

// Recovery before the persistence window cancels the pending critical episode.
{
  const test = makeProtection({ env: { RANAR_LOAD_EXTREME_LAG_MS: "500" } });
  let start = 0;
  for (let i = 0; i < 12; i++) {
    test.setNow(start + 260);
    test.protection.reportCycle(260, [], start);
    start += 260;
  }
  test.setNow(start + 20);
  test.protection.reportCycle(20, [], start);
  start += 34;
  test.setNow(start + 5);
  test.protection.reportCycle(5, [], start);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
  test.setNow(20000);
  // A later single costly cycle is not a critical episode when its smoothed run speed has recovered.
  test.protection.reportCycle(260, [], 114);
  assert.strictEqual(test.protection.getSnapshot().criticalLagConfirmed, false);
}

// Deliberate scheduler gaps are diagnostic only; they do not masquerade as simulation work.
{
  const test = makeProtection();
  test.protection.reportCycle(5, [], 0);
  assert.strictEqual(test.protection.getSnapshot().runSpeedPercent, 100);
  test.setNow(300);
  test.protection.reportCycle(5, [], 300);
  assert.strictEqual(test.protection.getSnapshot().runSpeedPercent, 100,
    "a long start-to-start interval must not be counted as heavy simulation work");
  assert.strictEqual(test.protection.getSnapshot().observedCycleIntervalMs, 300);
  assert.strictEqual(test.protection.getSnapshot().emergencyMitigation, false,
    "adaptive pacing must not trigger its own emergency response");
}

// Cost smoothing damps a single moderate spike, then escalates after repeated expensive cycles.
{
  const test = makeProtection({ env: { RANAR_LOAD_EXTREME_LAG_MS: "500" } });
  test.protection.reportCycle(110, [], 0);
  assert.strictEqual(test.protection.getRunSpeedMultiplier(), 1,
    "one moderately slow cycle should not immediately change pacing");
  const firstSmoothedCost = test.protection.getSnapshot().smoothedCycleMs;
  test.setNow(110);
  test.protection.reportCycle(110, [], 110);
  test.setNow(220);
  test.protection.reportCycle(110, [], 220);
  assert(test.protection.getRunSpeedMultiplier() > 1,
    "repeated expensive cycles should gradually increase pacing protection");
  assert(test.protection.getSnapshot().smoothedCycleMs > firstSmoothedCost);
  const speedAfterLoad = test.protection.getSnapshot().runSpeedPercent;
  test.setNow(500);
  test.protection.reportCycle(5, [], 500);
  assert(test.protection.getSnapshot().runSpeedPercent > speedAfterLoad,
    "recovery should follow actual cycle cost even if the scheduler interval was long");
}

// A bot suspended during extreme lag is not culled by the cleanup sweep and returns after recovery.
{
  const bot = {
    type: "tank", label: "Bot", name: "Test Bot", isBot: true,
    _loadProtectionNaturalSpawn: true, alpha: 1, size: 10,
    health: { amount: 100, max: 100 }, alive: true, destroyed: false,
    valid() { return this.alive; }, isDead() { return false; },
    destroy() { this.destroyed = true; this.alive = false; },
  };
  const test = makeProtection({
    env: {
      RANAR_LOAD_EXTREME_LAG_MS: "250",
      RANAR_LOAD_ENTITY_FADE_MS: "30",
      RANAR_LAG_CRITICAL_DURATION_MS: "1",
      RANAR_LAG_150_DURATION_MS: "1",
      RANAR_LAG_200_DURATION_MS: "1",
    },
    options: { getEntities: () => [bot] },
  });
  test.setNow(260);
  test.protection.reportCycle(260, [bot], 0);
  assert.strictEqual(bot._loadDisabled, true, "severe lag can temporarily suspend a bot");
  assert.strictEqual(bot.destroyed, false, "cleanup must keep suspended bots alive for restoration");
  let start = 260;
  for (let i = 0; i < 8; i++) {
    test.setNow(start + 33);
    test.protection.reportCycle(5, [bot], start);
    start += 33;
  }
  assert.strictEqual(bot._loadDisabled, undefined, "a recovered simulation must re-enable the bot");
  assert.strictEqual(bot.name, "Test Bot", "the original bot name must be restored");
  assert.strictEqual(bot.destroyed, false);
}

// Once both run speed and memory pressure recover, suspended bots are restored.
{
  let memoryRatio = 0.95;
  let now = 0;
  const bot = {
    type: "tank", label: "Bot", name: "Memory Test Bot", isBot: true,
    alpha: 1, size: 10, health: { amount: 100, max: 100 }, alive: true,
    valid() { return this.alive; }, isDead() { return false; }, destroy() { this.alive = false; },
  };
  const protection = createLoadProtection({
    env: {
      RANAR_LOAD_EXTREME_LAG_MS: "250",
      RANAR_LOAD_ENTITY_FADE_MS: "30",
      RANAR_LAG_CRITICAL_DURATION_MS: "1",
    },
    nowProvider: () => now,
    sampleProvider: () => ({
      memoryRatio, rssMb: 100, heapUsedMb: 50, heapLimitMb: 512, externalMb: 0,
      eventLoopP95Ms: 0, eventLoopMaxMs: 0, memoryGrowthMb: 0, memoryTrendReady: false,
    }),
    getEntities: () => [bot],
    delayMonitor: { enable() {}, disable() {}, percentile() { return 0; }, reset() {} },
  });
  now = 260;
  protection.reportCycle(260, [bot], 0);
  assert.strictEqual(bot._loadDisabled, true);
  // A healthy tick alone should not defeat an ongoing critical memory emergency.
  let start = 260;
  for (let i = 0; i < 8; i++) {
    now = start + 33;
    protection.reportCycle(5, [bot], start);
    start += 33;
  }
  memoryRatio = 0.5;
  now = start + 33;
  protection.sample();
  protection.reportCycle(5, [bot], start);
  start += 33;
  for (let i = 0; i < 8; i++) {
    now = start + 33;
    protection.reportCycle(5, [bot], start);
    start += 33;
  }
  assert.strictEqual(bot._loadDisabled, undefined, "bots restore once the actual load is healthy");
  assert.strictEqual(bot.name, "Memory Test Bot");
}

console.log("loadProtection tests passed");
