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

// When an entity explicitly has minion steering, do not allow an inherited
// mapTargetToGoal controller to overwrite its standoff/orbit goal with a direct
// collision course. Player-controlled bodies can still direct their own movement.
function shouldDeferDirectChase(body) {
  if (!body || body.isPlayer || (body.aiSettings && body.aiSettings.forceDirectChase === true)) {
    return false;
  }
  return hasController(body, "minion");
}

function isAutonomousRangedCombatant(body) {
  if (!body || body.isPlayer) return false;
  if (body.isEnemy === true || body.isBoss === true || /boss$/i.test(String(body.type || ""))) {
    return true;
  }
  const excludedTypes = new Set(["food", "bullet", "drone", "swarm", "minion", "trap", "wall", "tile"]);
  return body.master === body && body.source === body &&
    !excludedTypes.has(String(body.type || "").toLowerCase()) &&
    hasController(body, "nearestDifferentMaster") && hasController(body, "minion");
}

function safeStandoffOrbit(baseOrbit, bodySize, targetSize, minimumGap = 30) {
  const orbit = Math.max(0, Number(baseOrbit) || 0);
  const ownSize = Math.max(0, Number(bodySize) || 0);
  const foeSize = Math.max(0, Number(targetSize) || 0);
  const gap = Math.max(0, Number(minimumGap) || 0, Math.max(ownSize, foeSize) * 0.35);
  return Math.max(orbit, ownSize + foeSize + gap);
}

module.exports = {
  controllerName,
  hasController,
  shouldDeferDirectChase,
  isAutonomousRangedCombatant,
  safeStandoffOrbit,
};
