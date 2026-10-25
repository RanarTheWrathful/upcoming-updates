# Auto-upgrade integration repair

## Root cause

The live update hook called `autoUpgradeRules.update()` every simulation cycle, but the module immediately returned for any entity whose runtime `type` was not exactly `"tank"`. The configured class-specific upgrade sources inherit `TYPE: "crasher"`, so the rules could never run for their intended automated entities or for player bodies using those classes.

## Fix

- Class-specific `AUTO_UPGRADE_RULES` now apply to the exact source class even when its runtime entity type is `crasher`, `neutralBoss`, or another non-tank type.
- Any entity marked `isPlayer === true` can receive the configured options as player upgrades, regardless of runtime entity type.
- Player-controlled minions remain protected from automatic transformation; only the player's actual body receives selectable upgrade choices.
- Global rules without a `from` list remain tank-only. Global rules can target non-tank entities by explicitly specifying `from: ["exportName"]`.
- Existing random target selection, score thresholds, export-based rule IDs, optional spawn announcements, and completion tracking remain intact.

## Regression coverage

`tests/autoUpgradeIntegration.test.js` now constructs the real configured source classes as runtime type `crasher` and verifies that automated transformations occur and player bodies receive both selectable upgrade choices. `tests/autoUpgradeRules.test.js` checks that unscoped global rules do not affect arbitrary non-tanks and that a scoped global rule can target a non-tank source.
