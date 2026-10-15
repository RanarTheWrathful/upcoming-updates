"use strict";

const assert = require("assert");
const createOffscreenTransientCleanup = require("../lib/offscreenTransientCleanup");

function makeEntity(overrides = {}) {
  const entity = Object.assign({
    type: "bullet",
    isProjectile: true,
    label: "Bullet",
    alive: true,
    destroyed: false,
    valid() { return this.alive; },
    destroy() { this.destroyed = true; this.alive = false; },
  }, overrides);
  return entity;
}

// An unseen projectile is not destroyed before the five-second delay, then is destroyed.
{
  let visible = false;
  const cleaner = createOffscreenTransientCleanup({ isVisibleToAnyClient: () => visible, delayMs: 5000 });
  const projectile = makeEntity();
  assert.strictEqual(cleaner.check(projectile, 0), false);
  assert.strictEqual(cleaner.check(projectile, 4999), false);
  assert.strictEqual(projectile.destroyed, false);
  assert.strictEqual(cleaner.check(projectile, 5000), true);
  assert.strictEqual(projectile.destroyed, true);
}

// Visibility at any point resets the unseen timer.
{
  let visible = false;
  const cleaner = createOffscreenTransientCleanup({ isVisibleToAnyClient: () => visible, delayMs: 5000 });
  const projectile = makeEntity();
  cleaner.check(projectile, 0);
  visible = true;
  cleaner.check(projectile, 4000);
  visible = false;
  cleaner.check(projectile, 4500);
  assert.strictEqual(cleaner.check(projectile, 9499), false);
  assert.strictEqual(cleaner.check(projectile, 9500), true);
}

// Aura labels and atmosphere entities are also cleaned, while ordinary tanks are untouched.
{
  const cleaner = createOffscreenTransientCleanup({ isVisibleToAnyClient: () => false, delayMs: 5000 });
  const aura = makeEntity({ type: "atmosphere", isProjectile: false, label: "Aura" });
  const atmosphericEffect = makeEntity({ type: "atmosphere", isProjectile: false, label: "Hollow Digon" });
  const tank = makeEntity({ type: "tank", isProjectile: false, label: "Tank" });
  for (const entity of [aura, atmosphericEffect, tank]) cleaner.check(entity, 0);
  assert.strictEqual(cleaner.check(aura, 5000), true);
  assert.strictEqual(cleaner.check(atmosphericEffect, 5000), true);
  assert.strictEqual(cleaner.check(tank, 5000), false);
  assert.strictEqual(tank.destroyed, false);
}

// A normal death makes cleanup bookkeeping harmless; failed destroy calls can be retried.
{
  const cleaner = createOffscreenTransientCleanup({ isVisibleToAnyClient: () => false, delayMs: 5000 });
  const alreadyDead = makeEntity({ alive: false });
  assert.strictEqual(cleaner.check(alreadyDead, 0), false);
  let attempts = 0;
  const retry = makeEntity({ destroy() { attempts++; if (attempts > 1) this.alive = false; else throw new Error("temporary failure"); } });
  cleaner.check(retry, 0);
  assert.strictEqual(cleaner.check(retry, 5000), false);
  assert.strictEqual(cleaner.check(retry, 10000), true);
}

console.log("Offscreen transient cleanup tests passed");
