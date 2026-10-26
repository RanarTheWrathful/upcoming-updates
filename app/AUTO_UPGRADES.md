# Automatic score-based entity upgrades

Rules can be configured globally in `lib/autoUpgradeRules.js`, in the `AUTO_UPGRADE_RULES` array, or directly on an individual class export in `lib/definitions.js` using its `AUTO_UPGRADE_RULES` property. Class-level rules apply only while an entity is using that source class.

Each rule requires a numeric `score` and an `exports` array containing exact keys from the server's `Class` export object. `id` is optional: one export uses that export name as the ID; multiple exports use their sorted names joined with `+`. Set `id` manually only when you need to distinguish otherwise-identical export sets. If more than one export is listed, an automated tank randomly transforms into one valid target when its score reaches the threshold. If the entity's body has `isPlayer === true`, it receives all listed classes as selectable upgrade choices instead; choosing one completes that rule for the body so it is not offered repeatedly.

Example rule (commented out in the source so no unrequested class/score behavior is enabled by default):

```js
{
  // id: "advanced-siege-automata", // Optional override; defaults to export name(s).
  score: 250000,
  exports: ["sentry", "eliteSentry"],
  modes: ["siege"], // Optional; omit to use all modes.
  from: ["sentry"], // Optional; restrict source classes.
  spawnMessage: "{name} evolved into {label}!", // Optional broadcast.
}
```

Rules are checked each simulation cycle, including when an entity is outside its normal AI activation radius. Player-controlled minions are not automatically transformed, because their master is a player. Rule target strings must be exact `Class` export names, not display labels.

The bundled class-level rules currently configure these automated classes at 250,000 score:

- `triangleSwarmSentry` randomly upgrades to `elite_swarmer` or `elite_battleship`.
- `trianglePounderSentry` upgrades to `elite_destroyer`.
- `triangleTrapperSentry` randomly upgrades to `elite_gunner` or `elite_fortress`.
- `auto3Guard` upgrades to `Pawn` (the export whose displayed label is `Priest`).

When one of these source classes is an actual player body (`isPlayer === true`), its targets are added as selectable upgrades instead of changing the body automatically. For player classes that should receive rules regardless of a specific class-level declaration, add a global rule to the `AUTO_UPGRADE_RULES` array and use `from` to restrict which source classes qualify. The global array is intentionally empty by default.

Focused tests: `npm run test:auto-upgrade`. This includes integration tests against real class definitions.

## Optional spawn announcement

Add `spawnMessage` to a rule to broadcast a message when an automated entity reaches the threshold and upgrades. If the property is omitted or an empty string, no announcement is sent. Placeholders: `{entity}`, `{name}`, `{label}`, `{export}`, and `{score}`. For example:

```js
{
  id: "elite-sentry",
  score: 250000,
  exports: ["eliteSentry"],
  spawnMessage: "{name} evolved into {label}!",
}
```

The announcement is for automated transformations; player bodies that receive selectable upgrade options are not announced as having transformed.


### Supported source entity types

Class-level rules (`AUTO_UPGRADE_RULES` on a specific class export) can trigger for that exact class even when its runtime entity type is not `tank`. This is important for enemy definitions that inherit types such as `crasher` or `neutralBoss`. Player bodies marked `isPlayer === true` receive selectable options regardless of their runtime type. Global rules remain restricted to `tank` entities by default; use `from: ["exportName"]` to explicitly allow a non-tank source.


Runtime repair note: `Entity.define()` records the exact top-level source definition for each entity. Automatic class-level upgrade rules read from that retained definition rather than depending on a reverse lookup of aliased class indexes. The reverse index is only a compatibility fallback. Player rules add selectable options once, while automated entities uniformly choose among valid target exports at the score threshold.
