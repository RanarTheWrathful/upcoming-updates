# INTELLECT / Orbit behavior rework

## Core rule

`INTELLECT` does not change a minion's configured orbit radius, leash distance, near-master radius, or the radius used by the autonomous ranged-combat standoff calculation. Those values continue to come from class configuration, the shared legacy-radius floor, body/target size, and the independent speed safety buffer. Increasing intellect only changes the orbiting method and decision cadence.

## Orbit tiers

- `INTELLECT <= 1`: continuous, predictable circular orbit around the target/aim anchor. Ranged combatants keep the current side and travel smoothly around the full ring instead of moving to one offset point and stopping.
- `2+`: stable identity-derived lane offsets help different entities avoid synchronizing into the same orbit. The radius remains unchanged.
- `8+`: the orbit gains a slow, persistent maneuver style on top of the continuous baseline circle.
- `32+`: a low-frequency angular weave is added. It changes angle, not radius.
- `128+`: orbit direction and cruise style can change at long maneuver boundaries, not every frame.
- `512+`: several persistent orbit speeds are available, including slow arcs and faster feints.
- `2048+`: the most varied pattern combines lane offsets, smooth weaving, and deliberate maneuver changes.

The same entity/target/age inputs always produce the same maneuver profile. Changes happen on long time intervals and angles are integrated continuously, so new styles do not teleport the movement goal around the ring. The orbit controller accounts for the moving waypoint velocity so braking does not cause the AI to stop at one point on the circle. High-intellect near-master controllers retain chosen destinations longer to reduce goal jitter.

## Validation

All present `tests/*.test.js` files passed individually. All JavaScript files passed `node --check`. Live gameplay has not been tested.
