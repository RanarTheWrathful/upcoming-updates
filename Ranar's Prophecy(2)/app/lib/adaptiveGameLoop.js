"use strict";

const { performance } = require("perf_hooks");

function positiveInterval(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Runs a synchronous simulation callback without overlapping or catch-up bursts.
 * `getMultiplier` returns a load-based slowdown factor. In normal operation,
 * callback runtime is subtracted from the base interval to preserve the original
 * cadence. Under load, an extra idle gap is proportional to both the slowdown
 * factor and the callback runtime, so overlong cycles do not run back-to-back.
 */
function createAdaptiveGameLoop(options = {}) {
  if (typeof options.run !== "function") {
    throw new TypeError("createAdaptiveGameLoop requires a run function");
  }

  const run = options.run;
  const baseIntervalMs = positiveInterval(options.baseIntervalMs, 1000 / 30);
  const getMultiplier = typeof options.getMultiplier === "function"
    ? options.getMultiplier
    : () => 1;
  const now = typeof options.nowProvider === "function"
    ? options.nowProvider
    : () => performance.now();
  const scheduleTimeout = options.setTimeoutFn || setTimeout;
  const cancelTimeout = options.clearTimeoutFn || clearTimeout;

  let timer = null;
  let started = false;
  let running = false;

  function schedule(delayMs) {
    if (!started) return;
    timer = scheduleTimeout(tick, Math.max(0, delayMs));
    if (timer && typeof timer.unref === "function" && options.unref === true) {
      timer.unref();
    }
  }

  function tick() {
    timer = null;
    if (!started || running) return;

    running = true;
    const startedAt = now();
    let thrown = null;
    try {
      run();
    } catch (error) {
      thrown = error;
    } finally {
      const elapsed = Math.max(0, now() - startedAt);
      running = false;
      if (started) {
        let multiplier = 1;
        try {
          const requested = Number(getMultiplier());
          if (Number.isFinite(requested) && requested >= 1) multiplier = requested;
        } catch (_) {
          // A failed telemetry read must not strand the simulation timer.
        }
        const baselineDelay = Math.max(0, baseIntervalMs - elapsed);
        const loadDelay = (multiplier - 1) * Math.max(baseIntervalMs, elapsed);
        schedule(baselineDelay + loadDelay);
      }
    }

    if (thrown) throw thrown;
  }

  function start() {
    if (started) return;
    started = true;
    schedule(baseIntervalMs);
  }

  function stop() {
    started = false;
    if (timer !== null) {
      cancelTimeout(timer);
      timer = null;
    }
  }

  return {
    start,
    stop,
    get started() { return started; },
    get running() { return running; },
  };
}

module.exports = createAdaptiveGameLoop;
