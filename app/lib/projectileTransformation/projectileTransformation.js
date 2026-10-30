"use strict";

// Reusable profile-driven projectile transformation. A gun can supply profiles
// describing the projectile settings/type a source barrel would use, and a
// projectile definition can opt in with TRANSFORM_ON_RANGE_END: true. The shot
// is calculated from one randomly selected profile, then is replaced at range
// by an entity built from that profile's type and the same calculated stats.

const BODY_FIELDS = Object.freeze([
  "SPEED",
  "HEALTH",
  "RESIST",
  "DAMAGE",
  "PENETRATION",
  "RANGE",
  "DENSITY",
  "PUSHABILITY",
  "HETERO",
  "heteroMultiplier",
]);

function unitRandom(random = Math.random) {
  const value = Number(typeof random === "function" ? random() : 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(0.9999999999999999, value));
}

function chooseProfile(profiles, random = Math.random) {
  if (!Array.isArray(profiles) || profiles.length === 0) return null;
  return profiles[Math.floor(unitRandom(random) * profiles.length)] || profiles[0] || null;
}

function normalizeProfiles(profiles, options = {}) {
  if (!Array.isArray(profiles)) return [];
  return profiles
    .filter((profile) => profile && profile.TYPE && profile.SHOOT_SETTINGS)
    .map((profile) => {
      const type = profile.TYPE;
      const sourceSize = Number(profile.SOURCE_BODY_SIZE);
      const width = Number(profile.PROJECTILE_WIDTH);
      return {
        label: String(profile.LABEL || "Transformed entity"),
        type,
        settings: profile.SHOOT_SETTINGS,
        projectileWidth: Number.isFinite(width) && width > 0
          ? width
          : Number(options.defaultProjectileWidth) > 0 ? Number(options.defaultProjectileWidth) : 1,
        sourceBodySize: Number.isFinite(sourceSize) && sourceSize > 0
          ? sourceSize
          : Number(options.defaultSourceBodySize) > 0 ? Number(options.defaultSourceBodySize) : 12,
        natural: typeof options.getNatural === "function" ? options.getNatural(type) : {},
        calculator: profile.STAT_CALCULATOR == null
          ? options.defaultCalculator
          : profile.STAT_CALCULATOR,
        sourceProfile: profile,
      };
    });
}

function sourceScaledProjectileSize(parentSize, parentClassSize, profileWidth, settingsSize, sourceBodySize) {
  const parentSizeNumber = Number(parentSize);
  const parentClassSizeNumber = Number(parentClassSize);
  const width = Number(profileWidth);
  const settingSize = Number(settingsSize);
  const parentScale = Number.isFinite(parentSizeNumber) && parentSizeNumber > 0 &&
    Number.isFinite(parentClassSizeNumber) && parentClassSizeNumber > 0
    ? parentSizeNumber / parentClassSizeNumber
    : 1;
  const normalizedWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const normalizedSettingsSize = Number.isFinite(settingSize) && settingSize > 0 ? settingSize : 1;
  const sourceSizeNumber = Number(sourceBodySize);
  const sourceSize = Number.isFinite(sourceSizeNumber) && sourceSizeNumber > 0
    ? sourceSizeNumber
    : 12;
  return Math.max(0.1, parentScale * sourceSize * normalizedWidth * normalizedSettingsSize / 2);
}

function getCalculatedBody(entity) {
  const body = {};
  for (const field of BODY_FIELDS) {
    if (entity && entity[field] != null && Number.isFinite(Number(entity[field]))) {
      body[field] = Number(entity[field]);
    }
  }
  return body;
}

function isNeutralTeamEntity(entity) {
  // Standalone/free-for-all entities are assigned their own entity id as team.
  // Team-colored entities instead inherit a faction/AI team and must inherit
  // their owner's color when the replacement drone is spawned.
  return Boolean(
    entity && entity.team != null && (
      Number(entity.team) === -100 ||
      entity.master && Number(entity.master.id) === Number(entity.team)
    )
  );
}

function hasRangeTransformation(entity) {
  return Boolean(
    entity && entity.settings && entity.settings.diesAtRange === true &&
    entity._projectileTransformAtRange === true &&
    entity._projectileTransformProfile &&
    !entity._projectileTransformationComplete
  );
}

function transitionAtRange(projectile, Entity) {
  if (typeof Entity !== "function" || !hasRangeTransformation(projectile)) return null;
  const profile = projectile._projectileTransformProfile;
  const definitions = Array.isArray(profile.type) ? profile.type : [profile.type];
  if (!definitions.length || !definitions[0]) return null;

  const transformed = new Entity({ x: projectile.x, y: projectile.y }, projectile.master);
  for (const definition of definitions) {
    if (definition && (typeof definition === "object" || typeof definition === "function")) {
      transformed.define(definition);
    }
  }

  // The selected drone definition establishes its motion/controller/color
  // behavior. Only then are the source barrel's calculated combat stats copied
  // over, keeping custom properties such as drone shields and growth intact.
  const neutralColor = transformed.color;
  const body = getCalculatedBody(
    projectile._projectileTransformBody || projectile
  );
  const rawSkills = projectile.skill && Array.isArray(projectile.skill.raw)
    ? projectile.skill.raw.slice()
    : undefined;
  const transformSize = Number(projectile._projectileTransformSize);
  const size = Number.isFinite(transformSize) && transformSize > 0
    ? transformSize
    : Number(projectile.SIZE) > 0 ? Number(projectile.SIZE) : transformed.SIZE;
  const replacementDefinition = { BODY: body, SIZE: size };
  if (rawSkills && rawSkills.length === 10) replacementDefinition.SKILL = rawSkills;
  transformed.define(replacementDefinition);

  transformed.master = projectile.master;
  transformed.source = projectile.source || projectile.master;
  const oldParent = projectile.parent;
  transformed.parent = oldParent;
  if (oldParent && Array.isArray(oldParent.children) && !oldParent.children.includes(transformed)) {
    oldParent.children.push(transformed);
  }

  transformed.team = projectile.team;
  transformed.color = isNeutralTeamEntity(projectile)
    ? neutralColor
    : projectile.master && projectile.master.color != null
      ? projectile.master.color
      : projectile.color;
  transformed.facing = projectile.facing;
  transformed.vfacing = projectile.vfacing;
  transformed.velocity = projectile.velocity;
  transformed._projectileTransformProfile = profile;
  transformed._projectileTransformAtRange = false;
  transformed._projectileTransformationComplete = true;
  transformed.range = Math.max(1, Number(transformed.RANGE) || 200);
  transformed.control.goal = { x: transformed.x, y: transformed.y };
  transformed.control.target = { x: 0, y: 0 };
  transformed.refreshBodyAttributes();
  transformed.health.amount = transformed.health.max;
  transformed.shield.amount = transformed.shield.max;
  transformed.life();
  projectile._projectileTransformationComplete = true;
  return transformed;
}

module.exports = {
  BODY_FIELDS,
  unitRandom,
  chooseProfile,
  normalizeProfiles,
  sourceScaledProjectileSize,
  getCalculatedBody,
  isNeutralTeamEntity,
  hasRangeTransformation,
  transitionAtRange,
};
