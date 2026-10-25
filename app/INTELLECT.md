# Entity INTELLECT setting

Every entity defaults to `INTELLECT: 1`. Set it in an entity definition or use the existing developer property command (`intellect` or `INTELLECT`). Values are accepted as finite, non-negative numbers. There is no fixed configured upper bound; individual operations are deliberately bounded to protect server performance.

INTELLECT measures decision quality and planning depth. It should not make an AI randomly change plans more often. Target locks and movement goals are intentionally sticky unless the current plan is invalid or a materially better choice is available.

## What scales continuously

- **Target awareness:** acquisition range expands with intellect, up to a bounded multiplier. High values do not search the entire map.
- **Target reconsideration:** high intellect evaluates a new target more often, but has a minimum refresh interval and a switching margin. Comparable targets do not make the AI oscillate between locks.
- **Target selection:** beyond the baseline, the AI scores proximity, threat level, target vulnerability, and whether the target is approaching. It does not simply choose the farthest available target. Equal danger values remain equal instead of being ranked by array order.
- **Shot prediction:** the intercept solver avoids non-finite results when target and projectile speeds are similar. Motion prediction is smoothed and acceleration estimates are bounded.
- **Wandering:** higher intellect samples more destination candidates and weighs novelty and useful travel distance. It avoids repeatedly picking the farthest point.
- **Formation movement:** INTELLECT does not alter the configured minion orbit radius, leash distance, or near-master bounds. The standard `minion` controller currently uses the restored original target-relative orbit formula at every intellect value. INTELLECT does not yet add orbit-specific maneuver tiers to that controller; higher-intellect target selection, prediction, and projectile evasion remain active. Near-master controllers can retain chosen movement goals longer as intellect rises, avoiding destination jitter.
- **Retreat:** the flee threshold changes modestly. Extreme intellect does not make every small hit trigger near-permanent retreat.

## Threshold abilities

| INTELLECT | Capability |
|---:|---|
| `2+` | Basic threat-aware target scoring begins to influence target choice. The standard minion orbit formula remains unchanged. |
| `4+` | Uses a robust ballistic intercept solver rather than only the basic linear lead approximation. |
| `8+` | Builds short-term target motion history and estimates acceleration from velocity changes. |
| `16+` | Infers likely movement direction from non-player AI navigation goals and can reconsider a significantly better target while retaining target-lock hysteresis. |
| `32+` | Predicts near-future hostile projectile paths and can begin intellect-based projectile evasion; standard orbit steering is not replaced. |
| `128+` | Compares eight candidate escape directions and avoids per-frame random switching during evasion. |
| `512+` | Pathfinders can recover from repeated blockage by skipping a small number of waypoints. |
| `2048+` | Evaluates up to sixteen projectile-evasion directions while preserving the normal movement controller's orbit behavior. |
| `4096+` | Motion forecasting can use most of its bounded acceleration estimate and inferred navigation intent. |

## Controller notes

- `nearestDifferentMaster` and `Dominator`: threat scoring, predictive aiming, target-motion estimation, and projectile evasion when eligible.
- `wanderAroundMap`: novelty-aware destination selection and stable pauses.
- `pathFinder`: sequential routing by default; stuck recovery only at `INTELLECT >= 512` after repeated evidence that the current segment is blocked.
- `minion`: uses the original target-relative orbit formula, leash, repel behavior, and near-orbit power reduction. Its steering does not use the custom world-space orbit integrator or attack-lane planner. Eligible projectile-dodge goals can temporarily interrupt orbit, after which classic orbit movement resumes. INTELLECT does not change orbit radius.
- `hangOutNearMaster`: uses the same configured bounds at every intellect value; higher intellect retains a selected destination longer and can vary its chosen lane without changing the bounds.
- `fleeAtLowHealth`: the retreat threshold changes modestly; high intellect relies more on predictive defense than panic fleeing.
- Controllers that only issue fixed behavior, such as `spin`, `teleportToMaster`, or `doNothing`, are not changed unless they already use a movement/target decision affected by intellect.
- Entities without controllers are not autonomously moved or otherwise given AI behavior by INTELLECT.

## Range and performance safeguards

`100000000` is meaningfully different from `1`: it enables all listed tiers, deepens motion prediction, expands the bounded search radius, improves target selection, evaluates sixteen dodging routes, and enables quicker threat scanning. It does not create unbounded loops, unlimited spatial queries, or unlimited route searches. Prediction horizons, local projectile candidate counts, history size, and route-recovery steps are capped intentionally.
