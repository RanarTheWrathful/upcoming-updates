"use strict";

function normalizeSpecialEffects(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const unique = [...new Set(values.filter((effect) => typeof effect === "string" && effect.length > 0))];
  // "none" is a legacy empty marker. When other effects are present it adds
  // no meaning and should not shadow any active tags.
  return unique.length > 1 ? unique.filter((effect) => effect !== "none") : unique;
}

function hasSpecialEffect(entity, effect) {
  if (!entity || typeof effect !== "string" || !effect) return false;
  const effects = entity.specialEffect;
  // Collision handling calls this helper many times per pair. Do not normalize
  // into a new Set/Array for a read-only membership check.
  if (!Array.isArray(effects)) return effects === effect;
  if (!effects.includes(effect)) return false;
  // Preserve normalizeSpecialEffects()'s legacy rule: "none" is removed when
  // any other non-empty effect is present.
  if (effect === "none") {
    for (let i = 0; i < effects.length; i++) {
      if (typeof effects[i] === "string" && effects[i] && effects[i] !== "none") return false;
    }
  }
  return true;
}

function hasAnySpecialEffect(entity) {
  if (!entity) return false;
  const effects = entity.specialEffect;
  if (Array.isArray(effects)) {
    for (let i = 0; i < effects.length; i++) {
      if (typeof effects[i] === "string" && effects[i] && effects[i] !== "none") return true;
    }
    return false;
  }
  return typeof effects === "string" && effects.length > 0 && effects !== "none";
}

function addSpecialEffect(entity, effect) {
  if (!entity || typeof effect !== "string" || !effect) return [];
  const effects = normalizeSpecialEffects(entity.specialEffect).filter((item) => item !== "none");
  if (!effects.includes(effect)) effects.push(effect);
  entity.specialEffect = effects;
  return effects;
}

function removeSpecialEffect(entity, effect) {
  if (!entity) return [];
  const effects = normalizeSpecialEffects(entity.specialEffect).filter((item) => item !== effect);
  entity.specialEffect = effects.length ? effects : ["none"];
  return entity.specialEffect;
}

module.exports = { normalizeSpecialEffects, hasSpecialEffect, hasAnySpecialEffect, addSpecialEffect, removeSpecialEffect };
