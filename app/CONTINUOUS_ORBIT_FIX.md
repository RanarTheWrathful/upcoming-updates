# Continuous Orbit Fix

## What was wrong

The `INTELLECT: 1` maneuver returned zero angular speed. Autonomous ranged entities therefore moved to one selected point on the orbit ring and stopped there. The ordinary `minion` controller also used a small aim-relative offset rather than integrating an orbit angle around the current target/aim center.

## What changed

- `INTELLECT: 1` now performs a continuous, predictable orbit.
- The standard `minion` controller tracks a target-relative orbit angle instead of reaching one fixed offset point and parking.
- Autonomous ranged enemies and bosses advance their attack stance smoothly around the actual locked target position.
- The orbit radius stays independent of intellect; it still comes from class settings and existing size/speed safety rules.
- Higher intellect changes orbit direction/speed patterns at persistent maneuver boundaries and gradually varies angular motion. It does not choose a fresh random point each frame.
- Orbit speed is capped based on body movement capability and ring radius, so slow entities are not commanded to chase an impossible tangential speed.
- The braking calculation accounts for the orbit waypoint's tangential velocity and maintains steering power while following a moving waypoint. Real braking is retained when a motor-driven entity closes too quickly.
- Projectile evasion remains available at its existing intellect thresholds. A dodge can temporarily interrupt orbit only when the evasion system detects a relevant incoming projectile; normal orbital movement resumes afterward.

## Validation

All `tests/*.test.js` files included in this archive passed individually, and all project JavaScript files passed `node --check`. Live gameplay has not been tested.
