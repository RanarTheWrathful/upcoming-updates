"use strict";

function normalizeSpecialEffects(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const unique = [...new Set(values.filter((effect) => typeof effect === "string" && effect.length > 0))];
  // "none" is a legacy empty marker. When other effects are present it adds
  // no meaning and should not shadow any active tags.
  return unique.length > 1 ? unique.filter((effect) => effect !== "none") : unique;
}

function hasSpecialEffect(entity, effect) {
  if (!entity) return false;
  const effects = normalizeSpecialEffects(entity.specialEffect);
  return effects.includes(effect);
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

module.exports = { normalizeSpecialEffects, hasSpecialEffect, addSpecialEffect, removeSpecialEffect };
