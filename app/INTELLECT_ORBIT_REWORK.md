# INTELLECT and Minion Orbit Baseline

The standard `minion` controller remains restored to the original target-relative movement formula, including its leash/repel behavior and near-orbit power reduction. INTELLECT does not change its configured orbit radius or replace its goal with a custom attack stance.

INTELLECT is now a controller-specific decision layer. At exactly `1`, controller outputs remain at baseline, apart from rare opportunistic smart actions. Fractional positive values reduce awareness, prediction precision, movement commitment, and smart-action likelihood. Higher values increase tactical target evaluation, movement-power adaptation, wall-aware routing, prediction, projectile evasion/interception, path recovery, and controller-specific strategy choices. Negative values reverse the completed controller-stack intent once, rather than inverting each stacked controller independently.

Projectile evasion can temporarily override the classic minion goal when a hostile projectile is predicted to threaten the entity; the classic orbit resumes after the dodge. Higher intellect can also temporarily aim and fire at an imminent hostile projectile when the entity has usable guns and its targeting mode allows interception.

Positive configured `ORBIT_DISTANCE` values retain the previously requested wider-spacing policy. Explicit zero/negative values are not expanded. The direct-chase safeguard remains so `mapTargetToGoal` cannot replace minion steering with a straight-line ram.


At `INTELLECT >= 32`, hostile-target controllers can also coordinate their focus fire: short-lived target claims let allied high-intellect bots prefer another viable target when a teammate already has one covered. Target preferences are sticky enough to avoid oscillation, and this does not change baseline target behavior. Higher-intellect boomerangs keep the same outbound/dwell/return lifecycle but reduce the dwell interval; `boomerangToMaster` tracks the master's current position for its return.
