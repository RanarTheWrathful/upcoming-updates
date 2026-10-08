# Collision / Socket Traffic Bugfix

## Collision NaN regression
- Restored the original activation checks to the collision callback.
- Added finite-state validation before spatial/AABB collision work.
- Added immediate recovery when an entity has invalid position, velocity, or acceleration.
- Hardened simple/poly/reverse/firm/reflect collision math against invalid or zero distances.
- Hardened advanced collision direction calculation for coincident entities (zero-length separation).
- Hardened advanced collision motion normalization when relative motion is zero.
- Normalized invalid/zero penetration values before using them as divisors in collision damage calculations.
- Discarded invalid collision damage results instead of propagating Infinity/NaN into health and physics.

## Socket traffic violation regression
- The previous 50-packets-per-1.5-second threshold was too low for active clients because normal gameplay produces multiple packets per update.
- The shared traffic monitor now allows up to 180 packets per 1.5-second window (120 packets/sec) before counting a violation.
- A kick requires four consecutive over-limit windows.
- The server-to-client packet format was not changed.

## Validation
- 48 JavaScript files pass Node syntax validation.
- 39 game-mode files remain present.
- 3 JSON files validate.
- Collision safety audit confirms no raw zero-distance normalization remains.
