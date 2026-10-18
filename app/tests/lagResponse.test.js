"use strict";

const assert = require("assert");
const createLagResponse = require("../lib/lagResponse");

function fastEnv() {
  const env = {
    RANAR_LAG_RESPONSE_SCAN_BATCH_SIZE: "10000",
    RANAR_LAG_RESPONSE_DESTROY_BATCH_SIZE: "10000",
    RANAR_LAG_RESPONSE_RESCAN_MS: "1",
    RANAR_LAG_RESPONSE_SUSPEND_INTERVAL_MS: "1",
    RANAR_LAG_RESPONSE_RECOVERY_MS: "5",
    RANAR_LOAD_WARNING_MEMORY: "0.75",
    RANAR_LOAD_HIGH_MEMORY: "0.86",
    RANAR_LOAD_CRITICAL_MEMORY: "0.94",
  };
  for (const step of createLagResponse.DEFAULT_STEPS) {
    const prefix = "RANAR_LAG_STEP_" + step.id.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    env[prefix + "_DURATION_MS"] = "1";
    env[prefix + "_MIN_ACTIVE_MS"] = "0";
  }
  return env;
}

// A single disastrous tick is not enough to enter even the cheapest cleanup stage.
{
  let now = 0;
  const response = createLagResponse({
    env: {},
    nowProvider: () => now,
    getEntities: () => [],
  });
  response.update(0, { cycleMs: 260 }, []);
  assert.strictEqual(response.activeStageId, "normal");
  now = 4999;
  response.update(0, { cycleMs: 260 }, []);
  assert.strictEqual(response.activeStageId, "normal");
  now = 5000;
  response.update(0, { cycleMs: 260 }, []);
  assert.strictEqual(response.activeStageId, "offscreen-projectiles");
  assert.strictEqual(response.naturalSpawnsPaused, false, "spawns are not paused before off-screen projectile cleanup completes");
}

// Full staged response order, tri-state visibility, and owned-action callbacks.
{
  let now = 0;
  const removed = [];
  const suspended = [];
  const resets = [];
  const recovery = [];
  const entities = [
    { id: "projectile-off", category: "projectile", visible: false },
    { id: "enemy-off", category: "naturalEnemy", visible: false },
    { id: "food-off", category: "food", visible: false },
    { id: "bot-off", category: "bot", visible: false },
    { id: "boss-off", category: "naturalBoss", visible: false },
    { id: "general-on", category: "general", visible: true, score: 10 },
    { id: "projectile-on", category: "projectile", visible: true },
    { id: "food-on", category: "food", visible: true, score: 20 },
    { id: "enemy-on", category: "naturalEnemy", visible: true, score: 30 },
    { id: "bot-on", category: "bot", visible: true, score: 40 },
    { id: "boss-on", category: "naturalBoss", visible: true, score: 50 },
    { id: "unknown-view", category: "projectile", visible: null },
  ];
  const env = fastEnv();
  const response = createLagResponse({
    env,
    nowProvider: () => now,
    getEntities: () => entities,
    isEntityVisibleToAnyClient: (entity) => entity.visible,
    isCandidate: (entity, step) => entity.category === step.category || step.category === "general" && entity.category === "general",
    scoreEntity: (entity) => entity.score || 0,
    onDestroy: (entity, step) => { removed.push([entity.id, step.id]); return true; },
    onSuspend: (entity, step) => { suspended.push([entity.id, step.id]); return true; },
    onSoftReset: (details) => resets.push(details),
    onRecovery: (details) => recovery.push(details),
  });
  for (let tick = 0; tick < 20; tick++) {
    now++;
    response.update(0, { memoryRatio: 0.1, cycleMs: 375 }, entities);
  }
  assert.strictEqual(response.activeStageId, "onscreen-natural-bosses",
    "sub-500ms lag may progress through normal tiers but must not trigger a world reset");
  assert.strictEqual(resets.length, 0, "sub-500ms lag never invokes emergency world reset");
  assert(removed.some(([id, stage]) => id === "projectile-off" && stage === "offscreen-projectiles"));
  assert(!removed.some(([id, stage]) => id === "unknown-view" && stage === "offscreen-projectiles"),
    "unknown visibility must never be treated as off-screen");
  assert(removed.some(([id, stage]) => id === "enemy-off" && stage === "offscreen-natural-enemies"));
  assert(removed.some(([id, stage]) => id === "food-off" && stage === "offscreen-food"));
  assert(removed.some(([id, stage]) => id === "bot-off" && stage === "offscreen-bots"));
  assert(removed.some(([id, stage]) => id === "boss-off" && stage === "offscreen-natural-bosses"));
  assert(suspended.some(([id, stage]) => id === "general-on" && stage === "onscreen-entities"));
  assert(removed.some(([id, stage]) => id === "projectile-on" && stage === "onscreen-projectiles"));
  assert(suspended.some(([id, stage]) => id === "food-on" && stage === "onscreen-food"));
  assert(suspended.some(([id, stage]) => id === "enemy-on" && stage === "onscreen-natural-enemies"));
  assert(suspended.some(([id, stage]) => id === "bot-on" && stage === "onscreen-bots"));
  assert(suspended.some(([id, stage]) => id === "boss-on" && stage === "onscreen-natural-bosses"));
  let previousRecoveryIndex = response.activeStageIndex;
  let recoverySteps = 0;
  for (let tick = 0; tick < 13; tick++) {
    now += 10;
    const snapshot = response.update(100, { memoryRatio: 0.1 }, entities);
    if (snapshot.stageIndex < previousRecoveryIndex) {
      assert.strictEqual(snapshot.stageIndex, previousRecoveryIndex - 1,
        "recovery should lower only one mitigation tier at a time");
      previousRecoveryIndex = snapshot.stageIndex;
      recoverySteps++;
    }
  }
  assert.strictEqual(response.activeStageId, "normal", "sustained healthy speed gradually resets the response ladder");
  assert(recoverySteps >= 10, "the recovery ramp should pass through the active tiers instead of snapping to normal");
  assert.strictEqual(recovery.length, 1, "restoration begins once the first recovery interval is sustained");
}

// Runtime mitigation needs both poor throughput and a measured latency signal.
{
  let now = 0;
  const removed = [];
  const response = createLagResponse({
    env: {},
    nowProvider: () => now,
    getEntities: () => [{ category: "projectile", visible: false }],
    isEntityVisibleToAnyClient: (entity) => entity.visible,
    isCandidate: (entity, step) => entity.category === step.category,
    onDestroy: (entity) => { removed.push(entity); return true; },
  });
  for (let tick = 0; tick <= 6; tick++) {
    now = tick * 1000;
    response.update(100, { cycleMs: 300 }, []);
  }
  assert.strictEqual(response.activeStageId, "normal",
    "healthy throughput must prevent mitigation even when raw latency is high");
  assert.strictEqual(removed.length, 0);
}

// Low throughput alone is not enough: if measured latency stays below the
// first latency threshold, the lag-response tiers must remain inactive.
{
  let now = 0;
  const response = createLagResponse({
    env: {},
    nowProvider: () => now,
    getEntities: () => [],
  });
  for (let tick = 0; tick <= 12; tick++) {
    now = tick * 1000;
    response.update(0, { cycleMs: 90 }, []);
  }
  assert.strictEqual(response.activeStageId, "normal",
    "poor throughput without a qualifying latency signal must not start mitigation");
}

// A single 500ms+ tick is not a reset condition. Sustained raw lag AND poor
// throughput must persist for the configured emergency window.
{
  let now = 0;
  const resets = [];
  const response = createLagResponse({
    env: { RANAR_LAG_EMERGENCY_PERSIST_MS: "1000", RANAR_LAG_EMERGENCY_SPEED_PERCENT: "15" },
    nowProvider: () => now,
    getEntities: () => [],
    onSoftReset: (details) => { resets.push(details); },
  });
  response.update(10, { cycleMs: 500 }, []);
  assert.notStrictEqual(response.activeStageId, "soft-reset", "one extreme tick must not reset the server");
  assert.strictEqual(resets.length, 0);
  now = 999;
  response.update(10, { cycleMs: 500 }, []);
  assert.notStrictEqual(response.activeStageId, "soft-reset", "the emergency timer must persist for its full duration");
  now = 1000;
  response.update(10, { cycleMs: 500 }, []);
  assert.strictEqual(response.activeStageId, "soft-reset");
  assert.strictEqual(response.softResetRequested, true);
  assert.strictEqual(resets.length, 1);
  assert.strictEqual(resets[0].emergency, true);
}


// Repeated extreme-looking event-loop samples must not reset the world when
// the simulation is otherwise sustaining healthy throughput.
{
  let now = 0;
  const resets = [];
  const response = createLagResponse({
    env: { RANAR_LAG_EMERGENCY_PERSIST_MS: "10" },
    nowProvider: () => now,
    getEntities: () => [],
    onSoftReset: (details) => resets.push(details),
  });
  response.update(100, { cycleMs: 500 }, []);
  now = 100;
  response.update(100, { cycleMs: 500 }, []);
  now = 1000;
  response.update(100, { cycleMs: 500 }, []);
  assert.strictEqual(resets.length, 0, "healthy throughput prevents emergency reset despite high raw-lag values");
  assert.notStrictEqual(response.activeStageId, "soft-reset");
}

// An isolated extreme sample must not leave a stale emergency timer that can
// combine with a later, unrelated spike.
{
  let now = 0;
  const resets = [];
  const response = createLagResponse({
    env: { RANAR_LAG_EMERGENCY_PERSIST_MS: "1000" },
    nowProvider: () => now,
    getEntities: () => [],
    onSoftReset: (details) => resets.push(details),
  });
  response.update(10, { cycleMs: 500 }, []);
  now = 100;
  response.update(100, { cycleMs: 20 }, []);
  now = 2000;
  response.update(10, { cycleMs: 500 }, []);
  assert.strictEqual(resets.length, 0, "separated spikes must not accumulate into an emergency reset");
  assert.notStrictEqual(response.activeStageId, "soft-reset");
}

// Environment overrides must not make the hard emergency threshold more sensitive
// than the documented 500ms raw-latency boundary.
{
  let now = 0;
  const resets = [];
  const response = createLagResponse({
    env: Object.assign(fastEnv(), {
      RANAR_LOAD_EXTREME_LAG_MS: "100",
      RANAR_LAG_EMERGENCY_PERSIST_MS: "10",
      RANAR_LAG_EMERGENCY_SPEED_PERCENT: "15",
    }),
    nowProvider: () => now,
    getEntities: () => [],
    onSoftReset: (details) => resets.push(details),
  });
  response.update(0, { cycleMs: 499 }, []);
  assert.notStrictEqual(response.activeStageId, "soft-reset",
    "a configured lower threshold must not turn a sub-500ms cycle into an emergency reset");
  assert.strictEqual(resets.length, 0);
  now += 10;
  response.update(0, { cycleMs: 500 }, []);
  assert.notStrictEqual(response.activeStageId, "soft-reset", "the raw emergency must persist after its first sample");
  now += 10;
  response.update(0, { cycleMs: 500 }, []);
  assert.strictEqual(response.activeStageId, "soft-reset",
    "the hard emergency activates after sustained 500ms lag even when a lower threshold override is present");
  assert.strictEqual(resets.length, 1);
}

// Sustained but sub-500ms lag may progress through every normal cleanup stage,
// but never reaches the emergency-only world-reset stage by elapsed time alone.
{
  let now = 0;
  const resets = [];
  const response = createLagResponse({
    env: fastEnv(),
    nowProvider: () => now,
    getEntities: () => [],
    onSoftReset: (details) => resets.push(details),
  });
  for (let tick = 0; tick <= 90; tick++) {
    now = tick * 1000;
    response.update(0, { cycleMs: 499 }, []);
  }
  assert.notStrictEqual(response.activeStageId, "soft-reset",
    "prolonged sub-500ms latency may climb normal tiers but cannot masquerade as the emergency condition");
  assert.strictEqual(resets.length, 0);
}

// Smoothed latency alone cannot trigger the emergency reset; regular mitigation
// can still progress, but the reset is exclusive to a raw 500ms+ observation.
{
  let now = 0;
  const resets = [];
  const response = createLagResponse({
    env: Object.assign(fastEnv(), { RANAR_LAG_EMERGENCY_PERSIST_MS: "10" }),
    nowProvider: () => now,
    getEntities: () => [],
    onSoftReset: (details) => resets.push(details),
  });
  for (let tick = 0; tick <= 20; tick++) {
    now = tick;
    response.update(0, { cycleMs: 200, smoothedCycleMs: 700 }, []);
  }
  assert.notStrictEqual(response.activeStageId, "soft-reset",
    "an old or smoothed 700ms value must not reach the emergency-only reset tier");
  assert.strictEqual(resets.length, 0);
  now += 10;
  response.update(0, { cycleMs: 500, smoothedCycleMs: 700 }, []);
  assert.notStrictEqual(response.activeStageId, "soft-reset", "the first raw severe sample starts persistence");
  now += 10;
  response.update(0, { cycleMs: 500, smoothedCycleMs: 700 }, []);
  assert.strictEqual(response.activeStageId, "soft-reset",
    "a raw 500ms cycle must activate the emergency reset only after the persistence window");
  assert.strictEqual(resets.length, 1);
}


// Recovery restores entities at the start of a measured recovery ramp, then
// backs the tier index down one step at a time. If the stall returns, fading
// entities are handed back to the mitigation controller.
{
  let now = 0;
  const recoveries = [];
  const cancellations = [];
  const response = createLagResponse({
    env: Object.assign(fastEnv(), {
      RANAR_LAG_RESPONSE_RECOVERY_MS: "5",
      RANAR_LAG_EMERGENCY_PERSIST_MS: "1",
    }),
    nowProvider: () => now,
    getEntities: () => [],
    onRecovery: (details) => recoveries.push(details),
    onRecoveryCancelled: (details) => cancellations.push(details),
  });
  response.update(0, { cycleMs: 500 }, []);
  assert.notStrictEqual(response.activeStageId, "soft-reset", "emergency persistence begins at the first stall");
  now = 1;
  response.update(0, { cycleMs: 500 }, []);
  assert.strictEqual(response.activeStageId, "soft-reset");
  now = 5;
  let snapshot = response.update(100, { cycleMs: 20 }, []);
  assert.strictEqual(snapshot.stageIndex, createLagResponse.DEFAULT_STEPS.length - 2,
    "once raw emergency latency clears, the reset-only tier immediately falls back to normal mitigation");
  assert.strictEqual(snapshot.recovering, false, "the recovery timer starts after emergency clears");
  now = 10;
  snapshot = response.update(100, { cycleMs: 20 }, []);
  assert.strictEqual(snapshot.stageIndex, createLagResponse.DEFAULT_STEPS.length - 3);
  assert.strictEqual(snapshot.recovering, true,
    "the response should report recovery while it steps down the tiers");
  assert.strictEqual(snapshot.naturalSpawnsPaused, false,
    "natural spawns may resume once a stable recovery interval has begun");
  assert.strictEqual(recoveries.length, 1);
  now = 11;
  snapshot = response.update(0, { cycleMs: 220 }, []);
  assert.strictEqual(snapshot.recovering, false,
    "new sustained-load signals should cancel the recovery ramp");
  assert.strictEqual(cancellations.length, 1);
}

// High memory pressure performs generic cleanup only; it does not jump to on-screen destruction/reset.
{
  let now = 0;
  const cleanup = [];
  const resets = [];
  const response = createLagResponse({
    env: {},
    nowProvider: () => now,
    getEntities: () => [],
    onMemoryPressure: (level) => cleanup.push(level),
    onSoftReset: (details) => resets.push(details),
  });
  response.update(100, { memoryRatio: 0.96, memoryGrowthMb: 0, memoryTrendReady: false }, []);
  assert.deepStrictEqual(cleanup, ["critical"]);
  assert.strictEqual(response.activeStageId, "normal");
  assert.strictEqual(response.naturalSpawnsPaused, false);
  assert.strictEqual(resets.length, 0);
}

console.log("lagResponse tests passed");
