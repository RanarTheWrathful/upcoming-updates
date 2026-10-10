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

// Adaptive tick-rate recommendations scale with lag and recover gradually.
const pacingProtection = createLoadProtection({
  env: {}, memoryLimitBytes: null,
  sampleProvider: () => Object.assign({}, metrics, { eventLoopP95Ms: 5 }),
});
const baseCycleMs = 1000 / 30;
assert.strictEqual(pacingProtection.getRunSpeedMultiplier(), 1, "normal load keeps the original tick cadence");
assert.ok(Math.abs(pacingProtection.getRecommendedCycleIntervalMs(baseCycleMs) - baseCycleMs) < 0.001);
pacingProtection.reportCycle(75, []);
assert.strictEqual(pacingProtection.getRunSpeedMultiplier(), 1.15, "75ms lag reduces tick cadence modestly");
pacingProtection.reportCycle(100, []);
assert.strictEqual(pacingProtection.getRunSpeedMultiplier(), 1.3, "100ms lag reduces tick cadence further");
pacingProtection.reportCycle(150, []);
assert.strictEqual(pacingProtection.getRunSpeedMultiplier(), 1.5, "150ms lag increases slowdown");
pacingProtection.reportCycle(200, []);
assert.strictEqual(pacingProtection.getRunSpeedMultiplier(), 1.75, "200ms lag increases slowdown further");
pacingProtection.reportCycle(250, []);
assert.strictEqual(pacingProtection.getRunSpeedMultiplier(), 2, "250ms lag halves the target tick rate");
for (let i = 0; i < 10; i++) pacingProtection.reportCycle(50, []);
assert.strictEqual(pacingProtection.getRunSpeedMultiplier(), 1.75, "recovery restores one speed tier per ten healthy cycles");
pacingProtection.stop();


// Cycle-time mitigation, visual fade, and exact restoration of original state.
let emergencyNow = 0;
const entityChanges = [];
const player = {
  id: 101, label: "Player", isPlayer: true, _loadLifeCostMs: 500,
  controllers: [], guns: [], turrets: [], children: [], excludedTargets: [],
  name: "Player One", alpha: 1, allowPlate: true,
  valid: () => true,
};
const boss = {
  id: 102, label: "Boss", isBoss: true, _loadLifeCostMs: 450,
  controllers: [], guns: [], turrets: [], children: [], excludedTargets: [],
  name: "Boss One", alpha: 1, allowPlate: true,
  valid: () => true,
};
const modestEntity = {
  id: 103, label: "Small NPC", name: "Small NPC", alpha: 0.6, allowPlate: false,
  controllers: [], guns: [], turrets: [], children: [], excludedTargets: [],
  valid: () => true,
};
const expensiveEntity = {
  id: 104, label: "Expensive NPC", name: "Original Expensive Name", alpha: 0.8, allowPlate: false,
  controllers: [{}, {}], guns: [{}, {}, {}], turrets: [{}, {}, {}],
  children: [{}, {}, {}, {}], excludedTargets: [], valid: () => true,
};
const customKeptEntity = {
  id: 105, label: "Scripted Keep", keep: true, _loadLifeCostMs: 900,
  controllers: [], guns: [], turrets: [], children: [], excludedTargets: [],
  name: "Kept", alpha: 1, valid: () => true,
};
const uppercaseKeptEntity = {
  id: 109, label: "Uppercase Keep", KEEP: true, _loadLifeCostMs: 950,
  controllers: [], guns: [], turrets: [], children: [], excludedTargets: [],
  name: "Uppercase kept", alpha: 1, valid: () => true,
};
const projectile = {
  id: 106, label: "Bullet", isProjectile: true, _loadLifeCostMs: 1000,
  controllers: [], guns: [], turrets: [], children: [], excludedTargets: [],
  name: "Bullet", alpha: 1, valid: () => true,
};
const emergencyEntities = [player, boss, modestEntity, expensiveEntity, customKeptEntity, uppercaseKeptEntity, projectile];
const emergencyProtection = createLoadProtection({
  env: {
    RANAR_LOAD_SUSPEND_INTERVAL_MS: "99999",
    RANAR_LOAD_SUSPEND_WINDOW_MS: "60000",
    RANAR_LOAD_ENTITY_FADE_MS: "2500",
  },
  nowProvider: () => emergencyNow,
  memoryLimitBytes: null,
  getEntities: () => emergencyEntities,
  onEntityChange: (entity, disabled, details) => entityChanges.push({ entity, disabled, details }),
  sampleProvider: () => Object.assign({}, metrics, { eventLoopP95Ms: 5 }),
});
emergencyProtection.recordEntityLifeCost(expensiveEntity, 18);
emergencyProtection.recordCollisionCost(expensiveEntity, modestEntity, 2);
emergencyProtection.reportCycle(75, emergencyEntities);
assert.strictEqual(emergencyProtection.stage, 1, "75ms cycle begins mitigation immediately");
let fastUpdates = 0;
for (let i = 0; i < 4; i++) if (emergencyProtection.shouldUpdateMinimap()) fastUpdates++;
assert.strictEqual(fastUpdates, 2, "cycle-time mitigation throttles optional map work at 75ms");
emergencyProtection.reportCycle(150, emergencyEntities);
assert.strictEqual(emergencyProtection.stage, 2, "150ms cycle escalates mitigation immediately");
emergencyProtection.reportCycle(250, emergencyEntities);
assert.strictEqual(expensiveEntity._loadDisabled, true, "the highest-cost eligible entity is suspended at 250ms");
assert.strictEqual(expensiveEntity.name, "[Disabled]", "disabled entities expose the Disabled name");
assert.strictEqual(expensiveEntity.allowPlate, true, "disabled entity name is sent even if it normally has no nameplate");
assert.strictEqual(expensiveEntity.alpha, 0.8, "fade-out begins at the entity's current visible opacity");
assert.strictEqual(player._loadDisabled, undefined, "player-controlled entities are never suspended");
assert.strictEqual(boss._loadDisabled, undefined, "bosses are never suspended");
assert.strictEqual(modestEntity._loadDisabled, undefined, "only the highest-cost candidate is suspended initially");
assert.strictEqual(customKeptEntity._loadDisabled, undefined, "keep=true opt-outs are never suspended");
assert.strictEqual(uppercaseKeptEntity._loadDisabled, undefined, "KEEP=true opt-outs are never suspended");
assert.strictEqual(projectile._loadDisabled, undefined, "projectiles are not frozen mid-flight");

emergencyNow = 1250;
emergencyProtection.reportCycle(260, emergencyEntities);
assert.ok(Math.abs(expensiveEntity.alpha - 0.4) < 0.001, "alpha fades linearly to zero over 2.5 seconds");
assert.strictEqual(expensiveEntity.name, "[Disabled]", "the Disabled label stays during fade-out");

// Recovery before a full fade-out reverses smoothly and eventually restores
// the entity's exact name, alpha, and original nameplate setting.
emergencyNow = 1300;
emergencyProtection.reportCycle(249, emergencyEntities);
assert.strictEqual(expensiveEntity.name, "[Respawning...]", "recovery switches to the Respawning label");
assert.strictEqual(expensiveEntity._loadDisabled, true, "gameplay remains paused until the fade-in completes");
assert.ok(Math.abs(expensiveEntity.alpha - 0.384) < 0.001, "mid-fade recovery smoothly reverses from its current opacity");
emergencyNow = 3800;
emergencyProtection.reportCycle(49, emergencyEntities);
assert.strictEqual(expensiveEntity._loadDisabled, undefined, "entity resumes gameplay after the 2.5-second fade-in");
assert.strictEqual(expensiveEntity.name, "Original Expensive Name", "original entity name is restored");
assert.strictEqual(expensiveEntity.alpha, 0.8, "original alpha is restored exactly");
assert.strictEqual(expensiveEntity.allowPlate, false, "original nameplate setting is restored exactly");
assert.deepStrictEqual(entityChanges.map((entry) => entry.disabled), [true, false]);
emergencyProtection.stop();

// Sustained critical lag selects another entity every 2.5 seconds. After one
// full minute without a dip below 250ms, every critical-suspended entity begins fading
// back in and a lockout prevents more suspensions until lag falls below 250ms.
let windowNow = 0;
const thirdEntity = {
  id: 110, label: "Third NPC", name: "Third NPC", alpha: 1, allowPlate: true,
  controllers: [], guns: [], turrets: [], children: [], excludedTargets: [],
  valid: () => true,
};
const windowEntities = [player, boss, modestEntity, expensiveEntity, thirdEntity, customKeptEntity, uppercaseKeptEntity, projectile];
const windowProtection = createLoadProtection({
  env: {
    RANAR_LOAD_SUSPEND_INTERVAL_MS: "2500",
    RANAR_LOAD_SUSPEND_WINDOW_MS: "60000",
    RANAR_LOAD_ENTITY_FADE_MS: "2500",
  },
  nowProvider: () => windowNow,
  memoryLimitBytes: null,
  getEntities: () => windowEntities,
  sampleProvider: () => Object.assign({}, metrics, { eventLoopP95Ms: 5 }),
});
windowProtection.recordEntityLifeCost(expensiveEntity, 18);
windowProtection.recordCollisionCost(expensiveEntity, modestEntity, 2);
windowProtection.reportCycle(250, windowEntities);
assert.strictEqual(expensiveEntity._loadDisabled, true, "first eligible high-cost entity is suspended immediately");
windowNow = 2499;
windowProtection.reportCycle(260, windowEntities);
assert.strictEqual(modestEntity._loadDisabled, undefined, "next entity waits for the configured interval");
windowNow = 2500;
windowProtection.reportCycle(260, windowEntities);
assert.strictEqual(modestEntity._loadDisabled, true, "second entity is suspended 2.5 seconds later");
assert.strictEqual(expensiveEntity.alpha, 0, "first entity finishes its 2.5-second fade-out");
windowNow = 5000;
windowProtection.reportCycle(260, windowEntities);
assert.strictEqual(thirdEntity._loadDisabled, true, "third eligible entity is suspended at the next 2.5-second interval");
windowNow = 60000;
windowProtection.reportCycle(260, windowEntities);
assert.strictEqual(windowProtection.getSnapshot().loadSuspensionLockout, true, "one minute of uninterrupted critical lag activates lockout");
assert.strictEqual(windowProtection.getSnapshot().loadDisabledEntityCount, 3, "all suspended entities remain tracked during fade-in");
assert.deepStrictEqual(
  [expensiveEntity.name, modestEntity.name, thirdEntity.name],
  ["[Respawning...]", "[Respawning...]", "[Respawning...]"],
  "the one-minute timeout restores all critical-suspended entities visually"
);
windowNow = 65000;
windowProtection.reportCycle(260, windowEntities);
assert.strictEqual(windowProtection.getSnapshot().loadDisabledEntityCount, 0, "all three entities are restored after the 2.5-second fade-in");
assert.strictEqual(expensiveEntity._loadDisabled, undefined);
assert.strictEqual(modestEntity._loadDisabled, undefined);
assert.strictEqual(thirdEntity._loadDisabled, undefined);
assert.strictEqual(expensiveEntity.name, "Original Expensive Name", "timeout restores the original entity name");
assert.strictEqual(expensiveEntity.alpha, 0.8, "timeout restores the original alpha exactly");
assert.strictEqual(expensiveEntity.allowPlate, false, "timeout restores the original nameplate setting");
assert.strictEqual(modestEntity.name, "Small NPC", "timeout restores each entity's own original name");
windowProtection.reportCycle(260, windowEntities);
assert.strictEqual(windowProtection.getSnapshot().loadDisabledEntityCount, 0, "no entity is disabled again while critical-lag lockout remains active");
windowNow = 66000;
windowProtection.reportCycle(249, windowEntities);
assert.strictEqual(windowProtection.getSnapshot().loadSuspensionLockout, false, "falling below 250ms clears the lockout");
windowNow = 67000;
windowProtection.reportCycle(250, windowEntities);
assert.strictEqual(windowProtection.getSnapshot().loadDisabledEntityCount, 1, "a later critical episode can suspend entities again");
windowProtection.stop();

// Destroyed entities must be pruned from the controller's temporary registry.
let pruneNow = 0;
const transientEntity = {
  id: 120, label: "Transient", name: "Transient", alpha: 1, allowPlate: true,
  controllers: [], guns: [], turrets: [], children: [], excludedTargets: [],
  valid: () => true,
};
const pruneProtection = createLoadProtection({
  env: {}, memoryLimitBytes: null, nowProvider: () => pruneNow,
  getEntities: () => [transientEntity],
});
pruneProtection.reportCycle(250, [transientEntity]);
assert.strictEqual(pruneProtection.getSnapshot().loadDisabledEntityCount, 1);
transientEntity.valid = () => false;
pruneNow = 100;
pruneProtection.reportCycle(260, [transientEntity]);
assert.strictEqual(pruneProtection.getSnapshot().loadDisabledEntityCount, 0, "destroyed entities are promptly removed from suspension tracking");
pruneProtection.stop();

const classKeep = { KEEP: true };
assert.strictEqual(classKeep.KEEP, true, "entity definitions can declare KEEP: true");
const settingsKeep = {
  id: 107, settings: { KEEP: true }, _loadLifeCostMs: 1200,
  controllers: [], guns: [], turrets: [], children: [], excludedTargets: [],
  name: "Settings protected", alpha: 1, valid: () => true,
};
let keepNow = 0;
const keepProtection = createLoadProtection({
  env: {}, memoryLimitBytes: null, nowProvider: () => keepNow,
});
keepProtection.reportCycle(251, [settingsKeep, modestEntity]);
assert.strictEqual(settingsKeep._loadDisabled, undefined, "settings.KEEP also opts an entity out");
assert.strictEqual(modestEntity._loadDisabled, true, "a keep-protected candidate does not block suspension of another eligible entity");
keepNow = 100;
keepProtection.reportCycle(249, [settingsKeep, modestEntity]);
keepNow = 5100;
keepProtection.reportCycle(49, [settingsKeep, modestEntity]);
assert.strictEqual(modestEntity._loadDisabled, undefined, "protected-entity test cleanup completes after fade-in");
keepProtection.stop();

// A critical event-loop delay also invokes the containment path, even if the
// most recent measured simulation body itself was short.
const eventLoopTarget = {
  id: 108, label: "Event-loop target",
  controllers: [], guns: [], turrets: [], children: [], excludedTargets: [],
  valid: () => true,
};
const p95Protection = createLoadProtection({
  env: {}, memoryLimitBytes: null,
  getEntities: () => [eventLoopTarget],
  sampleProvider: () => ({
    memoryRatio: 0.1, rssMb: 100, heapUsedMb: 50, heapLimitMb: 1024,
    externalMb: 5, memoryLimitMb: null, eventLoopP95Ms: 260, eventLoopMaxMs: 300,
    cycleMs: 20,
  }),
});
p95Protection.sample();
assert.strictEqual(eventLoopTarget._loadDisabled, true, "critical event-loop delay also triggers entity suspension");
p95Protection.stop();


// Candidate filtering and structural priority.
let candidateNow = 0;
const disabledCandidate = { id: 201, name: "[Disabled]", _loadDisabled: true, _loadLifeCostMs: 5000, guns: [], turrets: [], children: [], controllers: [], excludedTargets: [], valid: () => true };
const respawningCandidate = { id: 202, name: "[Respawning...]", _loadDisabled: true, _loadLifeCostMs: 6000, guns: [], turrets: [], children: [], controllers: [], excludedTargets: [], valid: () => true };
const structurallyHeavy = { id: 203, label: "Many weapons", name: "Many weapons", alpha: 1, guns: Array(5).fill({}), turrets: Array(2).fill({}), children: Array(4).fill({}), controllers: [], excludedTargets: [], valid: () => true };
const measuredLight = { id: 204, label: "Measured light entity", name: "Measured light entity", alpha: 1, guns: [], turrets: [], children: [], controllers: [], excludedTargets: [], valid: () => true };
const candidateProtection = createLoadProtection({ env: { RANAR_LOAD_ENTITY_FADE_MS: "2500" }, memoryLimitBytes: null, nowProvider: () => candidateNow });
candidateProtection.recordEntityLifeCost(measuredLight, 5);
candidateProtection.reportCycle(250, [disabledCandidate, respawningCandidate, structurallyHeavy, measuredLight]);
assert.strictEqual(structurallyHeavy._loadDisabled, true, "gun/turret/child-heavy entities receive structural-cost priority");
assert.strictEqual(disabledCandidate._loadDisabled, true, "existing disabled entities remain untouched");
assert.strictEqual(respawningCandidate.name, "[Respawning...]", "respawning entities are never selected again");
candidateProtection.stop();

// 100ms for 10 seconds pauses spawning/food and destroys unknown labels.
let policyNow = 0;
const unknownEntity = {
  id: 301, label: "Unknown Entity", name: "Odd Entity", alpha: 1,
  guns: [], turrets: [], children: [], controllers: [], excludedTargets: [],
  _destroyed: false,
  valid() { return !this._destroyed; },
  destroy() { this._destroyed = true; },
};
const unknownClassEntity = {
  id: 302, name: "Unknown Class", alpha: 1,
  guns: [], turrets: [], children: [], controllers: [], excludedTargets: [],
  _destroyed: false,
  valid() { return !this._destroyed; },
  destroy() { this._destroyed = true; },
};
const protectedUnknown = {
  id: 303, label: "Unknown Class", name: "Protected Unknown", KEEP: true,
  guns: [], turrets: [], children: [], controllers: [], excludedTargets: [],
  _destroyed: false,
  valid() { return !this._destroyed; },
  destroy() { this._destroyed = true; },
};
const unknownEntities = [unknownEntity, unknownClassEntity, protectedUnknown];
const policyProtection = createLoadProtection({ env: {}, memoryLimitBytes: null, nowProvider: () => policyNow, getEntities: () => unknownEntities });
policyProtection.reportCycle(100, unknownEntities);
policyNow = 9999;
policyProtection.reportCycle(100, unknownEntities);
assert.strictEqual(policyProtection.shouldSpawnNaturalEntities(), true, "natural spawning continues before 10 seconds elapse");
policyNow = 10000;
policyProtection.reportCycle(100, unknownEntities);
assert.strictEqual(policyProtection.shouldSpawnNaturalEntities(), false, "natural entity spawning pauses after persistent 100ms lag");
assert.strictEqual(policyProtection.shouldSpawnFood(), false, "food spawning pauses after persistent 100ms lag");
assert.strictEqual(unknownEntity._destroyed, true, "Unknown Entity is destroyed once the 100ms persistence requirement is met");
assert.strictEqual(unknownClassEntity._destroyed, true, "Unknown Class is destroyed even when only its name matches");
assert.strictEqual(protectedUnknown._destroyed, false, "explicit KEEP protection overrides unknown-label cleanup");
assert.strictEqual(unknownEntity._loadDisabled, undefined, "Unknown Entity is destroyed directly, not put through a fade/disable cycle");
policyNow = 20000;
policyProtection.reportCycle(99, unknownEntities);
assert.strictEqual(policyProtection.shouldSpawnNaturalEntities(), false, "brief recovery does not resume spawning immediately");
policyNow = 29999;
policyProtection.reportCycle(99, unknownEntities)
assert.strictEqual(policyProtection.shouldSpawnNaturalEntities(), false, "10 healthy seconds are required before spawning resumes");
policyNow = 30000;
policyProtection.reportCycle(99, unknownEntities)
assert.strictEqual(policyProtection.shouldSpawnNaturalEntities(), true, "natural spawns resume after sustained recovery");
policyProtection.stop();

// 150ms for 15 seconds destroys only tagged natural entities off-screen.
let cleanup150Now = 0;
const makeCleanupEntity = (id, onScreen, natural = true) => ({ id, name: "Entity " + id, alpha: 1, onScreen, _loadProtectionNaturalSpawn: natural, guns: [], turrets: [], children: [], controllers: [], excludedTargets: [], _destroyed: false, valid() { return !this._destroyed; }, destroy() { this._destroyed = true; } });
const offscreenNatural = makeCleanupEntity(401, false);
const onscreenNatural150 = makeCleanupEntity(402, true);
const oneTimeWall = makeCleanupEntity(403, false, false);
const projectile150 = makeCleanupEntity(404, true, false); projectile150.isProjectile = true;
const entities150 = [offscreenNatural, onscreenNatural150, oneTimeWall, projectile150];
const screenProtection150 = createLoadProtection({ env: {}, memoryLimitBytes: null, nowProvider: () => cleanup150Now, getEntities: () => entities150, isEntityOnScreen: (entity) => entity.onScreen });
screenProtection150.reportCycle(150, entities150);
cleanup150Now = 14999; screenProtection150.reportCycle(150, entities150);
assert.strictEqual(offscreenNatural._destroyed, false, "off-screen cleanup waits 15 seconds");
cleanup150Now = 15000; screenProtection150.reportCycle(150, entities150);
assert.strictEqual(offscreenNatural._destroyed, true, "off-screen natural entities are destroyed at sustained 150ms lag");
assert.strictEqual(onscreenNatural150._destroyed, false, "on-screen natural entities survive the 150ms policy");
assert.strictEqual(projectile150._destroyed, false, "projectiles survive the 150ms policy");
assert.strictEqual(oneTimeWall._destroyed, false, "unmarked one-time structures are preserved");
screenProtection150.stop();

// 200ms for 15 seconds destroys projectiles and on-screen natural entities,
// repeating every 2.5 seconds while severe lag persists.
let cleanup200Now = 0;
const onscreenNatural200 = makeCleanupEntity(411, true);
const preservedWall200 = makeCleanupEntity(412, true, false);
const projectile200 = makeCleanupEntity(413, true, false); projectile200.isProjectile = true;
const entities200 = [onscreenNatural200, preservedWall200, projectile200];
const screenProtection200 = createLoadProtection({ env: {}, memoryLimitBytes: null, nowProvider: () => cleanup200Now, getEntities: () => entities200, isEntityOnScreen: (entity) => entity.onScreen });
screenProtection200.reportCycle(200, entities200);
cleanup200Now = 14999; screenProtection200.reportCycle(200, entities200);
assert.strictEqual(onscreenNatural200._destroyed, false, "on-screen cleanup waits 15 seconds");
cleanup200Now = 15000; screenProtection200.reportCycle(200, entities200);
assert.strictEqual(onscreenNatural200._destroyed, true, "on-screen natural entities are destroyed at sustained 200ms lag");
assert.strictEqual(projectile200._destroyed, true, "all projectiles are destroyed at sustained 200ms lag");
assert.strictEqual(preservedWall200._destroyed, false, "unmarked one-time structures are preserved at 200ms too");
cleanup200Now = 17500;
const laterProjectile = makeCleanupEntity(414, true, false); laterProjectile.isProjectile = true; entities200.push(laterProjectile);
screenProtection200.reportCycle(200, entities200);
assert.strictEqual(laterProjectile._destroyed, true, "projectile cleanup repeats while severe lag persists");
screenProtection200.stop();

// Cleanup only inspects a bounded batch per game cycle and resumes next cycle.
let batchNow = 0;
const batchEntities = [
  makeCleanupEntity(421, false),
  makeCleanupEntity(422, false),
  makeCleanupEntity(423, false),
];
const batchedProtection = createLoadProtection({
  env: { RANAR_LAG_CLEANUP_BATCH_SIZE: "1" },
  memoryLimitBytes: null,
  nowProvider: () => batchNow,
  getEntities: () => batchEntities,
  isEntityOnScreen: (entity) => entity.onScreen,
});
batchedProtection.reportCycle(150, batchEntities);
batchNow = 15000;
batchedProtection.reportCycle(150, batchEntities);
assert.strictEqual(batchEntities[0]._destroyed, true, "first cleanup batch is processed immediately");
assert.strictEqual(batchEntities[1]._destroyed, false, "cleanup stops after its configured per-cycle budget");
batchedProtection.reportCycle(150, batchEntities);
assert.strictEqual(batchEntities[1]._destroyed, true, "cleanup continues on the next cycle");
batchedProtection.reportCycle(150, batchEntities);
assert.strictEqual(batchEntities[2]._destroyed, true, "the bounded scan eventually visits every entity");
batchedProtection.stop();

// Instrumentation must back off—not increase—when the server is already lagging.
const profilingProtection = createLoadProtection({ env: {}, memoryLimitBytes: null });
let normalEntitySamples = 0;
let normalCollisionSamples = 0;
for (let i = 0; i < 1024; i++) {
  if (profilingProtection.shouldProfileEntity()) normalEntitySamples++;
  if (profilingProtection.shouldProfileCollision()) normalCollisionSamples++;
}
profilingProtection.reportCycle(250, []);
let criticalEntitySamples = 0;
let criticalCollisionSamples = 0;
for (let i = 0; i < 1024; i++) {
  if (profilingProtection.shouldProfileEntity()) criticalEntitySamples++;
  if (profilingProtection.shouldProfileCollision()) criticalCollisionSamples++;
}
assert.ok(criticalEntitySamples < normalEntitySamples / 4, "entity timing sampling backs off during critical lag");
assert.ok(criticalCollisionSamples < normalCollisionSamples / 4, "collision timing sampling backs off during critical lag");
profilingProtection.stop();

protection.stop();
console.log("Load protection tests passed.");
