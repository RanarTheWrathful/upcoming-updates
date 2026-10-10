"use strict";

const assert = require("assert");
const createAdaptiveGameLoop = require("../lib/adaptiveGameLoop");

let currentTime = 0;
let nextTimerId = 1;
const timers = new Map();
const scheduledDelays = [];
const timerApi = {
  setTimeoutFn(callback, delay) {
    const id = nextTimerId++;
    const item = { id, callback, delay, cleared: false };
    timers.set(id, item);
    scheduledDelays.push(delay);
    return item;
  },
  clearTimeoutFn(item) {
    if (item) {
      item.cleared = true;
      timers.delete(item.id);
    }
  },
};
function fireNext() {
  const next = Array.from(timers.values()).find((item) => !item.cleared);
  assert.ok(next, "a next timer should be scheduled");
  timers.delete(next.id);
  next.callback();
  return next;
}

let simulatedWorkMs = 10;
let slowdownMultiplier = 1;
let runCount = 0;
const scheduler = createAdaptiveGameLoop({
  run() {
    runCount++;
    currentTime += simulatedWorkMs;
  },
  getMultiplier: () => slowdownMultiplier,
  baseIntervalMs: 33,
  nowProvider: () => currentTime,
  setTimeoutFn: timerApi.setTimeoutFn,
  clearTimeoutFn: timerApi.clearTimeoutFn,
});

scheduler.start();
assert.strictEqual(timers.size, 1, "start schedules only one timer");
assert.strictEqual(scheduledDelays[0], 33, "first tick waits for the base cadence");
fireNext();
assert.strictEqual(runCount, 1);
assert.strictEqual(scheduledDelays[1], 23, "runtime is subtracted to preserve a 33ms start-to-start cadence");

// A slowdown doubles the effective target cadence while retaining one timer.
slowdownMultiplier = 2;
fireNext();
assert.strictEqual(runCount, 2);
assert.strictEqual(scheduledDelays[2], 56, "load adds an idle gap after the normal cadence wait");

// If a tick takes longer than the base period, load pacing still adds a gap
// proportional to the work duration rather than letting overdue ticks run back-to-back.
simulatedWorkMs = 80;
fireNext();
assert.strictEqual(runCount, 3);
assert.strictEqual(scheduledDelays[3], 80, "slow ticks receive proportional idle time to reduce run speed");
assert.strictEqual(timers.size, 1, "only one future tick is queued");

scheduler.stop();
assert.strictEqual(timers.size, 0, "stop cancels the outstanding tick timer");
assert.strictEqual(scheduler.started, false);
console.log("Adaptive game-loop tests passed.");
