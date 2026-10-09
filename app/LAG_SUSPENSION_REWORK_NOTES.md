# Progressive lag suspension and visual recovery

## Runtime behavior

- Mitigation still begins at 75 ms and escalates at 150 ms.
- At 250 ms or higher, the controller suspends the highest-cost eligible entity immediately.
- While lag remains at or above 250 ms, another eligible entity is selected every 5 seconds.
- If lag does not drop below 250 ms within 60 seconds of the episode starting, all suspended entities begin restoration and the controller locks out further suspensions until lag falls below 250 ms.
- If lag drops below 250 ms earlier, the episode ends and restoration starts immediately without the 60-second lockout.
- Each fade-out and fade-in lasts 5 seconds by default. These values are environment-configurable.

## Visual and gameplay lifecycle

At suspension, the entity's name becomes `[Disabled]`, a nameplate is temporarily enabled so the label reaches clients, and alpha fades to zero. While suspended or fading back in, the entity is kept out of AI, firing, movement, collision, and regeneration. This avoids invisible entities continuing to affect gameplay.

When restoration starts, the label becomes `[Respawning...]` and alpha fades toward the entity's original visible alpha. At the end of the fade-in, the original name, exact original alpha value, and original nameplate property are restored, and gameplay resumes.

The implementation reuses the existing `name` and `alpha` fields in entity-photo deltas. No client packet layout or FastTalk protocol changes were made.

## Safety and cleanup

- `KEEP: true`, `this.keep = true`, `entity.keep = true`, `entity.KEEP = true`, and `settings.KEEP = true` remain supported.
- Players, bosses, projectiles, bonded turrets, map structures, dominators, protected entities, and related support entities remain excluded.
- Entities already marked dead are not candidates.
- Destroyed entities are removed from the suspension tracking map on the next controller update.
- Selection still estimates workload/structural cost; it does not claim to know exact per-entity JavaScript heap bytes.

## Configurable defaults

- `RANAR_LOAD_SUSPEND_INTERVAL_MS=5000`
- `RANAR_LOAD_SUSPEND_WINDOW_MS=60000`
- `RANAR_LOAD_ENTITY_FADE_MS=5000`

## Validation performed

- `node tests/loadProtection.test.js` passes, including fade timing, label/nameplate changes, exact restoration of original visual state, staggered suspension, the one-minute cutoff, lockout/re-arm behavior, `KEEP` exclusions, and destroyed-entity cleanup.
- All 51 JavaScript files pass `node --check`.
- All 3 JSON files parse; all 40 game-mode JavaScript files remain present.
- `npm ci --dry-run --offline --ignore-scripts` passes lockfile consistency. This environment cannot fetch uncached production packages, so a full real-dependency server run should still be performed in the project's declared Node 16 environment before deployment.
