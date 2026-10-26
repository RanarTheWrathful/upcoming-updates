"use strict";

// INTELLECT is a decision-quality setting, not a global speed multiplier.
// Keep numerical operations bounded even when configured with huge values.
function normalize(value, fallback = 1) {
  const parsed = Number(value);
  // Negative intellect is intentional: it reverses a controller's decision
  // intent. Do not clamp it away at the entity property boundary.
  return Number.isFinite(parsed) ? parsed : fallback;
}

function level(value) {
  return Math.log2(1 + Math.abs(normalize(value, 1)));
}

function has(value, threshold) {
  return normalize(value, 1) >= threshold;
}

function progression(value, start, end) {
  const n = normalize(value, 1);
  // Negative intellect inverts decisions; it must not unlock positive tactics.
  if (n <= start) return 0;
  if (n >= end) return 1;
  const low = Math.log2(1 + start);
  const high = Math.log2(1 + end);
  return Math.max(0, Math.min(1, (Math.log2(1 + n) - low) / (high - low)));
}

function scaleRange(baseRange, value) {
  const base = Number(baseRange);
  if (!Number.isFinite(base)) return baseRange;
  const n = normalize(value, 1);
  if (n < 0) return base / (1 + Math.min(4, Math.sqrt(Math.abs(n)) * 0.65));
  // More intelligent entities search farther, with a bounded spatial query.
  if (n < 1) return base * (0.5 + 0.5 * Math.sqrt(n));
  return base * Math.min(2.25, Math.sqrt(n));
}

function scaleInterval(baseInterval, value) {
  const base = Math.max(1, Number(baseInterval) || 1);
  const n = normalize(value, 1);
  if (n === 1) return base;
  if (n < 0) return Math.min(base * 5, Math.ceil(base * (1 + Math.min(4, Math.sqrt(Math.abs(n))))));
  // More intellect means more frequent reconsideration, never an unbounded loop.
  return Math.max(4, Math.ceil(base / Math.sqrt(Math.max(0.01, n))));
}

function scalePauseInterval(baseInterval, value) {
  const base = Math.max(1, Number(baseInterval) || 1);
  const n = normalize(value, 1);
  if (n === 1) return base;
  if (n < 0) return Math.min(base * 5, Math.ceil(base * (1 + Math.min(4, Math.sqrt(Math.abs(n))))));
  return Math.max(8, Math.ceil(base / Math.sqrt(Math.max(0.01, n))));
}

function distance(a, b) {
  const dx = (Number(a && a.x) || 0) - (Number(b && b.x) || 0);
  const dy = (Number(a && a.y) || 0) - (Number(b && b.y) || 0);
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function chooseTarget(targets, body, value, currentTarget, strategy = "balanced") {
  if (!Array.isArray(targets) || !targets.length) return undefined;
  if (targets.length === 1 || !body) return targets[0];
  const intellectValue = normalize(value, 1);

  // A valid lock is sticky by default. Negative intellect deliberately weakens
  // the normal targeting intent; positive intellect makes a better-informed
  // choice without oscillating between equivalent targets.
  if (intellectValue <= 1) {
    if (currentTarget && targets.includes(currentTarget)) return currentTarget;
    return targets.reduce((best, candidate) =>
      distance(body, candidate) < distance(body, best) ? candidate : best
    );
  }

  const mode = body.aiTarget || "general";
  const range = Math.max(1, Number(body.fov) / 2 || 1000);
  const dangerValues = targets.map((target) => Number(target.dangerValue) || 0);
  let minimumDanger = Infinity;
  let maximumDanger = -Infinity;
  for (const danger of dangerValues) {
    if (danger < minimumDanger) minimumDanger = danger;
    if (danger > maximumDanger) maximumDanger = danger;
  }
  const dangerRank = new Map();
  targets.forEach((target, index) => {
    // Equal-danger targets must stay equal; array order must not masquerade as
    // tactical information or cause arbitrary target changes.
    const rank = maximumDanger <= minimumDanger
      ? 0.5
      : clamp((dangerValues[index] - minimumDanger) / (maximumDanger - minimumDanger), 0, 1);
    dangerRank.set(target, rank);
  });

  const blend = 0.15 + 0.85 * progression(Math.abs(intellectValue), 2, 256);
  const scores = new Map();
  let best = targets[0];
  let bestScore = -Infinity;
  for (const candidate of targets) {
    const d = distance(body, candidate);
    const proximity = 1 / (1 + d / range);
    const danger = dangerRank.get(candidate) == null ? 0.5 : dangerRank.get(candidate);
    const inverseDanger = 1 - danger;
    const maxHealth = Math.max(1, Number(candidate.health && candidate.health.max) || 1);
    const health = clamp((Number(candidate.health && candidate.health.amount) || 0) / maxHealth, 0, 1);
    const vulnerability = 1 - health;
    const bodyVelocity = body.velocity || { x: 0, y: 0 };
    const targetVelocity = candidate.velocity || { x: 0, y: 0 };
    const dx = d > 0 ? (candidate.x - body.x) / d : 0;
    const dy = d > 0 ? (candidate.y - body.y) / d : 0;
    const relativeX = (Number(targetVelocity.x) || 0) - (Number(bodyVelocity.x) || 0);
    const relativeY = (Number(targetVelocity.y) || 0) - (Number(bodyVelocity.y) || 0);
    const speedScale = Math.max(1, Number(body.topSpeed) || 0, Number(candidate.topSpeed) || 0);
    const closing = clamp(-(relativeX * dx + relativeY * dy) / speedScale, -1, 1) * 0.5 + 0.5;

    let tacticalScore;
    if (mode === "leastDeadly") {
      tacticalScore = inverseDanger * 0.55 + proximity * 0.25 + vulnerability * 0.1 + closing * 0.1;
    } else if (mode === "healAllies") {
      tacticalScore = vulnerability * 0.65 + proximity * 0.25 + closing * 0.1;
    } else if (mode === "projectiles") {
      tacticalScore = proximity * 0.55 + closing * 0.4 + danger * 0.05;
    } else {
      tacticalScore = danger * 0.4 + vulnerability * 0.2 + closing * 0.15 + proximity * 0.25;
    }
    // High intellect adapts its strategic emphasis in stable decision epochs,
    // but must respect specialist orders such as healing allies or intercepting projectiles.
    if (["general", "mostDeadly", "allHostiles"].includes(mode)) {
      if (strategy === "aggressive") tacticalScore = danger * 0.55 + closing * 0.25 + vulnerability * 0.15 + proximity * 0.05;
      else if (strategy === "finisher") tacticalScore = vulnerability * 0.6 + danger * 0.2 + proximity * 0.2;
      else if (strategy === "survival") tacticalScore = inverseDanger * 0.5 + proximity * 0.35 + (1 - closing) * 0.15;
    }
    const score = proximity * (1 - blend) + tacticalScore * blend;
    const reverseStrength = clamp(Math.abs(intellectValue), 0, 1);
    const signedScore = intellectValue < 0
      ? score * (1 - reverseStrength) + (1 - score) * reverseStrength
      : score;
    scores.set(candidate, signedScore);
    if (signedScore > bestScore || (signedScore === bestScore && d < distance(body, best))) {
      best = candidate;
      bestScore = signedScore;
    }
  }

  if (currentTarget && scores.has(currentTarget) && currentTarget !== best) {
    // Highly intelligent entities can change priorities, but only when the new
    // target is meaningfully better. The margin shrinks with intellect without
    // disappearing, preventing two similar targets from causing lock oscillation.
    const margin = 0.04 + 0.15 * (1 - progression(value, 16, 4096));
    if (bestScore - scores.get(currentTarget) < margin) return currentTarget;
  }
  return best;
}

/**
 * Higher-intellect hostile-target controllers spread a group across viable
 * enemies instead of dogpiling the first target. Focus counts are supplied by
 * the server's small, time-limited claim registry; baseline intellect never
 * enters this behavior. Returns the best target or the supplied preferred one.
 */
function distributeTargetFocus(targets, body, value, currentTarget, focusCounts = new Map(), preferredTarget) {
  const n = normalize(value, 1);
  const mode = body && body.aiTarget || "general";
  if (n < 32 || !body || !Array.isArray(targets) || !targets.length ||
      !["general", "mostDeadly", "allHostiles"].includes(mode)) return preferredTarget;

  const target = preferredTarget && targets.includes(preferredTarget)
    ? preferredTarget
    : chooseTarget(targets, body, n, currentTarget);
  if (targets.length < 2) return target;

  let minDanger = Infinity;
  let maxDanger = -Infinity;
  for (const candidate of targets) {
    const danger = Number(candidate.dangerValue) || 0;
    minDanger = Math.min(minDanger, danger);
    maxDanger = Math.max(maxDanger, danger);
  }
  const blend = progression(n, 32, 4096);
  const penaltyPerAlly = 0.08 + 0.32 * blend;
  const range = Math.max(1, Number(body.fov) / 2 || 1000);
  let best = target || targets[0];
  let bestScore = -Infinity;
  const scores = new Map();

  for (const candidate of targets) {
    const proximity = 1 / (1 + distance(body, candidate) / range);
    const danger = maxDanger > minDanger
      ? clamp(((Number(candidate.dangerValue) || 0) - minDanger) / (maxDanger - minDanger), 0, 1)
      : 0.5;
    const maxHealth = Math.max(1, Number(candidate.health && candidate.health.max) || 1);
    const vulnerability = 1 - clamp((Number(candidate.health && candidate.health.amount) || 0) / maxHealth, 0, 1);
    const alliedFocusCount = Math.max(0, Number(focusCounts instanceof Map
      ? focusCounts.get(candidate.id)
      : focusCounts && focusCounts[candidate.id]) || 0);
    const score = danger * 0.35 + vulnerability * 0.3 + proximity * 0.35 -
      Math.min(0.65, alliedFocusCount * penaltyPerAlly);
    scores.set(candidate, score);
    if (score > bestScore || (score === bestScore && distance(body, candidate) < distance(body, best))) {
      best = candidate;
      bestScore = score;
    }
  }

  // Keep a current target unless redistribution creates a clear improvement.
  // The threshold is fixed enough to prevent focus switching on similar scores.
  if (currentTarget && scores.has(currentTarget) && currentTarget !== best &&
      bestScore - scores.get(currentTarget) < 0.07 + 0.04 * (1 - blend)) {
    return currentTarget;
  }
  return best;
}

function waypointCandidateCount(value) {
  const n = normalize(value, 1);
  if (n < 0) return 1;
  return Math.max(1, Math.min(32, Math.ceil(level(n))));
}

function chooseWanderSpot(candidates, body, recentSpots, value) {
  if (!Array.isArray(candidates) || candidates.length === 0) return undefined;
  if (candidates.length === 1 || !body) return candidates[0];
  const recent = Array.isArray(recentSpots) ? recentSpots : [];
  let maxDistance = 1;
  for (const candidate of candidates) maxDistance = Math.max(maxDistance, distance(body, candidate));

  let best = candidates[0];
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const travelRatio = distance(body, candidate) / maxDistance;
    // A useful trip is neither a tiny loop nor always the farthest point.
    const travelScore = clamp(1 - Math.abs(travelRatio - 0.55) / 0.55, 0, 1);
    let novelty = 0.5;
    if (recent.length) {
      let nearestRecent = Infinity;
      for (const old of recent) nearestRecent = Math.min(nearestRecent, distance(candidate, old));
      novelty = clamp(nearestRecent / Math.max(1, maxDistance * 0.25), 0, 1);
    }
    const score = 0.58 * novelty + 0.42 * travelScore;
    // Candidate quality remains a property of the controller. Negative
    // intellect reverses the final controller intent once, at the AI stack
    // boundary, instead of double-inverting both selection and movement here.
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function arrivalRadius(baseRadius, value) {
  const n = normalize(value, 1);
  // Low/negative intellect is less precise; high intellect tightens route arrival
  // slightly but never changes the controller's underlying route intent.
  if (n < 0) return baseRadius * (1 + Math.min(0.5, Math.sqrt(Math.abs(n)) * 0.12));
  const multiplier = n <= 1 ? 1 + (1 - n) * 0.12 : Math.pow(n, 0.025);
  return Math.max(baseRadius, Math.min(baseRadius * 1.4, baseRadius * multiplier));
}

function pathStep(value, stuckChecks = 0) {
  const n = normalize(value, 1);
  // Waypoints are sequential by default. Only intelligent pathfinders may skip
  // ahead after repeated evidence that the current route segment is blocked.
  if (n < 512 || stuckChecks < 5) return 1;
  return clamp(2 + Math.floor((level(n) - level(512)) / 6), 2, 4);
}

function fleeThreshold(base, value) {
  const original = Math.max(0, Number(base) || 0);
  const n = normalize(value, 1);
  if (n === 1) return original;
  if (n < 0) return original * (1 - 0.95 * clamp(Math.abs(n), 0, 1));
  if (n < 1) return original * (0.5 + 0.5 * n);
  // Better retreat timing, without panic fleeing after minor damage.
  if (original >= 0.9) return original;
  return original + (Math.min(0.9, original * 1.1) - original) * progression(n, 2, 2048);
}

// Kept as a compatibility helper for older controllers, but intellect must
// never alter the configured orbit radius. It changes orbit strategy instead.
function orbitMultiplier() {
  return 1;
}

function stableHash(value) {
  const text = String(value == null ? "unknown" : value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Produce a deterministic, persistent orbit maneuver. The position radius is
// deliberately absent: INTELLECT chooses *how* the entity travels around the
// ring, never how close to the master/target it gets. age is measured in AI
// think calls; changes happen in long epochs, not through per-frame randomness.
function orbitManeuver(value, entityId, targetId, age = 0) {
  const n = normalize(value, 1);
  const identity = `${entityId == null ? "entity" : entityId}:${targetId == null ? "target" : targetId}`;
  const seed = stableHash(identity);
  const phaseSeed = stableHash(`${identity}:phase`) / 0xffffffff;
  const nAge = Math.max(0, Math.floor(Number(age) || 0));
  const baselineDirection = seed % 2 === 0 ? 1 : -1;

  // INTELLECT 1 is a real, continuous circular orbit: predictable and smooth,
  // not a single offset destination that the entity reaches and then abandons.
  // Higher values add maneuver choices without changing the configured radius.
  const baselineAngularSpeed = 0.012;
  if (n <= 1) {
    return {
      style: "standard",
      phaseOffset: 0,
      direction: baselineDirection,
      angularSpeed: baselineAngularSpeed,
      speedMultiplier: 1,
      wobbleAmplitude: 0,
      wobblePeriod: 900,
      wobblePhase: 0,
      wobbleOffset: 0,
      cycleLength: 1800,
      cycle: 0,
    };
  }

  const cycleLength = clamp(Math.round(1800 - level(n) * 25), 900, 1800);
  const cycle = Math.floor(nAge / cycleLength);
  const cycleSeed = stableHash(`${identity}:cycle:${n >= 128 ? cycle : 0}`);

  let direction = baselineDirection;
  if (n >= 128) direction = cycleSeed % 2 === 0 ? 1 : -1;

  let speedMultiplier = 1;
  if (n >= 512) {
    // Change cruising style only at long maneuver boundaries. This creates
    // purposeful slow arcs, normal strafes, and faster feints without jitter.
    const speeds = [0.55, 0.8, 1, 1.25, 1.45];
    speedMultiplier = speeds[cycleSeed % speeds.length];
  } else if (n >= 128) {
    const speeds = [0.7, 1, 1.3];
    speedMultiplier = speeds[cycleSeed % speeds.length];
  }

  // Keep orbiting at every intellect level. Increasing intellect changes the
  // maneuver profile and stability, with only a gradual bounded speed increase.
  const angularSpeed = baselineAngularSpeed +
    0.008 * progression(n, 1, 4096);
  const wobbleAmplitude = n >= 32
    ? 0.04 + 0.28 * progression(n, 32, 4096)
    : 0;
  const wobblePeriod = clamp(Math.round(900 - level(n) * 14), 300, 900);
  const wobblePhase = phaseSeed * Math.PI * 2;
  const wobbleOffset = wobbleAmplitude * Math.sin(nAge * Math.PI * 2 / wobblePeriod + wobblePhase);
  let style = "offset-lane";
  if (n >= 2048) style = "predictive-feint";
  else if (n >= 512) style = "adaptive-weave";
  else if (n >= 128) style = "variable-orbit";
  else if (n >= 32) style = "weaving-orbit";
  else if (n >= 8) style = "slow-orbit";

  return {
    style,
    // The phase offset creates a stable per-entity style. Goal positions are
    // integrated continuously; no frame-to-frame random angle is selected.
    phaseOffset: Math.PI * 2 * phaseSeed * progression(n, 1, 16),
    direction,
    angularSpeed,
    speedMultiplier,
    wobbleAmplitude,
    wobblePeriod,
    wobblePhase,
    wobbleOffset,
    cycleLength,
    cycle,
  };
}

// Near-master controllers should keep each chosen destination long enough for
// the movement controller to actually reach it. Smarter AI plans ahead instead
// of rerolling its goal more frequently.
function orbitDecisionInterval(value) {
  const n = normalize(value, 1);
  if (n === 1) return 30;
  if (n < 0) return Math.min(150, Math.round(30 + 60 * Math.min(2, Math.sqrt(Math.abs(n)))));
  // Better planning produces more useful decisions, but each goal is held long
  // enough to avoid jitter. High intellect can reconsider more often, not every tick.
  return Math.max(8, Math.round(30 - 22 * progression(n, 1, 4096)));
}

function solveInterceptTime(position, velocity, projectileSpeed, maxTime = 120) {
  const px = Number(position && position.x) || 0;
  const py = Number(position && position.y) || 0;
  const vx = Number(velocity && velocity.x) || 0;
  const vy = Number(velocity && velocity.y) || 0;
  const speed = Number(projectileSpeed);
  const distanceToTarget = Math.hypot(px, py);
  if (!Number.isFinite(speed) || speed <= 0) return 0;

  const a = vx * vx + vy * vy - speed * speed;
  const b = 2 * (px * vx + py * vy);
  const c = px * px + py * py;
  let time = NaN;

  if (Math.abs(a) < 1e-8) {
    if (Math.abs(b) > 1e-8) time = -c / b;
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0 && Number.isFinite(discriminant)) {
      const root = Math.sqrt(discriminant);
      const candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)]
        .filter((candidate) => Number.isFinite(candidate) && candidate > 0);
      if (candidates.length) time = Math.min(...candidates);
    }
  }
  if (!Number.isFinite(time) || time < 0) time = distanceToTarget / Math.max(0.001, speed);
  return clamp(time, 0, Math.max(1, maxTime));
}

function predictIntercept(position, velocity, acceleration, projectileSpeed, value) {
  const n = normalize(value, 1);
  const p = { x: Number(position && position.x) || 0, y: Number(position && position.y) || 0 };
  const v = { x: Number(velocity && velocity.x) || 0, y: Number(velocity && velocity.y) || 0 };
  const a = { x: Number(acceleration && acceleration.x) || 0, y: Number(acceleration && acceleration.y) || 0 };
  if (!Number.isFinite(projectileSpeed) || projectileSpeed <= 0) return p;

  const horizon = clamp(12 + level(n) * 3, 12, 120);
  let time = solveInterceptTime(p, v, projectileSpeed, horizon);
  let accelWeight = 0;
  if (n >= 8) {
    accelWeight = 0.12 + 0.88 * progression(n, 8, 4096);
  }

  // Bound inferred acceleration. Motion history can be noisy when an entity
  // collides with a wall, and a clever AI should not predict a target across the map.
  const velocityMagnitude = Math.hypot(v.x, v.y);
  const accelerationMagnitude = Math.hypot(a.x, a.y);
  const maxAcceleration = Math.max(0.025, (velocityMagnitude + projectileSpeed) * 0.12);
  if (accelerationMagnitude > maxAcceleration && accelerationMagnitude > 0) {
    const factor = maxAcceleration / accelerationMagnitude;
    a.x *= factor;
    a.y *= factor;
  }

  if (accelWeight > 0) {
    for (let i = 0; i < 3; i++) {
      const effectiveVelocity = {
        x: v.x + 0.5 * a.x * time * accelWeight,
        y: v.y + 0.5 * a.y * time * accelWeight,
      };
      const nextTime = solveInterceptTime(p, effectiveVelocity, projectileSpeed, horizon);
      time = 0.45 * time + 0.55 * nextTime;
    }
  }

  const offset = {
    x: v.x * time + 0.5 * a.x * time * time * accelWeight,
    y: v.y * time + 0.5 * a.y * time * time * accelWeight,
  };
  const maximumOffset = Math.max(50, (Math.hypot(p.x, p.y) + velocityMagnitude * time) * 0.9);
  const offsetMagnitude = Math.hypot(offset.x, offset.y);
  if (offsetMagnitude > maximumOffset && offsetMagnitude > 0) {
    const factor = maximumOffset / offsetMagnitude;
    offset.x *= factor;
    offset.y *= factor;
  }
  return { x: p.x + offset.x, y: p.y + offset.y };
}

function targetIntentVelocity(target, velocity, value) {
  const n = normalize(value, 1);
  const current = {
    x: Number(velocity && velocity.x) || 0,
    y: Number(velocity && velocity.y) || 0,
  };
  if (n < 16 || !target || target.isPlayer || !target.control || !target.control.goal) return current;
  const goal = target.control.goal;
  const dx = (Number(goal.x) || 0) - (Number(target.x) || 0);
  const dy = (Number(goal.y) || 0) - (Number(target.y) || 0);
  const goalDistance = Math.hypot(dx, dy);
  if (goalDistance < Math.max(40, (Number(target.size) || 0) * 3)) return current;
  const desiredSpeed = Math.max(Math.hypot(current.x, current.y), (Number(target.topSpeed) || 0) * 0.65);
  if (desiredSpeed <= 0.5) return current;
  const intended = { x: dx / goalDistance * desiredSpeed, y: dy / goalDistance * desiredSpeed };
  const intentWeight = 0.08 + 0.37 * progression(n, 16, 4096);
  return {
    x: current.x * (1 - intentWeight) + intended.x * intentWeight,
    y: current.y * (1 - intentWeight) + intended.y * intentWeight,
  };
}

function closestApproach(position, relativeVelocity, horizon) {
  const rx = Number(position && position.x) || 0;
  const ry = Number(position && position.y) || 0;
  const vx = Number(relativeVelocity && relativeVelocity.x) || 0;
  const vy = Number(relativeVelocity && relativeVelocity.y) || 0;
  const speedSquared = vx * vx + vy * vy;
  if (speedSquared < 1e-8) return { time: 0, distance: Math.hypot(rx, ry) };
  const time = clamp(-(rx * vx + ry * vy) / speedSquared, 0, Math.max(1, horizon));
  return { time, distance: Math.hypot(rx + vx * time, ry + vy * time) };
}

function chooseDodgeDirection(body, projectiles, value, horizon = 30) {
  if (!body || !Array.isArray(projectiles) || !projectiles.length) return undefined;
  const bodyVelocity = body.velocity || { x: 0, y: 0 };
  const bodySpeed = Math.max(0.1, Number(body.topSpeed) || Math.hypot(bodyVelocity.x || 0, bodyVelocity.y || 0));
  const bodyRadius = Math.max(1, Number(body.size) || 1);
  const threats = [];

  for (const projectile of projectiles) {
    if (!projectile || !projectile.velocity) continue;
    const relativePosition = {
      x: (Number(projectile.x) || 0) - (Number(body.x) || 0),
      y: (Number(projectile.y) || 0) - (Number(body.y) || 0),
    };
    const relativeVelocity = {
      x: (Number(projectile.velocity.x) || 0) - (Number(bodyVelocity.x) || 0),
      y: (Number(projectile.velocity.y) || 0) - (Number(bodyVelocity.y) || 0),
    };
    const current = closestApproach(relativePosition, relativeVelocity, horizon);
    const safeRadius = bodyRadius + Math.max(1, Number(projectile.size) || 1) + 8;
    if (current.time > 0 && current.distance < safeRadius * 2.1) {
      threats.push({ projectile, relativePosition, safeRadius, current });
    }
  }
  if (!threats.length) return undefined;

  const n = normalize(value, 1);
  const directions = n >= 2048 ? 16 : n >= 128 ? 8 : 4;
  const phase = Number.isFinite(Number(body.id)) ? (Number(body.id) % 7) * 0.025 : 0;
  let bestDirection;
  let bestRisk = Infinity;
  const currentSpeed = Math.hypot(bodyVelocity.x || 0, bodyVelocity.y || 0);
  const currentDirection = currentSpeed > 0.01
    ? { x: bodyVelocity.x / currentSpeed, y: bodyVelocity.y / currentSpeed }
    : { x: 0, y: 0 };

  for (let i = 0; i < directions; i++) {
    const angle = 2 * Math.PI * i / directions + phase;
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const desiredVelocity = { x: direction.x * bodySpeed, y: direction.y * bodySpeed };
    let risk = 0;
    for (const threat of threats) {
      const p = threat.projectile;
      const relativeVelocity = {
        x: (Number(p.velocity.x) || 0) - desiredVelocity.x,
        y: (Number(p.velocity.y) || 0) - desiredVelocity.y,
      };
      const approach = closestApproach(threat.relativePosition, relativeVelocity, horizon);
      const radius = threat.safeRadius * 2;
      const penetration = clamp((radius - approach.distance) / radius, 0, 1);
      const urgency = 0.55 + 0.45 * (1 - approach.time / Math.max(1, horizon));
      risk += penetration * penetration * urgency;
      // Still penalize a very close near-miss even if the projected bodies do not overlap.
      risk += 0.08 * Math.exp(-approach.distance / Math.max(1, radius)) * urgency;
    }
    const turnPenalty = 0.025 * (1 - (direction.x * currentDirection.x + direction.y * currentDirection.y));
    risk += turnPenalty;
    if (risk < bestRisk) {
      bestRisk = risk;
      bestDirection = direction;
    }
  }
  return bestDirection;
}

function dodgeHorizon(value) {
  return clamp(18 + level(value) * 2.2, 18, 90);
}

function dodgeDuration(value) {
  return clamp(Math.round(6 + level(value) * 0.35), 6, 16);
}

function dodgeScanInterval(value) {
  const n = normalize(value, 1);
  if (n >= 2048) return 1;
  if (n >= 128) return 2;
  return 4;
}


function smartActionChance(value, baseChance = 0.01, cap = 4096) {
  const n = normalize(value, 1);
  if (n < 0) return 0;
  if (n <= 1) return clamp(baseChance * n, 0, 1);
  return clamp(baseChance + (1 - baseChance) * progression(n, 1, cap), 0, 1);
}

function shouldTakeSmartAction(value, identity, frame = 0, baseChance = 0.01, cap = 4096) {
  const chance = smartActionChance(value, baseChance, cap);
  if (chance <= 0) return false;
  if (chance >= 1) return true;
  // Eight-frame buckets make decisions persistent long enough to be legible.
  const bucket = Math.floor(Math.max(0, Number(frame) || 0) / 8);
  const sample = stableHash(`${identity == null ? "ai" : identity}:${bucket}:smart`) / 0xffffffff;
  return sample < chance;
}

function strategyProfile(value, identity, epoch = 0) {
  const n = normalize(value, 1);
  if (n < 16) return "balanced";
  const profiles = ["balanced", "aggressive", "finisher", "survival"];
  const count = n >= 2048 ? profiles.length : n >= 128 ? 3 : 2;
  const index = stableHash(`${identity == null ? "ai" : identity}:strategy:${Math.floor(epoch / 4)}`) % count;
  return profiles[index];
}

function segmentBlocked(a, b, isBlocked) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distanceValue = Math.hypot(dx, dy);
  const samples = clamp(Math.ceil(distanceValue / 24), 4, 100);
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    if (isBlocked({ x: a.x + dx * t, y: a.y + dy * t })) return true;
  }
  return false;
}

function wallAwareWaypoint(body, destination, isBlocked, value, identity, frame = 0, state) {
  if (!body || !destination || !Number.isFinite(Number(destination.x)) ||
      !Number.isFinite(Number(destination.y)) || typeof isBlocked !== "function") return undefined;
  const n = normalize(value, 1);
  if (n < 0 || !shouldTakeSmartAction(n, `${identity}:wall-route`, frame, 0.015, 512)) return undefined;
  const start = { x: Number(body.x) || 0, y: Number(body.y) || 0 };
  const end = { x: Number(destination.x) || 0, y: Number(destination.y) || 0 };
  const targetMoved = !state || !state.destination || distance(state.destination, end) > Math.max(100, (Number(body.size) || 0) * 4);
  if (state && state.waypoint && !targetMoved && !isBlocked(state.waypoint) &&
      distance(start, state.waypoint) > Math.max(40, (Number(body.size) || 0) * 1.5)) {
    return state.waypoint;
  }
  if (!segmentBlocked(start, end, isBlocked)) {
    if (state) { state.destination = end; state.waypoint = undefined; }
    return undefined;
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const total = Math.hypot(dx, dy) || 1;
  let firstBlockedT = 0.5;
  const samples = clamp(Math.ceil(total / 24), 4, 100);
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    if (isBlocked({ x: start.x + dx * t, y: start.y + dy * t })) {
      firstBlockedT = t;
      break;
    }
  }
  const obstruction = { x: start.x + dx * firstBlockedT, y: start.y + dy * firstBlockedT };
  const directAngle = Math.atan2(dy, dx);
  const radii = [Math.max(70, (Number(body.size) || 0) * 2.5), 120, 190, 280, 380];
  const angleOffsets = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2,
    Math.PI * 0.72, -Math.PI * 0.72, Math.PI * 0.9, -Math.PI * 0.9];
  let best;
  let bestCost = Infinity;
  for (const radius of radii) {
    for (const offset of angleOffsets) {
      const angle = directAngle + offset;
      const candidate = { x: obstruction.x + Math.cos(angle) * radius, y: obstruction.y + Math.sin(angle) * radius };
      if (isBlocked(candidate) || segmentBlocked(start, candidate, isBlocked) || segmentBlocked(candidate, end, isBlocked)) continue;
      const cost = distance(start, candidate) + distance(candidate, end) + radius * 0.05;
      if (cost < bestCost) { bestCost = cost; best = candidate; }
    }
    if (best) break;
  }
  if (state) {
    state.destination = end;
    state.waypoint = best;
  }
  return best;
}

function adaptControllerOutput(controllerNameValue, output, body, frame = 0) {
  if (!output || !body || body.isPlayer) return output;
  const name = String(controllerNameValue || "").replace(/^io_/, "").toLowerCase();
  const n = normalize(body.intellect, 1);
  if (n === 1) return output; // exact baseline at the default setting
  const result = { ...output };
  const exemptFromInversion = new Set(["donothing", "listentoplayer", "teleporttomaster"]);

  if (n < 0 && !exemptFromInversion.has(name)) {
    const strength = clamp(Math.abs(n), 0, 1);
    if (result.goal && Number.isFinite(Number(result.goal.x)) && Number.isFinite(Number(result.goal.y))) {
      const dx = Number(result.goal.x) - (Number(body.x) || 0);
      const dy = Number(result.goal.y) - (Number(body.y) || 0);
      const reverse = 1 - 2 * strength;
      result.goal = { x: body.x + dx * reverse, y: body.y + dy * reverse };
    }
    const hasSpinController = name === "combined" && Array.isArray(body.controllers) &&
      body.controllers.some((controller) => controller && controller.constructor && controller.constructor.name === "io_spin");
    const hasTargetingController = name === "combined" && Array.isArray(body.controllers) &&
      body.controllers.some((controller) => controller && controller.constructor &&
        ["io_nearestDifferentMaster", "io_Dominator", "io_listenToPlayer"].includes(controller.constructor.name));
    if (!hasSpinController || hasTargetingController) {
      if (result.target && Number.isFinite(Number(result.target.x)) && Number.isFinite(Number(result.target.y))) {
        const reverse = 1 - 2 * strength;
        result.target = { x: Number(result.target.x) * reverse, y: Number(result.target.y) * reverse };
      }
    }
    if (strength >= 1) {
      for (const key of ["fire", "main", "alt"]) {
        if (typeof result[key] === "boolean") result[key] = !result[key];
      }
    }
    return result;
  }

  if (n > 0 && n < 1) {
    // Fractional intellect retains the controller's intent but reduces movement
    // commitment and prediction precision. No positive-only tactics unlock.
    if (result.goal && result.power !== 0) {
      const basePower = result.power == null ? 1 : Number(result.power);
      if (Number.isFinite(basePower)) result.power = basePower * (0.5 + 0.5 * n);
    }
    return result;
  }

  if (n > 1 && result.goal && result.power !== 0) {
    const weights = {
      mapTargetToGoal: 1, nearestdifferentmaster: 0.8, dominator: 0.8,
      pathfinder: 0.9, wanderaroundmap: 0.65, guard1: 0.45, minion: 0.35,
      hangoutnearmaster: 0.5, gotomastertarget: 0.55, boomerang: 0.35,
      fleeatlowhealth: 0.8, movInCircles: 0.25, moveincircles: 0.25,
    };
    const weight = weights[name] == null ? 0.35 : weights[name];
    const planning = progression(n, 2, 2048) * weight;
    const goalDistance = distance(body, result.goal);
    const speed = Math.max(1, Number(body.topSpeed) || 1);
    const currentSpeed = Math.hypot(Number(body.velocity && body.velocity.x) || 0, Number(body.velocity && body.velocity.y) || 0);
    let factor = 1;
    if (goalDistance > speed * 8) factor += 0.22 * planning;
    else if (goalDistance < speed * 2.5 && currentSpeed > speed * 0.4) factor -= 0.28 * planning;
    const basePower = result.power == null ? 1 : Number(result.power);
    if (Number.isFinite(basePower)) result.power = clamp(basePower * factor, 0, 1.5);
  }
  return result;
}

module.exports = {
  normalize,
  level,
  has,
  progression,
  scaleRange,
  scaleInterval,
  scalePauseInterval,
  distance,
  chooseTarget,
  distributeTargetFocus,
  waypointCandidateCount,
  chooseWanderSpot,
  arrivalRadius,
  pathStep,
  fleeThreshold,
  orbitMultiplier,
  orbitManeuver,
  orbitDecisionInterval,
  solveInterceptTime,
  predictIntercept,
  targetIntentVelocity,
  closestApproach,
  chooseDodgeDirection,
  dodgeHorizon,
  dodgeDuration,
  dodgeScanInterval,
  smartActionChance,
  shouldTakeSmartAction,
  strategyProfile,
  wallAwareWaypoint,
  adaptControllerOutput,
};
