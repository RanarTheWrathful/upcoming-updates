# Render deployment handoff

The application does not require a Render API key, Redis URL, or other custom environment variables to run its deployment handoff.

## How the handoff works

- Render starts the replacement instance and waits until it is live.
- Render sends `SIGTERM` to the old instance after switching traffic.
- The old instance treats that `SIGTERM` as the handoff signal, broadcasts `Closing the server for updates.`, closes its arena, spawns the Living Apocalypses, then disconnects its old clients and exits.
- The update shutdown is intentionally shortened to fit Render's default 30-second termination window.

## Important limitation

Render does not provide a deployment-only signal to the application. It also uses `SIGTERM` for ordinary stops and restarts. Therefore, any Render `SIGTERM` will run the Apocalypse handoff, including a manual restart or service stop. This is the only automatic in-process policy that does not require an API key or a separate coordination service.

## Score recovery

The application retains its local five-minute score-recovery store for local/shared-filesystem hosting. Render instances do not share their filesystems, so this local store cannot transfer scores to a replacement container. Cross-instance score recovery would require shared storage or a client-carried signed recovery token; neither can be achieved by a server-only local file.

## Health checks

The application exposes `/healthz`. If the service uses a configured Render health check, set its path to `/healthz` so Render only routes traffic to an initialized instance.
