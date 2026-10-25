# Automatic score-based entity upgrades

Configure score thresholds in `lib/autoUpgradeRules.js`, in the `AUTO_UPGRADE_RULES` array.

Each rule requires a unique `id`, a numeric `score`, and an `exports` array containing exact keys from the server's `Class` export object. If more than one export is listed, an automated tank randomly transforms into one valid target when its score reaches the threshold. If the entity's body has `isPlayer === true`, it receives all listed classes as selectable upgrade choices instead; choosing one completes that rule for the body so it is not offered repeatedly.

Example configuration (commented out in the source so no unrequested class/score behavior is enabled by default):

```js
{
  id: "advanced-siege-automata",
  score: 250000,
  exports: ["sentry", "eliteSentry"],
  modes: ["siege"], // Optional; omit to use all modes.
  from: ["sentry"], // Optional; restrict source classes.
}
```

Rules are checked each simulation cycle, including when an entity is outside its normal AI activation radius. Player-controlled minions are not automatically transformed, because their master is a player. Rule target strings must be exact `Class` export names, not display labels.

Focused tests: `node tests/autoUpgradeRules.test.js`.
