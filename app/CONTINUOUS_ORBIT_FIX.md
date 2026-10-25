# Classic Minion Orbit Restored

## What was changed

The custom world-space orbit integrator and fixed attack-stance movement have been removed from `io_minion`. The controller again uses the original target-relative offset formula from the project baseline, including the original leash/repel logic and the `0.7` movement-power reduction near the desired orbit distance.

The earlier request to widen unusually tight formations is retained as a separate radius policy for positive configured `ORBIT_DISTANCE` values. Explicit zero/negative settings are preserved.

The `mapTargetToGoal` safeguard remains so it cannot overwrite a minion controller's movement goal with a direct collision-course chase. Existing INTELLECT targeting, predictive aiming, and projectile evasion remain available. During an active projectile-dodge plan, the minion controller temporarily respects the dodge goal, then resumes the classic orbit.

## Deliberately removed from the minion orbit

- No persistent world-space `_orbitPhase` integration.
- No separate fixed attack lane for ranged combatants/bosses.
- No standoff/braking controller that replaces the classic minion steering formula.
- No intellect-based orbit-radius adjustment.

## Validation

Focused tests compare the live orbit helper against the classic formula, verify the radius policy is separate, and ensure active evasion goals are not overwritten. Live gameplay has not been tested.
