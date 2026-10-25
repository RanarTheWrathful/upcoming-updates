# Entity INTELLECT setting

Every entity defaults to `INTELLECT: 1`. Set it in an entity definition or use the existing developer property command (`intellect` or `INTELLECT`). Values are accepted as finite, non-negative numbers. There is no fixed configured upper bound; individual operations are deliberately bounded to protect server performance.

INTELLECT measures decision quality and planning depth. It should not make an AI randomly change plans more often. Target locks and movement goals are intentionally sticky unless the current plan is invalid or a materially better choice is available.

## What scales continuously

- **Target awareness:** acquisition range expands with intellect, up to a bounded multiplier. High values do not search the entire map.
- **Target reconsideration:** high intellect evaluates a new target more often, but has a minimum refresh interval and a switching margin. Comparable targets do not make the AI oscillate between locks.
- **Target selection:** beyond the baseline, the AI scores proximity, threat level, target vulnerability, and whether the target is approaching. It does not simply choose the farthest available target. Equal danger values remain equal instead of being ranked by array order.
- **Shot prediction:** the intercept solver avoids non-finite results when target and projectile speeds are similar. Motion prediction is smoothed and acceleration estimates are bounded.
- **Wandering:** higher intellect samples more destination candidates and weighs novelty and useful travel distance. It avoids repeatedly picking the farthest point.
- **Formation movement:** INTELLECT does not alter the configured minion orbit radius, leash distance, or near-master bounds. At `1`, minions use the standard orbit. Higher values unlock stable entity-specific orbital lanes, slow angular travel, smooth weaving, and long-duration maneuver changes. Maneuvers change angle and timing, not radius. Near-master controllers retain chosen movement goals longer as intellect rises, avoiding destination jitter.
- **Retreat:** the flee threshold changes modestly. Extreme intellect does not make every small hit trigger near-permanent retreat.

## Threshold abilities

| INTELLECT | Capability |
|---:|---|
| `2+` | Basic threat-aware target scoring begins to influence target choice; minions begin using stable, entity-specific orbit lanes without changing orbit radius. |
| `4+` | Uses a robust ballistic intercept solver rather than only the basic linear lead approximation. |
| `8+` | Builds short-term target motion history and estimates acceleration from velocity changes; minions begin a slow, persistent orbit rather than holding one angle. |
| `16+` | Infers likely movement direction from non-player AI navigation goals and can reconsider a significantly better target while retaining target-lock hysteresis. |
| `32+` | Adds a smooth angular weave to the orbit path and predicts near-future hostile projectile paths; the orbital radius does not change. |
| `128+` | Selects orbit direction and cruise style in long maneuver intervals, compares eight candidate escape directions, and avoids per-frame random switching. |
| `512+` | Adds multiple stable orbit speeds and longer, more varied attack arcs; pathfinders can also recover from repeated blockage by skipping a small number of waypoints. |
| `2048+` | Unlocks the most varied orbit pattern, combining stable phase offsets, angular weaving, deliberate maneuver changes, and up to sixteen projectile-evasion directions while preserving the same radius. |
| `4096+` | Motion forecasting can use most of its bounded acceleration estimate and inferred navigation intent. |

## Controller notes

- `nearestDifferentMaster` and `Dominator`: threat scoring, predictive aiming, target-motion estimation, and projectile evasion when eligible.
- `wanderAroundMap`: novelty-aware destination selection and stable pauses.
- `pathFinder`: sequential routing by default; stuck recovery only at `INTELLECT >= 512` after repeated evidence that the current segment is blocked.
- `minion`: uses the standard orbit at `INTELLECT: 1`. Higher values add stable, entity-specific lane offsets, slow orbiting, smooth angular weave, and infrequent direction/speed changes. Radius, leash distance, and target standoff remain independent of intellect.
- `hangOutNearMaster`: uses the same configured bounds at every intellect value; higher intellect retains a selected destination longer and can vary its chosen lane without changing the bounds.
- `fleeAtLowHealth`: the retreat threshold changes modestly; high intellect relies more on predictive defense than panic fleeing.
- Controllers that only issue fixed behavior, such as `spin`, `teleportToMaster`, or `doNothing`, are not changed unless they already use a movement/target decision affected by intellect.
- Entities without controllers are not autonomously moved or otherwise given AI behavior by INTELLECT.

## Range and performance safeguards

`100000000` is meaningfully different from `1`: it enables all listed tiers, deepens motion prediction, expands the bounded search radius, improves target selection, evaluates sixteen dodging routes, and enables quicker threat scanning. It does not create unbounded loops, unlimited spatial queries, or unlimited route searches. Prediction horizons, local projectile candidate counts, history size, and route-recovery steps are capped intentionally.
