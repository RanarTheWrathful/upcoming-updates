# Render deployment and graceful update shutdown

This project uses Render's native zero-downtime deployment lifecycle. Render starts a replacement instance, waits for it to pass its health check, switches traffic, and then sends `SIGTERM` to the old instance. The old instance treats that signal as an update only when Render's latest live deploy commit differs from its own `RENDER_GIT_COMMIT`.

## Required configuration on BOTH the testing and official Web Services

1. **Health check path:** set the service health check path to `/healthz`.
2. **Render API key:** add `RENDER_API_KEY` containing an account API key that can read the service's deploys. Render supplies `RENDER_SERVICE_ID` and `RENDER_GIT_COMMIT` automatically; do not hardcode either service ID or hostname.
3. **Shared score recovery:** create one Render Key Value service (Redis) and set its *internal connection URL* as `REDIS_URL` on both game services. The code namespaces keys by `RENDER_SERVICE_ID`, so testing and official scores cannot be restored into each other. Do not attach a persistent disk to either web service: Render disables zero-downtime deploys for services with an attached persistent disk.
4. **Shutdown allowance:** configure `maxShutdownDelaySeconds: 90` for each Web Service. The Apocalypse close sequence can take about 42.5 seconds (2.5-second close start + 10-second Apocalypse delay + 30-second final window), so Render's default 30-second shutdown allowance is insufficient.

If the services are managed by a Render Blueprint, add these properties to each existing web service entry (keep your actual service names, branches, build commands, and start commands):

```yaml
healthCheckPath: /healthz
maxShutdownDelaySeconds: 90
```

If the services are not Blueprint-managed, configure the health check in each service's Settings and set `maxShutdownDelaySeconds` through the Render service configuration/API. Merely adding a `render.yaml` file to a repository does not change an existing Dashboard-managed service unless you adopt it as a Blueprint.

## What happens on a code deployment

- Render starts the replacement separately; the old process does not try to fork or bind the replacement's port.
- Render only sends the old process `SIGTERM` after the replacement is healthy and traffic has switched.
- The old process compares its commit with the latest live deploy using the Render API. A different commit activates the update sequence.
- The old process broadcasts `Closing the server for updates.`, runs `closeArena()`, and spawns the Living Apocalypses in the old instance. It keeps the old simulation and WebSocket clients alive through the existing Apocalypse/final-disconnect sequence.
- At the end, it stores player scores in Redis for five minutes, disconnects the old clients, and exits. The replacement can consume each score once.

A same-commit restart, scale-down, or other ordinary `SIGTERM` does not activate the Apocalypse update sequence and does not create score-recovery entries. Fatal JavaScript errors do save score-recovery entries. A forced `SIGKILL` (for example, an out-of-memory kill) cannot run application cleanup and therefore cannot save scores.

## Maze performance

Plain square maze walls are now marked as static map geometry. They remain in the collision broad phase and continue colliding with players, projectiles, and other gameplay entities, but their per-tick AI/lifecycle and movement integration are skipped. Static maze-wall pairs are also filtered before collision dispatch because fixed wall blocks do not need to collide with one another. Custom maze-wall classes with guns, turrets, or controllers retain their normal lifecycle.

## Local development

Without `REDIS_URL`, the existing JSON-file recovery store is used. This is suitable for local restarts only; it is not shared between Render instances. Without `RENDER_API_KEY`, Render update detection deliberately falls back to ordinary shutdown rather than guessing that every `SIGTERM` is a code deployment.
