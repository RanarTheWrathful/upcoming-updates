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
  test.setNow(33);
  test.protection.reportCycle(110, natural, 33);
  test.setNow(66);
  test.protection.reportCycle(110, natural, 66);
  test.setNow(99);
  test.protection.reportCycle(110, natural, 99);
  assert.strictEqual(natural.every((entity) => !entity.destroyed), true,
    "the new anti-lag ladder does not destroy natural enemies before its persistence timer");
  assert(test.protection.getSnapshot().naturalPopulationCap < baseline,
    "reduced simulation throughput should still lower the natural population cap");
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
    test.protection.reportCycle(2000, entities, now - 2000);
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

// Recovery after temporary suspension restores opacity, names, and gameplay state.
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
  // Use the real staged sequence with short timings; one visible general entity is
  // suspended only after the five off-screen sweeps have been completed.
  const { DEFAULT_STEPS } = require("../lib/lagResponse");
  for (const step of DEFAULT_STEPS) {
    const prefix = "RANAR_LAG_STEP_" + step.id.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    env[prefix + "_DURATION_MS"] = "1";
    env[prefix + "_MIN_ACTIVE_MS"] = "0";
  }
  env.RANAR_LOAD_ENTITY_FADE_MS = "2";
  env.RANAR_LOAD_RUNTIME_EMA_ALPHA = "1";
  env.RANAR_LAG_RESPONSE_RECOVERY_MS = "5";
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
  assert.strictEqual(visibleEnemy._loadDisabled, true,
    "an on-screen ordinary entity is disabled only after earlier mitigation stages");
  assert.strictEqual(ownedProjectile._loadDisabled, true,
    "owned projectiles are suspended together with their visible owner");
  for (let tick = 0; tick < 8; tick++) {
    now += 10;
    test.setNow(now);
    test.protection.reportCycle(5, entities, now - 5);
  }
  assert.strictEqual(visibleEnemy._loadDisabled, undefined,
    "sustained healthy throughput restores suspended entities");
  assert.strictEqual(ownedProjectile._loadDisabled, undefined,
    "owned projectiles are restored with their owner when load recovers");
  assert.strictEqual(visibleEnemy.name, "Visible Enemy");
  assert.strictEqual(visibleEnemy.destroyed, false);
}

console.log("loadProtection tests passed");
