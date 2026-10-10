# Run-Speed Contingency Update

## Behavior

The main simulation loop now uses `lib/adaptiveGameLoop.js` instead of a fixed `setInterval`. The scheduler is self-scheduling, has only one pending timer, does not overlap ticks, and does not queue catch-up bursts. Under normal conditions it preserves the previous nominal cadence. Under load, it adds an idle gap after each cycle, proportional to both the slowdown factor and the cycle runtime, so even an overlong cycle is followed by a deliberate pause.

The scheduler does not change `room.cycleSpeed`, the socket-update timing, any gameplay algorithm, or the server-to-client packet format.

## Default lag response

| Measured lag | Slowdown multiplier | Approx. target tick rate |
|---:|---:|---:|
| Below 75 ms | 1.00x | 100% |
| 75 ms | 1.15x | 87% |
| 100 ms | 1.30x | 77% |
| 150 ms | 1.50x | 67% |
| 200 ms | 1.75x | 57% |
| 250 ms or above | 2.00x | 50% |

The slowdown escalates immediately. After ten consecutive completed cycles below the current speed tier, the scheduler recovers one tier toward normal. Recovery is intentionally gradual to avoid oscillation near a threshold.

## Configuration

Optional environment variables:

- `RANAR_LOAD_RUN_SPEED_MULTIPLIER_75` (default `1.15`)
- `RANAR_LOAD_RUN_SPEED_MULTIPLIER_100` (default `1.3`)
- `RANAR_LOAD_RUN_SPEED_MULTIPLIER_150` (default `1.5`)
- `RANAR_LOAD_RUN_SPEED_MULTIPLIER_200` (default `1.75`)
- `RANAR_LOAD_RUN_SPEED_MULTIPLIER_250` (default `2`)

A multiplier must be at least `1`; invalid or nonpositive values fall back to defaults. These are cadence slowdown factors, not changes to projectile physics, entity speed stats, or the networking protocol.

## Validation

- `npm test` passes both dependency-free controller/scheduler suites.
- All 53 JavaScript files pass `node --check`.
- All 40 top-level game-mode JavaScript files remain present.
- All three JSON files parse.
- `npm ci --dry-run --offline` succeeds against the available local npm metadata. It emits the existing warning that the project declares Node 16.x while the test host is Node 22.
- A full server runtime with actual installed dependencies was not run during this update.
