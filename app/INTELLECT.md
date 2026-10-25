# Entity INTELLECT setting

Every entity defaults to `INTELLECT: 1`. Set it in an entity definition or use the existing developer property command (`intellect` or `INTELLECT`). Values are accepted as finite, non-negative numbers. There is no fixed configured upper bound; individual operations are deliberately bounded to protect server performance.

INTELLECT measures decision quality and planning depth. It should not make an AI randomly change plans more often. Target locks and movement goals are intentionally sticky unless the current plan is invalid or a materially better choice is available.

## What scales continuously

- **Target awareness:** acquisition range expands with intellect, up to a bounded multiplier. High values do not search the entire map.
- **Target reconsideration:** high intellect evaluates a new target more often, but has a minimum refresh interval and a switching margin. Comparable targets do not make the AI oscillate between locks.
- **Target selection:** beyond the baseline, the AI scores proximity, threat level, target vulnerability, and whether the target is approaching. It does not simply choose the farthest available target. Equal danger values remain equal instead of being ranked by array order.
- **Shot prediction:** the intercept solver avoids non-finite results when target and projectile speeds are similar. Motion prediction is smoothed and acceleration estimates are bounded.
- **Wandering:** higher intellect samples more destination candidates and weighs novelty and useful travel distance. It avoids repeatedly picking the farthest point.
- **Formation movement:** higher intellect tightens formation gradually and smooths minion orbit directions. Near-master controllers now retain a movement goal for a short interval rather than selecting a new random one every frame while outside the formation radius.
- **Retreat:** the flee threshold changes modestly. Extreme intellect does not make every small hit trigger near-permanent retreat.

## Threshold abilities

| INTELLECT | Capability |
|---:|---|
| `2+` | Basic threat-aware target scoring begins to influence target choice. |
| `4+` | Uses a robust ballistic intercept solver rather than only the basic linear lead approximation. |
| `8+` | Builds short-term target motion history and estimates acceleration from velocity changes. |
| `16+` | Infers likely movement direction from non-player AI navigation goals and can reconsider a significantly better target while retaining target-lock hysteresis. |
| `32+` | Predicts near-future hostile projectile paths and can choose a stable evasive movement goal when a collision is likely. Player bodies and immobile/bound entities are not forcibly moved by this feature. |
| `128+` | Compares eight candidate escape directions against nearby projectile trajectories instead of choosing a simple perpendicular dodge. |
| `512+` | Pathfinders can detect repeated no-progress samples and skip a small number of waypoints as a recovery measure. They do not skip waypoints just because their intellect is high. |
| `2048+` | Evaluates up to sixteen escape directions and scans for projectile threats every simulation frame. |
| `4096+` | Motion forecasting can use most of its bounded acceleration estimate and inferred navigation intent. |

## Controller notes

- `nearestDifferentMaster` and `Dominator`: threat scoring, predictive aiming, target-motion estimation, and projectile evasion when eligible.
- `wanderAroundMap`: novelty-aware destination selection and stable pauses.
- `pathFinder`: sequential routing by default; stuck recovery only at `INTELLECT >= 512` after repeated evidence that the current segment is blocked.
- `minion`: smoother orbit response at higher intellect to avoid sharp formation shifts from tiny changes in the master's aim.
- `hangOutNearMaster`: stable repositioning with a cooldown so a minion does not randomize its goal every frame when it has fallen outside its preferred radius.
- `fleeAtLowHealth`: the retreat threshold changes modestly; high intellect relies more on predictive defense than panic fleeing.
- Controllers that only issue fixed behavior, such as `spin`, `teleportToMaster`, or `doNothing`, are not changed unless they already use a movement/target decision affected by intellect.
- Entities without controllers are not autonomously moved or otherwise given AI behavior by INTELLECT.

## Range and performance safeguards

`100000000` is meaningfully different from `1`: it enables all listed tiers, deepens motion prediction, expands the bounded search radius, improves target selection, evaluates sixteen dodging routes, and enables quicker threat scanning. It does not create unbounded loops, unlimited spatial queries, or unlimited route searches. Prediction horizons, local projectile candidate counts, history size, and route-recovery steps are capped intentionally.
