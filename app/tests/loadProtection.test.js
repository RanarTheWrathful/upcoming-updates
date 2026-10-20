"use strict";

const assert = require("assert");
const createLoadProtection = require("../lib/loadProtection");

function makeProtection(overrides = {}) {
  let now = 0;
  const emptyEntities = [];
  const env = Object.assign({
    RANAR_LOAD_SAMPLE_MS: "2000",
    RANAR_LAG_RESPONSE_RECOVERY_MS: "10",
    RANAR_LAG_MEMORY_CLEANUP_INTERVAL_MS: "1000",
  }, overrides.env || {});
  const changes = [];
  const memoryCleanups = [];
  const protection = createLoadProtection(Object.assign({
    env,
    nowProvider: () => now,
    sampleProvider: () => ({
      memoryRatio: 0.1,
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
    onMemoryPressure: (level) => memoryCleanups.push(level),
    delayMonitor: { enable() {}, disable() {}, percentile() { return 0; }, reset() {} },
  }, overrides.options || {}));
  return {
    protection,
    changes,
    memoryCleanups,
    setNow(value) { now = value; },
  };
}

function makeEntity(overrides = {}) {
  return Object.assign({
    type: "tank", label: "Enemy", name: "Enemy", alpha: 1, size: 10,
    health: { amount: 100, max: 100 }, alive: true, destroyed: false,
    valid() { return this.alive; }, isDead() { return false; },
    destroy() { this.destroyed = true; this.alive = false; },
  }, overrides);
}

// A single extreme cycle affects pacing, but destructive mitigation waits for persistence.
{
  const test = makeProtection();
  test.protection.reportCycle(260, [], 0);
  let snapshot = test.protection.getSnapshot();
  assert.strictEqual(snapshot.lagResponseStageId, "normal");
  assert.strictEqual(snapshot.naturalSpawnsPaused, false);
  assert.strictEqual(snapshot.emergencyMitigation, false,
    "a single expensive tick must not jump directly to on-screen cleanup or reset");
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), true);

  // Persistent low run speed eventually enters the first, least disruptive stage.
  for (let now = 260; now <= 5260; now += 260) {
    test.setNow(now);
    test.protection.reportCycle(260, [], now - 260);
  }
  snapshot = test.protection.getSnapshot();
  assert.strictEqual(snapshot.lagResponseStageId, "offscreen-projectiles");
  assert.strictEqual(snapshot.naturalSpawnsPaused, false,
    "natural spawning remains active until the off-screen projectile pass completes and the next stage begins");
}

// Natural population caps still reduce spawning as measured simulation load rises.
{
  const natural = Array.from({ length: 10 }, (_, i) => makeEntity({
    label: "Natural " + i, name: "Natural " + i, _loadProtectionNaturalSpawn: true,
  }));
  const test = makeProtection({ options: { getEntities: () => natural } });
  test.protection.reportCycle(5, natural, 0);
  const baseline = test.protection.getSnapshot().naturalPopulationBaseline;
  assert.strictEqual(baseline, 10, "the healthy population should establish a stable baseline");
  // A sustained 220 ms execution cycle is above the newly raised threshold.
  // Three samples should lower the cap, while the persistence timer still keeps
  // the cleanup ladder from deleting entities immediately.
  for (let now = 33; now <= 99; now += 33) {
    test.setNow(now);
    test.protection.reportCycle(220, natural, now);
  }
  assert.strictEqual(natural.every((entity) => !entity.destroyed), true,
    "the new anti-lag ladder does not destroy natural enemies before its persistence timer");
  assert.strictEqual(test.protection.getSnapshot().cycleStage, 0,
    "a short slowdown should not start the mitigation tiers");
  for (let now = 132; now <= 5200; now += 33) {
    test.setNow(now);
    test.protection.reportCycle(220, natural, now);
  }
  assert(test.protection.getSnapshot().naturalPopulationCap < baseline,
    "sustained throughput loss and measured latency should lower the natural population cap after the tier timer");
}

// Scheduler pacing escalates one tier per five seconds; emergency max requires sustained severe lag.
{
  const test = makeProtection();
  test.protection.reportCycle(200, [], 0);
  assert.strictEqual(test.protection.getSnapshot().runSpeedLevel, 0,
    "one slow cycle must not increase scheduler pacing");
  for (let now = 1000; now < 5000; now += 1000) {
    test.setNow(now);
    test.protection.reportCycle(200, [], now);
  }
  assert.strictEqual(test.protection.getSnapshot().runSpeedLevel, 0,
    "a slowdown shorter than five seconds must not increase scheduler pacing");
  test.setNow(5000);
  test.protection.reportCycle(200, [], 5000);
  assert.strictEqual(test.protection.getSnapshot().runSpeedLevel, 0,
    "tier timing begins once both smoothed latency and throughput cross their thresholds");
  test.setNow(6000);
  test.protection.reportCycle(200, [], 6000);
  assert.strictEqual(test.protection.getSnapshot().runSpeedLevel, 1,
    "sustained lag should climb by one tier after five seconds, not jump to the requested level");

  const emergency = makeProtection({
    env: {
      RANAR_LOAD_RUNTIME_EMA_ALPHA: "1",
      RANAR_LOAD_EMERGENCY_PERSIST_MS: "1000",
      RANAR_LAG_EMERGENCY_PERSIST_MS: "1000",
      RANAR_LOAD_EMERGENCY_SPEED_PERCENT: "15",
      RANAR_LAG_EMERGENCY_SPEED_PERCENT: "15",
    },
  });
  emergency.protection.reportCycle(1000, [], 0);
  let emergencySnapshot = emergency.protection.getSnapshot();
  assert(emergencySnapshot.runSpeedLevel < 5,
    "a single 1000ms cycle must not instantly max scheduler pacing");
  assert.notStrictEqual(emergencySnapshot.lagResponseStageId, "emergency-shutdown",
    "a single 1000ms cycle must not trigger the emergency mitigation tier");
  emergency.setNow(999);
  emergency.protection.reportCycle(1000, [], 999);
  emergencySnapshot = emergency.protection.getSnapshot();
  assert.notStrictEqual(emergencySnapshot.lagResponseStageId, "emergency-shutdown",
    "the emergency reset must wait for the complete persistence window");
  emergency.setNow(1000);
  emergency.protection.reportCycle(1000, [], 1000);
  emergencySnapshot = emergency.protection.getSnapshot();
  assert.strictEqual(emergencySnapshot.runSpeedLevel, 5,
    "persistent severe lag may max scheduler pacing");
  assert.strictEqual(emergencySnapshot.lagResponseStageId, "emergency-shutdown",
    "persistent severe lag may activate emergency mitigation");
}

// The hard emergency boundary is exactly 1000ms. A lower environment setting
// must not make one 999ms cycle instantly max the scheduler or reset the world.
{
  const test = makeProtection({
    env: {
      RANAR_LOAD_EXTREME_LAG_MS: "100",
      RANAR_LOAD_RUNTIME_EMA_ALPHA: "1",
      RANAR_LOAD_EMERGENCY_PERSIST_MS: "1000",
      RANAR_LAG_EMERGENCY_PERSIST_MS: "1000",
      RANAR_LOAD_EMERGENCY_SPEED_PERCENT: "15",
      RANAR_LAG_EMERGENCY_SPEED_PERCENT: "15",
    },
  });
  test.protection.reportCycle(999, [], 0);
  let snapshot = test.protection.getSnapshot();
  assert(snapshot.runSpeedLevel < 5,
    "a 999ms cycle must not instantly max scheduler pacing");
  assert.notStrictEqual(snapshot.lagResponseStageId, "emergency-shutdown",
    "a 999ms cycle must not trigger the emergency world reset");
  test.setNow(1);
  test.protection.reportCycle(1000, [], 1);
  snapshot = test.protection.getSnapshot();
  assert(snapshot.runSpeedLevel < 5, "the first raw 1000ms sample starts, but does not bypass, the persistence timer");
  assert.notStrictEqual(snapshot.lagResponseStageId, "emergency-shutdown");
  test.setNow(1001);
  test.protection.reportCycle(1000, [], 1001);
  snapshot = test.protection.getSnapshot();
  assert.strictEqual(snapshot.runSpeedLevel, 5,
    "a raw 1000ms cycle must max scheduler pacing only after sustained emergency lag");
  assert.strictEqual(snapshot.lagResponseStageId, "emergency-shutdown",
    "a raw 1000ms cycle must activate emergency mitigation only after sustained emergency lag");
}

// Once throughput recovers, every natural spawn gate reopens even if the
// slower diagnostic-stage cooldown has not returned to normal or heap use remains high but stable.
{
  let now = 0;
  const env = {
    RANAR_LOAD_RUNTIME_EMA_ALPHA: "1",
    RANAR_LAG_RECOVERY_SPEED_PERCENT: "75",
    RANAR_LAG_RESPONSE_RECOVERY_MS: "10",
  };
  const { DEFAULT_STEPS } = require("../lib/lagResponse");
  for (const step of DEFAULT_STEPS) {
    const prefix = "RANAR_LAG_STEP_" + step.id.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    env[prefix + "_SPEED_PERCENT"] = "100";
    env[prefix + "_DURATION_MS"] = "1";
    env[prefix + "_MIN_ACTIVE_MS"] = "0";
  }
  const test = makeProtection({
    env,
    options: {
      // A high, stable heap should not prevent lag gates reopening once
      // simulation throughput is healthy again; V8 need not return reserved pages.
      sampleProvider: () => ({
        memoryRatio: 0.99, rssMb: 450, heapUsedMb: 420, heapLimitMb: 456, externalMb: 0,
        eventLoopP95Ms: 0, eventLoopMaxMs: 0, memoryGrowthMb: 0, memoryTrendReady: false,
      }),
    },
  });
  for (let tick = 0; tick < 20 && test.protection.getSnapshot().lagResponseStage < 3; tick++) {
    now += 2;
    test.setNow(now);
    test.protection.reportCycle(220, [], now - 220);
  }
  assert(test.protection.getSnapshot().lagResponseStage >= 3,
    "sustained server lag should reach the bot-throttling stage in this short-timer test");
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), false,
    "natural enemies and bosses should be gated while their mitigation stage is active");
  assert.strictEqual(test.protection.shouldSpawnFood(), false, "food spawning pauses at its mitigation stage");
  assert.strictEqual(test.protection.shouldSpawnBot(), false, "bot spawning pauses at its mitigation stage");

  // Supply a stable high heap sample while runtime speed is still poor; it must
  // not bypass the active mitigation stage on its own.
  test.protection.sample();
  assert.notStrictEqual(test.protection.getSnapshot().lagResponseStageId, "normal",
    "high but stable memory alone must not prematurely release active lag mitigation");

  for (let tick = 0; tick < 20 && test.protection.getSnapshot().lagResponseStage !== -1; tick++) {
    now += 5;
    test.setNow(now);
    test.protection.reportCycle(1, [], now - 1);
  }
  const recovered = test.protection.getSnapshot();
  assert.strictEqual(recovered.lagResponseStageId, "normal", "the mitigation ladder should reset after sustained recovery");
  assert.strictEqual(recovered.naturalSpawnRecoveryOverride, true,
    "natural spawning should be explicitly released on lag recovery");
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), true,
    "natural enemies and bosses should spawn again after lag subsides");
  assert.strictEqual(test.protection.shouldSpawnFood(), true, "food spawning should resume after lag subsides");
  assert.strictEqual(test.protection.shouldSpawnBot(), true, "bot spawning should resume after lag subsides");
  assert.strictEqual(test.protection.canSpawnNaturalEntity(), true,
    "the natural population cap should no longer use a stale anti-lag stage after recovery");
}

// Off-screen culling rechecks visibility, and only runs after the duration configured for that stage.
{
  const projectile = makeEntity({ type: "bullet", isProjectile: true, label: "Projectile" });
  const food = makeEntity({ type: "food", foodLevel: 1, label: "Food" });
  let now = 0;
  let visible = false;
  const entities = [projectile, food];
  const env = {
    RANAR_LAG_STEP_OFFSCREEN_PROJECTILES_DURATION_MS: "100",
    RANAR_LAG_RESPONSE_SCAN_BATCH_SIZE: "100",
    RANAR_LAG_RESPONSE_DESTROY_BATCH_SIZE: "1",
  };
  const test = makeProtection({
    env,
    options: {
      getEntities: () => entities,
      isEntityVisibleToAnyClient(entity) {
        if (entity === projectile) return visible;
        return false;
      },
    },
  });
  test.protection.reportCycle(260, entities, 0);
  visible = true;
  now = 99;
  test.setNow(now);
  test.protection.reportCycle(260, entities, now - 260);
  assert.strictEqual(projectile.destroyed, false, "a single tick and a sub-threshold duration do not destroy projectiles");
  visible = false;
  now = 500;
  test.setNow(now);
  test.protection.reportCycle(260, entities, now - 260);
  assert.strictEqual(projectile.destroyed, true, "off-screen projectiles are removed after their stage duration persists");
  assert.strictEqual(food.destroyed, false, "food belongs to a later stage, not the projectile pass");
}

// Natural bosses remain eligible for their dedicated late-stage cleanup even when
// their generic class carries isProtected/alwaysExists/KEEP flags.
{
  let now = 0;
  const boss = makeEntity({
    label: "Natural Boss", name: "Natural Boss", isBoss: true, boss: true,
    _loadProtectionNaturalSpawn: true, isProtected: true, alwaysExists: true,
    keep: true, KEEP: true,
  });
  const wall = makeEntity({
    label: "Maze Wall", name: "Maze Wall", type: "wall", isWall: true,
    isBoss: true, _loadProtectionNaturalSpawn: true, isProtected: true,
    alwaysExists: true, keep: true, KEEP: true,
  });
  const entities = [boss, wall];
  const env = {
    RANAR_LAG_RESPONSE_SCAN_BATCH_SIZE: "10000",
    RANAR_LAG_RESPONSE_DESTROY_BATCH_SIZE: "10000",
    RANAR_LAG_RESPONSE_RESCAN_MS: "1",
    RANAR_LAG_RESPONSE_SUSPEND_INTERVAL_MS: "1",
  };
  const { DEFAULT_STEPS } = require("../lib/lagResponse");
  for (const step of DEFAULT_STEPS) {
    const prefix = "RANAR_LAG_STEP_" + step.id.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    env[prefix + "_DURATION_MS"] = "1";
    env[prefix + "_MIN_ACTIVE_MS"] = "0";
  }
  const test = makeProtection({
    env,
    options: { getEntities: () => entities, isEntityVisibleToAnyClient: () => false },
  });
  for (let tick = 0; tick < 30 && !boss.destroyed; tick++) {
    now += 10;
    test.setNow(now);
    test.protection.reportCycle(450, entities, now - 450);
  }
  assert.strictEqual(boss.destroyed, true,
    "the natural-boss stage should be able to remove a natural boss despite generic protection flags");
  assert.strictEqual(wall.destroyed, false,
    "a structure remains protected even when it carries boss-like flags");
}

// Critical memory pressure performs generic memory cleanup only and does not skip ahead to destructive stages.
{
  let now = 0;
  const bot = makeEntity({ isBot: true });
  const test = makeProtection({
    env: { RANAR_LAG_MEMORY_CLEANUP_INTERVAL_MS: "1" },
    options: {
      getEntities: () => [bot],
      sampleProvider: () => ({
        memoryRatio: 0.96, rssMb: 900, heapUsedMb: 500, heapLimitMb: 512, externalMb: 0,
        eventLoopP95Ms: 0, eventLoopMaxMs: 0, memoryGrowthMb: 0, memoryTrendReady: false,
      }),
    },
  });
  test.protection.sample();
  const snapshot = test.protection.getSnapshot();
  assert.strictEqual(snapshot.lagResponseStageId, "normal");
  assert.strictEqual(snapshot.naturalSpawnsPaused, false);
  assert.strictEqual(bot.destroyed, false, "memory pressure alone does not delete gameplay entities");
  assert.strictEqual(test.protection.shouldSpawnNaturalEntities(), true);
}

// Lag mitigation must never rename, fade, or disable on-screen gameplay entities.
{
  let now = 0;
  const ownedProjectile = makeEntity({
    name: "Owned Projectile", label: "Owned Projectile", type: "bullet", isProjectile: true,
  });
  const visibleEnemy = makeEntity({
    name: "Visible Enemy", label: "Visible Enemy",
    children: [ownedProjectile], possiblyChildren: new Set([ownedProjectile]),
  });
  ownedProjectile.master = visibleEnemy;
  ownedProjectile.source = visibleEnemy;
  const entities = [visibleEnemy, ownedProjectile];
  const env = {};
  const { DEFAULT_STEPS } = require("../lib/lagResponse");
  for (const step of DEFAULT_STEPS) {
    const prefix = "RANAR_LAG_STEP_" + step.id.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    env[prefix + "_DURATION_MS"] = "1";
    env[prefix + "_MIN_ACTIVE_MS"] = "0";
  }
  env.RANAR_LOAD_RUNTIME_EMA_ALPHA = "1";
  const test = makeProtection({
    env,
    options: {
      getEntities: () => entities,
      isEntityVisibleToAnyClient: () => true,
    },
  });
  for (let tick = 0; tick < 7; tick++) {
    now += 1;
    test.setNow(now);
    test.protection.reportCycle(260, entities, now - 260);
  }
  assert.strictEqual(visibleEnemy._loadDisabled, undefined,
    "on-screen entities are never marked disabled during lag mitigation");
  assert.strictEqual(ownedProjectile._loadDisabled, undefined,
    "owned entities are never suspended with their owner");
  assert.strictEqual(visibleEnemy.name, "Visible Enemy", "entity identity is preserved");
  assert.strictEqual(visibleEnemy.alpha, 1, "entity opacity is not modified by lag mitigation");
  assert.strictEqual(visibleEnemy.destroyed, false, "on-screen general entities remain live");
}

console.log("loadProtection tests passed");
