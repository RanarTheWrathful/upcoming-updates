# Lag contingency update — October 2026

- Excluded already-disabled and `[Respawning...]` entities from selection.
- Reduced sequential suspension cadence and both visual fades from 5 seconds to 2.5 seconds.
- Increased gun/turret/child structural weighting in entity candidate scoring.
- Added sustained 100 ms / 10 s spawn-and-food pause plus temporary disabling of `Unknown Entity` / `Unknown Class` entities.
- Added sustained 150 ms / 15 s cleanup for off-screen tagged natural spawns.
- Added sustained 200 ms / 15 s cleanup for all projectiles and on-screen tagged natural spawns.
- Natural-spawn tags are applied at known recurring spawn/food sites; setup-time maze walls and other one-time map structures remain untagged. Special/rare conditional Voidlord spawn variants are explicitly protected.
- Kept food and bot registries in sync with destroyed entities to avoid stale references.
- Added deterministic regression tests for all rules. The server/client wire format is unchanged.

Delayed special-boss/guardian/fallen spawn callbacks are also deferred while the spawn pause is active, so a sequence queued before a lag spike cannot bypass the contingency. One-time map structures remain untagged and are not removed by natural-spawn cleanup.
