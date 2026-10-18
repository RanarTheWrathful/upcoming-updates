"use strict";

const assert = require("assert");
const createOffscreenTransientCleanup = require("../lib/offscreenTransientCleanup");
const isVisibleToAnyClient = require("../lib/clientVisibility");

assert.strictEqual(
  createOffscreenTransientCleanup({}).delayMs,
  2500,
  "the default off-screen transient lifetime is 2.5 seconds"
);

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

// An unseen projectile is not destroyed before the 2.5-second delay, then is destroyed.
{
  let visible = false;
  const cleaner = createOffscreenTransientCleanup({ isVisibleToAnyClient: () => visible, delayMs: 2500 });
  const projectile = makeEntity();
  assert.strictEqual(cleaner.check(projectile, 0), false);
  assert.strictEqual(cleaner.check(projectile, 2499), false);
  assert.strictEqual(projectile.destroyed, false);
  assert.strictEqual(cleaner.check(projectile, 2500), true);
  assert.strictEqual(projectile.destroyed, true);
}

// Visibility at any point resets the unseen timer.
{
  let visible = false;
  const cleaner = createOffscreenTransientCleanup({ isVisibleToAnyClient: () => visible, delayMs: 2500 });
  const projectile = makeEntity();
  cleaner.check(projectile, 0);
  visible = true;
  cleaner.check(projectile, 2000);
  visible = false;
  cleaner.check(projectile, 2200);
  assert.strictEqual(cleaner.check(projectile, 4699), false);
  assert.strictEqual(cleaner.check(projectile, 4700), true);
}

// Projectiles and explicitly labelled auras are cleaned; unrelated atmosphere entities are untouched.
{
  const cleaner = createOffscreenTransientCleanup({ isVisibleToAnyClient: () => false, delayMs: 2500 });
  const aura = makeEntity({ type: "atmosphere", isProjectile: false, label: "Aura" });
  const atmosphericEffect = makeEntity({ type: "atmosphere", isProjectile: false, label: "Hollow Digon" });
  const tank = makeEntity({ type: "tank", isProjectile: false, label: "Tank" });
  for (const entity of [aura, atmosphericEffect, tank]) cleaner.check(entity, 0);
  assert.strictEqual(cleaner.check(aura, 2500), true);
  assert.strictEqual(cleaner.check(atmosphericEffect, 5000), false, "non-aura atmosphere entities are not transient cleanup targets");
  assert.strictEqual(atmosphericEffect.destroyed, false);
  assert.strictEqual(cleaner.check(tank, 5000), false);
  assert.strictEqual(tank.destroyed, false);
}

// A normal death makes cleanup bookkeeping harmless; failed destroy calls can be retried.
{
  const cleaner = createOffscreenTransientCleanup({ isVisibleToAnyClient: () => false, delayMs: 2500 });
  const alreadyDead = makeEntity({ alive: false });
  assert.strictEqual(cleaner.check(alreadyDead, 0), false);
  let attempts = 0;
  const retry = makeEntity({ destroy() { attempts++; if (attempts > 1) this.alive = false; else throw new Error("temporary failure"); } });
  cleaner.check(retry, 0);
  assert.strictEqual(cleaner.check(retry, 2500), false);
  assert.strictEqual(cleaner.check(retry, 5000), true);
}


// An indeterminate visibility result or visibility exception resets the timer rather than causing deletion.
{
  let visibility = false;
  const cleaner = createOffscreenTransientCleanup({
    isVisibleToAnyClient: () => {
      if (visibility === "throw") throw new Error("view unavailable");
      return visibility;
    },
    delayMs: 2500,
  });
  const projectile = makeEntity();
  cleaner.check(projectile, 0);
  visibility = null;
  cleaner.check(projectile, 2000);
  visibility = false;
  assert.strictEqual(cleaner.check(projectile, 4499), false, "unknown visibility must restart the unseen timer");
  visibility = "throw";
  cleaner.check(projectile, 4500);
  visibility = false;
  assert.strictEqual(cleaner.check(projectile, 6999), false, "visibility errors must restart the unseen timer");
  assert.strictEqual(cleaner.check(projectile, 9498), false);
  assert.strictEqual(cleaner.check(projectile, 9499), true);
}

// Client visibility uses the drawn view, includes valid views without hasSpawned, and ignores closed sockets.
{
  const entity = { x: 40, y: 0, size: 10, settings: { drawShape: true } };
  const activeView = {
    x: 0, y: 0, fov: 100,
    socket: { readyState: 1, status: { hasSpawned: false } },
    visibleEntity: new Set(),
  };
  assert.strictEqual(isVisibleToAnyClient(entity, [activeView]), true, "currently drawable entities count as visible even before hasSpawned is set");
  assert.strictEqual(isVisibleToAnyClient({ x: 500, y: 500, size: 1, settings: { drawShape: true } }, [activeView]), false);
  assert.strictEqual(isVisibleToAnyClient({ x: 40, y: 0, size: 10, settings: { drawShape: false } }, [activeView]), false,
    "entities the renderer does not draw are not considered visible");
  activeView.visibleEntity.add(entity);
  assert.strictEqual(isVisibleToAnyClient({ x: 500, y: 500, size: 1 }, [activeView]), false, "unrelated visible-set entries do not affect another entity");
  activeView.visibleEntity.add({ x: 500, y: 500 });
  assert.strictEqual(isVisibleToAnyClient(entity, [Object.assign({}, activeView, { socket: { readyState: 3 } })]), false, "closed client views do not count");
  assert.strictEqual(isVisibleToAnyClient(entity, []), false, "no connected clients means no client can see the entity");
  const malformedView = { x: NaN, y: 0, fov: 100, isInView() { return false; } };
  assert.strictEqual(isVisibleToAnyClient(entity, [malformedView]), null, "malformed view geometry must be treated as indeterminate");
}

console.log("Offscreen transient cleanup tests passed");
