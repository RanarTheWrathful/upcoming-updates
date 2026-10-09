"use strict";

const fs = require("fs");
const v8 = require("v8");
const { monitorEventLoopDelay, performance } = require("perf_hooks");

const STAGE_NAMES = ["normal", "elevated", "high", "critical"];

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function detectMemoryLimitBytes(env = process.env) {
  const configuredMb = Number(env.RANAR_MEMORY_LIMIT_MB);
  if (Number.isFinite(configuredMb) && configuredMb > 0) {
    return configuredMb * 1024 * 1024;
  }

  const candidates = [
    "/sys/fs/cgroup/memory.max", // cgroup v2
    "/sys/fs/cgroup/memory/memory.limit_in_bytes", // cgroup v1
  ];

  for (const filename of candidates) {
    try {
      const raw = fs.readFileSync(filename, "utf8").trim();
      if (!raw || raw === "max") continue;
      const value = Number(raw);
      // Some hosts expose a sentinel near UINT64_MAX instead of a real limit.
      if (
        Number.isFinite(value) &&
        value > 16 * 1024 * 1024 &&
        value < Math.pow(2, 60)
      ) {
        return value;
      }
    } catch (_) {
      // Not running under this cgroup layout; try the next source.
    }
  }
  return null;
}

function createLoadProtection(options = {}) {
  const env = options.env || process.env;
  const onStageChange = options.onStageChange || (() => {});
  const sampleProvider = options.sampleProvider || null;
  const getEntities = options.getEntities || (() => []);
  const isEntityOnScreen = options.isEntityOnScreen || (() => false);
  const onEntityChange = options.onEntityChange || (() => {});
  const nowProvider = options.nowProvider || (() => performance.now());
  const intervalMs = positiveNumber(env.RANAR_LOAD_SAMPLE_MS, 1000);
  const warningMemory = positiveNumber(env.RANAR_LOAD_WARNING_MEMORY, 0.75);
  const highMemory = positiveNumber(env.RANAR_LOAD_HIGH_MEMORY, 0.86);
  const criticalMemory = positiveNumber(env.RANAR_LOAD_CRITICAL_MEMORY, 0.94);
  // Match actual simulation lag thresholds requested for this server.
  const warningDelayMs = positiveNumber(env.RANAR_LOAD_WARNING_DELAY_MS, 75);
  const highDelayMs = positiveNumber(env.RANAR_LOAD_HIGH_DELAY_MS, 150);
  const criticalDelayMs = positiveNumber(env.RANAR_LOAD_CRITICAL_DELAY_MS, 250);
  const suspensionIntervalMs = positiveNumber(env.RANAR_LOAD_SUSPEND_INTERVAL_MS, 2500);
  const suspensionWindowMs = positiveNumber(env.RANAR_LOAD_SUSPEND_WINDOW_MS, 60000);
  const entityFadeMs = positiveNumber(env.RANAR_LOAD_ENTITY_FADE_MS, 2500);
  const naturalSpawnPauseMs = positiveNumber(env.RANAR_LAG_100_DURATION_MS, 10000);
  const offscreenCleanupDelayMs = positiveNumber(env.RANAR_LAG_150_DURATION_MS, 15000);
  const onScreenCleanupDelayMs = positiveNumber(env.RANAR_LAG_200_DURATION_MS, 15000);
  const cleanupIntervalMs = positiveNumber(env.RANAR_LAG_CLEANUP_INTERVAL_MS, 2500);
  const policyRecoveryMs = positiveNumber(env.RANAR_LAG_POLICY_RECOVERY_MS, 10000);
  const warningGrowthMb = positiveNumber(env.RANAR_LOAD_WARNING_GROWTH_MB, 64);
  const highGrowthMb = positiveNumber(env.RANAR_LOAD_HIGH_GROWTH_MB, 128);
  const criticalGrowthMb = positiveNumber(env.RANAR_LOAD_CRITICAL_GROWTH_MB, 256);
  const trendWindowValue = Math.floor(positiveNumber(env.RANAR_LOAD_TREND_SAMPLES, 30));
  const trendWindowSamples = Math.max(10, Math.min(300, trendWindowValue));
  const memoryHistory = [];
  // Weak keys keep profiling data from extending destroyed entity lifetimes and
  // avoid adding hidden properties to every hot-path game object.
  const entityStats = new WeakMap();
  const memoryLimitBytes = options.memoryLimitBytes === undefined
    ? detectMemoryLimitBytes(env)
    : options.memoryLimitBytes;

  const delayMonitor = options.delayMonitor || monitorEventLoopDelay({ resolution: 20 });
  let timer = null;
  let running = false;
  let stage = 0;
  // Cycle-based load responds immediately instead of waiting for the 1 Hz sampler.
  let cycleStage = 0;
  let lastCycleMs = 0;
  let lowCycleSamples = 0;
  let cycleIndex = 0;
  // Entity references are held only while they are visibly suspended/fading.
  // The episode is bounded to one minute and invalid entities are pruned each cycle.
  const suspendedEntities = new Map();
  let suspensionEpisodeStartedAt = null;
  let lastEntitySuspensionAt = null;
  let suspensionLockout = false;
  let lastObservedLagMs = 0;
  let lastNoCandidateWarningAt = 0;
  let profileCounter = 0;
  let collisionProfileCounter = 0;
  let candidateStage = 0;
  let candidateSamples = 0;
  let recoverySamples = 0;
  let minimapTick = 0;
  let foodSpawnTick = 0;
  let botSpawnTick = 0;
  const sustainedPolicies = {
    100: { durationMs: naturalSpawnPauseMs, since: null, triggered: false, lastActionAt: 0 },
    150: { durationMs: offscreenCleanupDelayMs, since: null, triggered: false, lastActionAt: 0 },
    200: { durationMs: onScreenCleanupDelayMs, since: null, triggered: false, lastActionAt: 0 },
  };
  let naturalSpawnsPaused = false;
  let below100Since = null;
  let lastUnknownSweepAt = 0;
  let lastMetrics = {
    stage: 0,
    stageName: "normal",
    memoryRatio: 0,
    rssMb: 0,
    heapUsedMb: 0,
    heapLimitMb: 0,
    externalMb: 0,
    memoryLimitMb: memoryLimitBytes ? memoryLimitBytes / 1048576 : null,
    eventLoopP95Ms: 0,
    eventLoopMaxMs: 0,
    memoryGrowthMb: 0,
    memoryTrendReady: false,
    cycleMs: 0,
    cycleStage: 0,
    loadDisabledEntityId: null,
    loadDisabledEntityLabel: null,
    loadDisabledEntityCount: 0,
    loadSuspensionLockout: false,
    loadSuspensionElapsedMs: 0,
    naturalSpawnsPaused: false,
    lagPolicy100Triggered: false,
    lagPolicy150Triggered: false,
    lagPolicy200Triggered: false,
    sampledAt: 0,
  };

  function readMetrics() {
    if (sampleProvider) {
      const provided = sampleProvider();
      return Object.assign({
        memoryRatio: 0,
        rssMb: 0,
        heapUsedMb: 0,
        heapLimitMb: 0,
        externalMb: 0,
        memoryLimitMb: memoryLimitBytes ? memoryLimitBytes / 1048576 : null,
        eventLoopP95Ms: 0,
        eventLoopMaxMs: 0,
        memoryGrowthMb: 0,
        memoryTrendReady: false,
        cycleMs: lastCycleMs,
      }, provided);
    }

    const memory = process.memoryUsage();
    const heap = v8.getHeapStatistics();
    const heapLimit = heap.heap_size_limit || 1;
    const rssRatio = memoryLimitBytes ? memory.rss / memoryLimitBytes : null;
    const heapRatio = memory.heapUsed / heapLimit;
    let p95 = 0;
    let max = 0;
    try {
      const rawP95 = delayMonitor.percentile(95) / 1e6;
      const rawMax = delayMonitor.max / 1e6;
      if (Number.isFinite(rawP95)) p95 = rawP95;
      if (Number.isFinite(rawMax)) max = rawMax;
      delayMonitor.reset();
    } catch (_) {
      // A test or older runtime may provide a partial monitor implementation.
    }

    return {
      memoryRatio: rssRatio === null ? heapRatio : rssRatio,
      rssMb: memory.rss / 1048576,
      heapUsedMb: memory.heapUsed / 1048576,
      heapLimitMb: heapLimit / 1048576,
      externalMb: memory.external / 1048576,
      memoryLimitMb: memoryLimitBytes ? memoryLimitBytes / 1048576 : null,
      eventLoopP95Ms: p95,
      eventLoopMaxMs: max,
      cycleMs: lastCycleMs,
    };
  }

  function addMemoryTrend(metrics) {
    const rssMb = Number(metrics.rssMb);
    if (Number.isFinite(rssMb) && rssMb >= 0) {
      memoryHistory.push(rssMb);
      if (memoryHistory.length > trendWindowSamples) memoryHistory.shift();
    }
    const ready = memoryHistory.length >= trendWindowSamples;
    const growthMb = ready ? memoryHistory[memoryHistory.length - 1] - memoryHistory[0] : 0;
    return Object.assign({}, metrics, {
      memoryGrowthMb: Number.isFinite(growthMb) ? growthMb : 0,
      memoryTrendReady: ready,
    });
  }

  function classify(metrics) {
    const memoryRatio = Number.isFinite(metrics.memoryRatio) ? metrics.memoryRatio : 0;
    const p95 = Number.isFinite(metrics.eventLoopP95Ms) ? metrics.eventLoopP95Ms : 0;
    const cycleMs = Number.isFinite(metrics.cycleMs) ? metrics.cycleMs : lastCycleMs;
    const lagMs = Math.max(p95, cycleMs);
    const growth = metrics.memoryTrendReady && Number.isFinite(metrics.memoryGrowthMb)
      ? metrics.memoryGrowthMb
      : 0;
    if (
      memoryRatio >= criticalMemory ||
      lagMs >= criticalDelayMs ||
      growth >= criticalGrowthMb
    ) return 3;
    if (memoryRatio >= highMemory || lagMs >= highDelayMs || growth >= highGrowthMb) return 2;
    if (memoryRatio >= warningMemory || lagMs >= warningDelayMs || growth >= warningGrowthMb) return 1;
    return 0;
  }

  function effectiveStage() {
    return Math.max(stage, cycleStage);
  }

  function notifyStageChange(previousEffective, metrics) {
    const currentEffective = effectiveStage();
    if (previousEffective === currentEffective) return;
    try {
      onStageChange(previousEffective, currentEffective, getSnapshot(metrics));
    } catch (_) {
      // Monitoring must never crash the game server.
    }
  }

  function getEntityStats(entity) {
    let stats = entityStats.get(entity);
    if (!stats) {
      stats = {
        lifeMs: 0,
        lastLifeCycle: 0,
        collisionMs: 0,
        collisionLoad: 0,
        lastCollisionCycle: 0,
      };
      entityStats.set(entity, stats);
    }
    return stats;
  }

  function isEntityLive(entity) {
    if (!entity) return false;
    try {
      return typeof entity.valid !== "function" || entity.valid();
    } catch (_) {
      return false;
    }
  }

  function clampVisualAlpha(value) {
    const alpha = Number(value);
    if (!Number.isFinite(alpha)) return 1;
    return Math.max(0, Math.min(1, alpha));
  }

  function isDisabledOrRespawning(entity) {
    if (!entity) return true;
    if (entity._loadDisabled === true || entity._loadRespawning === true) return true;
    const name = typeof entity.name === "string" ? entity.name.trim().toLowerCase() : "";
    return name === "[disabled]" || name === "[respawning...]" || name === "[respawning]";
  }

  function isUnknownEntity(entity) {
    if (!entity) return false;
    const values = [entity.label, entity.name, entity.type];
    const state = suspendedEntities.get(entity);
    // The visible status name temporarily replaces the original name during a
    // quarantine fade. Keep using the saved name until that policy is released.
    if (state && state.kind === "unknown" &&
        /^unknown (entity|class)$/i.test(String(state.originalName || "").trim()) &&
        /^\[(disabled|respawning)(\.\.\.)?\]$/i.test(String(entity.name || "").trim())) {
      values.push(state.originalName);
    }
    return values.some((value) => typeof value === "string" &&
      /^(unknown entity|unknown class)$/i.test(value.trim()));
  }

  function isProjectile(entity) {
    return !!(entity && (entity.isProjectile === true || entity.type === "bullet"));
  }

  function isNaturalSpawnEntity(entity) {
    if (!entity) return false;
    if (entity._loadProtectionNaturalSpawn === true) return true;
    if (typeof entity.foodLevel === "number" && entity.foodLevel >= 0) return true;
    const source = entity.source;
    return !!(source && source !== entity && source._loadProtectionNaturalSpawn === true);
  }

  function shouldProtectFromNaturalCleanup(entity) {
    if (!entity) return true;
    const settings = entity.settings || {};
    if (
      entity._loadProtectionSpecialSpawn === true || entity.keep === true ||
      entity.KEEP === true || settings.KEEP === true || entity.isProtected === true ||
      entity.alwaysExists === true || entity.isPlayer === true || entity.isBoss === true ||
      entity.boss === true || entity.isDominator === true || entity.isGate === true ||
      entity.isWall === true || entity.bond != null || entity.type === "base" ||
      entity.type === "wall" || entity.type === "fortWall" || entity.type === "fortGate" ||
      (entity.isBot === true && entity.skill && Number(entity.skill.score) >= 1000000) ||
      (typeof entity.name === "string" && entity.name.startsWith("[LORD]_"))
    ) return true;
    return false;
  }

  function destroyForLoadProtection(entity) {
    if (!entity || !isEntityLive(entity) || shouldProtectFromNaturalCleanup(entity)) return false;
    suspendedEntities.delete(entity);
    try {
      if (typeof entity.destroy === "function") {
        entity.destroy();
        return true;
      }
    } catch (_) {
      // A later cleanup pass can retry remaining entities. Never crash the game loop.
    }
    return false;
  }

  function cleanupNaturalEntities(entityList, mode) {
    const list = Array.isArray(entityList) ? entityList : [];
    let destroyed = 0;
    for (let i = 0; i < list.length; i++) {
      const entity = list[i];
      if (!entity || !isEntityLive(entity)) continue;
      if (mode === "projectiles-and-onscreen") {
        // The 200ms rule explicitly includes every projectile, regardless of source.
        if (isProjectile(entity)) {
          try {
            if (typeof entity.destroy === "function") {
              suspendedEntities.delete(entity);
              entity.destroy();
              destroyed++;
            }
          } catch (_) {}
          continue;
        }
        if (!isNaturalSpawnEntity(entity) || shouldProtectFromNaturalCleanup(entity)) continue;
        let onScreen = false;
        try { onScreen = !!isEntityOnScreen(entity); } catch (_) { onScreen = false; }
        if (onScreen && destroyForLoadProtection(entity)) destroyed++;
      } else {
        // Projectiles are deliberately reserved for the more severe 200ms rule.
        if (isProjectile(entity) || !isNaturalSpawnEntity(entity) || shouldProtectFromNaturalCleanup(entity)) continue;
        let onScreen = false;
        try { onScreen = !!isEntityOnScreen(entity); } catch (_) { onScreen = false; }
        if (!onScreen && destroyForLoadProtection(entity)) destroyed++;
      }
    }
    if (destroyed > 0) {
      callEntityChange(null, false, {
        reason: "load policy " + mode + " removed " + destroyed + " entity/entities",
        destroyedCount: destroyed,
        cycleMs: lastCycleMs,
      });
    }
    return destroyed;
  }

  function callEntityChange(entity, disabled, details) {
    try {
      onEntityChange(entity, disabled, details || {});
    } catch (_) {
      // Monitoring and presentation callbacks must never crash the game server.
    }
  }

  function shouldKeepEntity(entity) {
    if (!entity) return true;
    // Bound turrets are lifecycle-controlled by their parent; suspending them
    // independently would not reliably stop their nested life() calls.
    if (entity.bond != null) return true;
    if (
      entity.keep === true || entity.KEEP === true ||
      (entity.settings && entity.settings.KEEP === true) ||
      entity.isPlayer === true || entity.isBoss === true || entity.boss === true ||
      entity._loadProtectionSpecialSpawn === true || entity.alwaysExists === true ||
      entity.isProjectile === true || entity.type === "bullet" ||
      entity.isDominator === true || entity.isGate === true ||
      entity.isWall === true || entity.isProtected === true ||
      entity.type === "base" || entity.type === "wall" ||
      entity.type === "fortWall" || entity.type === "fortGate"
    ) return true;

    // Do not disable support entities belonging to a protected player or boss.
    const master = entity.master;
    const source = entity.source;
    const parent = entity.parent;
    if (master && master !== entity && (
      master.keep === true || master.KEEP === true || master.isPlayer === true || master.isBoss === true
    )) return true;
    if (source && source !== entity && (
      source.keep === true || source.KEEP === true || source.isPlayer === true || source.isBoss === true
    )) return true;
    if (parent && parent !== entity && (
      parent.keep === true || parent.KEEP === true || parent.isPlayer === true || parent.isBoss === true
    )) return true;
    return false;
  }

  function entityCostScore(entity) {
    if (!entity) return -1;
    const stats = entityStats.get(entity);
    const lifeAge = Math.max(0, cycleIndex - (stats ? stats.lastLifeCycle : 0));
    const collisionAge = Math.max(0, cycleIndex - (stats ? stats.lastCollisionCycle : 0));
    const lifeCost = (stats ? stats.lifeMs : 0) * Math.pow(0.85, lifeAge);
    const collisionCost = (stats ? stats.collisionMs : 0) * Math.pow(0.75, collisionAge);
    const collisionLoad = (stats ? stats.collisionLoad : 0) * Math.pow(0.70, collisionAge);
    const controllers = entity.controllers && entity.controllers.length || 0;
    const guns = entity.guns && entity.guns.length || 0;
    const turrets = entity.turrets && entity.turrets.length || 0;
    const children = entity.children && entity.children.length || 0;
    const linkedChildren = entity.possiblyChildren && entity.possiblyChildren.size || 0;
    const excludedTargets = entity.excludedTargets && entity.excludedTargets.length || 0;
    // JS does not expose reliable per-object heap sizes. This is a workload/structure
    // proxy, not a claim that these values are exact bytes of memory.
    // Structures multiply descendant updates and collision work, so they need
    // meaningful weight alongside measured life/collision time.
    const structureCost = controllers * 10 + guns * 80 + turrets * 120 +
      children * 30 + linkedChildren * 25 + excludedTargets * 2;
    return lifeCost * 100 + collisionCost * 100 + collisionLoad * 0.25 + structureCost;
  }

  function beginEntityRestore(entity, state, reason) {
    if (!entity || !state || state.phase === "restoring") return;
    if (!isEntityLive(entity)) {
      suspendedEntities.delete(entity);
      return;
    }
    const now = nowProvider();
    state.phase = "restoring";
    state.transitionStartedAt = now;
    // If lag clears part-way through fade-out, reverse smoothly from the
    // current opacity instead of making the entity pop out and back in.
    state.startAlpha = clampVisualAlpha(entity.alpha);
    state.restoreReason = reason || "lag recovered";
    entity._loadDisabled = true;
    entity.name = "[Respawning...]";
    entity.allowPlate = true;
    entity.alpha = state.startAlpha;
  }

  function restoreSuspendedEntities(reason, kind) {
    for (const [entity, state] of suspendedEntities) {
      if (kind && state.kind !== kind) continue;
      beginEntityRestore(entity, state, reason);
    }
  }

  function restoreAllSuspendedEntities(reason) {
    restoreSuspendedEntities(reason, null);
  }

  function reverseRestoringEntities(now) {
    let reversed = 0;
    for (const [entity, state] of suspendedEntities) {
      if (state.phase !== "restoring" || !isEntityLive(entity)) continue;
      state.phase = "fadingOut";
      state.transitionStartedAt = now;
      state.startAlpha = clampVisualAlpha(entity.alpha);
      entity._loadDisabled = true;
      entity.name = "[Disabled]";
      entity.allowPlate = true;
      reversed++;
    }
    return reversed;
  }

  function advanceEntityTransitions(now = nowProvider()) {
    for (const [entity, state] of suspendedEntities) {
      if (!isEntityLive(entity)) {
        // Prune dead entities immediately so this controller cannot retain them.
        suspendedEntities.delete(entity);
        continue;
      }

      // A runtime KEEP opt-out takes effect immediately, even mid-fade.
      if (shouldKeepEntity(entity) && state.phase !== "restoring") {
        beginEntityRestore(entity, state, "entity became protected");
      } else if (state.kind === "unknown" && !isUnknownEntity(entity) && state.phase !== "restoring") {
        beginEntityRestore(entity, state, "entity no longer has an unknown label");
      }

      // Keep the entity out of gameplay until it is fully visible again.
      entity._loadDisabled = true;
      const elapsed = Math.max(0, now - state.transitionStartedAt);
      const progress = entityFadeMs > 0 ? Math.max(0, Math.min(1, elapsed / entityFadeMs)) : 1;

      if (state.phase === "fadingOut") {
        entity.name = "[Disabled]";
        entity.allowPlate = true;
        entity.alpha = state.startAlpha * (1 - progress);
        if (progress >= 1) {
          state.phase = "suspended";
          state.transitionStartedAt = now;
          state.startAlpha = 0;
          entity.alpha = 0;
        }
      } else if (state.phase === "suspended") {
        entity.name = "[Disabled]";
        entity.allowPlate = true;
        entity.alpha = 0;
      } else if (state.phase === "restoring") {
        entity.name = "[Respawning...]";
        entity.allowPlate = true;
        entity.alpha = state.startAlpha + (state.targetAlpha - state.startAlpha) * progress;
        if (progress >= 1) {
          entity.name = state.originalName;
          entity.alpha = state.originalAlpha;
          if (state.hadAllowPlate) entity.allowPlate = state.originalAllowPlate;
          else delete entity.allowPlate;
          delete entity._loadDisabled;
          suspendedEntities.delete(entity);
          callEntityChange(entity, false, {
            reason: state.restoreReason || "lag recovered",
            score: entityCostScore(entity),
            cycleMs: lastCycleMs,
            stage: effectiveStage(),
            fadeMs: entityFadeMs,
          });
        }
      }
    }
  }

  function suspendEntity(entity, reason, kind, score) {
    if (!entity || !isEntityLive(entity) || isDisabledOrRespawning(entity) || suspendedEntities.has(entity) || shouldKeepEntity(entity)) return null;
    if (typeof entity.isDead === "function") {
      let dead = false;
      try { dead = entity.isDead(); } catch (_) { dead = true; }
      if (dead) return null;
    }
    const originalAlpha = typeof entity.alpha === "number" && Number.isFinite(entity.alpha) ? entity.alpha : 1;
    const state = {
      kind: kind || "critical",
      originalName: entity.name,
      originalAlpha,
      targetAlpha: clampVisualAlpha(originalAlpha),
      hadAllowPlate: Object.prototype.hasOwnProperty.call(entity, "allowPlate"),
      originalAllowPlate: entity.allowPlate,
      phase: "fadingOut",
      transitionStartedAt: nowProvider(),
      startAlpha: clampVisualAlpha(originalAlpha),
      restoreReason: null,
    };
    suspendedEntities.set(entity, state);
    entity._loadDisabled = true;
    entity.name = "[Disabled]";
    entity.allowPlate = true;
    entity.alpha = state.startAlpha;
    callEntityChange(entity, true, {
      reason: reason || "load policy suspended entity",
      score: Number.isFinite(score) ? score : entityCostScore(entity),
      cycleMs: lastCycleMs,
      stage: effectiveStage(),
      fadeMs: entityFadeMs,
      kind: state.kind,
    });
    return entity;
  }

  function suspendNextEntity(entityList, reason) {
    const list = Array.isArray(entityList) ? entityList : [];
    let best = null;
    let bestScore = -1;
    for (let i = 0; i < list.length; i++) {
      const entity = list[i];
      if (!entity || isDisabledOrRespawning(entity) || suspendedEntities.has(entity) || shouldKeepEntity(entity)) continue;
      if (!isEntityLive(entity)) continue;
      if (typeof entity.isDead === "function") {
        let dead = false;
        try { dead = entity.isDead(); } catch (_) { dead = true; }
        if (dead) continue;
      }
      const score = entityCostScore(entity);
      if (score > bestScore) {
        best = entity;
        bestScore = score;
      }
    }
    if (!best) {
      const now = Date.now();
      if (now - lastNoCandidateWarningAt > 10000) {
        lastNoCandidateWarningAt = now;
        callEntityChange(null, false, {
          reason: "no eligible entity; all candidates are protected, disabled, or respawning",
          cycleMs: lastCycleMs,
        });
      }
      return null;
    }
    return suspendEntity(best, reason, "critical", bestScore);
  }

  function disableUnknownEntities(entityList, now) {
    const list = Array.isArray(entityList) ? entityList : [];
    if (now - lastUnknownSweepAt < cleanupIntervalMs) return 0;
    lastUnknownSweepAt = now;
    let disabled = 0;
    for (let i = 0; i < list.length; i++) {
      const entity = list[i];
      if (!entity || !isUnknownEntity(entity) || isDisabledOrRespawning(entity) || suspendedEntities.has(entity)) continue;
      if (suspendEntity(entity, "lag >= 100ms for " + Math.round(naturalSpawnPauseMs / 1000) + "s; unknown entity quarantined", "unknown")) disabled++;
    }
    return disabled;
  }

  function updateSustainedLagPolicies(lagMs, entityList) {
    const now = nowProvider();
    const finiteLag = Number.isFinite(lagMs) ? lagMs : 0;
    const lag100 = sustainedPolicies[100];
    const lag150 = sustainedPolicies[150];
    const lag200 = sustainedPolicies[200];
    const list = Array.isArray(entityList) ? entityList : getEntities();

    if (finiteLag >= 100) {
      below100Since = null;
      if (lag100.since === null) lag100.since = now;
      if (now - lag100.since >= lag100.durationMs) {
        lag100.triggered = true;
        if (!naturalSpawnsPaused) {
          naturalSpawnsPaused = true;
          lastUnknownSweepAt = 0;
          callEntityChange(null, false, {
            reason: "lag >= 100ms for " + Math.round(naturalSpawnPauseMs / 1000) + "s; natural bot/entity spawning and food paused",
            cycleMs: lastCycleMs,
          });
        }
        disableUnknownEntities(list, now);
      }
    } else {
      lag100.since = null;
      lag100.triggered = false;
      if (naturalSpawnsPaused) {
        if (below100Since === null) below100Since = now;
        if (now - below100Since >= policyRecoveryMs) {
          naturalSpawnsPaused = false;
          below100Since = null;
          restoreSuspendedEntities("lag stayed below 100ms for " + Math.round(policyRecoveryMs / 1000) + "s", "unknown");
          callEntityChange(null, false, {
            reason: "lag recovered below 100ms; natural bot/entity spawning and food resumed",
            cycleMs: lastCycleMs,
          });
        }
      } else {
        below100Since = null;
      }
    }

    if (finiteLag >= 150) {
      if (lag150.since === null) lag150.since = now;
      if (now - lag150.since >= lag150.durationMs) {
        lag150.triggered = true;
        if (lag150.lastActionAt === 0 || now - lag150.lastActionAt >= cleanupIntervalMs) {
          cleanupNaturalEntities(list, "offscreen");
          lag150.lastActionAt = now;
        }
      }
    } else {
      lag150.since = null;
      lag150.triggered = false;
      lag150.lastActionAt = 0;
    }

    if (finiteLag >= 200) {
      if (lag200.since === null) lag200.since = now;
      if (now - lag200.since >= lag200.durationMs) {
        lag200.triggered = true;
        if (lag200.lastActionAt === 0 || now - lag200.lastActionAt >= cleanupIntervalMs) {
          cleanupNaturalEntities(list, "projectiles-and-onscreen");
          lag200.lastActionAt = now;
        }
      }
    } else {
      lag200.since = null;
      lag200.triggered = false;
      lag200.lastActionAt = 0;
    }

    lastMetrics.naturalSpawnsPaused = naturalSpawnsPaused;
    lastMetrics.lagPolicy100Triggered = lag100.triggered;
    lastMetrics.lagPolicy150Triggered = lag150.triggered;
    lastMetrics.lagPolicy200Triggered = lag200.triggered;
  }

  function handleCriticalLag(lagMs, entityList, reason) {
    const now = nowProvider();
    lastObservedLagMs = Number.isFinite(lagMs) ? lagMs : 0;

    if (lastObservedLagMs < criticalDelayMs) {
      if (suspensionLockout) {
        suspensionLockout = false;
        callEntityChange(null, false, {
          reason: "lag fell below " + criticalDelayMs + "ms; entity-suspension lockout cleared",
          cycleMs: lastCycleMs,
        });
      }
      if (suspensionEpisodeStartedAt !== null) {
        suspensionEpisodeStartedAt = null;
        lastEntitySuspensionAt = null;
        restoreSuspendedEntities("lag fell below " + criticalDelayMs + "ms", "critical");
      }
      return;
    }

    if (suspensionLockout) return;

    if (suspensionEpisodeStartedAt === null) {
      suspensionEpisodeStartedAt = now;
      const reversing = reverseRestoringEntities(now);
      if (reversing > 0) {
        // Existing suspended entities have resumed fading out; wait before
        // selecting another so the response remains one-at-a-time.
        lastEntitySuspensionAt = now;
      } else {
        suspendNextEntity(entityList || getEntities(), reason);
        lastEntitySuspensionAt = now;
      }
    }

    const episodeElapsed = Math.max(0, now - suspensionEpisodeStartedAt);
    if (episodeElapsed >= suspensionWindowMs) {
      restoreSuspendedEntities(
        "lag stayed at or above " + criticalDelayMs + "ms for " + Math.round(suspensionWindowMs / 1000) + " seconds",
        "critical"
      );
      suspensionEpisodeStartedAt = null;
      lastEntitySuspensionAt = null;
      suspensionLockout = true;
      callEntityChange(null, false, {
        reason: "critical lag persisted for " + Math.round(suspensionWindowMs / 1000) +
          " seconds; restoring all entities and locking out further suspensions until lag falls below " +
          criticalDelayMs + "ms",
        cycleMs: lastCycleMs,
      });
      return;
    }

    if (
      lastEntitySuspensionAt === null ||
      now - lastEntitySuspensionAt >= suspensionIntervalMs
    ) {
      suspendNextEntity(entityList || getEntities(), reason);
      // Rate-limit attempts as well as successful suspensions when every
      // remaining candidate is KEEP-protected.
      lastEntitySuspensionAt = now;
    }
  }

  function primarySuspendedEntity() {
    for (const [entity, state] of suspendedEntities) {
      if (state.phase !== "restoring") return entity;
    }
    return suspendedEntities.size ? suspendedEntities.keys().next().value : null;
  }

  function updateSuspensionSnapshot(target) {
    const entity = primarySuspendedEntity();
    target.loadDisabledEntityId = entity ? entity.id : null;
    target.loadDisabledEntityLabel = entity ? (entity.label || entity.type || "entity") : null;
    target.loadDisabledEntityCount = suspendedEntities.size;
    target.loadSuspensionLockout = suspensionLockout;
    target.loadSuspensionElapsedMs = suspensionEpisodeStartedAt === null
      ? 0
      : Math.max(0, nowProvider() - suspensionEpisodeStartedAt);
    target.loadObservedLagMs = lastObservedLagMs;
  }

  function transition(nextStage, metrics) {
    const previousEffective = effectiveStage();
    stage = nextStage;
    candidateStage = stage;
    candidateSamples = 0;
    recoverySamples = 0;
    minimapTick = 0;
    foodSpawnTick = 0;
    botSpawnTick = 0;
    lastMetrics = Object.assign({}, metrics, {
      stage,
      stageName: STAGE_NAMES[effectiveStage()],
      cycleMs: lastCycleMs,
      cycleStage,
      sampledAt: Date.now(),
    });
    notifyStageChange(previousEffective, metrics);
  }

  function reportCycle(durationMs, entityList) {
    const cycleMs = Number(durationMs);
    if (!Number.isFinite(cycleMs) || cycleMs < 0) return getSnapshot();
    const previousEffective = effectiveStage();
    lastCycleMs = cycleMs;
    cycleIndex++;

    const sampledP95 = Number(lastMetrics.eventLoopP95Ms) || 0;
    const observedLagMs = Math.max(cycleMs, sampledP95);
    if (observedLagMs >= criticalDelayMs) {
      cycleStage = 3;
      lowCycleSamples = 0;
    } else if (observedLagMs >= highDelayMs) {
      cycleStage = Math.max(cycleStage, 2);
      lowCycleSamples = 0;
    } else if (observedLagMs >= warningDelayMs) {
      cycleStage = Math.max(cycleStage, 1);
      lowCycleSamples = 0;
    } else {
      lowCycleSamples++;
      if (lowCycleSamples >= 10) {
        lowCycleSamples = 0;
        if (cycleStage > 0) cycleStage--;
      }
    }

    const reason = cycleMs >= criticalDelayMs
      ? "simulation cycle reached " + Math.round(cycleMs) + "ms"
      : sampledP95 >= criticalDelayMs
        ? "event-loop p95 reached " + Math.round(sampledP95) + "ms"
        : "simulation lag reached emergency threshold";
    // Advance existing fades before episode transitions. In particular, the
    // 60-second cutoff must see the latest opacity of a just-disabled entity.
    advanceEntityTransitions(nowProvider());
    updateSustainedLagPolicies(observedLagMs, entityList || getEntities());
    handleCriticalLag(observedLagMs, entityList || getEntities(), reason);
    advanceEntityTransitions(nowProvider());

    // Keep the sampled telemetry current without storing entity references in history.
    lastMetrics = Object.assign({}, lastMetrics, {
      cycleMs: lastCycleMs,
      cycleStage,
      stage,
      stageName: STAGE_NAMES[effectiveStage()],
    });
    updateSuspensionSnapshot(lastMetrics);
    notifyStageChange(previousEffective, lastMetrics);
    return getSnapshot();
  }

  function recordEntityLifeCost(entity, elapsedMs) {
    if (!entity || !Number.isFinite(elapsedMs) || elapsedMs < 0) return;
    if (typeof entity.valid === "function") {
      try { if (!entity.valid()) return; } catch (_) { return; }
    }
    const stats = getEntityStats(entity);
    stats.lifeMs = stats.lifeMs ? stats.lifeMs * 0.8 + elapsedMs * 0.2 : elapsedMs;
    stats.lastLifeCycle = cycleIndex;
  }

  function recordOneCollisionCost(entity, elapsedMs) {
    if (!entity) return;
    // The collision callback already checked validity; avoid another key lookup
    // on the hottest path. WeakMap keys do not retain destroyed entities.
    const stats = getEntityStats(entity);
    stats.collisionMs = stats.collisionMs
      ? stats.collisionMs * 0.8 + elapsedMs * 0.2
      : elapsedMs;
    stats.collisionLoad = Math.min(100, stats.collisionLoad + 1);
    stats.lastCollisionCycle = cycleIndex;
  }

  function recordCollisionCost(first, second, elapsedMs) {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return;
    const halfCost = elapsedMs / 2;
    recordOneCollisionCost(first, halfCost);
    recordOneCollisionCost(second, halfCost);
  }

  function shouldProfileEntity() {
    profileCounter++;
    const currentStage = effectiveStage();
    const interval = currentStage >= 2 ? 2 : currentStage === 1 ? 4 : 8;
    // Rotate the sampling phase each cycle so long-lived entities don't end up
    // permanently inside or outside the sample just because of array order.
    return (profileCounter + cycleIndex) % interval === 0;
  }

  function shouldProfileCollision() {
    const currentStage = effectiveStage();
    collisionProfileCounter++;
    const interval = currentStage >= 2 ? 2 : currentStage === 1 ? 4 : 16;
    return (collisionProfileCounter + cycleIndex) % interval === 0;
  }

  function sample() {
    let metrics;
    try {
      metrics = addMemoryTrend(readMetrics());
    } catch (_) {
      // A failed telemetry sample must never take down the game server.
      return getSnapshot();
    }
    const desiredStage = classify(metrics);
    lastMetrics = Object.assign({}, metrics, {
      stage,
      stageName: STAGE_NAMES[effectiveStage()],
      cycleMs: lastCycleMs,
      cycleStage,
      sampledAt: Date.now(),
    });

    // Event-loop delay can be high even when the measured simulation body is
    // short. Treat either measurement as lag for emergency entity suspension.
    const sampledP95 = Number.isFinite(metrics.eventLoopP95Ms) ? metrics.eventLoopP95Ms : 0;
    const observedLagMs = Math.max(sampledP95, lastCycleMs);
    const previousDelayEffective = effectiveStage();
    if (observedLagMs >= criticalDelayMs) {
      cycleStage = 3;
      lowCycleSamples = 0;
    } else if (observedLagMs >= highDelayMs) {
      cycleStage = Math.max(cycleStage, 2);
      lowCycleSamples = 0;
    } else if (observedLagMs >= warningDelayMs) {
      cycleStage = Math.max(cycleStage, 1);
      lowCycleSamples = 0;
    }
    const reason = sampledP95 >= criticalDelayMs
      ? "event-loop p95 reached " + Math.round(sampledP95) + "ms"
      : "simulation lag reached emergency threshold";
    advanceEntityTransitions(nowProvider());
    updateSustainedLagPolicies(observedLagMs, getEntities());
    handleCriticalLag(observedLagMs, getEntities(), reason);
    advanceEntityTransitions(nowProvider());
    lastMetrics.cycleStage = cycleStage;
    lastMetrics.stageName = STAGE_NAMES[effectiveStage()];
    updateSuspensionSnapshot(lastMetrics);
    notifyStageChange(previousDelayEffective, lastMetrics);

    if (desiredStage > stage) {
      recoverySamples = 0;
      if (candidateStage === desiredStage) candidateSamples++;
      else {
        candidateStage = desiredStage;
        candidateSamples = 1;
      }
      // Escalation requires sustained pressure; critical conditions react sooner.
      const memoryEmergency =
        (Number.isFinite(metrics.memoryRatio) && metrics.memoryRatio >= criticalMemory) ||
        (metrics.memoryTrendReady && Number.isFinite(metrics.memoryGrowthMb) && metrics.memoryGrowthMb >= criticalGrowthMb);
      const requiredSamples = memoryEmergency ? 1 : desiredStage >= 3 ? 2 : 3;
      if (candidateSamples >= requiredSamples) transition(desiredStage, metrics);
    } else if (desiredStage < stage) {
      candidateStage = stage;
      candidateSamples = 0;
      recoverySamples++;
      // Recover one tier at a time after 10 healthy samples (about 10 seconds).
      if (recoverySamples >= 10) transition(Math.max(desiredStage, stage - 1), metrics);
    } else {
      candidateStage = stage;
      candidateSamples = 0;
      recoverySamples = 0;
    }
    return getSnapshot();
  }

  function start() {
    if (running) return;
    running = true;
    try {
      delayMonitor.enable();
    } catch (_) {
      // The sample provider can still support tests without a real monitor.
    }
    timer = setInterval(sample, intervalMs);
    if (timer && typeof timer.unref === "function") timer.unref();
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    if (running) {
      try {
        delayMonitor.disable();
      } catch (_) {}
    }
    running = false;
  }

  function getSnapshot(metrics) {
    const snapshot = Object.assign({}, lastMetrics, metrics || {});
    const currentStage = effectiveStage();
    snapshot.stage = currentStage;
    snapshot.stageName = STAGE_NAMES[currentStage];
    snapshot.cycleMs = lastCycleMs;
    snapshot.cycleStage = cycleStage;
    snapshot.naturalSpawnsPaused = naturalSpawnsPaused;
    snapshot.lagPolicy100Triggered = sustainedPolicies[100].triggered;
    snapshot.lagPolicy150Triggered = sustainedPolicies[150].triggered;
    snapshot.lagPolicy200Triggered = sustainedPolicies[200].triggered;
    updateSuspensionSnapshot(snapshot);
    snapshot.memoryRatio = Number.isFinite(snapshot.memoryRatio) ? snapshot.memoryRatio : 0;
    return snapshot;
  }

  function shouldUpdateMinimap() {
    minimapTick++;
    const currentStage = effectiveStage();
    const interval = currentStage >= 3 ? 10 : currentStage === 2 ? 5 : currentStage === 1 ? 2 : 1;
    return minimapTick % interval === 0;
  }

  function shouldSpawnFood() {
    if (naturalSpawnsPaused) return false;
    const currentStage = effectiveStage();
    if (currentStage >= 3) return false;
    if (currentStage < 2) return true;
    foodSpawnTick++;
    return foodSpawnTick % 2 === 0;
  }

  function shouldSpawnBot() {
    if (naturalSpawnsPaused) return false;
    const currentStage = effectiveStage();
    if (currentStage >= 3) return false;
    if (currentStage < 2) return true;
    botSpawnTick++;
    return botSpawnTick % 2 === 0;
  }

  function shouldSpawnNaturalEntities() {
    return !naturalSpawnsPaused;
  }

  return {
    start,
    stop,
    sample,
    reportCycle,
    recordEntityLifeCost,
    recordCollisionCost,
    shouldProfileEntity,
    shouldProfileCollision,
    get stage() { return effectiveStage(); },
    isCritical: () => effectiveStage() >= 3,
    getSnapshot,
    shouldUpdateMinimap,
    shouldSpawnFood,
    shouldSpawnBot,
    shouldSpawnNaturalEntities,
    isEntityOnScreen: (entity) => {
      try { return !!isEntityOnScreen(entity); } catch (_) { return false; }
    },
  };
}

module.exports = createLoadProtection;
module.exports.detectMemoryLimitBytes = detectMemoryLimitBytes;
