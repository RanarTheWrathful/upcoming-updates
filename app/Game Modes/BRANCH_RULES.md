# Per-entity branch exceptions and hidden branch unlocks

The standard `UPGRADES_TIER_*` lists remain the default source of upgrade options. Two layers of exceptions can now narrow or extend them without changing the global class definition for every entity.

## Mode-specific exclusions

Add `TANK_BRANCH_EXCEPTIONS` to a mode config to remove selected options from a source class in that mode only:

```js
TANK_BRANCH_EXCEPTIONS: {
  fallenLegendaryClasses: {
    "1": ["exclusiveFactionTankA", "exclusiveFactionTankB"],
    "all": ["unavailableTank"],
  },
},
```

The source and excluded class names must exist. Tier keys accept `"0"`–`"15"`, `"god"`, or `"all"`. Exclusions are applied after `TANK_BRANCHES`, so a class listed here stays excluded even if another mode branch added it.

## Entity-specific exceptions

Place `BRANCH_OVERRIDES` on an entity definition when only that class/definition should change its own upgrade options:

```js
BRANCH_OVERRIDES: {
  remove: ["otherFactionTank"], // remove from every tier
  removeByTier: { "1": ["factionSpecificTank"] },
  addByTier: { "2": ["exceptionOnlyTank"] },
},
```

Names are strings resolved against `lib/definitions.js`. The override changes the spawned entity's own option list; it does not mutate the global source class tree. This is suitable for faction-specific forms, special spawns, and exceptions inherited from a special class.

## Unlocking a secret branch by defeating a special enemy

Put `BRANCH_UNLOCK_ON_KILL` on the enemy that grants the unlock:

```js
BRANCH_UNLOCK_ON_KILL: {
  id: "hidden-guardian-branch",
  tiers: {
    "3": ["secretGuardianTank"],
    // "god": ["secretUltimateTank"],
  },
  message: "You have unlocked the Guardian's hidden branch!",
  // once: false, // optional; defaults to true
},
```

Only player-controlled tanks that helped kill the enemy receive the branch. Unlocks are added to that player's current upgrade options, never to the shared global definitions. Repeated kills do not duplicate an option or re-send the message by default. The id is optional but recommended when you want multiple distinct rewards on the same enemy.
