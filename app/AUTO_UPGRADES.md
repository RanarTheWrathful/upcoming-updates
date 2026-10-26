# Automatic score-based entity upgrades

Rules can be configured globally in `lib/autoUpgradeRules/autoUpgradeRules.js`, in the `AUTO_UPGRADE_RULES` array, or directly on an individual class export in `lib/definitions.js` using its `AUTO_UPGRADE_RULES` property. Class-level rules apply only while an entity is using that source class.

Each rule requires a numeric `score` and an `exports` array containing exact keys from the server's `Class` export object. `id` is optional: one export uses that export name as the ID; multiple exports use their sorted names joined with `+`. Set `id` manually only when you need to distinguish otherwise-identical export sets.

When a score threshold is reached, player bodies and bots receive the valid target classes as upgrade-menu options. A bot makes one uniform decision for a newly available tier/unlock: every eligible class choice and the explicit decision to skip have equal probability. The bot does not immediately transform just because its score reaches the threshold. Unmanaged non-bot NPCs can still automatically transform into one random valid export.

Example rule (commented out in the source so no unrequested class/score behavior is enabled by default):

```js
{
  // id: "advanced-siege-automata", // Optional override; defaults to export name(s).
  score: 250000,
  exports: ["sentry", "eliteSentry"],
  modes: ["siege"], // Optional; omit to use all modes.
  from: ["sentry"], // Optional; restrict source classes.
  spawnMessage: "{name} evolved into {label}!", // Optional broadcast for an automatic NPC transform.
}
```

Rules are checked each simulation cycle, including when an entity is outside its normal AI activation radius. Player-controlled minions are not automatically transformed or given independent bot decisions, because their master is a player. Rule target strings must be exact `Class` export names, not display labels.

The bundled class-level rules currently configure these classes at 250,000 score:

- `triangleSwarmSentry` adds `elite_swarmer` and `elite_battleship` as choices.
- `trianglePounderSentry` adds `elite_destroyer` as a choice.
- `triangleTrapperSentry` adds `elite_gunner` and `elite_fortress` as choices.
- `auto3Guard` adds `Pawn` (the export whose displayed label is `Priest`) as a choice.

For each one, players may select a class manually and bots choose randomly from the choices plus skipping. Unmanaged NPCs still use automatic transformations. When one of these source classes is a player body (`isPlayer === true`), its targets are added as selectable upgrades. For classes that should receive rules regardless of a specific class-level declaration, add a global rule to the `AUTO_UPGRADE_RULES` array and use `from` to restrict which source classes qualify. The global array is intentionally empty by default.

Bots at 1,000,000 score can also receive faction- and mode-appropriate legendary class choices from their existing team; those classes are offered as options rather than being forced onto the bot. The legendary class list remains an option at 2,500,000 score, subject to the mode and eligibility restrictions.

Focused tests: `npm run test:auto-upgrade`. The archive may omit other tests referenced by the broad `npm test` script; run the included `tests/*.test.js` files individually to validate the included suite.

## Optional spawn announcement

Add `spawnMessage` to a rule to broadcast a message when an unmanaged NPC automatically transforms at the score threshold. If the property is omitted or an empty string, no announcement is sent. Placeholders: `{entity}`, `{name}`, `{label}`, `{export}`, and `{score}`. For example:

```js
{
  id: "elite-sentry",
  score: 250000,
  exports: ["eliteSentry"],
  spawnMessage: "{name} evolved into {label}!",
}
```

Player bodies and bots that receive selectable options are not announced as having transformed until they actually choose an upgrade.

### Supported source entity types

Class-level rules (`AUTO_UPGRADE_RULES` on a specific class export) can trigger for that exact class even when its runtime entity type is not `tank`. This is important for enemy definitions that inherit types such as `crasher` or `neutralBoss`. Player bodies marked `isPlayer === true` receive selectable options regardless of runtime entity type. Global rules remain restricted to `tank` entities by default; use `from: ["exportName"]` to explicitly allow a non-tank source.

`Entity.define()` records the exact top-level source definition for each entity. Automatic class-level upgrade rules use that retained definition rather than relying on a reverse lookup of aliased class indexes. The reverse index is a compatibility fallback.
