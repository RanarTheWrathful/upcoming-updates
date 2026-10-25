"use strict";

// Intellect is deliberately accepted across a very wide numeric range. Individual
// controllers scale the specific decision they own so extreme values can be wild
// without multiplying global simulation work without bound.
function normalize(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

function level(value) {
  // Logarithmic level preserves meaningful changes at 0.1 and 100,000,000.
  return Math.log2(1 + normalize(value, 1));
}

function scaleRange(baseRange, value) {
  const base = Number(baseRange);
  if (!Number.isFinite(base)) return baseRange;
  const intellectValue = normalize(value, 1);
  // Operational cap keeps entity queries bounded even for enormous intellect.
  const multiplier = Math.min(3, Math.max(0.2, Math.sqrt(intellectValue)));
  return base * multiplier;
}

function scaleInterval(baseInterval, value) {
  const base = Math.max(1, Number(baseInterval) || 1);
  const intellectValue = normalize(value, 1);
  // Lower intellect is slower to reconsider; high intellect rethinks each tick.
  return Math.max(1, Math.ceil(base / Math.sqrt(Math.max(0.01, intellectValue))));
}

function boldness(value) {
  // At the default (1), normal nearest-target behavior is unchanged. Larger values
  // progressively favor distant targets; high values approach the farthest option.
  return 1 - Math.exp(-Math.max(0, level(value) - 1) / 6);
}

function chooseTarget(targets, body, value) {
  if (!Array.isArray(targets) || !targets.length) return undefined;
  if (targets.length === 1 || !body) return targets[0];
  const bias = boldness(value);
  if (bias <= 0.00001) {
    return targets.reduce((best, candidate) =>
      distance(body, candidate) < distance(body, best) ? candidate : best
    );
  }
  const ordered = targets.slice().sort((a, b) => distance(body, a) - distance(body, b));
  const targetIndex = Math.min(ordered.length - 1, Math.round((ordered.length - 1) * bias));
  return ordered[targetIndex];
}

function distance(a, b) {
  const dx = (Number(a && a.x) || 0) - (Number(b && b.x) || 0);
  const dy = (Number(a && a.y) || 0) - (Number(b && b.y) || 0);
  return Math.sqrt(dx * dx + dy * dy);
}

function waypointCandidateCount(value) {
  return Math.max(1, Math.min(50, Math.ceil(level(value))));
}

function pathStep(value) {
  return Math.max(1, Math.min(50, Math.ceil(level(value))));
}

function fleeThreshold(base, value) {
  const original = Math.max(0, Number(base) || 0);
  const intellectValue = normalize(value, 1);
  // Keep the default setting behavior byte-for-byte equivalent to the old
  // controller; the ceiling applies only when intellect is above its default.
  if (intellectValue === 1) return original;
  const threshold = original * Math.sqrt(intellectValue);
  return intellectValue > 1 ? Math.min(0.98, threshold) : threshold;
}

function orbitMultiplier(value) {
  return Math.min(3.5, Math.max(0.25, 1 / Math.sqrt(Math.max(0.01, normalize(value, 1)))));
}

module.exports = {
  normalize,
  level,
  scaleRange,
  scaleInterval,
  boldness,
  chooseTarget,
  waypointCandidateCount,
  pathStep,
  fleeThreshold,
  orbitMultiplier,
};
