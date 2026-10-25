# Minion AI / Ramming Correction

## Cause

Some entities can inherit both `minion` and `mapTargetToGoal` controllers through multiple class definitions. `mapTargetToGoal` sets a direct target-position movement goal, which can overwrite the offset/orbit goal from `minion`, making a ranged AI drive directly into its target. An earlier intellect multiplier also tied intelligence to orbit radius, which confused decision quality with physical spacing.

## Fix

- `io_mapTargetToGoal` now defers direct movement when the entity has a minion steering controller, unless `aiSettings.forceDirectChase === true`. Player bodies are not affected by the safeguard.
- Autonomous ranged enemies and bosses use a fixed orbit radius independent of `INTELLECT`; their size/speed standoff safeguards remain active.
- Legacy class orbit distances are expanded: small 50–120 unit radii become at least 220 units, while already-large radii grow more gradually.
- The default shared orbit baseline is approximately 240 units at `INTELLECT: 1` for the default legacy radius. Higher intellect never widens or tightens that radius; it only changes angular phase, orbiting method, and maneuver timing.
- The fallback hang-out formation radius was increased from 30 to 65 so minions without a usable target goal do not clump on the master.
- When a target lock is available, ranged-combatant movement anchors to the target's real position, not the prediction point used for firing. Aim prediction can therefore no longer pull the movement goal through a fast-moving target.
- Each autonomous ranged entity starts on its current approach side when it acquires a target, then continuously traverses the ring. The angular movement is integrated smoothly and does not pick a new random flank each frame.
- High-speed entities get an additional speed-based standoff buffer. Motor-mode AI accounts for both its radial approach speed and the orbit waypoint’s tangential velocity when braking, so following a moving orbit point is not mistaken for overshooting a stationary destination.
- The previous abrupt power toggle based on current target distance has been removed; power now depends on distance to the actual attack point.
- Ordinary melee AI without a minion controller still uses direct target pursuit.

## Validation

Run `npm run test:minion-movement` or `npm run test:intellect`. Regression checks cover minion-vs-direct-chase priority, preserving melee chase, player control, explicit override, autonomous ranged classification, size-aware standoff, stable attack-side selection, locked-target movement anchoring, and approach braking. Other focused suites were also run while preparing this edit. Live gameplay remains unverified.
