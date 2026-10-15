"use strict";

const fs = require("fs");
const v8 = require("v8");
const { monitorEventLoopDelay, performance } = require("perf_hooks");

const STAGE_NAMES = ["normal", "elevated", "high", "critical"];
const RUN_SPEED_THRESHOLDS_MS = [75, 100, 150, 200, 250];

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
  const intervalMs = positiveNumber(env.RANAR_LOAD_SAMPLE_MS, 2000);
  // Nominal interval between completed simulation cycles. Anti-lag policies use
  // observed throughput relative to this target; automatic pacing still uses ms.
  const targetCycleIntervalMs = positiveNumber(
    options.targetCycleIntervalMs,
    positiveNumber(env.RANAR_LOAD_TARGET_CYCLE_MS, 1000 / 30)
  );
  const warningMemory = positiveNumber(env.RANAR_LOAD_WARNING_MEMORY, 0.75);
  const highMemory = positiveNumber(env.RANAR_LOAD_HIGH_MEMORY, 0.86);
  const criticalMemory = positiveNumber(env.RANAR_LOAD_CRITICAL_MEMORY, 0.94);
  // Match actual simulation lag thresholds requested for this server.
  const warningDelayMs = positiveNumber(env.RANAR_LOAD_WARNING_DELAY_MS, 75);
  const highDelayMs = positiveNumber(env.RANAR_LOAD_HIGH_DELAY_MS, 150);
  const criticalDelayMs = positiveNumber(env.RANAR_LOAD_CRITICAL_DELAY_MS, 250);
  // Crossing this extreme-lag threshold bypasses every policy persistence timer.
  const emergencyLagMs = positiveNumber(env.RANAR_LOAD_EXTREME_LAG_MS, 250);
  const suspensionIntervalMs = positiveNumber(env.RANAR_LOAD_SUSPEND_INTERVAL_MS, 2500);
  const suspensionWindowMs = positiveNumber(env.RANAR_LOAD_SUSPEND_WINDOW_MS, 60000);
  const entityFadeMs = positiveNumber(env.RANAR_LOAD_ENTITY_FADE_MS, 2500);
  const naturalSpawnPauseMs = positiveNumber(env.RANAR_LAG_100_DURATION_MS, 10000);
  const offscreenCleanupDelayMs = positiveNumber(env.RANAR_LAG_150_DURATION_MS, 15000);
  const onScreenCleanupDelayMs = positiveNumber(env.RANAR_LAG_200_DURATION_MS, 15000);
  // Normal critical suspension waits for persistence; an explicit extreme-load
  // condition below bypasses this delay and activates all mitigation policies.
  const criticalLagPersistenceMs = positiveNumber(env.RANAR_LAG_CRITICAL_DURATION_MS, 15000);
  const cleanupIntervalMs = positiveNumber(env.RANAR_LAG_CLEANUP_INTERVAL_MS, 2500);
  const speedPercentForMs = (milliseconds) => Math.max(
    1,
    Math.min(99.9, (targetCycleIntervalMs / Math.max(targetCycleIntervalMs, milliseconds)) * 100)
  );
  const configuredSpeedThreshold = (envName, fallbackMs) => {
    const configured = Number(env[envName]);
    return Number.isFinite(configured) && configured > 0
      ? Math.max(1, Math.min(100, configured))
      : speedPercentForMs(fallbackMs);
  };
  // Defaults preserve the severity of the old thresholds, but express them as
  // percent of target tick throughput. Override them directly with *_SPEED_PERCENT.
  const speedThresholds = {
    warning: configuredSpeedThreshold("RANAR_LOAD_WARNING_SPEED_PERCENT", warningDelayMs),
    high: configuredSpeedThreshold("RANAR_LOAD_HIGH_SPEED_PERCENT", highDelayMs),
    critical: configuredSpeedThreshold("RANAR_LOAD_CRITICAL_SPEED_PERCENT", criticalDelayMs),
    100: configuredSpeedThreshold("RANAR_LAG_100_SPEED_PERCENT", 100),
    150: configuredSpeedThreshold("RANAR_LAG_150_SPEED_PERCENT", 150),
    200: configuredSpeedThreshold("RANAR_LAG_200_SPEED_PERCENT", 200),
  };
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
  let lastCycleStartedAt = null;
  // Observed interval is start-to-start cadence, guarded by the current cycle's
  // measured cost so a single expensive tick is reflected immediately.
  let observedCycleIntervalMs = targetCycleIntervalMs;
  let currentRunSpeedPercent = 100;
  let lastObservedRunSpeedPercent = 100;
  // Entity references are held only while they are visibly suspended/fading.
  // The episode is bounded to one minute and invalid entities are pruned each cycle.
  const suspendedEntities = new Map();
  let suspensionEpisodeStartedAt = null;
  let criticalLagSince = null;
  let lastEntitySuspensionAt = null;
  let suspensionLockout = false;
  let lastObservedLagMs = 0;
  // Scheduler pacing is independent of room.cycleSpeed (which is also used by
  // existing network timing). Higher lag targets a slower start-to-start tick
  // cadence; recovery is deliberately gradual to prevent threshold flapping.
  const runSpeedMultipliers = [
    1,
    positiveNumber(env.RANAR_LOAD_RUN_SPEED_MULTIPLIER_75, 1.05),
    positiveNumber(env.RANAR_LOAD_RUN_SPEED_MULTIPLIER_100, 1.1),
    positiveNumber(env.RANAR_LOAD_RUN_SPEED_MULTIPLIER_150, 1.15),
    positiveNumber(env.RANAR_LOAD_RUN_SPEED_MULTIPLIER_200, 1.25),
    positiveNumber(env.RANAR_LOAD_RUN_SPEED_MULTIPLIER_250, 1.35),
  ];
  let runSpeedLevel = 0;
  let runSpeedRecoveryCycles = 0;
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
    100: { durationMs: naturalSpawnPauseMs, since: null, triggered: false },
    150: { durationMs: offscreenCleanupDelayMs, since: null, triggered: false },
    200: { durationMs: onScreenCleanupDelayMs, since: null, triggered: false },
  };
  let naturalSpawnsPaused = false;
  let below100Since = null;
  // Unknown entities are cleaned once per upward crossing of 100ms. Keep this
  // independent from the 10-second natural-spawn pause policy.
  let unknownCleanupLatched = false;
  let unknownCleanupGeneration = 0;
  let unknownCleanupPending = false;
  // Cleanup work is spread across game cycles instead of scanning the entire
  // entity table in one burst. Higher-severity modes share one scan.
  const cleanupBatchSize = Math.max(1, Math.floor(positiveNumber(env.RANAR_LAG_CLEANUP_BATCH_SIZE, 8)));
  const CLEAN_UNKNOWN = 1;
  const CLEAN_OFFSCREEN = 2;
  const CLEAN_ONSCREEN_AND_PROJECTILES = 4;
  const cleanupSweep = {
    active: false,
    cursor: 0,
    end: 0,
    mode: 0,
    lastCompletedMode: 0,
    unknownGeneration: 0,
    nextSweepAt: 0,
    destroyedUnknown: 0,
    destroyedOffscreen: 0,
    destroyedOnscreen: 0,
    destroyedProjectiles: 0,
  };
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
    criticalLagPersistenceMs,
    emergencyLagMs,
    emergencyMitigation: false,
    criticalLagConfirmed: false,
    targetCycleIntervalMs,
    observedCycleIntervalMs,
    runSpeedPercent: currentRunSpeedPercent,
    runSpeedDeficitPercent: 0,
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
        targetCycleIntervalMs,
        observedCycleIntervalMs,
        runSpeedPercent: currentRunSpeedPercent,
        runSpeedDeficitPercent: 100 - currentRunSpeedPercent,
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
      targetCycleIntervalMs,
      observedCycleIntervalMs,
      runSpeedPercent: currentRunSpeedPercent,
      runSpeedDeficitPercent: 100 - currentRunSpeedPercent,
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
    const runSpeedPercent = Number.isFinite(metrics.runSpeedPercent)
      ? metrics.runSpeedPercent
      : currentRunSpeedPercent;
    const growth = metrics.memoryTrendReady && Number.isFinite(metrics.memoryGrowthMb)
      ? metrics.memoryGrowthMb
      : 0;
    if (
      memoryRatio >= criticalMemory ||
      runSpeedPercent <= speedThresholds.critical ||
      growth >= criticalGrowthMb
    ) return 3;
    if (
      memoryRatio >= highMemory ||
      runSpeedPercent <= speedThresholds.high ||
      growth >= highGrowthMb
    ) return 2;
    if (
      memoryRatio >= warningMemory ||
      runSpeedPercent <= speedThresholds.warning ||
      growth >= warningGrowthMb
    ) return 1;
    return 0;
  }

  function updateObservedRunSpeed(cycleMs, cycleStartedAt) {
    const completedAt = nowProvider();
    const startAt = Number.isFinite(cycleStartedAt) ? cycleStartedAt : completedAt - cycleMs;
    if (lastCycleStartedAt === null) {
      // Until there are two start timestamps, use this cycle's cost as a safe
      // initial estimate rather than assuming a slow first tick was healthy.
      observedCycleIntervalMs = Math.max(targetCycleIntervalMs, cycleMs);
    } else {
      const startInterval = Math.max(0, startAt - lastCycleStartedAt);
      // Start-to-start cadence accounts for the previous cycle and its wait;
      // current cycle cost catches an overload before another tick can finish.
      observedCycleIntervalMs = startInterval > 0
        ? Math.max(cycleMs, startInterval)
        : Math.max(targetCycleIntervalMs, cycleMs);
    }
    lastCycleStartedAt = startAt;
    currentRunSpeedPercent = Math.max(
      0,
      Math.min(100, (targetCycleIntervalMs / Math.max(targetCycleIntervalMs, observedCycleIntervalMs)) * 100)
    );
    lastObservedRunSpeedPercent = currentRunSpeedPercent;
    lastMetrics.targetCycleIntervalMs = targetCycleIntervalMs;
    lastMetrics.observedCycleIntervalMs = observedCycleIntervalMs;
    lastMetrics.runSpeedPercent = currentRunSpeedPercent;
    lastMetrics.runSpeedDeficitPercent = 100 - currentRunSpeedPercent;
    return currentRunSpeedPercent;
  }

  function desiredCycleStage(speedPercent) {
    if (speedPercent <= speedThresholds.critical) return 3;
    if (speedPercent <= speedThresholds.high) return 2;
    if (speedPercent <= speedThresholds.warning) return 1;
    return 0;
  }

  function updateCycleStage(speedPercent, allowRecovery) {
    const desired = desiredCycleStage(speedPercent);
    if (desired > cycleStage) {
      cycleStage = desired;
      lowCycleSamples = 0;
    } else if (desired < cycleStage && allowRecovery) {
      lowCycleSamples++;
      if (lowCycleSamples >= 10) {
        lowCycleSamples = 0;
        cycleStage = Math.max(desired, cycleStage - 1);
      }
    } else if (desired >= cycleStage) {
      lowCycleSamples = 0;
    }
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

  function isUnknownLabel(value) {
    return typeof value === "string" && /^(unknown entity|unknown class)$/i.test(value.trim());
  }

  function isUnknownEntity(entity) {
    if (!entity) return false;
    // Avoid allocating a temporary array for each candidate in a stressed server.
    if (isUnknownLabel(entity.label) || isUnknownLabel(entity.name) || isUnknownLabel(entity.type)) return true;
    const state = suspendedEntities.get(entity);
    // A status name may mask the original label during a legacy suspension.
    return !!(state && isUnknownLabel(state.originalName));
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

  function currentCleanupMode() {
    let mode = 0;
    if (unknownCleanupPending) mode |= CLEAN_UNKNOWN;
    if (sustainedPolicies[150].triggered) mode |= CLEAN_OFFSCREEN;
    if (sustainedPolicies[200].triggered) mode |= CLEAN_ONSCREEN_AND_PROJECTILES;
    return mode;
  }

  function destroyProjectileForLoadProtection(entity) {
    if (!entity || !isEntityLive(entity)) return false;
    try {
      if (typeof entity.destroy !== "function") return false;
      suspendedEntities.delete(entity);
      entity.destroy();
      return true;
    } catch (_) {
      return false;
    }
  }

  function inspectCleanupEntity(entity, mode) {
    if (!entity || !isEntityLive(entity)) return;

    // The first sustained low-run-speed policy destroys unknown classes instead
    // of suspending them. KEEP/protected entities remain protected.
    if ((mode & CLEAN_UNKNOWN) && isUnknownEntity(entity)) {
      if (destroyForLoadProtection(entity)) cleanupSweep.destroyedUnknown++;
      return;
    }

    if ((mode & CLEAN_ONSCREEN_AND_PROJECTILES) && isProjectile(entity)) {
      if (destroyProjectileForLoadProtection(entity)) cleanupSweep.destroyedProjectiles++;
      return;
    }

    if (!isNaturalSpawnEntity(entity) || shouldProtectFromNaturalCleanup(entity)) return;
    // Visibility is calculated only for natural entities that passed protection
    // checks; unknown cleanup and projectile cleanup never pay this cost.
    let onScreen = false;
    try { onScreen = !!isEntityOnScreen(entity); } catch (_) { onScreen = false; }

    if ((mode & CLEAN_ONSCREEN_AND_PROJECTILES) && onScreen) {
      if (destroyForLoadProtection(entity)) cleanupSweep.destroyedOnscreen++;
    } else if ((mode & CLEAN_OFFSCREEN) && !onScreen) {
      if (destroyForLoadProtection(entity)) cleanupSweep.destroyedOffscreen++;
    }
  }

  function finishCleanupSweep(now) {
    const counts = cleanupSweep;
    const total = counts.destroyedUnknown + counts.destroyedOffscreen +
      counts.destroyedOnscreen + counts.destroyedProjectiles;
    if (total > 0) {
      const parts = [];
      if (counts.destroyedUnknown) parts.push(counts.destroyedUnknown + " unknown");
      if (counts.destroyedOffscreen) parts.push(counts.destroyedOffscreen + " off-screen natural");
      if (counts.destroyedOnscreen) parts.push(counts.destroyedOnscreen + " on-screen natural");
      if (counts.destroyedProjectiles) parts.push(counts.destroyedProjectiles + " projectiles");
      callEntityChange(null, false, {
        reason: "load protection cleanup removed " + parts.join(", "),
        destroyedCount: total,
        cycleMs: lastCycleMs,
      });
    }
    cleanupSweep.lastCompletedMode = cleanupSweep.mode;
    if ((cleanupSweep.mode & CLEAN_UNKNOWN) && cleanupSweep.unknownGeneration === unknownCleanupGeneration) {
      unknownCleanupPending = false;
    }
    cleanupSweep.active = false;
    cleanupSweep.cursor = 0;
    cleanupSweep.end = 0;
    cleanupSweep.mode = 0;
    cleanupSweep.nextSweepAt = now + cleanupIntervalMs;
    cleanupSweep.destroyedUnknown = 0;
    cleanupSweep.destroyedOffscreen = 0;
    cleanupSweep.destroyedOnscreen = 0;
    cleanupSweep.destroyedProjectiles = 0;
  }

  function processCleanupSweep(entityList, now = nowProvider()) {
    const list = Array.isArray(entityList) ? entityList : getEntities();
    const requestedMode = currentCleanupMode();

    if (cleanupSweep.active) {
      // If a stricter policy activates mid-scan, restart once so entities already
      // visited by the weaker policy are also checked by the new rule.
      const expandedMode = cleanupSweep.mode | requestedMode;
      if (expandedMode !== cleanupSweep.mode) {
        cleanupSweep.mode = expandedMode;
        if (expandedMode & CLEAN_UNKNOWN) cleanupSweep.unknownGeneration = unknownCleanupGeneration;
        cleanupSweep.cursor = 0;
        cleanupSweep.end = list.length;
        cleanupSweep.destroyedUnknown = 0;
        cleanupSweep.destroyedOffscreen = 0;
        cleanupSweep.destroyedOnscreen = 0;
        cleanupSweep.destroyedProjectiles = 0;
      }
    } else if (requestedMode && (
      (requestedMode & CLEAN_UNKNOWN) !== 0 ||
      now >= cleanupSweep.nextSweepAt || (requestedMode & ~cleanupSweep.lastCompletedMode) !== 0
    )) {
      cleanupSweep.active = true;
      cleanupSweep.cursor = 0;
      cleanupSweep.end = list.length;
      cleanupSweep.mode = requestedMode;
      cleanupSweep.unknownGeneration = unknownCleanupGeneration;
      cleanupSweep.destroyedUnknown = 0;
      cleanupSweep.destroyedOffscreen = 0;
      cleanupSweep.destroyedOnscreen = 0;
      cleanupSweep.destroyedProjectiles = 0;
    }

    if (!cleanupSweep.active) return;

    let inspected = 0;
    const end = Math.min(cleanupSweep.end, list.length);
    while (cleanupSweep.cursor < end && inspected < cleanupBatchSize) {
      const entity = list[cleanupSweep.cursor++];
      inspected++;
      inspectCleanupEntity(entity, cleanupSweep.mode);
    }

    if (cleanupSweep.cursor >= cleanupSweep.end || cleanupSweep.cursor >= list.length) {
      finishCleanupSweep(now);
    }
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


  function updateSustainedLagPolicies(runSpeedPercent, forceAll = false) {
    const now = nowProvider();
    const finiteSpeed = Number.isFinite(runSpeedPercent)
      ? Math.max(0, Math.min(100, runSpeedPercent))
      : 100;
    const lag100 = sustainedPolicies[100];
    const lag150 = sustainedPolicies[150];
    const lag200 = sustainedPolicies[200];

    if (forceAll) {
      // At extreme load, bypass the normal 10s/15s grace periods and activate
      // every policy in the same simulation cycle.
      if (!unknownCleanupLatched) {
        unknownCleanupLatched = true;
        unknownCleanupPending = true;
        unknownCleanupGeneration++;
      }
      for (const policy of [lag100, lag150, lag200]) {
        if (policy.since === null) policy.since = now - policy.durationMs;
        policy.triggered = true;
      }
      naturalSpawnsPaused = true;
      below100Since = null;
      lastMetrics.naturalSpawnsPaused = true;
      lastMetrics.lagPolicy100Triggered = true;
      lastMetrics.lagPolicy150Triggered = true;
      lastMetrics.lagPolicy200Triggered = true;
      lastMetrics.emergencyMitigation = true;
      return;
    }

    lastMetrics.emergencyMitigation = false;

    // Unknown-entity cleanup normally waits for sustained low speed. The
    // extreme-load branch above is the explicit exception, and it still runs
    // only once per sustained episode.
    if (finiteSpeed <= speedThresholds[100]) {
      below100Since = null;
      if (lag100.since === null) lag100.since = now;
      if (now - lag100.since >= lag100.durationMs) {
        if (!unknownCleanupLatched) {
          unknownCleanupLatched = true;
          unknownCleanupPending = true;
          unknownCleanupGeneration++;
        }
        lag100.triggered = true;
        if (!naturalSpawnsPaused) {
          naturalSpawnsPaused = true;
          callEntityChange(null, false, {
            reason: "server run speed stayed at or below " + Math.round(speedThresholds[100]) + "% of target for " + Math.round(naturalSpawnPauseMs / 1000) + "s; natural spawning and food paused",
            cycleMs: lastCycleMs,
            runSpeedPercent: currentRunSpeedPercent,
          });
        }
      }
    } else {
      unknownCleanupLatched = false;
      lag100.since = null;
      lag100.triggered = false;
      if (naturalSpawnsPaused) {
        if (below100Since === null) below100Since = now;
        if (now - below100Since >= policyRecoveryMs) {
          naturalSpawnsPaused = false;
          below100Since = null;
          restoreSuspendedEntities("server run speed recovered above " + Math.round(speedThresholds[100]) + "% for " + Math.round(policyRecoveryMs / 1000) + "s", "unknown");
          callEntityChange(null, false, {
            reason: "server run speed recovered; natural bot/entity spawning and food resumed",
            cycleMs: lastCycleMs,
            runSpeedPercent: currentRunSpeedPercent,
          });
        }
      } else {
        below100Since = null;
      }
    }

    if (finiteSpeed <= speedThresholds[150]) {
      if (lag150.since === null) lag150.since = now;
      if (now - lag150.since >= lag150.durationMs) lag150.triggered = true;
    } else {
      lag150.since = null;
      lag150.triggered = false;
    }

    if (finiteSpeed <= speedThresholds[200]) {
      if (lag200.since === null) lag200.since = now;
      if (now - lag200.since >= lag200.durationMs) lag200.triggered = true;
    } else {
      lag200.since = null;
      lag200.triggered = false;
    }

    lastMetrics.naturalSpawnsPaused = naturalSpawnsPaused;
    lastMetrics.lagPolicy100Triggered = lag100.triggered;
    lastMetrics.lagPolicy150Triggered = lag150.triggered;
    lastMetrics.lagPolicy200Triggered = lag200.triggered;
  }

  function handleCriticalLag(runSpeedPercent, entityList, reason, forceImmediate = false) {
    const now = nowProvider();
    lastObservedRunSpeedPercent = Number.isFinite(runSpeedPercent)
      ? Math.max(0, Math.min(100, runSpeedPercent))
      : 100;

    if (!forceImmediate && lastObservedRunSpeedPercent > speedThresholds.critical) {
      criticalLagSince = null;
      if (suspensionLockout) {
        suspensionLockout = false;
        callEntityChange(null, false, {
          reason: "server run speed recovered above " + Math.round(speedThresholds.critical) + "% of target; entity-suspension lockout cleared",
          cycleMs: lastCycleMs,
          runSpeedPercent: lastObservedRunSpeedPercent,
        });
      }
      if (suspensionEpisodeStartedAt !== null) {
        suspensionEpisodeStartedAt = null;
        lastEntitySuspensionAt = null;
        restoreSuspendedEntities("server run speed recovered above " + Math.round(speedThresholds.critical) + "% of target", "critical");
      }
      return;
    }

    if (suspensionLockout && !forceImmediate) return;

    if (forceImmediate) {
      // Treat the persistence window as satisfied immediately. This also makes
      // the emergency visible in the status snapshot without another sample.
      criticalLagSince = now - criticalLagPersistenceMs;
      suspensionLockout = false;
    } else if (criticalLagSince === null) {
      criticalLagSince = now;
    }
    if (!forceImmediate && now - criticalLagSince < criticalLagPersistenceMs) return;

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
        "server run speed stayed at or below " + Math.round(speedThresholds.critical) + "% of target for " + Math.round(suspensionWindowMs / 1000) + " seconds",
        "critical"
      );
      suspensionEpisodeStartedAt = null;
      lastEntitySuspensionAt = null;
      suspensionLockout = true;
      callEntityChange(null, false, {
        reason: "server run speed stayed at or below " + Math.round(speedThresholds.critical) + "% of target for " +
          Math.round(suspensionWindowMs / 1000) +
          " seconds; restoring all entities and locking out further suspensions until speed recovers",
        cycleMs: lastCycleMs,
        runSpeedPercent: lastObservedRunSpeedPercent,
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
    target.criticalLagPersistenceMs = criticalLagPersistenceMs;
    target.criticalLagConfirmed = criticalLagSince !== null &&
      nowProvider() - criticalLagSince >= criticalLagPersistenceMs;
    target.loadObservedLagMs = lastObservedLagMs;
    target.targetCycleIntervalMs = targetCycleIntervalMs;
    target.observedCycleIntervalMs = observedCycleIntervalMs;
    target.runSpeedPercent = lastObservedRunSpeedPercent;
    target.runSpeedDeficitPercent = 100 - lastObservedRunSpeedPercent;
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

  function desiredRunSpeedLevel(lagMs) {
    let desired = 0;
    for (let i = 0; i < RUN_SPEED_THRESHOLDS_MS.length; i++) {
      if (lagMs >= RUN_SPEED_THRESHOLDS_MS[i]) desired = i + 1;
      else break;
    }
    return desired;
  }

  function updateRunSpeed(lagMs, allowRecovery) {
    const safeLagMs = Number.isFinite(lagMs) && lagMs >= 0 ? lagMs : 0;
    const desired = desiredRunSpeedLevel(safeLagMs);
    if (desired > runSpeedLevel) {
      // Escalate immediately when lag worsens.
      runSpeedLevel = desired;
      runSpeedRecoveryCycles = 0;
      return;
    }
    if (desired < runSpeedLevel && allowRecovery) {
      // One step faster after ten consecutive healthy simulation cycles.
      runSpeedRecoveryCycles++;
      if (runSpeedRecoveryCycles >= 10) {
        runSpeedLevel = Math.max(desired, runSpeedLevel - 1);
        runSpeedRecoveryCycles = 0;
      }
      return;
    }
    if (desired >= runSpeedLevel) runSpeedRecoveryCycles = 0;
  }

  function getRunSpeedMultiplier() {
    return runSpeedMultipliers[runSpeedLevel] || 1;
  }

  function getRecommendedCycleIntervalMs(baseIntervalMs) {
    const base = positiveNumber(baseIntervalMs, 1000 / 30);
    return base * getRunSpeedMultiplier();
  }

  function isExtremeLoad(observedLagMs, metrics = lastMetrics) {
    const safeMetrics = metrics || {};
    const memoryAtCriticalLimit = Number.isFinite(safeMetrics.memoryRatio) &&
      safeMetrics.memoryRatio >= criticalMemory;
    const growthAtCriticalLimit = safeMetrics.memoryTrendReady === true &&
      Number.isFinite(safeMetrics.memoryGrowthMb) &&
      safeMetrics.memoryGrowthMb >= criticalGrowthMb;
    const extremeCycleCadence = Number.isFinite(observedCycleIntervalMs) &&
      observedCycleIntervalMs >= emergencyLagMs;
    return (Number.isFinite(observedLagMs) && observedLagMs >= emergencyLagMs) ||
      extremeCycleCadence || memoryAtCriticalLimit || growthAtCriticalLimit;
  }

  function reportCycle(durationMs, entityList, cycleStartedAt) {
    const cycleMs = Number(durationMs);
    if (!Number.isFinite(cycleMs) || cycleMs < 0) return getSnapshot();
    const previousEffective = effectiveStage();
    lastCycleMs = cycleMs;
    cycleIndex++;

    // Run-speed protection uses actual completed-cycle cadence. The separate
    // automatic scheduler still reacts immediately to cycle/event-loop ms.
    const runSpeedPercent = updateObservedRunSpeed(cycleMs, cycleStartedAt);
    const sampledP95 = Number(lastMetrics.eventLoopP95Ms) || 0;
    const observedLagMs = Math.max(cycleMs, sampledP95);
    lastObservedLagMs = observedLagMs;
    updateRunSpeed(observedLagMs, true);
    updateCycleStage(runSpeedPercent, true);

    const reason = "server run speed fell to " + Math.round(runSpeedPercent) + "% of target";
    const emergency = isExtremeLoad(observedLagMs, lastMetrics);
    // Advance existing fades before episode transitions. In particular, the
    // 60-second cutoff must see the latest opacity of a just-disabled entity.
    advanceEntityTransitions(nowProvider());
    const liveEntities = entityList || getEntities();
    updateSustainedLagPolicies(runSpeedPercent, emergency);
    handleCriticalLag(runSpeedPercent, liveEntities, reason, emergency);
    processCleanupSweep(liveEntities, nowProvider());
    advanceEntityTransitions(nowProvider());

    // Keep the sampled telemetry current without storing entity references in history.
    lastMetrics = Object.assign({}, lastMetrics, {
      cycleMs: lastCycleMs,
      cycleStage,
      stage,
      stageName: STAGE_NAMES[effectiveStage()],
      targetCycleIntervalMs,
      observedCycleIntervalMs,
      runSpeedPercent: currentRunSpeedPercent,
      runSpeedDeficitPercent: 100 - currentRunSpeedPercent,
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
    // Instrumentation backs off as load rises. The previous version sampled up
    // to half of all entity updates while already lagging, creating feedback.
    const interval = currentStage >= 3 ? 512 : currentStage >= 2 ? 256 : currentStage === 1 ? 128 : 64;
    return (profileCounter + cycleIndex) % interval === 0;
  }

  function shouldProfileCollision() {
    const currentStage = effectiveStage();
    collisionProfileCounter++;
    // Collision counts can be enormous, so sample much more sparsely under load.
    const interval = currentStage >= 3 ? 512 : currentStage >= 2 ? 256 : currentStage === 1 ? 128 : 64;
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

    // Event-loop delay remains an input to automatic scheduler pacing. Entity
    // suspension and other mitigation policies use the measured run-speed below.
    const sampledP95 = Number.isFinite(metrics.eventLoopP95Ms) ? metrics.eventLoopP95Ms : 0;
    const observedLagMs = Math.max(sampledP95, lastCycleMs);
    lastObservedLagMs = observedLagMs;
    // Sampling can immediately slow the loop further, but it cannot speed it
    // back up: recovery is counted only on completed simulation cycles.
    updateRunSpeed(observedLagMs, false);
    const previousDelayEffective = effectiveStage();
    // The sample timer may observe memory/event-loop stress, but destructive and
    // spawn policies are driven by the latest measured simulation throughput.
    updateCycleStage(currentRunSpeedPercent, false);
    const reason = "server run speed stayed at " + Math.round(currentRunSpeedPercent) + "% of target";
    const emergency = isExtremeLoad(observedLagMs, metrics);
    advanceEntityTransitions(nowProvider());
    const liveEntities = getEntities();
    updateSustainedLagPolicies(currentRunSpeedPercent, emergency);
    handleCriticalLag(currentRunSpeedPercent, liveEntities, reason, emergency);
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
    snapshot.targetCycleIntervalMs = targetCycleIntervalMs;
    snapshot.observedCycleIntervalMs = observedCycleIntervalMs;
    snapshot.runSpeedPercent = currentRunSpeedPercent;
    snapshot.runSpeedDeficitPercent = 100 - currentRunSpeedPercent;
    snapshot.runSpeedThresholds = Object.assign({}, speedThresholds);
    snapshot.runSpeedLevel = runSpeedLevel;
    snapshot.emergencyLagMs = emergencyLagMs;
    snapshot.runSpeedMultiplier = getRunSpeedMultiplier();
    snapshot.targetTickRatePercent = Math.round(100 / getRunSpeedMultiplier());
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
    getRunSpeedMultiplier,
    getRecommendedCycleIntervalMs,
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
