"use strict";

// Lag response is ordered deliberately: cheap/off-screen cleanup first, then
// increasingly disruptive actions only after sustained server slowdowns.
const DEFAULT_STEPS = Object.freeze([
  // Ordinary mitigation must be backed by both low server throughput and a
  // measured slow cycle/event-loop delay. Each step has a five-second dwell.
  { id: "offscreen-projectiles", category: "projectile", visibility: "offscreen", action: "destroy", speed: 42, lagMs: 100, durationMs: 5000, minActiveMs: 5000 },
  { id: "offscreen-natural-enemies", category: "naturalEnemy", visibility: "offscreen", action: "destroy", speed: 38, lagMs: 125, durationMs: 5000, minActiveMs: 5000 },
  { id: "offscreen-food", category: "food", visibility: "offscreen", action: "destroy", speed: 34, lagMs: 150, durationMs: 5000, minActiveMs: 5000 },
  { id: "offscreen-bots", category: "bot", visibility: "offscreen", action: "destroy", speed: 30, lagMs: 175, durationMs: 5000, minActiveMs: 5000 },
  { id: "offscreen-natural-bosses", category: "naturalBoss", visibility: "offscreen", action: "destroy", speed: 27, lagMs: 200, durationMs: 5000, minActiveMs: 5000 },
  { id: "onscreen-projectiles", category: "projectile", visibility: "onscreen", action: "destroy", speed: 20, lagMs: 250, durationMs: 5000, minActiveMs: 5000 },
  // Only sustained extreme lag and very poor throughput may trigger a full
  // process shutdown. The server must not attempt a destructive in-game reset.
  { id: "emergency-shutdown", category: "all", visibility: "any", action: "shutdown", speed: 5, lagMs: 1000, durationMs: 15000, minActiveMs: 0 },
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

function maxMetric(metrics, fields) {
  let lag = 0;
  for (const field of fields) {
    const value = Number(metrics[field]);
    if (Number.isFinite(value) && value >= 0) lag = Math.max(lag, value);
  }
  return lag;
}

function observedLagMs(metrics = {}) {
  // The normal ladder can use raw and smoothed measurements to avoid reacting
  // to noise in a single source, but still requires poor throughput as well.
  return maxMetric(metrics, [
    "loadObservedLagMs",
    "observedLagMs",
    "cycleMs",
    "eventLoopP95Ms",
    "eventLoopMaxMs",
    "smoothedCycleMs",
    "smoothedEventLoopDelayMs",
  ]);
}

function emergencyObservedLagMs(metrics = {}) {
  // Instant maximum response is reserved for an actual sampled stall. Do not
  // let a lingering EMA value alone trip the hard emergency threshold.
  return maxMetric(metrics, [
    "loadObservedLagMs",
    "observedLagMs",
    "cycleMs",
    "eventLoopP95Ms",
    "eventLoopMaxMs",
  ]);
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
  const onEmergencyShutdown = options.onEmergencyShutdown || options.onSoftReset || (() => false);
  const onRecovery = options.onRecovery || (() => {});
  const onRecoveryCancelled = options.onRecoveryCancelled || (() => {});
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
  // Do not require near-ideal throughput to recover on a naturally heavy map.
  const recoverySpeed = percent(env.RANAR_LAG_RECOVERY_SPEED_PERCENT, 75);
  const recoveryMs = positive(env.RANAR_LAG_RESPONSE_RECOVERY_MS, 10000);
  // A healthy-looking throughput percentage is not enough to recover while
  // measured cycle/event-loop delay remains high.
  const recoveryMaxLagMs = positive(env.RANAR_LAG_RECOVERY_MAX_MS, 80);
  const emergencyRearmMs = positive(env.RANAR_LAG_EMERGENCY_REARM_MS, 5000);
  const memoryCleanupIntervalMs = positive(env.RANAR_LAG_MEMORY_CLEANUP_INTERVAL_MS, 30000);
  const memoryWarningRatio = ratio(env.RANAR_LOAD_WARNING_MEMORY, 0.75);
  const memoryHighRatio = ratio(env.RANAR_LOAD_HIGH_MEMORY, 0.86);
  const memoryCriticalRatio = ratio(env.RANAR_LOAD_CRITICAL_MEMORY, 0.94);
  // Permit spawn recovery when heap use remains high-but-not-critical after a
  // lag episode. Requiring the heap to fall below 90% could keep spawners
  // disabled forever because a healthy Node.js heap does not necessarily shrink.
  const recoveryMemoryRatio = ratio(env.RANAR_LAG_RECOVERY_MEMORY_RATIO, 0.98);
  const emergencyLagMs = 1000; // Fixed safety boundary; only sustained extreme lag can shut the process down.
  const emergencyPersistenceMs = positive(env.RANAR_LAG_EMERGENCY_PERSIST_MS, 15000);
  const emergencySpeedPercent = percent(env.RANAR_LAG_EMERGENCY_SPEED_PERCENT, 10);
  const memoryWarningGrowthMb = positive(env.RANAR_LOAD_WARNING_GROWTH_MB, 64);
  const memoryHighGrowthMb = positive(env.RANAR_LOAD_HIGH_GROWTH_MB, 128);
  const memoryCriticalGrowthMb = positive(env.RANAR_LOAD_CRITICAL_GROWTH_MB, 256);

  const stepSince = new Array(steps.length).fill(null);
  let activeIndex = -1;
  let activeSince = null;
  let recoverySince = null;
  let recoveryNotified = false;
  let lastMemoryCleanupAt = -Infinity;
  let emergencyShutdownRequested = false;
  let completedSweeps = 0;
  let destroyedByMitigation = 0;
  let suspendedByMitigation = 0;
  let sweep = null;
  let lastLagMs = 0;
  let lastEmergencyLagMs = 0;
  let emergencyLagSince = null;
  let emergencyClearSince = null;

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
    recoveryNotified = false;
    emergencyShutdownRequested = false;
    emergencyClearSince = null;
    emergencyLagSince = null;
    stepSince.fill(null);
    clearSweep();
  }

  function cancelRecovery(now, reason) {
    if (!recoveryNotified) return;
    recoveryNotified = false;
    try {
      onRecoveryCancelled({
        at: now,
        reason: reason || "lag returned during recovery",
        stageIndex: activeIndex,
        stageId: activeIndex >= 0 ? steps[activeIndex].id : "normal",
      });
    } catch (_) {}
  }

  function getSnapshot(now, speed) {
    const active = activeIndex >= 0 ? steps[activeIndex] : null;
    return {
      stageIndex: activeIndex,
      stageId: active ? active.id : "normal",
      stageCount: steps.length,
      stageStartedAt: activeSince,
      stageElapsedMs: activeSince === null ? 0 : Math.max(0, now - activeSince),
      stageAction: recoveryNotified ? "recovery" : active ? active.action : "none",
      runSpeedPercent: Number.isFinite(speed) ? speed : undefined,
      observedLagMs: lastLagMs,
      emergencyObservedLagMs: lastEmergencyLagMs,
      emergencyLagMs,
      emergencyLagPersistenceMs: emergencyPersistenceMs,
      emergencyLagPersistenceElapsedMs: emergencyLagSince === null ? 0 : Math.max(0, now - emergencyLagSince),
      extremeLag: emergencyLagSince !== null && now - emergencyLagSince >= emergencyPersistenceMs &&
        lastEmergencyLagMs >= emergencyLagMs,
      recoverySpeedPercent: recoverySpeed,
      recoveryMaxLagMs,
      recoveryMemoryRatio,
      recovering: recoveryNotified,
      recoveryPending: recoverySince !== null && !recoveryNotified,
      naturalSpawnsPaused: !recoveryNotified && activeIndex >= 1,
      emergencyMitigation: !recoveryNotified && activeIndex >= 5,
      emergencyShutdownRequested,
      // Backward-compatible snapshot alias; this now means shutdown requested,
      // not an in-game soft reset.
      softResetRequested: emergencyShutdownRequested,
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
    const lagMs = observedLagMs(metrics);
    const rawEmergencyLagMs = emergencyObservedLagMs(metrics);
    lastLagMs = lagMs;
    lastEmergencyLagMs = rawEmergencyLagMs;

    // A single long tick can be caused by garbage collection, a host pause, or
    // unrelated scheduler noise. Require severe measured latency AND genuinely
    // poor throughput to persist before allowing the destructive reset path.
    const emergencyCondition = rawEmergencyLagMs >= emergencyLagMs &&
      speed <= emergencySpeedPercent;
    if (emergencyCondition) {
      if (emergencyLagSince === null) emergencyLagSince = now;
    } else {
      emergencyLagSince = null;
    }
    const emergencyConfirmed = emergencyCondition &&
      now - emergencyLagSince >= emergencyPersistenceMs;

    if (emergencyConfirmed) {
      activeIndex = steps.length - 1;
      if (activeSince === null || !emergencyShutdownRequested) activeSince = now;
      recoverySince = null;
      emergencyClearSince = null;
      stepSince.fill(now);
      clearSweep();
      cancelRecovery(now, "sustained extreme lag interrupted recovery");
      recoveryNotified = false;
      if (!emergencyShutdownRequested) {
        emergencyShutdownRequested = true;
        try {
          onEmergencyShutdown({
            stepId: steps[activeIndex].id,
            runSpeedPercent: speed,
            observedLagMs: rawEmergencyLagMs,
            emergencyPersistenceMs,
            metrics,
            at: now,
            emergency: true,
          });
        } catch (_) {}
      }
      return getSnapshot(now, speed);
    }

    // Once the raw emergency signal clears, fall back to the strongest normal
    // tier instead of leaving the controller parked at the shutdown-only tier.
    if (activeIndex === steps.length - 1) {
      activeIndex = steps.length - 2;
      activeSince = now;
      recoverySince = null;
      recoveryNotified = false;
      clearSweep();
    }

    // Re-arm after the raw emergency signal clears and remains clear. A new
    // reset must establish a fresh persistence window; stale samples cannot do it.
    if (emergencyShutdownRequested) {
      if (emergencyClearSince === null) emergencyClearSince = now;
      if (now - emergencyClearSince >= emergencyRearmMs) emergencyShutdownRequested = false;
    }

    // The emergency-shutdown stage is intentionally excluded from the normal
    // timed ladder; only the raw emergency branch above may enter it.
    for (let i = 0; i < steps.length - 1; i++) {
      const conditionMet = speed <= steps[i].speed && lagMs >= steps[i].lagMs;
      if (conditionMet) {
        if (stepSince[i] === null) stepSince[i] = now;
      } else {
        stepSince[i] = null;
      }
    }

    const mem = Number(metrics && metrics.memoryRatio);
    const memoryGrowth = Number(metrics && metrics.memoryGrowthMb);
    const memoryTrendReady = metrics && metrics.memoryTrendReady === true;
    // A large but stable Node heap is not proof the server is still unhealthy.
    // Otherwise spawn gates can remain closed forever after cleanup because V8
    // does not promise to return reserved heap pages to the operating system.
    // Keep recovery blocked only while memory is both very high and still growing,
    // or while the measured growth itself remains severe.
    const memoryPressureStillGrowing = memoryTrendReady && Number.isFinite(memoryGrowth) &&
      (memoryGrowth >= memoryHighGrowthMb ||
        (Number.isFinite(mem) && mem >= recoveryMemoryRatio && memoryGrowth >= memoryWarningGrowthMb));
    // Recovery still requires both healthy throughput and low current measured lag.
    const memoryHealthy = !memoryPressureStillGrowing;
    const recoveryHealthy = speed >= recoverySpeed && memoryHealthy && lagMs <= recoveryMaxLagMs;
    if (activeIndex >= 0 && recoveryHealthy) {
      if (recoverySince === null) recoverySince = now;
      if (now - recoverySince >= recoveryMs) {
        if (!recoveryNotified) {
          recoveryNotified = true;
          clearSweep();
          try {
            onRecovery({
              at: now,
              reason: "server run speed and measured lag recovered",
              recovering: true,
              stageIndex: activeIndex,
              stageId: steps[activeIndex].id,
            });
          } catch (_) {}
        }
        activeIndex--;
        activeSince = activeIndex >= 0 ? now : null;
        stepSince.fill(null);
        clearSweep();
        if (activeIndex < 0) {
          // onRecovery already ran when the gradual restoration began.
          resetAfterRecovery(now);
          return getSnapshot(now, speed);
        }
        recoverySince = now;
        return getSnapshot(now, speed);
      }
    } else {
      if (recoveryNotified) cancelRecovery(now, "lag or throughput worsened during recovery");
      recoverySince = null;
      recoveryNotified = false;
    }

    if (activeIndex < 0) {
      if (stepSince[0] !== null && now - stepSince[0] >= steps[0].durationMs) {
        activeIndex = 0;
        activeSince = now;
        clearSweep();
      }
    } else if (activeIndex < steps.length - 2) {
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

    if (activeIndex >= 0 && recoverySince === null) {
      const step = steps[activeIndex];
      if (step.action === "shutdown" || step.action === "reset") {
        if (!emergencyShutdownRequested) {
          emergencyShutdownRequested = true;
          try { onEmergencyShutdown({ stepId: step.id, runSpeedPercent: speed, metrics, at: now }); } catch (_) {}
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
    get emergencyShutdownRequested() { return emergencyShutdownRequested; },
    get softResetRequested() { return emergencyShutdownRequested; },
    get steps() { return steps.map((step) => Object.assign({}, step)); },
  };
}

module.exports = createLagResponse;
module.exports.DEFAULT_STEPS = DEFAULT_STEPS;
