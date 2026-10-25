# Automatic score-based entity upgrades

Configure score thresholds in `lib/autoUpgradeRules.js`, in the `AUTO_UPGRADE_RULES` array.

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

Focused tests: `node tests/autoUpgradeRules.test.js`.

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
