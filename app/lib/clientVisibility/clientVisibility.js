"use strict";

/**
 * Determine whether any connected client currently has an entity in its drawn
 * view. Returns true/false when known, or null if view geometry is unavailable.
 * A null result is intentionally conservative: callers must not destroy an
 * entity based on an untrustworthy visibility calculation.
 */
function isVisibleToAnyClient(entity, views) {
  if (!entity || !Array.isArray(views)) return null;
  let indeterminate = false;
  const entityX = Number(entity.x);
  const entityY = Number(entity.y);
  const sizeValue = Number(entity.size);
  const size = Number.isFinite(sizeValue) && sizeValue > 0 ? sizeValue : 0;

  for (const view of views) {
    if (!view) continue;
    const socket = view.socket;
    // WebSocket.OPEN is 1. Skip views that cannot currently deliver updates.
    if (socket && Number.isFinite(socket.readyState) && socket.readyState !== 1) continue;

    // This is the strongest evidence: the entity is in this client's actual
    // transmitted/drawn entity set, not merely in its spatial prefetch region.
    try {
      if (view.visibleEntity && typeof view.visibleEntity.has === "function" &&
          view.visibleEntity.has(entity)) return true;
    } catch (_) {
      indeterminate = true;
    }

    const fov = Number(view.fov);
    const x = Number(view.x);
    const y = Number(view.y);
    if ([fov, x, y, entityX, entityY].every(Number.isFinite)) {
      // Match View.gazeUpon()'s actual draw window. Do not use View.isInView(),
      // whose deliberately larger bounds are only for prefetching nearby data.
      const insideDrawWindow = Math.abs(entityX - x) < fov / 2 + 1.5 * size &&
        Math.abs(entityY - y) < (fov / 2) * (9 / 16) + 1.5 * size;
      if (insideDrawWindow && entity.settings && entity.settings.drawShape) return true;
      if (insideDrawWindow && !entity.settings) indeterminate = true;
      continue;
    }

    // Bad geometry is not equivalent to proof of being off-screen. Try the
    // view's own predicate if available; if it still cannot answer, return null.
    if (typeof view.isInView === "function") {
      try {
        if (view.isInView(entity)) return true;
        indeterminate = true;
      } catch (_) {
        indeterminate = true;
      }
    } else {
      indeterminate = true;
    }
  }

  return indeterminate ? null : false;
}

module.exports = isVisibleToAnyClient;
