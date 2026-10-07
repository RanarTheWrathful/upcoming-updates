# Ranar's Prophecy – Optimization Pass

## Scope
This pass focused on reducing per-tick allocations, avoiding repeated distance calculations, removing unnecessary work from the collision/activation loops, and trimming unused runtime dependencies without intentionally changing gameplay rules.

## Changes
- Replaced `Math.pow(x, 2)` distance calculations with direct multiplication in the shared utility and vector length getters.
- Reworked `nearest()` from a priority-queue allocation/sort-style approach to a single linear nearest-target scan.
- Reworked the mockup geometry's two priority-queue selections into direct linear maximum-distance scans.
- Removed the now-unused `google-closure-library` dependency and references.
- Removed the unused `express` dependency.
- Fixed `sortByDistance()` so it actually compares squared distances instead of comparing the entity objects themselves.
- Reduced allocations in `getEntitiesFromRange()` by replacing chained `map()`/`filter()` calls with one loop.
- Reused the active-entity array and collision AABB arrays across game ticks instead of replacing them every cycle.
- Removed redundant activation checks during collision processing because activation was already established when `activeEntities` was built.
- Replaced several hot-path `forEach()` callbacks with indexed loops.
- Reused collision arrays by clearing their length instead of allocating new arrays per entity/tick.
- Consolidated the 10-second socket-list cooldown scheduling so the timer is checked once per live iteration instead of once per entity.
- Removed repeated temporary `Vector` creation from several AI proximity/distance checks and cached the target length/direction in `io_minion`.
- Reduced temporary allocations and repeated distance calculations in `simplecollide`, `polycollide`, `reversecollide`, `firmcollide`, and `reflectcollide`.
- Added a tiny zero-distance guard in firm/reflect collision math to prevent avoidable division-by-zero NaNs.

## Verification
- Every JavaScript source file passes `node --check`.
- `package.json`, `package-lock.json`, and `serverState.json` parse successfully.
- `npm ls --package-lock-only --depth=0` reports no dependency problems.
- All 40 JavaScript files in `Game Modes/` load successfully under the controlled test environment.
- The server reaches room initialization and successfully opens its HTTP/WebSocket listener in a controlled smoke test.
- The server removes its lock file during graceful shutdown.

## Important limitation
The environment does not have the project's full production dependency installation available from the network, so the live smoke test uses controlled test doubles for third-party runtime modules. This verifies server initialization/control flow, but it is not a substitute for a production run with the real packages and the project's declared Node 16.x environment.
