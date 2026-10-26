"use strict";
const assert = require("assert");
const transformation = require("../lib/projectileTransformation/projectileTransformation");

let nextId = 100;
class MockEntity {
  constructor(position, master) {
    this.id = nextId++;
    this.x = position.x;
    this.y = position.y;
    this.master = master || this;
    this.team = master ? master.team : this.id;
    this.color = 1;
    this.SIZE = 12;
    this.size = 12;
    this.settings = { diesAtRange: false };
    this.health = { amount: 10, max: 10 };
    this.shield = { amount: 0, max: 0 };
    this.control = { goal: null, target: null };
    this.skill = { raw: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] };
    this.velocity = { x: 1, y: 2, direction: 1 };
    this.children = [];
  }
  define(definition) {
    if (!definition || typeof definition !== "object") return;
    if (definition.COLOR != null) this.color = definition.COLOR;
    if (definition.LABEL != null) this.label = definition.LABEL;
    if (definition.MOTION_TYPE != null) this.motionType = definition.MOTION_TYPE;
    if (definition.SHAPE != null) this.shape = definition.SHAPE;
    if (definition.DRAW_HEALTH != null) this.drawHealth = definition.DRAW_HEALTH;
    if (definition.GROWTH_FACTOR != null) this.growthFactor = definition.GROWTH_FACTOR;
    if (definition.SIZE != null) this.SIZE = definition.SIZE;
    if (definition.BODY) {
      for (const [key, value] of Object.entries(definition.BODY)) this[key] = value;
    }
    if (Array.isArray(definition.SKILL)) this.skill.raw = definition.SKILL.slice();
    if (definition.DIE_AT_RANGE != null) this.settings.diesAtRange = definition.DIE_AT_RANGE;
  }
  refreshBodyAttributes() {
    this.size = this.SIZE;
    this.health.max = Number(this.HEALTH) || 10;
    this.shield.max = Number(this.SHIELD) || 0;
  }
  life() { this.didLifeRun = true; }
}

const nativeSquare = {
  LABEL: "Square Drone",
  COLOR: 13,
  SHAPE: 4,
  MOTION_TYPE: "drift",
  BODY: { HEALTH: 11, DAMAGE: 2, SPEED: 3 },
};
const hexMods = { DRAW_HEALTH: true, GROWTH_FACTOR: 3 };
const profile = { label: "square source profile", type: [nativeSquare, hexMods] };
const master = { id: 7, team: -100, color: 3 };
const parent = { children: [] };
const projectile = {
  x: 25,
  y: 50,
  master,
  team: -100,
  color: 3,
  parent,
  source: master,
  velocity: { x: 4, y: -2, direction: 1.2 },
  settings: { diesAtRange: true },
  _projectileTransformAtRange: true,
  _projectileTransformProfile: profile,
  _projectileTransformSize: 9.6,
  SIZE: 999,
  SPEED: 3.5,
  HEALTH: 17,
  DAMAGE: 7,
  PENETRATION: 4,
  RANGE: 120,
  DENSITY: 2,
  PUSHABILITY: 1,
  skill: { raw: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] },
};
const replacement = transformation.transitionAtRange(projectile, MockEntity);
assert.ok(replacement instanceof MockEntity, "range transition creates a new entity");
assert.notStrictEqual(replacement, projectile, "the seed is replaced instead of mutated in place");
assert.strictEqual(replacement.label, "Square Drone");
assert.strictEqual(replacement.motionType, "drift");
assert.strictEqual(replacement.drawHealth, true);
assert.strictEqual(replacement.growthFactor, 3);
assert.strictEqual(replacement.x, 25);
assert.strictEqual(replacement.y, 50);
assert.strictEqual(replacement.team, -100);
assert.strictEqual(replacement.color, 13, "neutral-team replacement keeps the drone's native color");
assert.strictEqual(replacement.SIZE, 9.6, "replacement uses normal source-barrel scale, not the boss seed's giant size");
assert.strictEqual(replacement.DAMAGE, 7, "source barrel-calculated combat stats are retained");
assert.strictEqual(replacement.HEALTH, 17);
assert.deepStrictEqual(replacement.skill.raw, projectile.skill.raw);
assert.strictEqual(replacement.parent, parent);
assert.ok(parent.children.includes(replacement));
assert.strictEqual(replacement.didLifeRun, true);
assert.strictEqual(replacement._projectileTransformAtRange, false);
assert.strictEqual(projectile._projectileTransformationComplete, true);

const teamMaster = { id: 22, team: -2, color: 18 };
const teamProjectile = {
  x: 1, y: 2, master: teamMaster, team: -2, color: 18,
  velocity: { x: 0, y: 0, direction: 0 },
  settings: { diesAtRange: true },
  _projectileTransformAtRange: true,
  _projectileTransformProfile: { label: "normal team", type: nativeSquare },
  _projectileTransformSize: 8,
  skill: { raw: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
};
const teamReplacement = transformation.transitionAtRange(teamProjectile, MockEntity);
assert.strictEqual(teamReplacement.color, 18, "team-colored replacement inherits its owner's color");
assert.strictEqual(transformation.chooseProfile(["a", "b"], () => 0), "a");
assert.strictEqual(transformation.chooseProfile(["a", "b"], () => 0.5), "b");
assert.strictEqual(transformation.isNeutralTeamEntity({ team: -100, master }), true);

console.log("Reusable projectile transformation tests passed.");
