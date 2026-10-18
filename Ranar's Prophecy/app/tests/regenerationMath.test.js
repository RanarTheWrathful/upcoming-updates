"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const sourcePath = path.join(__dirname, "..", "server.js");
const source = fs.readFileSync(sourcePath, "utf8");
const start = source.indexOf("class HealthType {");
const end = source.indexOf("\nclass Entity {", start);
assert(start !== -1 && end > start, "HealthType source should be present");
const classSource = source.slice(start, end) + "\nmodule.exports = { HealthType };\n";
const context = {
  module: { exports: {} }, exports: {},
  util: { clamp: (value, min, max) => Math.max(min, Math.min(max, value)) },
  Math, Number,
};
vm.runInNewContext(classSource, context, { filename: sourcePath });
const { HealthType } = context.module.exports;

{
  const health = new HealthType(100, "static");
  health.amount = 50;
  health.regenerate(false, 1);
  assert(health.amount > 50, "positive health REGEN should heal");
  health.amount = 100;
  health.regenerate(false, 1);
  assert.strictEqual(health.amount, 100, "health should not exceed its maximum");
}
{
  const health = new HealthType(100, "static");
  health.amount = 50;
  health.regenerate(false, 0);
  assert.strictEqual(health.amount, 50, "zero REGEN should do nothing");
  health.regenerate(false, -1);
  assert(health.amount < 50, "negative health REGEN should drain health");
  health.amount = 0.001;
  health.regenerate(false, -1000);
  assert.strictEqual(health.amount, 0, "health drain should clamp at zero");
}
{
  const shield = new HealthType(100, "dynamic");
  shield.regen = 0.05;
  shield.amount = 50;
  shield.regenerate(false, 1);
  assert(shield.amount > 50, "positive shield REGEN should replenish shield");
  shield.regen = -0.05;
  const before = shield.amount;
  shield.regenerate(false, -1);
  assert(shield.amount < before, "negative shield REGEN should drain shield");
  shield.amount = 0.001;
  shield.regenerate(false, -1000);
  assert.strictEqual(shield.amount, 0, "shield drain should clamp at zero");
}
{
  const health = new HealthType(100, "static");
  health.amount = 150;
  health.regenerate(false, 1);
  assert.strictEqual(health.amount, 100, "resource should be clamped to maximum");
}
console.log("Regeneration math tests passed.");
