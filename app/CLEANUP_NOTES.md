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

- All 99 JavaScript source files in the supplied project tree pass Node syntax checking.
- All 39 game-mode configuration modules load successfully.
- `package.json`, `package-lock.json`, and `serverState.json` parse successfully.
- The server was smoke-tested through room initialization and HTTP/WebSocket listen using controlled stubs for unavailable third-party packages. No uncaught startup/runtime exception occurred before shutdown.

## Remaining verification limitation

The archive did not contain installed dependencies, and this environment could not fetch them. The live smoke test therefore used minimal controlled stubs for the third-party packages. A final run with `npm ci` on Node 16.x is still recommended before deployment.

The original archive contained a real `.env` with credentials; those values were intentionally not copied into this release. Restore them locally or through the hosting platform's secret/environment-variable settings.
