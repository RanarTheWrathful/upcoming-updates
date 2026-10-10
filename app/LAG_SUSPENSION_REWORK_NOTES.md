# Lag suspension and sustained-load contingencies

## Runtime behavior

- Ordinary mitigation begins at 75 ms and increases at 150 ms.
- At 250 ms or higher, the controller suspends the highest-cost eligible entity immediately; another is considered every 2.5 seconds while lag remains critical.
- Candidate scoring combines measured update/collision cost with a strong structural-cost term. Entities with many guns, turrets, and children receive higher priority. This is a workload proxy; JavaScript does not expose reliable per-entity heap byte counts.
- An entity already marked `_loadDisabled`, named `[Disabled]`, or named `[Respawning...]` is never selected again.
- After 60 seconds continuously at/above 250 ms, critical-suspended entities begin restoration and the sequence locks out further critical suspensions until lag drops below 250 ms. Earlier recovery ends the episode and begins restoring critical-suspended entities immediately.
- Each fade-out, fade-in, and next-entity selection interval defaults to 2.5 seconds.

## Sustained-lag rules

All timers use measured simulation-cycle duration or Node event-loop p95 delay, and require continuous time above the threshold:

- **100 ms for 10 seconds:** pause recurring bot/natural entity spawning and food generation. Unprotected entities whose label, name, or type is exactly `Unknown Entity` or `Unknown Class` are destroyed directly, not disabled or faded. Spawning resumes after lag remains below 100 ms for 10 seconds.
- **150 ms for 15 seconds:** destroy tagged naturally spawned entities outside every spawned client's viewing rectangle. This includes regular recurring crasher/sentinel/thrasher/lasher/spark/undead spawns, standard bots, and naturally spawned food. Projectiles are reserved for the more severe 200 ms rule.
- **200 ms for 15 seconds:** destroy all projectiles and all tagged naturally spawned entities currently in a client's viewing rectangle. Both cleanup policies repeat every 2.5 seconds while their respective lag thresholds persist.

Entities are marked as naturally spawned at known recurring spawn sites. One-time room structures—such as maze walls, gates, portals, and other setup-time objects—are not marked, so routine cleanup cannot mistake them for recurring population. Rare conditional Voidlord spawns are marked special rather than ordinary natural spawns. Natural cleanup also protects explicit `KEEP` entities, known bosses, player entities, bonded turrets, and protected/map structures.

Food's local registry continues to be refreshed even while new food is paused, and destroyed bots are removed from the local bot registry. This avoids retaining objects after emergency cleanup.

## Visual and gameplay lifecycle

At suspension, the entity's name becomes `[Disabled]`, its nameplate is temporarily enabled, and alpha fades to zero. While suspended or fading back in, the entity stays out of AI, firing, movement, collision, and regeneration.

When restoration begins, the name becomes `[Respawning...]` and alpha fades toward its original visible value. At the end of the 2.5-second fade-in, the original name, exact original alpha, and original nameplate property are restored, and gameplay resumes. If recovery begins during fade-out, the fade reverses smoothly.

The visual effect uses the existing entity `name` and `alpha` update fields. No client packet layout or FastTalk protocol changes were made.

## Safety and configuration

- `KEEP: true`, `this.keep = true`, `entity.keep = true`, `entity.KEEP = true`, and `settings.KEEP = true` opt entities out of temporary suspension.
- Player-controlled entities, bosses, bonded turrets, map structures, dominators, protected entities, and related support entities are never selected for the critical suspension sequence.
- The 200 ms cleanup rule is intentionally stronger: it removes all projectiles, including player-fired projectiles. Natural entity destruction remains limited to tagged recurring spawns and respects protection/special-spawn markers.
- Visibility is determined from active spawned views' viewing rectangles; this check runs only during sustained-lag cleanup, not in every entity tick.

## Configurable defaults

- `RANAR_LOAD_SUSPEND_INTERVAL_MS=2500`
- `RANAR_LOAD_SUSPEND_WINDOW_MS=60000`
- `RANAR_LOAD_ENTITY_FADE_MS=2500`
- `RANAR_LAG_100_DURATION_MS=10000`
- `RANAR_LAG_150_DURATION_MS=15000`
- `RANAR_LAG_200_DURATION_MS=15000`
- `RANAR_LAG_CLEANUP_INTERVAL_MS=2500`
- `RANAR_LAG_POLICY_RECOVERY_MS=10000`

## Validation

- `node tests/loadProtection.test.js` passes, including disabled/respawning exclusion, structural prioritization, 2.5-second transitions/cadence, one-minute lockout, sustained 100/150/200 ms policies, unknown-label destruction, on/off-screen cleanup, repeated projectile cleanup, and preservation of unmarked one-time structures.
- All project JavaScript files pass syntax checks; JSON configs parse; game-mode files are present; the ZIP passes integrity validation.
- Full startup with real npm dependencies still needs verification under the project's declared Node 16 runtime because this environment cannot fetch uncached packages.
