Ranar's Prophecy — Collision/MASTER Hotfix

Problem fixed:
The memory-management rework deliberately clears an entity's MASTER reference during destroy().
An entity that had already collided with that entity could still retain the destroyed object in its
collisionArray until the end of the tick. The death-scoring code dereferenced instance.master
without checking whether the collider was still live, causing:

TypeError: Cannot read properties of null (reading 'settings')

Fixes:
- Death-scoring now ignores stale/destroyed collision entries.
- Killer master is captured once and validated before any property access.
- Kill-count bookkeeping skips stale collision entries.
- AI damage-target acquisition now searches for a live collision entry with a live master instead
  of blindly assuming collisionArray[0] is valid.

This preserves the earlier memory-leak fix: destroyed entities can still have MASTER cleared
immediately without leaving stale collision records capable of crashing the server.

Verification:
- node --check server.js passes.
