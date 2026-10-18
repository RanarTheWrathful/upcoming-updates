"use strict";

// Lag response is ordered deliberately: cheap/off-screen cleanup first, then
// increasingly disruptive actions only after sustained server slowdowns.
const DEFAULT_STEPS = Object.freeze([
  { id: "offscreen-projectiles", category: "projectile", visibility: "offscreen", action: "destroy", speed: 85, durationMs: 5000, minActiveMs: 2500 },
  { id: "offscreen-natural-enemies", category: "naturalEnemy", visibility: "offscreen", action: "destroy", speed: 80, durationMs: 7000, minActiveMs: 3000 },
  { id: "offscreen-food", category: "food", visibility: "offscreen", action: "destroy", speed: 75, durationMs: 8000, minActiveMs: 3500 },
  { id: "offscreen-bots", category: "bot", visibility: "offscreen", action: "destroy", speed: 70, durationMs: 9000, minActiveMs: 3500 },
  { id: "offscreen-natural-bosses", category: "naturalBoss", visibility: "offscreen", action: "destroy", speed: 65, durationMs: 10000, minActiveMs: 4000 },
  { id: "onscreen-entities", category: "general", visibility: "onscreen", action: "suspend", speed: 20, durationMs: 10000, minActiveMs: 8000 },
  { id: "onscreen-projectiles", category: "projectile", visibility: "onscreen", action: "destroy", speed: 18, durationMs: 10000, minActiveMs: 6000 },
  { id: "onscreen-food", category: "food", visibility: "onscreen", action: "suspend", speed: 16, durationMs: 10000, minActiveMs: 6000 },
  { id: "onscreen-natural-enemies", category: "naturalEnemy", visibility: "onscreen", action: "suspend", speed: 14, durationMs: 10000, minActiveMs: 6000 },
  { id: "onscreen-bots", category: "bot", visibility: "onscreen", action: "suspend", speed: 12, durationMs: 12000, minActiveMs: 6500 },
  { id: "onscreen-natural-bosses", category: "naturalBoss", visibility: "onscreen", action: "suspend", speed: 10, durationMs: 12000, minActiveMs: 7000 },
  { id: "soft-reset", category: "all", visibility: "any", action: "reset", speed: 5, durationMs: 15000, minActiveMs: 0 },
]);

function positive(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function percent(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : fallback;
}

function ratio(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
}

function createLagResponse(options = {}) {
  const env = options.env || process.env;
  const nowProvider = options.nowProvider || (() => Number(process.hrtime.bigint()) / 1e6);
  const getEntities = options.getEntities || (() => []);
  const isCandidate = options.isCandidate || (() => false);
  const isEntityVisibleToAnyClient = options.isEntityVisibleToAnyClient || (() => null);
  const scoreEntity = options.scoreEntity || (() => 0);
  const onDestroy = options.onDestroy || (() => false);
  const onSuspend = options.onSuspend || (() => false);
  const onSoftReset = options.onSoftReset || (() => false);
  const onRecovery = options.onRecovery || (() => {});
  const onMemoryPressure = options.onMemoryPressure || (() => {});

  const steps = DEFAULT_STEPS.map((base) => {
    const prefix = "RANAR_LAG_STEP_" + base.id.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    const minActive = Number(env[prefix + "_MIN_ACTIVE_MS"]);
    return Object.assign({}, base, {
      speed: percent(env[prefix + "_SPEED_PERCENT"], base.speed),
      durationMs: positive(env[prefix + "_DURATION_MS"], base.durationMs),
      minActiveMs: Number.isFinite(minActive) && minActive >= 0 ? minActive : base.minActiveMs,
    });
  });
  const scanBatchSize = Math.max(25, Math.floor(positive(env.RANAR_LAG_RESPONSE_SCAN_BATCH_SIZE, 300)));
  const destroyBatchSize = Math.max(1, Math.floor(positive(env.RANAR_LAG_RESPONSE_DESTROY_BATCH_SIZE, 3)));
  const rescanIntervalMs = positive(env.RANAR_LAG_RESPONSE_RESCAN_MS, 5000);
  const suspendIntervalMs = positive(env.RANAR_LAG_RESPONSE_SUSPEND_INTERVAL_MS, 2500);
  const recoverySpeed = percent(env.RANAR_LAG_RECOVERY_SPEED_PERCENT, 88);
  const recoveryMs = positive(env.RANAR_LAG_RESPONSE_RECOVERY_MS, 10000);
  const memoryCleanupIntervalMs = positive(env.RANAR_LAG_MEMORY_CLEANUP_INTERVAL_MS, 30000);
  const memoryWarningRatio = ratio(env.RANAR_LOAD_WARNING_MEMORY, 0.75);
  const memoryHighRatio = ratio(env.RANAR_LOAD_HIGH_MEMORY, 0.86);
  const memoryCriticalRatio = ratio(env.RANAR_LOAD_CRITICAL_MEMORY, 0.94);
  const memoryWarningGrowthMb = positive(env.RANAR_LOAD_WARNING_GROWTH_MB, 64);
  const memoryHighGrowthMb = positive(env.RANAR_LOAD_HIGH_GROWTH_MB, 128);
  const memoryCriticalGrowthMb = positive(env.RANAR_LOAD_CRITICAL_GROWTH_MB, 256);

  const stepSince = new Array(steps.length).fill(null);
  let activeIndex = -1;
  let activeSince = null;
  let recoverySince = null;
  let lastMemoryCleanupAt = -Infinity;
  let softResetRequested = false;
  let completedSweeps = 0;
  let destroyedByMitigation = 0;
  let suspendedByMitigation = 0;
  let sweep = null;

  function clearSweep() { sweep = null; }

  function startSweep(step, source, now) {
    // Destruction mutates the live entity list. A snapshot avoids skipping the
    // next item when Entity.destroy() removes the current item from that list.
    const list = source.slice();
    sweep = {
      stepId: step.id,
      source,
      list,
      cursor: 0,
      best: null,
      bestScore: -Infinity,
      complete: false,
      nextSweepAt: now,
    };
  }

  function visibilityMatches(entity, step) {
    if (step.visibility === "any") return true;
    let visible = null;
    try {
      const result = isEntityVisibleToAnyClient(entity);
      visible = result === true ? true : result === false ? false : null;
    } catch (_) { visible = null; }
    // Unknown visibility is not proof an entity is off-screen. Only a positive
    // visibility answer can enter the on-screen emergency stages.
    return step.visibility === "onscreen" ? visible === true : visible === false;
  }

  function getSweep(step, source, now) {
    if (sweep && (sweep.stepId !== step.id || sweep.source !== source)) clearSweep();
    if (!sweep || (sweep.complete && now >= sweep.nextSweepAt)) startSweep(step, source, now);
    return sweep;
  }

  function finishSweep(step, current, now) {
    if (current.complete) return;
    current.complete = true;
    current.nextSweepAt = now + (step.action === "suspend" ? suspendIntervalMs : rescanIntervalMs);
    completedSweeps++;
    if (step.action === "suspend" && current.best) {
      let accepted = false;
      try { accepted = onSuspend(current.best, step, current.bestScore) === true; } catch (_) {}
      if (accepted) suspendedByMitigation++;
    }
  }

  function processSweep(step, now, source) {
    const current = getSweep(step, source, now);
    if (current.complete || step.action === "reset") return;
    let inspected = 0;
    let destroyed = 0;
    while (current.cursor < current.list.length && inspected < scanBatchSize) {
      const entity = current.list[current.cursor++];
      inspected++;
      if (!entity) continue;
      let eligible = false;
      try { eligible = isCandidate(entity, step) === true; } catch (_) {}
      if (!eligible || !visibilityMatches(entity, step)) continue;
      if (step.action === "destroy") {
        let accepted = false;
        try { accepted = onDestroy(entity, step) === true; } catch (_) {}
        if (accepted) {
          destroyedByMitigation++;
          if (++destroyed >= destroyBatchSize) break;
        }
      } else if (step.action === "suspend") {
        let score = 0;
        try { score = Number(scoreEntity(entity)); } catch (_) {}
        if (!Number.isFinite(score)) score = 0;
        if (score > current.bestScore) {
          current.best = entity;
          current.bestScore = score;
        }
      }
    }
    if (current.cursor >= current.list.length) finishSweep(step, current, now);
  }

  function updateMemoryPolicy(metrics, now) {
    if (!metrics || now - lastMemoryCleanupAt < memoryCleanupIntervalMs) return;
    const mem = Number(metrics.memoryRatio);
    const growth = Number(metrics.memoryGrowthMb);
    let level = null;
    if ((Number.isFinite(mem) && mem >= memoryCriticalRatio) ||
        (metrics.memoryTrendReady === true && Number.isFinite(growth) && growth >= memoryCriticalGrowthMb)) level = "critical";
    else if ((Number.isFinite(mem) && mem >= memoryHighRatio) ||
        (metrics.memoryTrendReady === true && Number.isFinite(growth) && growth >= memoryHighGrowthMb)) level = "high";
    else if ((Number.isFinite(mem) && mem >= memoryWarningRatio) ||
        (metrics.memoryTrendReady === true && Number.isFinite(growth) && growth >= memoryWarningGrowthMb)) level = "warning";
    if (!level) return;
    lastMemoryCleanupAt = now;
    try { onMemoryPressure(level, metrics); } catch (_) {}
  }

  function resetAfterRecovery(now) {
    activeIndex = -1;
    activeSince = null;
    recoverySince = null;
    softResetRequested = false;
    stepSince.fill(null);
    clearSweep();
    try { onRecovery({ at: now, reason: "server run speed recovered" }); } catch (_) {}
  }

  function getSnapshot(now, speed) {
    const active = activeIndex >= 0 ? steps[activeIndex] : null;
    return {
      stageIndex: activeIndex,
      stageId: active ? active.id : "normal",
      stageCount: steps.length,
      stageStartedAt: activeSince,
      stageElapsedMs: activeSince === null ? 0 : Math.max(0, now - activeSince),
      stageAction: active ? active.action : "none",
      runSpeedPercent: Number.isFinite(speed) ? speed : undefined,
      naturalSpawnsPaused: activeIndex >= 1,
      emergencyMitigation: activeIndex >= 5,
      softResetRequested,
      sweepActive: !!(sweep && !sweep.complete),
      sweepCursor: sweep ? sweep.cursor : 0,
      sweepLength: sweep ? sweep.list.length : 0,
      completedSweeps,
      destroyedByMitigation,
      suspendedByMitigation,
      memoryCleanupAt: Number.isFinite(lastMemoryCleanupAt) ? lastMemoryCleanupAt : null,
      speedThresholds: steps.map((step) => ({ id: step.id, speed: step.speed, durationMs: step.durationMs })),
    };
  }

  function update(runSpeedPercent, metrics = {}, listOverride) {
    const providedNow = nowProvider();
    const now = Number.isFinite(providedNow) ? providedNow : 0;
    const speed = Number.isFinite(runSpeedPercent) ? Math.max(0, Math.min(100, runSpeedPercent)) : 100;
    const source = Array.isArray(listOverride) ? listOverride : getEntities();
    updateMemoryPolicy(metrics, now);

    for (let i = 0; i < steps.length; i++) {
      if (speed <= steps[i].speed) {
        if (stepSince[i] === null) stepSince[i] = now;
      } else {
        stepSince[i] = null;
      }
    }

    const mem = Number(metrics && metrics.memoryRatio);
    const memoryHealthy = !Number.isFinite(mem) || mem < memoryHighRatio;
    if (speed >= recoverySpeed && memoryHealthy) {
      if (recoverySince === null) recoverySince = now;
      if (activeIndex >= 0 && now - recoverySince >= recoveryMs) {
        resetAfterRecovery(now);
        return getSnapshot(now, speed);
      }
    } else {
      recoverySince = null;
    }

    if (activeIndex < 0) {
      if (stepSince[0] !== null && now - stepSince[0] >= steps[0].durationMs) {
        activeIndex = 0;
        activeSince = now;
        clearSweep();
      }
    } else if (activeIndex < steps.length - 1) {
      const current = steps[activeIndex];
      const next = steps[activeIndex + 1];
      const completed = !!(sweep && sweep.stepId === current.id && sweep.complete);
      const dwellComplete = now - activeSince >= current.minActiveMs;
      const nextConditionPersisted = stepSince[activeIndex + 1] !== null &&
        now - stepSince[activeIndex + 1] >= next.durationMs;
      if (completed && dwellComplete && nextConditionPersisted) {
        activeIndex++;
        activeSince = now;
        clearSweep();
      }
    }

    if (activeIndex >= 0) {
      const step = steps[activeIndex];
      if (step.action === "reset") {
        if (!softResetRequested) {
          softResetRequested = true;
          try { onSoftReset({ stepId: step.id, runSpeedPercent: speed, metrics, at: now }); } catch (_) {}
        }
      } else {
        processSweep(step, now, source);
      }
    }
    return getSnapshot(now, speed);
  }

  return {
    update,
    getSnapshot() { const now = nowProvider(); return getSnapshot(Number.isFinite(now) ? now : 0); },
    get activeStageIndex() { return activeIndex; },
    get activeStageId() { return activeIndex >= 0 ? steps[activeIndex].id : "normal"; },
    get naturalSpawnsPaused() { return activeIndex >= 1; },
    get emergencyMitigation() { return activeIndex >= 5; },
    get softResetRequested() { return softResetRequested; },
    get steps() { return steps.map((step) => Object.assign({}, step)); },
  };
}

module.exports = createLagResponse;
module.exports.DEFAULT_STEPS = DEFAULT_STEPS;
