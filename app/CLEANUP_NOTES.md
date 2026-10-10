# Ranar's Prophecy — cleanup notes

This copy is the cleaned canonical project from the supplied archive.

## Repairs made

- Removed an accidental separator line from `JJ's Research Facility.js` that made the file invalid JavaScript.
- Fixed the Siege mode vote casing so the mode name remains `Siege` consistently and cannot become an invalid `siege` module path on the next server start.
- Made `serv.lock` and `serverState.json` resolve relative to the project directory rather than the process working directory.
- Made the existing `--port` argument in the start command functional. A platform-provided `PORT` takes precedence; otherwise `--port 3000` is used, with 8080 as the final fallback.
- Made lock-file cleanup tolerant of an already-missing lock file.
- Excluded the nested duplicate `app/` workspace, the unused broken root `definitions.js`, generated/runtime directories, and the real `.env` from this cleaned release.
- Added `.env.example` and `.gitignore` so secrets and generated files have safe placeholders/rules.

## Verification performed

- The current lag-contingency tree passes syntax checking for all 53 JavaScript files.
- All 40 top-level game-mode files remain present.
- `package.json`, `package-lock.json`, `serverState.json`, and the remaining JSON files parse successfully.
- The dependency-free load protection and adaptive game-loop regression suites pass.
- `npm ci --dry-run --offline` confirms the lockfile can resolve against the locally available package metadata; Node 22 warns that the declared target remains Node 16.x.

## Remaining verification limitation

The archive did not contain installed dependencies, and this environment could not fetch them. The live smoke test therefore used minimal controlled stubs for the third-party packages. A final run with `npm ci` on Node 16.x is still recommended before deployment.

The original archive contained a real `.env` with credentials; those values were intentionally not copied into this release. Restore them locally or through the hosting platform's secret/environment-variable settings.

## Adaptive simulation cadence (current update)

- Replaced the fixed game-loop interval with `lib/adaptiveGameLoop.js`, a single self-scheduling timer that cannot overlap itself or queue catch-up ticks.
- Normal operation maintains the nominal `room.cycleSpeed` cadence. As lag rises, configurable factors of 1.15x, 1.30x, 1.50x, 1.75x, and 2.00x apply at 75/100/150/200/250ms. The scheduler adds a proportional idle gap even when a tick itself exceeds the normal period, reducing simulation work per second.
- Scheduler cleanup is part of graceful shutdown. The existing `room.cycleSpeed`, socket update timing, and server/client packet format remain unchanged.
- `npm test` runs both dependency-free regression files, covering stage selection, recovery hysteresis, long-running cycles, single-timer ownership, and cancellation.
