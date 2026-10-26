"use strict";

/**
 * Configure score-based automatic upgrades here.
 *
 * Each rule can contain:
 *   id: stable, unique identifier
 *   score: required skill.score value
 *   exports: one or more exact keys from Class (not the display label)
 *   modes: optional list of game modes; omit to allow every mode
 *   from: optional list of source Class export keys; omit to allow any tank
 *   spawnMessage: optional global message broadcast when an automated entity upgrades
 *
 * Non-player-controlled tanks randomly select one valid export when they meet
 * the score threshold. Player bodies receive all the exports as selectable
 * upgrades at that threshold. A chosen player option completes that rule so it
 * is not offered again after the class definition refreshes their upgrade list.
 */
const AUTO_UPGRADE_RULES = [
  // Example:
  // {
  //   id: "advanced-automata",
  //   score: 250000,
  //   exports: ["sentry", "eliteSentry"],
  //   modes: ["siege"],
  // },
];

// Class-level AUTO_UPGRADE_RULES are supported in addition to this global list.
// Definitions are indexed once per Class object, rather than scanning ~2,000
// exports every simulation tick for every entity.
const definitionIndexCache = new WeakMap();

function getDefinitionIndexMap(Class) {
  if (!Class || (typeof Class !== "object" && typeof Class !== "function")) return null;
  let index = definitionIndexCache.get(Class);
  if (index) return index;
  index = new Map();
  for (const [exportName, definition] of Object.entries(Class)) {
    if (!definition || (typeof definition !== "object" && typeof definition !== "function")) continue;
    if (definition.index == null) continue;
    // If aliases point at the same definition, they share its final index.
    index.set(definition.index, { exportName, definition });
  }
  definitionIndexCache.set(Class, index);
  return index;
}

function normalizeRules(value) {
  if (Array.isArray(value)) return value.filter((rule) => rule && typeof rule === "object");
  if (value && typeof value === "object") return [value];
  return [];
}

function getRulesForEntity(entity, Class, globalRules = AUTO_UPGRADE_RULES) {
  const rules = normalizeRules(globalRules).map((rule) => ({ rule, sourceExport: null, sourceIndex: null }));
  if (!entity) return rules;

  // Entity.define() records the exact last top-level definition. Prefer that
  // object over a class-index reverse lookup: aliased exports can share one
  // definition object/index and a reverse lookup can otherwise obscure which
  // source class the runtime entity actually selected.
  const sourceDefinition = entity._autoUpgradeSourceDefinition;
  let classRules = sourceDefinition && normalizeRules(sourceDefinition.AUTO_UPGRADE_RULES);
  let sourceExport = null;
  let sourceIndex = sourceDefinition && sourceDefinition.index != null ? sourceDefinition.index : entity.index;

  // The normal class-level path uses the retained definition reference and
  // does not scan every Class export per live entity tick. Reverse lookup is
  // only needed for compatibility with entities created before that reference
  // was recorded or by isolated callers/tests. If we *do* know the exact source
  // definition, an empty rule list is authoritative: never borrow another
  // aliased export's rule just because it shares the same runtime index.
  if (!sourceDefinition) {
    const current = getDefinitionIndexMap(Class)?.get(entity.index);
    classRules = current && normalizeRules(current.definition.AUTO_UPGRADE_RULES);
    sourceExport = current && current.exportName;
    sourceIndex = current && current.definition.index != null ? current.definition.index : entity.index;
  }
  for (const rule of classRules || []) {
    rules.push({ rule, sourceExport, sourceIndex });
  }
  return rules;
}

function getRuleId(rule) {
  if (!rule || typeof rule !== "object") return "";
  if (typeof rule.id === "string" && rule.id.trim()) return rule.id.trim();
  const names = (Array.isArray(rule.exports) ? rule.exports : typeof rule.export === "string" ? [rule.export] : [])
    .filter((name) => typeof name === "string" && name.trim())
    .map((name) => name.trim());
  if (!names.length) return "";
  const derived = [...new Set(names)].sort();
  return derived.length === 1 ? derived[0] : derived.join("+");
}

function getCompletedMap(entity) {
  if (!entity._autoUpgradeRulesCompleted || typeof entity._autoUpgradeRulesCompleted !== "object") {
    entity._autoUpgradeRulesCompleted = Object.create(null);
  }
  return entity._autoUpgradeRulesCompleted;
}

function markCompleted(entity, ruleId) {
  if (!entity || typeof ruleId !== "string" || !ruleId) return;
  getCompletedMap(entity)[ruleId] = true;
}

function isCompleted(entity, ruleId) {
  return Boolean(entity && entity._autoUpgradeRulesCompleted && entity._autoUpgradeRulesCompleted[ruleId]);
}

function isControlledByPlayer(entity) {
  if (!entity) return false;
  if (entity.isPlayer === true) return true;
  let master = entity.master;
  const visited = new Set([entity]);
  // Follow master links defensively; malformed ownership chains must not loop.
  for (let depth = 0; master && depth < 16 && !visited.has(master); depth++) {
    if (master.isPlayer === true) return true;
    visited.add(master);
    if (!master.master || master.master === master) break;
    master = master.master;
  }
  return false;
}

function resolveTargets(rule, Class) {
  if (!rule || !Class) return [];
  const exportNames = Array.isArray(rule.exports)
    ? rule.exports
    : typeof rule.export === "string" ? [rule.export] : [];
  const targets = [];
  const seen = new Set();
  for (const exportName of exportNames) {
    if (typeof exportName !== "string" || !exportName.trim()) continue;
    const target = Class[exportName];
    if (!target || (typeof target !== "object" && typeof target !== "function")) continue;
    if (target.index == null || seen.has(target)) continue;
    seen.add(target);
    targets.push({ exportName, target });
  }
  return targets;
}

function ruleAppliesToEntity(rule, entity, Class) {
  // A rule declared on a class export applies only while the entity is that
  // exact source class. Global rules can instead use an optional `from` list.
  if (rule._sourceIndex != null && entity.index !== rule._sourceIndex) return false;
  if (Array.isArray(rule.modes) && rule.modes.length && !rule.modes.includes(rule._currentMode)) return false;
  if (Array.isArray(rule.from) && rule.from.length) {
    const allowedIndices = rule.from
      .map((name) => Class && Class[name] && Class[name].index)
      .filter((index) => index != null);
    if (!allowedIndices.includes(entity.index)) return false;
  }
  return true;
}

function addRuleOptions(entity, rule, targets) {
  if (!Array.isArray(entity.upgrades)) entity.upgrades = [];
  for (const { target } of targets) {
    if (entity.index === target.index) continue;
    // If a regular class path already exposes this exact class and is available
    // at the current level, annotate that option rather than showing a duplicate.
    const existingAvailable = entity.upgrades.find((option) =>
      option && option.class === target && Number(entity.skill.level) >= Number(option.level || 0)
    );
    if (existingAvailable) {
      if (!Array.isArray(existingAvailable.autoUpgradeRuleIds)) existingAvailable.autoUpgradeRuleIds = [];
      if (!existingAvailable.autoUpgradeRuleIds.includes(rule.id)) existingAvailable.autoUpgradeRuleIds.push(rule.id);
      continue;
    }
    const existingRuleOption = entity.upgrades.find((option) =>
      option && option.class === target && Array.isArray(option.autoUpgradeRuleIds) && option.autoUpgradeRuleIds.includes(rule.id)
    );
    if (existingRuleOption) continue;
    entity.upgrades.push({
      class: target,
      tier: Number.isFinite(Number(rule.tier)) ? Number(rule.tier) : 0,
      level: 0,
      index: target.index,
      autoUpgradeRuleIds: [rule.id],
      autoUpgradeRule: true,
    });
  }
}

function update(entity, Class, options = {}) {
  // Do not gate on entity.type === "tank" here. Several valid rule sources in
  // definitions.js are autonomous "crasher" entities (for example sentries and
  // guards), so that check silently prevented both their AI transformations
  // and player-body unlocks. Discover eligible rules first, then restrict
  // *unscoped global* rules to tanks unless the rule explicitly names sources.
  if (!entity || !entity.skill || typeof entity.define !== "function") return false;
  const globalRules = Array.isArray(options.rules) ? options.rules : AUTO_UPGRADE_RULES;
  const rules = getRulesForEntity(entity, Class, globalRules);
  if (!rules.length) return false;
  const score = Number(entity.skill.score);
  if (!Number.isFinite(score)) return false;
  const playerControlled = isControlledByPlayer(entity);
  const mode = options.mode;
  const random = typeof options.random === "function" ? options.random : Math.random;

  for (const entry of rules) {
    const originalRule = entry.rule;
    const ruleId = getRuleId(originalRule);
    if (!originalRule || !ruleId || !Number.isFinite(Number(originalRule.score))) continue;
    if (score < Number(originalRule.score) || isCompleted(entity, ruleId)) continue;
    const rule = Object.assign({}, originalRule, {
      id: ruleId,
      _currentMode: mode,
      _sourceIndex: entry.sourceIndex,
    });
    if (!ruleAppliesToEntity(rule, entity, Class)) continue;

    // Class-level rules are explicitly attached to this exact definition and
    // may intentionally upgrade non-tank entity types such as "crasher" or
    // "neutralBoss". Global rules remain tank-only by default; a global rule
    // can opt another source type in by supplying `from: [...]`.
    const explicitlyScopedRule = entry.sourceIndex != null ||
      (Array.isArray(originalRule.from) && originalRule.from.length > 0);
    if (
      entity.isPlayer !== true &&
      entity.type !== "tank" &&
      !explicitlyScopedRule
    ) continue;

    const targets = resolveTargets(rule, Class).filter(({ target }) => target !== Class.genericEntity && target.index !== entity.index);
    if (!targets.length) continue;

    if (playerControlled) {
      // Only a true player body receives interactive upgrade choices. A player's
      // owned drones/minions are still automated and are not automatically changed.
      if (entity.isPlayer !== true) continue;
      addRuleOptions(entity, rule, targets);
      if (!entity._autoUpgradeRuleNotices || typeof entity._autoUpgradeRuleNotices !== "object") {
        entity._autoUpgradeRuleNotices = Object.create(null);
      }
      if (!entity._autoUpgradeRuleNotices[rule.id]) {
        entity._autoUpgradeRuleNotices[rule.id] = true;
        if (typeof entity.sendMessage === "function") {
          const names = targets.map(({ target }) => target.LABEL || target.label || "an available class");
          entity.sendMessage("Auto-upgrade unlocked at " + Number(originalRule.score).toLocaleString() + " score: " + names.join(", ") + ". Choose it from your upgrade menu.");
        }
      }
      continue;
    }

    // Entity must not be directly or indirectly controlled by a player.
    if (isControlledByPlayer(entity)) continue;
    const randomValue = Number(random());
    const normalizedRandom = Number.isFinite(randomValue) ? Math.max(0, Math.min(0.999999999999, randomValue)) : 0;
    const selected = targets[Math.min(targets.length - 1, Math.floor(normalizedRandom * targets.length))];
    if (!selected) continue;
    markCompleted(entity, rule.id);
    entity.define(selected.target);
    // define() normally leaves custom runtime properties alone, but set the
    // marker once more in case a class definition explicitly reset it.
    markCompleted(entity, rule.id);

    const configuredMessage = typeof originalRule.spawnMessage === "string"
      ? originalRule.spawnMessage
      : typeof originalRule.message === "string" ? originalRule.message : "";
    if (configuredMessage.trim()) {
      const targetLabel = selected.target.LABEL || selected.target.label || selected.exportName;
      const replacements = {
        "{entity}": String(entity.name || entity.label || targetLabel),
        "{name}": String(entity.name || targetLabel),
        "{label}": String(targetLabel),
        "{export}": String(selected.exportName),
        "{score}": String(score),
      };
      const message = configuredMessage.replace(/\{entity\}|\{name\}|\{label\}|\{export\}|\{score\}/g,
        (token) => replacements[token]);
      if (typeof options.broadcastMessage === "function") options.broadcastMessage(message, entity, selected);
      else if (typeof entity.sendMessage === "function") entity.sendMessage(message);
    }
    return { upgraded: true, ruleId: rule.id, exportName: selected.exportName, spawnMessage: configuredMessage || undefined };
  }
  return false;
}

module.exports = {
  AUTO_UPGRADE_RULES,
  getRuleId,
  getDefinitionIndexMap,
  getRulesForEntity,
  resolveTargets,
  isControlledByPlayer,
  markCompleted,
  isCompleted,
  update,
};
