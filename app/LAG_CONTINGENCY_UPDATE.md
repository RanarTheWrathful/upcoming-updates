# Lag contingency update

## Threshold behavior

- **75 ms:** Immediately enter elevated mitigation based on measured simulation-cycle duration or event-loop p95 delay. Optional minimap/leaderboard broadcasts are reduced.
- **150 ms:** Escalate mitigation; optional food and bot spawning is reduced.
- **250 ms:** Begin an emergency suspension episode. Disable the highest-cost eligible entity immediately, then select another every five seconds for as long as lag remains at or above 250 ms. Selection excludes already-suspended entities and obeys the `KEEP` protections below.
- **After 60 seconds of uninterrupted critical lag:** Start fading every suspended entity back in and set a lockout. The controller will not suspend more entities until lag falls below 250 ms. If lag drops below 250 ms earlier, restoration begins immediately without activating the timeout lockout.

## Suspension visual and lifecycle

A suspended entity's name changes to `[Disabled]` and its alpha fades to zero over five seconds. It remains registered and its state is retained, but normal AI/life, movement, collision, firing, and health regeneration are skipped. Its nameplate is temporarily enabled so the status is actually sent to clients, using the existing `name` and `alpha` delta fields; the network packet format does not change.

When recovery begins, the name becomes `[Respawning...]` and alpha fades back in over five seconds. The original name, original alpha value, and original nameplate setting are restored exactly when the fade completes. Gameplay simulation resumes at that point, not while the entity is still invisible. If an entity is destroyed during a transition, its transition state is pruned without retaining the entity indefinitely.

The additional behavior is configurable through `RANAR_LOAD_SUSPEND_INTERVAL_MS` (5000), `RANAR_LOAD_SUSPEND_WINDOW_MS` (60000), and `RANAR_LOAD_ENTITY_FADE_MS` (5000). Timing is measured using a monotonic clock.

## Entity protection

Use `KEEP: true` in a class definition or set `this.keep = true` / `entity.keep = true` at runtime. `entity.KEEP = true` and `settings.KEEP = true` are also honored. Player-controlled entities are automatically protected; boss-marked entities are protected by default. Projectiles, bonded turrets, map walls/gates, dominators, and explicitly protected entities are also excluded from emergency suspension.

Suspension does not destroy the selected entity or change the network packet format. Gameplay remains paused through fade-out and fade-in, so an entity cannot collide, move, or fire while invisible. The previous name, alpha, and nameplate setting are restored at the end of the five-second fade-in.

## Validation

- `tests/loadProtection.test.js` passes, including exact 75/150/250 ms thresholds, five-second staggered selection, fade-out/fade-in, original-state restoration, `KEEP` protection, the 60-second cutoff, and lockout clearing below 250 ms.
- All JavaScript files pass `node --check`.
- All JSON files parse and all 40 game-mode files remain present.
- `npm ci --dry-run --offline --ignore-scripts` passes the lockfile consistency check. The environment's actual offline install cannot complete because the `ws@8.18.0` tarball is not cached; a full run with real dependencies should be performed under the project's declared Node 16 runtime before deployment.
