"use strict";

const assert = require("assert");
const createAdaptiveGameLoop = require("../lib/adaptiveGameLoop");

let now = 0;
let scheduled = [];
let callbackCount = 0;
const loop = createAdaptiveGameLoop({
  run() { callbackCount++; now += 5; },
  baseIntervalMs: 30,
  getMultiplier: () => 2,
  nowProvider: () => now,
  setTimeoutFn(fn, delay) { scheduled.push({ fn, delay }); return scheduled.length; },
  clearTimeoutFn() {},
});
loop.start();
assert.strictEqual(scheduled.length, 1);
assert.strictEqual(scheduled[0].delay, 30);
scheduled.shift().fn();
assert.strictEqual(callbackCount, 1);
assert.strictEqual(scheduled[0].delay, (30 - 5) + (2 - 1) * 30);
loop.stop();
console.log("adaptiveGameLoop tests passed");
