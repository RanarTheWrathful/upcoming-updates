# Ranar's Prophecy — Stability Rework Notes

This build is a stability-first correction to the aggressive optimization build.

## Gameplay behavior deliberately restored

The original gameplay implementations were retained for the sensitive core paths:
- Entity `bringToLife()` initialization/controller setup.
- Entity `move()` and `face()` behavior.
- AI controller semantics, targeting, movement and fire timing.
- Client-facing `takePhoto()` / `syncPhoto()` packet generation.
- Original nearest-target / sort behavior.
- Original collision damage/healing/recoil formulas, with only zero/invalid divisor protection added.

## Bugs addressed

### Health effects becoming NaN
Stationary/collocated entities could make `delt.length` zero. The collision code previously calculated `component / delt.length`, producing `NaN`, which then propagated into heal/repair calculations and entity health.

The collision code now:
- uses a deterministic direction when the separation vector is exactly zero;
- uses a finite zero-movement `componentNorm` when relative movement is zero;
- leaves normal non-zero collision math unchanged.

### AI moving too fast / not firing
The sensitive AI initialization, movement, facing, targeting and fire-control logic was restored to the cleaned baseline. The optimization changes that altered those semantics are not present in this build.

### Memory/resource cleanup retained
The safe memory fixes remain, including:
- complete entity relationship cleanup on destruction;
- turret/master back-reference cleanup;
- collision/reference container cleanup;
- guarded registry removal;
- owned simulation timers and idempotent shutdown;
- corrected per-client traffic-monitor cleanup;
- safer sparse-entity iteration.

### Socket traffic false positives
The traffic guard was relaxed to avoid disconnecting normal clients during legitimate packet bursts: 180 packets per 1.5-second window, with four consecutive violating windows required before a kick.

## Validation

- 49 JavaScript files pass syntax checking.
- 40 game-mode modules load successfully.
- `npm ci --dry-run --offline` passes.
- HEAL_EFFECT regression passes.
- REPAIR_EFFECT regression passes.
- AI fire regression passes.
- Zero-distance collision regression keeps health finite.
- 900 destroyed test entities become unreachable after GC.
- `move()` and `face()` are identical to the cleaned baseline.
- `bringToLife()` is identical to the cleaned baseline.
- Client packet photo/sync paths were not reworked.

This build intentionally favors preserving gameplay semantics over maximum theoretical micro-optimization.
