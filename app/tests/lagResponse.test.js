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
  response.update(0, {}, []);
  assert.strictEqual(response.activeStageId, "normal");
  now = 4999;
  response.update(0, {}, []);
  assert.strictEqual(response.activeStageId, "normal");
  now = 5000;
  response.update(0, {}, []);
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
    response.update(0, { memoryRatio: 0.1 }, entities);
  }
  assert.strictEqual(response.activeStageId, "soft-reset");
  assert.strictEqual(resets.length, 1, "soft reset fires once after all prior stages");
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
  now += 10;
  response.update(100, { memoryRatio: 0.1 }, entities);
  now += 10;
  response.update(100, { memoryRatio: 0.1 }, entities);
  now += 10;
  response.update(100, { memoryRatio: 0.1 }, entities);
  now += 10;
  response.update(100, { memoryRatio: 0.1 }, entities);
  now += 10;
  response.update(100, { memoryRatio: 0.1 }, entities);
  assert.strictEqual(response.activeStageId, "normal", "sustained healthy speed resets the response ladder");
  assert.strictEqual(recovery.length, 1);
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
