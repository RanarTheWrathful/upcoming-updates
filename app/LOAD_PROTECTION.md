# Runtime load and memory contingencies

Ranar's Prophecy now has a lightweight server-side load-protection controller. It monitors process memory and Node's event-loop delay once per second by default. It does not change the game/client packet format and does not throttle collision resolution, physics, AI updates, weapons, health effects, or regeneration.

## Automatic stages

- **Normal:** the simulation and optional broadcasts/spawns run normally.
- **Elevated:** minimap/leaderboard updates are sent every 200 ms rather than every 100 ms.
- **High:** minimap/leaderboard updates are sent every 500 ms, and optional food and bot spawning is reduced to every other eligible maintenance pass.
- **Critical:** minimap/leaderboard updates are sent every second, optional food/bot spawning pauses, and new WebSocket sessions are temporarily rejected with close code 1013. Existing gameplay loops continue to run.

Escalation requires repeated samples (three samples for elevated/high; two for critical event-loop delay). Reaching the configured critical memory fraction or critical 30-second memory-growth threshold triggers an immediate critical response. The controller keeps a bounded, 30-sample RSS history to catch sustained growth before the hard limit. Recovery requires 10 healthy samples and descends one stage at a time. State changes are logged with memory and event-loop measurements. No automatic process restart or forced garbage collection is attempted.

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
| `RANAR_LOAD_WARNING_DELAY_MS` | `50` | Elevated event-loop p95 delay |
| `RANAR_LOAD_HIGH_DELAY_MS` | `100` | High event-loop p95 delay |
| `RANAR_LOAD_CRITICAL_DELAY_MS` | `250` | Critical event-loop p95 delay |
| `RANAR_LOAD_TREND_SAMPLES` | `30` | Samples used for the bounded memory-growth window (10–300) |
| `RANAR_LOAD_WARNING_GROWTH_MB` | `64` | Elevated when RSS grows this many MB over the trend window |
| `RANAR_LOAD_HIGH_GROWTH_MB` | `128` | High when RSS grows this many MB over the trend window |
| `RANAR_LOAD_CRITICAL_GROWTH_MB` | `256` | Critical when RSS grows this many MB over the trend window |
| `RANAR_MAX_REQUESTS_PER_WINDOW` | `450` | Inbound messages per 1.5-second window |
| `RANAR_MAX_SOCKET_BUFFER_BYTES` | `4194304` | Outbound buffered bytes considered congested |
| `RANAR_SOCKET_BACKPRESSURE_WINDOWS` | `10` | Consecutive 100 ms congested checks before kicking a client |

The controller detects cgroup v2/v1 memory limits when available. Otherwise it falls back to the V8 heap-use ratio. If the host has a strict process-memory limit that cannot be detected automatically, set `RANAR_MEMORY_LIMIT_MB` to that limit.

## Validation

Run the dependency-free controller regression tests with:

```sh
node tests/loadProtection.test.js
```

The full server requires the dependencies declared in `package.json`. The controller is compatible with Node's built-in `perf_hooks` API; this project continues to declare Node 16.x as its target runtime.
