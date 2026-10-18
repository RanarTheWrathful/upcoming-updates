"use strict";

// Generates cave-like, deliberately open wall formations for MAZE_GENERATION.
// The room supplies its existing "norm" cells so generated geometry does not
// replace the map's authored bases, walls, nests, or other special regions.
function generateCaveMaze(options = {}) {
  const width = Number(options.width);
  const height = Number(options.height);
  const gridWidth = Number(options.gridWidth);
  const gridHeight = Number(options.gridHeight);
  const cells = Array.isArray(options.cells) ? options.cells : [];
  const random = typeof options.random === "function" ? options.random : Math.random;
  const isOpen = typeof options.isOpen === "function" ? options.isOpen : () => true;
  const canPlace = typeof options.canPlace === "function" ? options.canPlace : () => true;
  const targetCount = Math.max(0, Math.floor(Number(options.targetCount) || 0));
  if (!(width > 0 && height > 0 && gridWidth > 0 && gridHeight > 0) || !cells.length || !targetCount) {
    return [];
  }

  const minCell = Math.min(gridWidth, gridHeight);
  const baseSize = Math.max(30, Math.min(66, minCell * 0.205));
  const walls = [];
  // A clear spoke is reserved through every cave entrance. Later formations
  // honor it, so multiple cave walls are less likely to seal a chamber shut.
  const entrances = [];
  const placedBuckets = new Map();
  const bucketSize = Math.max(45, baseSize * 1.2);
  const maxAttempts = Math.max(120, targetCount * 14);
  let attempts = 0;

  const rand = (min, max) => min + random() * (max - min);
  const distanceToSegment = (p, a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };

  function randomCellPoint() {
    const cell = cells[Math.floor(random() * cells.length)];
    if (!cell) return null;
    // Stay inside the chosen norm tile even when a map has a mixed room layout.
    return {
      x: Math.max(0, Math.min(width, cell.x + rand(-gridWidth * 0.34, gridWidth * 0.34))),
      y: Math.max(0, Math.min(height, cell.y + rand(-gridHeight * 0.34, gridHeight * 0.34))),
    };
  }

  function nearReservedEntrance(point, size) {
    const clearance = Math.max(70, size * 1.35);
    for (const entrance of entrances) {
      if (distanceToSegment(point, entrance.start, entrance.end) < clearance) return true;
    }
    return false;
  }

  function isDuplicate(point) {
    const bx = Math.floor(point.x / bucketSize);
    const by = Math.floor(point.y / bucketSize);
    for (let x = bx - 1; x <= bx + 1; x++) {
      for (let y = by - 1; y <= by + 1; y++) {
        const bucket = placedBuckets.get(x + ":" + y);
        if (!bucket) continue;
        for (const existing of bucket) {
          if (Math.hypot(point.x - existing.x, point.y - existing.y) < 24) return true;
        }
      }
    }
    return false;
  }

  function addWall(point, size) {
    if (walls.length >= targetCount || !point) return false;
    if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) return false;
    if (!isOpen(point) || nearReservedEntrance(point, size) || !canPlace(point, size) || isDuplicate(point)) return false;
    const wall = { x: point.x, y: point.y, size };
    walls.push(wall);
    const bx = Math.floor(point.x / bucketSize);
    const by = Math.floor(point.y / bucketSize);
    const key = bx + ":" + by;
    if (!placedBuckets.has(key)) placedBuckets.set(key, []);
    placedBuckets.get(key).push(wall);
    return true;
  }

  function createCave() {
    const center = randomCellPoint();
    if (!center || !isOpen(center)) return;
    const radius = rand(minCell * 0.62, minCell * 0.98);
    const size = rand(baseSize * 0.72, baseSize * 1.08);
    const slots = Math.max(9, Math.min(17, Math.round((Math.PI * 2 * radius) / (size * 1.9))));
    // Always leave a 2–4-segment doorway instead of completing a ring.
    const gapStart = Math.floor(random() * slots);
    const gapLength = random() < 0.3 ? 4 : (random() < 0.55 ? 3 : 2);
    const gapMiddle = (gapStart + (gapLength - 1) / 2) % slots;
    const gapAngle = (gapMiddle / slots) * Math.PI * 2;
    entrances.push({
      start: center,
      end: {
        x: center.x + Math.cos(gapAngle) * (radius + minCell * 0.95),
        y: center.y + Math.sin(gapAngle) * (radius + minCell * 0.95),
      },
    });

    for (let i = 0; i < slots && walls.length < targetCount; i++) {
      let offset = (i - gapStart + slots) % slots;
      if (offset < gapLength) continue;
      // Slight angular/radial noise makes the chamber irregular rather than a ring.
      const angle = (i / slots) * Math.PI * 2 + rand(-0.065, 0.065);
      const r = radius * rand(0.88, 1.12);
      const point = {
        x: center.x + Math.cos(angle) * r,
        y: center.y + Math.sin(angle) * r,
      };
      addWall(point, rand(baseSize * 0.72, baseSize * 1.12));
    }
  }

  function createWindingRidge() {
    let point = randomCellPoint();
    if (!point || !isOpen(point)) return;
    let angle = rand(0, Math.PI * 2);
    const steps = Math.floor(rand(6, 11));
    let gapStep = Math.floor(rand(2, Math.max(3, steps - 2)));
    let secondaryGap = random() < 0.45 ? Math.floor(rand(1, steps - 1)) : -1;
    for (let i = 0; i < steps && walls.length < targetCount; i++) {
      // A missing segment or two acts as a side entrance to the winding passage.
      if (i !== gapStep && i !== secondaryGap) {
        addWall(point, rand(baseSize * 0.68, baseSize * 1.03));
      }
      angle += rand(-0.38, 0.38);
      const step = rand(baseSize * 1.55, baseSize * 2.05);
      point = {
        x: point.x + Math.cos(angle) * step,
        y: point.y + Math.sin(angle) * step,
      };
      if (point.x < minCell * 0.25 || point.x > width - minCell * 0.25 ||
          point.y < minCell * 0.25 || point.y > height - minCell * 0.25) break;
    }
  }

  while (walls.length < targetCount && attempts < maxAttempts) {
    attempts++;
    // Caves are the primary motif; winding broken ridges connect and complicate them.
    if (random() < 0.68) createCave();
    else createWindingRidge();
  }

  return walls;
}

module.exports = generateCaveMaze;
