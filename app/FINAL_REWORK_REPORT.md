# Ranar's Prophecy — Final Rework Report

This build is the result of a full server-side optimization, lifecycle, and compatibility pass. The goal was to reduce CPU/GC overhead and long-lived references while keeping the existing gameplay architecture and the server/client wire protocol intact.

## Major architectural changes

- Added a dense `liveEntities` registry for simulation/network hot loops while retaining the legacy `entities[]` key-indexed table for compatibility.
- Removed hot-path scans of the sparse legacy entity table.
- Reworked entity destruction so parent/master/source/turret/protection relationships are released consistently.
- Kept SOA numeric arrays dense by resetting primitive slots instead of deleting numeric array elements.
- Reworked activation, physics, movement, collision broadphase preparation, and live simulation loops to avoid unnecessary temporary objects.
- Reused collision AABB storage instead of allocating a new box per active entity each tick.
- Removed per-collision wall-contact timers in favor of an entity-local expiry timestamp.
- Reworked NPC census generation into a single pass.
- Reworked minimap/leaderboard snapshot generation into a single entity pass with reusable snapshot/delta buffers.
- Replaced several internal membership arrays with `Set` where uniqueness and membership testing were the actual requirements.
- Removed the unused, unbounded `socketList` that accumulated IP addresses forever.

## Client/server boundary preservation

The client-facing protocol was treated as a compatibility boundary.

- FastTalk keeps the existing nibble/type assignments and compression format.
- `socket.talk()` still emits the same FastTalk packet format; its implementation now avoids a rest-parameter allocation.
- The photo/delta synchronization path preserves the existing field flags, order, turret framing, and update semantics while removing repeated temporary arrays and functions.
- Reusable photo/diff buffers are consumed synchronously before they are mutated again.
- Malformed FastTalk packets now fail safely instead of propagating decoder failures into the game loop.

## Memory/leak work

- Destroyed entities are removed from the live registry, legacy table, views, minimap, protection set, parent/master/source sets, and turret ownership lists.
- `util.remove()` is now a safe no-op for an invalid index and no longer creates accidental `array[-1]` properties.
- Per-socket recurring traffic timers were consolidated into one server-owned monitor.
- Socket update/close timers are explicitly owned and cancelled during disconnect/shutdown.
- All global recurring timers used by the game loop are retained and cleared during shutdown.
- Siege countdown intervals are owned and cleared.
- Entity-owned delayed callbacks that were retaining destroyed entities were moved to weak-reference timers where appropriate.
- Bot-specific 12.5-second and 100-second callbacks now use weak entity references so dead bots are not kept alive solely by delayed timers.
- `serverStateManager` now writes state to a temporary file before atomically replacing the live state file.
- Shutdown is idempotent and releases sockets, timers, views, and the server listener.
- Mode voting state is now an actual set and is populated/cleared according to the existing one-vote-per-IP intent.

## FastTalk

The FastTalk implementation was internally rewritten with reusable typed scratch buffers and geometric growth. Its binary output remains compatible with the previous implementation.

Regression checks performed:

- 10,000 randomized encode/decode cases matched the original implementation byte-for-byte and value-for-value.
- 50,000 malformed/random packet inputs completed without decoder exceptions.
- A local benchmark on the same workload measured approximately 1.27x encode+decode throughput improvement while producing identical packet sizes in that test.

## Lifecycle verification

A dedicated lifecycle stress test created and destroyed 900 entities, including masters, children, and bound turrets.

Result:

- Live-entity registry returned exactly to its baseline.
- 900/900 `WeakRef` checks became unreachable after a GC-safe turn boundary.
- No retained destroyed entities were found in that test.

## Server verification

The project was checked with:

- Full JavaScript syntax validation across the source tree.
- All 39 game-mode modules loaded successfully.
- Offline `npm ci --dry-run` dependency/lockfile validation passed.
- Live startup smoke test reached server initialization and HTTP/WebSocket listening.
- Graceful shutdown closed the server and released its runtime resources.

## Deliberate compatibility decisions

A spatial-networking rewrite or wholesale replacement of the collision system was intentionally not performed. Those are possible future optimization targets, but they would carry substantially greater gameplay/client compatibility risk than the improvements already made here.

The archive intentionally does not include the original private `.env` file or installed dependencies. `.env.example` remains documentation only; the application does not load it automatically.

The project's existing Node engine declaration remains `16.x`. The verification environment used Node 22 for static/runtime tests; deployment should use the project's declared runtime or a separately tested upgrade path.
