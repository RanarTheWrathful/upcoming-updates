"use strict";

function controllerName(controller) {
  if (!controller) return "";
  if (typeof controller.controllerName === "string") return controller.controllerName.toLowerCase();
  if (controller.constructor && typeof controller.constructor.name === "string") {
    return controller.constructor.name.replace(/^io_/, "").toLowerCase();
  }
  return typeof controller.name === "string" ? controller.name.toLowerCase() : "";
}

function hasController(body, expectedName) {
  const controllers = body && Array.isArray(body.controllers) ? body.controllers : [];
  const expected = String(expectedName || "").replace(/^io_/, "").toLowerCase();
  return controllers.some((controller) => controllerName(controller) === expected);
}

// Keep the previous fix that prevents an inherited direct-chase controller from
// overwriting the minion controller's goal. Entities that intentionally need
// direct chasing can opt in; player-controlled movement is never intercepted.
function shouldDeferDirectChase(body) {
  if (!body || body.isPlayer || (body.aiSettings && body.aiSettings.forceDirectChase === true)) {
    return false;
  }
  return hasController(body, "minion");
}

// Preserve the earlier requested wider spacing, while leaving the actual orbit
// steering formula on the original implementation. This modifies radius only,
// not the controller's target-relative movement behavior.
function expandedOrbitDistance(configuredOrbit) {
  const value = Number(configuredOrbit);
  const base = Number.isFinite(value) ? Math.max(0, value) : 120;
  return Math.max(220, base * 1.5, base + 120);
}

// Original minion orbit goal formula from the project before the custom orbit
// rewrite. Keep it isolated so the current controller can use and test the
// baseline directly: no persistent global angle, generated lane, or standoff
// controller is involved.
function classicMinionOrbitGoal(body, target, orbit, turnwise = 1) {
  const direction = (Number(turnwise) || 1) * (Number(target && target.direction) || 0) + 0.01;
  const targetX = Number(target && target.x) || 0;
  const targetY = Number(target && target.y) || 0;
  const targetLength = Number.isFinite(Number(target && target.length))
    ? Number(target.length)
    : Math.hypot(targetX, targetY);
  const radius = Number(orbit) || 0;
  return {
    goal: {
      x: (Number(body && body.x) || 0) + targetX - radius * Math.cos(direction),
      y: (Number(body && body.y) || 0) + targetY - radius * Math.sin(direction),
    },
    power: Math.abs(targetLength - radius) < (Number(body && body.size) || 0) * 2 ? 0.7 : 1,
  };
}

// Dodge plans originate in nearestDifferentMaster/Dominator. The standard
// minion controller should temporarily respect those goals instead of silently
// replacing the evasion destination with its ordinary orbit goal.
function hasActiveIntellectDodge(body) {
  const controllers = body && Array.isArray(body.controllers) ? body.controllers : [];
  return controllers.some((controller) => {
    const state = controller && controller._intellectDodgeState;
    const frame = Number(controller && controller._intellectFrame);
    return !!(
      state && state.direction && Number.isFinite(frame) &&
      frame < Number(state.until)
    );
  });
}

module.exports = {
  controllerName,
  hasController,
  shouldDeferDirectChase,
  expandedOrbitDistance,
  classicMinionOrbitGoal,
  hasActiveIntellectDodge,
};
