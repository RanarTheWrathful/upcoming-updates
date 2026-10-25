# Minion Orbit Baseline Reset

This revision restores the original target-relative `io_minion` movement formula as the baseline for future orbit tuning.

- The controller no longer integrates a separate world-space orbit angle.
- It no longer picks a persistent attack-side stance for ranged entities/bosses.
- It restores the original `alt` leash/repel logic and the original reduced power when near the orbit band.
- Positive `ORBIT_DISTANCE` values retain the separately requested wider-spacing policy; explicit zero/negative values are preserved.
- `mapTargetToGoal` still defers when a minion controller is present, preventing a second controller from replacing the classic orbit goal with direct chase.
- Existing INTELLECT targeting, aiming prediction, and projectile evasion remain. An active evasion goal temporarily overrides the orbit goal, after which classic movement resumes.

Orbit-specific INTELLECT maneuvering is intentionally disabled in the standard `minion` controller for this baseline reset. It can be reintroduced incrementally after this version has been tested in game.

Validation: all 9 test files in the supplied archive passed individually, and all 83 JavaScript files passed `node --check`. Live gameplay was not tested.
