"use strict";

const fs = require("fs");
const v8 = require("v8");
const { monitorEventLoopDelay } = require("perf_hooks");

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
  const intervalMs = positiveNumber(env.RANAR_LOAD_SAMPLE_MS, 1000);
  const warningMemory = positiveNumber(env.RANAR_LOAD_WARNING_MEMORY, 0.75);
  const highMemory = positiveNumber(env.RANAR_LOAD_HIGH_MEMORY, 0.86);
  const criticalMemory = positiveNumber(env.RANAR_LOAD_CRITICAL_MEMORY, 0.94);
  const warningDelayMs = positiveNumber(env.RANAR_LOAD_WARNING_DELAY_MS, 50);
  const highDelayMs = positiveNumber(env.RANAR_LOAD_HIGH_DELAY_MS, 100);
  const criticalDelayMs = positiveNumber(env.RANAR_LOAD_CRITICAL_DELAY_MS, 250);
  const warningGrowthMb = positiveNumber(env.RANAR_LOAD_WARNING_GROWTH_MB, 64);
  const highGrowthMb = positiveNumber(env.RANAR_LOAD_HIGH_GROWTH_MB, 128);
  const criticalGrowthMb = positiveNumber(env.RANAR_LOAD_CRITICAL_GROWTH_MB, 256);
  const trendWindowValue = Math.floor(positiveNumber(env.RANAR_LOAD_TREND_SAMPLES, 30));
  const trendWindowSamples = Math.max(10, Math.min(300, trendWindowValue));
  const memoryHistory = [];
  const memoryLimitBytes = options.memoryLimitBytes === undefined
    ? detectMemoryLimitBytes(env)
    : options.memoryLimitBytes;

  const delayMonitor = options.delayMonitor || monitorEventLoopDelay({ resolution: 20 });
  let timer = null;
  let running = false;
  let stage = 0;
  let candidateStage = 0;
  let candidateSamples = 0;
  let recoverySamples = 0;
  let minimapTick = 0;
  let foodSpawnTick = 0;
  let botSpawnTick = 0;
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
    const growth = metrics.memoryTrendReady && Number.isFinite(metrics.memoryGrowthMb)
      ? metrics.memoryGrowthMb
      : 0;
    if (
      memoryRatio >= criticalMemory ||
      p95 >= criticalDelayMs ||
      growth >= criticalGrowthMb
    ) return 3;
    if (memoryRatio >= highMemory || p95 >= highDelayMs || growth >= highGrowthMb) return 2;
    if (memoryRatio >= warningMemory || p95 >= warningDelayMs || growth >= warningGrowthMb) return 1;
    return 0;
  }

  function transition(nextStage, metrics) {
    const previous = stage;
    stage = nextStage;
    candidateStage = stage;
    candidateSamples = 0;
    recoverySamples = 0;
    minimapTick = 0;
    foodSpawnTick = 0;
    botSpawnTick = 0;
    lastMetrics = Object.assign({}, metrics, {
      stage,
      stageName: STAGE_NAMES[stage],
      sampledAt: Date.now(),
    });
    try {
      onStageChange(previous, stage, getSnapshot());
    } catch (_) {
      // Monitoring must never crash the game server.
    }
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
      stageName: STAGE_NAMES[stage],
      sampledAt: Date.now(),
    });

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

  function getSnapshot() {
    return Object.assign({}, lastMetrics, {
      stage,
      stageName: STAGE_NAMES[stage],
      memoryRatio: Number.isFinite(lastMetrics.memoryRatio) ? lastMetrics.memoryRatio : 0,
    });
  }

  function shouldUpdateMinimap() {
    minimapTick++;
    const interval = stage >= 3 ? 10 : stage === 2 ? 5 : stage === 1 ? 2 : 1;
    return minimapTick % interval === 0;
  }

  function shouldSpawnFood() {
    if (stage >= 3) return false;
    if (stage < 2) return true;
    foodSpawnTick++;
    return foodSpawnTick % 2 === 0;
  }

  function shouldSpawnBot() {
    if (stage >= 3) return false;
    if (stage < 2) return true;
    botSpawnTick++;
    return botSpawnTick % 2 === 0;
  }

  return {
    start,
    stop,
    sample,
    get stage() { return stage; },
    isCritical: () => stage >= 3,
    getSnapshot,
    shouldUpdateMinimap,
    shouldSpawnFood,
    shouldSpawnBot,
  };
}

module.exports = createLoadProtection;
module.exports.detectMemoryLimitBytes = detectMemoryLimitBytes;
