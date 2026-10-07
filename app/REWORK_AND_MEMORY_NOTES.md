# Ranar's Prophecy — Rework & Memory-Lifecycle Pass

## Main lifecycle fixes

- Fixed `util.remove()` so an invalid index is a safe no-op instead of creating an `array[-1]` property and accidentally retaining an object.
- Made entity destruction idempotent with an explicit destroyed flag and key validation.
- Removed destroyed entities from the live entity table and deleted their per-key physics state.
- Broke master/source/parent references during destruction.
- Removed destroyed children from parent child arrays, including duplicate defensive cleanup.
- Removed destroyed entities from `possiblyChildren` sets and the protected-entity list.
- Removed destroyed entities from minimap/view registries.
- Fixed turret lifecycle retention: destroying a turret now removes it from its bond/master's `turrets` array and `possiblyChildren` set.
- Turret destruction now uses a snapshot so removing a turret cannot cause another turret to be skipped.
- Cleared large per-entity containers after destruction.
- Made `View.reset()` and `View.remove()` release stale per-view entity references.
- Prevented duplicate entries in moderation ban/mute lists.
- Added dynamic growth to the entity key manager instead of failing when the initial key capacity is exhausted.

## Timer/socket/resource fixes

- Fixed the Siege countdown interval leak by keeping one timer handle, preventing duplicate intervals, and clearing it when the countdown ends or the server shuts down.
- Fixed per-socket traffic-monitor intervals so socket termination clears them.
- Fixed a stale-heartbeat property typo that could prevent dead connections from being cleaned up.
- Captured the disconnected body in the disconnect timeout instead of closing over mutable `player.body`.
- Made server shutdown idempotent so repeated SIGINT/SIGTERM events cannot start multiple cleanup sequences.
- Shutdown now terminates active WebSocket resources before closing the HTTP server.

## Hot-path / allocation improvements

- Replaced the dependency-backed nearest-selection priority queues with simpler linear scans.
- Removed redundant high-frequency array creation in NPC/food maintenance.
- Reduced temporary object creation in spawn/maintenance paths.
- Replaced callback-heavy `some()` logic in the protected-entity collision check with a direct loop.
- Removed an unused random-player debug allocation from spawning.
- Corrected the `sortByDistance()` comparator.
- Fixed several sparse-entity-table loops after entity slots were changed to reusable holes.
- Fixed array comparisons such as `set.SKILL != []` by using proper array/length checks.

## Dependency/code cleanup

- Removed unused `express` dependency.
- Removed unused `google-closure-library` dependency after replacing its two uses.
- Removed unused `Game Modes/serverStateManager.js`; the root `serverStateManager.js` is the module actually used by the server.
- Regenerated the package lock metadata for the remaining dependencies.

## Security/configuration handling

- The original `.env` was not carried into the cleaned release because it contains private credential/IP data.
- `.env.example` remains only as a human configuration template; the server does not load it automatically.

## Verification

- JavaScript syntax check: passed for the source tree, excluding `node_modules`.
- Game-mode module load: 39 game-mode files loaded successfully.
- `util.remove()` regression test: passed for both invalid and valid indices.
- Entity lifecycle/leak stress test: 300 masters + 300 turrets + 300 children created/destroyed; all registry assertions passed and `WeakRef` verification reported `0/900` objects still strongly reachable after a GC-safe turn boundary.
- Server smoke test: initialization, HTTP/WebSocket listener startup, SIGTERM shutdown, HTTP close, and process exit all passed.

## Final verification limitation

The environment could not complete a full networked dependency install. Runtime smoke and lifecycle tests therefore used temporary local stubs for the external packages; those stubs are not included in the final archive. The package lock itself was validated offline.
