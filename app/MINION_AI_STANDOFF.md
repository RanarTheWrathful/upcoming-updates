# Minion AI / Ramming Correction

## Cause

Some entities can inherit both `minion` and `mapTargetToGoal` controllers through multiple class definitions. `mapTargetToGoal` sets a direct target-position movement goal, which can overwrite the offset/orbit goal from `minion`, making a ranged AI drive directly into its target. Separately, the prior intellect orbit multiplier shrank orbit distance at high values.

## Fix

- `io_mapTargetToGoal` now defers direct movement when the entity has a minion steering controller, unless `aiSettings.forceDirectChase === true`. Player bodies are not affected by the safeguard.
- Autonomous ranged enemies and bosses use a non-shrinking, modestly increasing orbit scale as `INTELLECT` rises.
- Legacy class orbit distances are expanded: small 50–120 unit radii become at least 220 units, while already-large radii grow more gradually.
- The default orbit is approximately 240 units at `INTELLECT: 1`; higher intellect widens minion formations further, up to a bounded 1.6x intellect multiplier.
- The fallback hang-out formation radius was increased from 30 to 65 so minions without a usable target goal do not clump on the master.
- When a target lock is available, ranged-combatant movement anchors to the target's real position, not the prediction point used for firing. Aim prediction can therefore no longer pull the movement goal through a fast-moving target.
- Each autonomous ranged entity chooses its attack lane from its current approach side when it acquires a target. The angle remains fixed until that target changes, preventing frame-to-frame orbit/flank changes.
- High-speed entities get an additional speed-based standoff buffer. Motor-mode AI uses distance and relative velocity to brake as it approaches its desired attack point, including reverse acceleration when it is closing too quickly.
- The previous abrupt power toggle based on current target distance has been removed; power now depends on distance to the actual attack point.
- Ordinary melee AI without a minion controller still uses direct target pursuit.

## Validation

Run `npm run test:minion-movement` or `npm run test:intellect`. Regression checks cover minion-vs-direct-chase priority, preserving melee chase, player control, explicit override, autonomous ranged classification, size-aware standoff, stable attack-side selection, locked-target movement anchoring, and approach braking. Other focused suites were also run while preparing this edit. Live gameplay remains unverified.
