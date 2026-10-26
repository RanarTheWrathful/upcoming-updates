# Auto-upgrade integration repair

## Root cause

The live update hook called `autoUpgradeRules.update()` every simulation cycle, but the module immediately returned for any entity whose runtime `type` was not exactly `"tank"`. The configured class-specific upgrade sources inherit `TYPE: "crasher"`, so the rules could never run for their intended automated entities or for player bodies using those classes.

## Fix

- Class-specific `AUTO_UPGRADE_RULES` now apply to the exact source class even when its runtime entity type is `crasher`, `neutralBoss`, or another non-tank type.
- Any entity marked `isPlayer === true` can receive the configured options as player upgrades, regardless of runtime entity type.
- Player-controlled minions remain protected from automatic transformation and independent bot decisions; only the player's actual body receives selectable upgrade choices.
- Bots now receive all targets from score-based rules as upgrade choices, and their choice is uniformly random across each eligible class plus a skip option. Non-bot NPCs retain automatic transformation behavior.
- Global rules without a `from` list remain tank-only. Global rules can target non-tank entities by explicitly specifying `from: ["exportName"]`.
- Score thresholds, export-based rule IDs, optional spawn announcements, and completion tracking remain intact. Bot choices use the shared option list rather than automatic transformations.

## Regression coverage

`tests/autoUpgradeIntegration.test.js` constructs real source classes as runtime type `crasher` and verifies bots receive the configured selectable options while non-bot NPCs can still auto-transform. `tests/autoUpgradeRules.test.js` checks global and source-scoped rules, player option behavior, and protections for player-controlled minions.
