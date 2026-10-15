"use strict";

const { performance } = require("perf_hooks");

function isTransientEffect(entity) {
  if (!entity) return false;
  if (entity.isProjectile === true || entity.type === "bullet" || entity.type === "atmosphere") {
    return true;
  }
  const label = typeof entity.label === "string" ? entity.label.trim().toLowerCase() : "";
  return label === "aura";
}

function createOffscreenTransientCleanup(options = {}) {
  const isVisibleToAnyClient = options.isVisibleToAnyClient || (() => false);
  const delayMs = Number.isFinite(Number(options.delayMs)) && Number(options.delayMs) >= 0
    ? Number(options.delayMs)
    : 5000;
  const nowProvider = options.nowProvider || (() => performance.now());
  const onDestroy = options.onDestroy || (() => {});
  // Weak keys ensure already-destroyed entities are not kept alive by cleanup bookkeeping.
  const unseenSince = new WeakMap();

  function check(entity, suppliedNow) {
    if (!entity || typeof entity !== "object") return false;

    let alive = true;
    if (typeof entity.valid === "function") {
      try { alive = entity.valid(); } catch (_) { alive = false; }
    }
    if (!alive) {
      unseenSince.delete(entity);
      return false;
    }

    if (!isTransientEffect(entity)) {
      unseenSince.delete(entity);
      return false;
    }

    let visible = false;
    try { visible = !!isVisibleToAnyClient(entity); } catch (_) { visible = false; }
    if (visible) {
      unseenSince.delete(entity);
      return false;
    }

    const now = Number.isFinite(suppliedNow) ? suppliedNow : nowProvider();
    const firstUnseenAt = unseenSince.get(entity);
    if (firstUnseenAt === undefined) {
      unseenSince.set(entity, now);
      return false;
    }
    if (now - firstUnseenAt < delayMs) return false;

    // Destroy directly, without awarding a kill or relying on health damage.
    // Delete the timer first so re-entrant destroy paths cannot double-process it.
    unseenSince.delete(entity);
    try {
      if (typeof entity.destroy === "function") {
        entity.destroy();
      } else if (typeof entity.kill === "function") {
        entity.kill();
      } else {
        return false;
      }
      try { onDestroy(entity, now - firstUnseenAt); } catch (_) {}
      return true;
    } catch (_) {
      // If destruction failed, allow a later maintenance pass to retry.
      unseenSince.set(entity, now);
      return false;
    }
  }

  return {
    check,
    delayMs,
  };
}

module.exports = createOffscreenTransientCleanup;
module.exports.isTransientEffect = isTransientEffect;
