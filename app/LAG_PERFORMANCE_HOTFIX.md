# Lag Performance Hotfix

## Why the previous contingency build could add lag

- The timing profiler increased its sample rate as the server got slower, reaching approximately half of entity updates and collision callbacks at higher load. Timing the work added more overhead at precisely the point where the server had the least spare time.
- The 150 ms and 200 ms cleanup policies each made a separate pass across the entity table on their 2.5-second cadence. When both policies were active this could trigger two full scans close together, with visibility tests for natural-spawn candidates.
- The unknown-label policy put `Unknown Entity` / `Unknown Class` objects through the fade/suspension lifecycle even though those objects can be destroyed directly.

## Changes

- Profiling now backs off as load rises: roughly 1/16 sampling at normal load, 1/32 at elevated load, 1/64 at high load, and 1/128 at critical load for both entity life and collision timing.
- Sustained-lag cleanup shares one scanner across the 100/150/200 ms rules. By default it inspects no more than 32 entity slots per simulation cycle, preventing a large synchronous full-table scan. If a stricter policy activates during a scan, the scan restarts once in the combined mode to ensure already-visited entities are checked against the new rule too.
- Entities labelled/named/typed exactly `Unknown Entity` or `Unknown Class` are destroyed after the 100 ms-for-10-seconds condition. They are not faded or marked as respawning. Explicit `KEEP` and other protected-entity rules still apply.
- Unknown-label matching no longer allocates a temporary array for every entity inspected.
- Added regressions for critical-load profiling backoff, incremental cleanup, name-only `Unknown Class`, and `KEEP` protection.
- Added `RANAR_LAG_CLEANUP_BATCH_SIZE` (default `32`) to tune the work budget if a deployment has a different entity population/tick rate.

## Validation

- `node tests/loadProtection.test.js` passes.
- All 51 JavaScript files pass `node --check`.
- All 3 project JSON files parse.
- All 40 game-mode files remain present.
- ZIP integrity check passes.

The dependency-free controller/scheduler tests and source checks pass. `npm ci --dry-run --offline` also passed, but a full real-dependency live server run has not been performed. `server.js` was changed to use the adaptive scheduler; the gameplay algorithms, nominal `room.cycleSpeed`, socket timing, and server-to-client packet format remain unchanged.


## Adaptive simulation cadence

The main game loop is now driven by a self-scheduling timeout. At normal load it preserves the previous nominal cadence; as lag reaches 75/100/150/200/250 ms, the scheduler applies configurable slowdown factors of 1.15x/1.30x/1.50x/1.75x/2.00x. The additional wait is proportional to the most recent cycle runtime, so a slow cycle is not followed by an immediate catch-up tick. Only one timer is queued, the loop never overlaps, and `room.cycleSpeed` and client packet structure are unchanged. It recovers one tier after ten healthy completed cycles. Unit tests cover escalation, recovery, overlong cycles, shutdown, and the single-pending-timer invariant.
