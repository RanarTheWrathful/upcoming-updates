# Runtime load and memory contingencies

Ranar's Prophecy has a lightweight server-side load-protection controller. It monitors process memory and Node's event-loop delay once per second by default, and it measures the duration of each actual simulation cycle. It does not change the game/client packet format.

## Automatic stages

- **Normal:** the simulation and optional broadcasts/spawns run normally.
- **Elevated (75 ms):** mitigation begins immediately when a simulation cycle takes about 75 ms or event-loop p95 reaches 75 ms. Minimap/leaderboard updates are sent every 200 ms rather than every 100 ms.
- **High (150 ms):** minimap/leaderboard updates are sent every 500 ms, and optional food and bot spawning is reduced to every other eligible maintenance pass.
- **Critical (250 ms):** when a simulation cycle or event-loop p95 reaches 250 ms, the server starts an emergency suspension episode. It selects the eligible entity with the highest measured workload/structural-cost score, then considers another entity every 2.5 seconds while lag remains at or above 250 ms. Minimap/leaderboard updates are sent every second, optional food/bot spawning pauses, and new WebSocket sessions are temporarily rejected with close code 1013.

Each selected entity stays registered and retains its state. Its name changes to **`[Disabled]`** and its alpha fades to zero over 2.5 seconds. During this time it does not think, fire, collide, move, or regenerate. When load recovers below 250 ms, suspended entities enter a **`[Respawning...]`** state and fade back in over 2.5 seconds. Their original name, alpha, and nameplate setting are restored exactly, and gameplay resumes once the fade-in completes.

### Adaptive simulation cadence

The main simulation loop now uses a single self-scheduling timeout rather than a fixed `setInterval`. At normal load it preserves the existing nominal cycle cadence. When lag increases, it adds a controlled idle gap after each simulation cycle, including cycles that already exceed the nominal period. This reduces total simulation work per second instead of letting delayed interval callbacks run back-to-back. It never runs overlapping simulation cycles or queues catch-up bursts, and it does not change `room.cycleSpeed`, which remains unchanged for the existing socket-update timing and client protocol.

Default slowdown multipliers are **1.15x at 75 ms**, **1.30x at 100 ms**, **1.50x at 150 ms**, **1.75x at 200 ms**, and **2.00x at 250 ms** (about half the target tick rate at the critical threshold). Worsening lag escalates immediately. After ten consecutive healthy simulation cycles, the loop recovers one speed tier at a time to avoid oscillating around thresholds. These factors are configurable through the environment variables below. Slowdown primarily gives the event loop breathing room; it cannot make an individual expensive cycle itself compute faster, so the existing entity/spawn contingencies remain important.

If lag does not fall below 250 ms within 60 seconds of the emergency episode starting, the controller starts restoring all suspended entities and activates a suspension lockout. No additional entities are disabled until the measured lag falls below 250 ms. If load recovers earlier, the episode ends and restoration starts without activating that timeout lockout. Each new emergency episode can suspend entities again. These timings are configurable and use monotonic time.

### Entity opt-out (`KEEP`)

Player-controlled entities, bosses, dominators, map walls/gates, projectiles, protected entities, bonded turrets, and entities owned by a player/boss are excluded from automatic suspension. Player bodies and boss class definitions are marked `keep = true` automatically. For additional special cases, set `KEEP: true` in the entity class definition (the `define()` method reads this property), or set `entity.keep = true` at runtime. Both `entity.keep = true` and `entity.KEEP = true` are recognized. These hard-coded safety exclusions cannot be overridden just by setting `keep = false`.

The server cannot read an exact JavaScript heap-size figure for each individual object. Entity selection therefore uses sampled per-entity `life()` time, measured collision work, recent collision frequency, and a structural-size proxy (guns, turrets, controllers, children, and excluded targets). This targets the entity most likely to be causing work/lag; it is not an exact per-object memory measurement. Profiling is sampled conservatively and backs off as load rises: approximately 1/16 of entity updates and collisions during normal operation, 1/32 at elevated load, 1/64 at high load, and 1/128 at critical load. The profiler never increases its sampling rate during a lag spike, avoiding a feedback loop where measuring the slowdown adds more work. A `WeakMap` holds the metrics so profiling does not add properties to every entity or keep destroyed entities alive.

Lag actions respond immediately when a measured simulation cycle crosses 75/150/250 ms, and they respond on the same telemetry sample when event-loop p95 crosses those thresholds. The separate memory-pressure classification requires sustained samples in normal cases; reaching the configured critical memory fraction or critical 30-second memory-growth threshold triggers an immediate critical response. The controller keeps a bounded, 30-sample RSS history to catch sustained growth before the hard limit. Memory-stage recovery requires 10 healthy samples and descends one stage at a time. State changes are logged with memory, event-loop, and simulation-cycle measurements. No automatic process restart or forced garbage collection is attempted.

Minimap/leaderboard updates are delayed, not discarded: their existing delta snapshots remain in place until the next update, preserving the packet structure and allowing the next delta to include accumulated changes. Heartbeat/timeout checks continue every 100 ms even when map broadcasts are throttled.

## Network protections

- Inbound traffic is checked in 1.5-second windows. By default, a socket must exceed **450 messages in a window** for four consecutive windows before the traffic-volume guard kicks it. This threshold is intentionally generous to reduce false positives and can be tuned with `RANAR_MAX_REQUESTS_PER_WINDOW`.
- Outbound WebSocket backpressure is considered persistent only after the buffered data exceeds **4 MiB for 10 consecutive 100 ms checks**. Configure with `RANAR_MAX_SOCKET_BUFFER_BYTES` and `RANAR_SOCKET_BACKPRESSURE_WINDOWS`.
- The existing heartbeat check now reads `socket.status.lastHeartbeat` consistently.

## Environment configuration

All settings are optional; defaults are suitable as conservative starting points, not as universal resource limits.

| Variable | Default | Meaning |
|---|---:|---|
| `RANAR_LOAD_SAMPLE_MS` | `1000` | Monitoring interval in milliseconds |
| `RANAR_MEMORY_LIMIT_MB` | Auto-detected | Override the process/container memory limit used for RSS pressure calculations |
| `RANAR_LOAD_WARNING_MEMORY` | `0.75` | Elevated threshold, as a memory-limit fraction |
| `RANAR_LOAD_HIGH_MEMORY` | `0.86` | High threshold, as a memory-limit fraction |
| `RANAR_LOAD_CRITICAL_MEMORY` | `0.94` | Critical threshold, as a memory-limit fraction |
| `RANAR_LOAD_WARNING_DELAY_MS` | `75` | Elevated simulation-cycle duration or event-loop p95 delay |
| `RANAR_LOAD_HIGH_DELAY_MS` | `150` | High simulation-cycle duration or event-loop p95 delay |
| `RANAR_LOAD_CRITICAL_DELAY_MS` | `250` | Critical simulation-cycle duration or event-loop p95 delay; starts an entity-suspension episode |
| `RANAR_LOAD_RUN_SPEED_MULTIPLIER_75` | `1.15` | Simulation cadence slowdown factor at 75 ms lag |
| `RANAR_LOAD_RUN_SPEED_MULTIPLIER_100` | `1.3` | Simulation cadence slowdown factor at 100 ms lag |
| `RANAR_LOAD_RUN_SPEED_MULTIPLIER_150` | `1.5` | Simulation cadence slowdown factor at 150 ms lag |
| `RANAR_LOAD_RUN_SPEED_MULTIPLIER_200` | `1.75` | Simulation cadence slowdown factor at 200 ms lag |
| `RANAR_LOAD_RUN_SPEED_MULTIPLIER_250` | `2` | Simulation cadence slowdown factor at 250 ms lag |
| `RANAR_LOAD_SUSPEND_INTERVAL_MS` | `2500` | Delay between suspending additional eligible entities |
| `RANAR_LOAD_SUSPEND_WINDOW_MS` | `60000` | Maximum time spent progressively suspending entities before restoring all and entering lockout |
| `RANAR_LOAD_ENTITY_FADE_MS` | `2500` | Duration of each fade-out/fade-in visual transition |
| `RANAR_LOAD_TREND_SAMPLES` | `30` | Samples used for the bounded memory-growth window (10–300) |
| `RANAR_LOAD_WARNING_GROWTH_MB` | `64` | Elevated when RSS grows this many MB over the trend window |
| `RANAR_LOAD_HIGH_GROWTH_MB` | `128` | High when RSS grows this many MB over the trend window |
| `RANAR_LOAD_CRITICAL_GROWTH_MB` | `256` | Critical when RSS grows this many MB over the trend window |
| `RANAR_MAX_REQUESTS_PER_WINDOW` | `450` | Inbound messages per 1.5-second window |
| `RANAR_MAX_SOCKET_BUFFER_BYTES` | `4194304` | Outbound buffered bytes considered congested |
| `RANAR_SOCKET_BACKPRESSURE_WINDOWS` | `10` | Consecutive 100 ms congested checks before kicking a client |
| `RANAR_LAG_CLEANUP_BATCH_SIZE` | `32` | Maximum entity slots inspected per simulation cycle by the sustained-lag cleanup scanner |

The controller detects cgroup v2/v1 memory limits when available. Otherwise it falls back to the V8 heap-use ratio. If the host has a strict process-memory limit that cannot be detected automatically, set `RANAR_MEMORY_LIMIT_MB` to that limit.

## Validation

Run the dependency-free load-controller and adaptive-loop regression tests with:

```sh
npm test
```

The full server requires the dependencies declared in `package.json`. The controller is compatible with Node's built-in `perf_hooks` API; this project continues to declare Node 16.x as its target runtime.

## Sustained-lag entity policies (current defaults)

- **100 ms for 10 seconds:** pause recurring bot/natural entity spawns and food. Destroy unprotected entities labeled, named, or typed exactly `Unknown Entity` or `Unknown Class`; do not put them through the suspension/fade lifecycle. Explicit `KEEP` and other protected-entity rules still apply. Resume spawning after 10 seconds below 100 ms.
- **150 ms for 15 seconds:** destroy tagged naturally spawned entities that are outside every active spawned client's view.
- **200 ms for 15 seconds:** destroy every projectile and tagged naturally spawned entity visible in a client's view. Cleanup repeats every 2.5 seconds while the relevant condition remains active.
- Suspension fades, fade-ins, and sequential-selection cadence are **2.5 seconds**. The critical suspension episode keeps its 60-second cutoff and lockout until lag falls below 250 ms.
- High-cost selection emphasizes guns, turrets, and children as well as measured update/collision work; already-disabled and `[Respawning...]` entities are never candidates.
- One-time map structures are not marked as natural spawns and are excluded from routine cleanup. The client protocol remains unchanged.

Delayed special-boss/guardian/fallen spawn callbacks are also deferred while the spawn pause is active, so a sequence queued before a lag spike cannot bypass the contingency. One-time map structures remain untagged and are not removed by natural-spawn cleanup.
