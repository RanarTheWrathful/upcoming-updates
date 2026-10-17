# Adding mode-specific tank branches

Any `Game Modes/*.js` file can append additional tank upgrades without replacing
its existing upgrade tree. Add a `TANK_BRANCHES` object to that mode's exported
settings:

```js
TANK_BRANCHES: {
  basic: {
    "1": ["twin", "sniper"],
    "2": ["machineGun"],
  },
  someOtherTank: {
    "god": ["godTank"],
  },
},
```

Each key at the first level is the existing source tank class name. Each nested
key is the upgrade tier (`"0"` through `"15"`, or `"god"`), and each value is a
list of class names to add at that tier. These entries are **appended** to the
source tank's existing `UPGRADES_TIER_*` list, with duplicates ignored. The
referenced source and upgrade class names must exist in `lib/definitions.js`; a
mistyped name or tier stops startup with a useful error instead of silently
breaking the branch.

For mode-specific branch exclusions, per-entity branch exceptions, and secret branches unlocked by defeating an enemy, see [BRANCH_RULES.md](./BRANCH_RULES.md).
