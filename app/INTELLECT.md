# Entity INTELLECT: Controller-Specific Decision Quality

Every entity defaults to `INTELLECT: 1`. The setting accepts any finite number, including fractions, very large positive values, and negative values. Entities without controllers do not receive autonomous behavior from INTELLECT.

## Baseline and signed values

- **`INTELLECT: 1` is the controller baseline.** Existing controller output is unchanged at this value, except for rare smart actions such as an occasional emergency dodge or wall detour.
- **`0 < INTELLECT < 1` reduces competence.** Target awareness shrinks, prediction is blended toward direct aim, movement commitment is reduced, and smart actions become less likely.
- **`INTELLECT > 1` adds competence and decisions.** Tactical behaviors become more likely, more accurate, and more frequent. Movement goals are still kept stable long enough to avoid jitter.
- **`INTELLECT < 0` reverses controller intent.** The completed controller stack is inverted once, preventing multiple stacked controllers from accidentally cancelling or doubling the inversion. Goals and aim vectors reverse; explicit `fire`, `main`, and `alt` decisions invert at magnitude 1 or above. Larger negative magnitudes make the AI slower and less aware, while the direction reversal saturates at magnitude 1. Player input, do-nothing, and teleport utility controllers are handled separately.

There is no global upper cap. Expensive operations such as target searches, trajectory prediction, candidate evaluation, and wall sampling have per-operation bounds for server safety.

## Positive-intellect progression

| INTELLECT | Capability examples |
|---:|---|
| `1` | Normal controller behavior; rare smart reactions only. |
| `2+` | Tactical target scoring and adaptive movement power begin to matter. |
| `4+` | Robust projectile interception prediction; target selection can use stable strategy profiles as intellect increases. |
| `8+` | Motion-history acceleration estimates, prediction of a target's current navigation intent, and better master-target/boomerang lead. |
| `16+` | Stable strategy profiles (aggressive, finisher, survival, balanced) can change between decision epochs rather than every frame. |
| `32+` | Projectile-trajectory evasion becomes a regular tactic; hostile targeters begin distributing focus fire among friendly bots instead of always dogpiling one target. The normal minion orbit is only interrupted for an active dodge. |
| `64+` | Hostile projectiles on a likely collision course can be selected as temporary interception targets and shot at, when the controller has usable guns and is not in a support-only targeting mode. |
| `128+` | Evasion evaluates more directions; target strategy and route choices become more adaptive. |
| `512+` | Pathfinders can recover from repeated blocked movement by skipping a small number of waypoints. |
| `2048+` | Evasion evaluates up to sixteen directions and scans for threats more frequently. |
| `4096+` and beyond | Prediction uses more of its bounded acceleration estimate; coordinated target distribution, tactical actions, and route recovery become increasingly decisive, while search and prediction limits remain enforced. |

The exact likelihood of an opportunistic action increases smoothly with intellect. At `1`, projectile evasion, interception, and wall detours are rare. At very high values, they are consistently considered when their prerequisites are satisfied.

## Controller-specific behavior

- **`nearestDifferentMaster` / `Dominator`:** target scoring, stable tactical strategy changes, linear and acceleration-based interception, threat response, projectile evasion, temporary projectile interception fire, and focus-fire distribution against targets already claimed by allied intelligent entities.
- **`mapTargetToGoal`:** wall-aware intermediate waypoints when the direct route crosses wall tiles; a waypoint persists until reached or invalidated.
- **`minion`:** keeps the restored classic target-relative orbit, leash, repel, and near-orbit power behavior. INTELLECT never changes orbit radius. Shared adaptive power can modulate acceleration without replacing the orbit formula; evasion may temporarily override the orbit goal.
- **`wanderAroundMap`:** samples more candidate destinations, favors novelty/useful travel distance, reduces idle pauses, and can route around walls.
- **`pathFinder`:** retains sequential path semantics; high intellect can detect repeated lack of progress, recover from blocked segments, and route around wall tiles.
- **`guard1`:** maintains its assigned post but can route around intervening walls and modulate movement power on the way there.
- **`hangOutNearMaster`:** preserves its configured formation bounds; high intellect can choose more varied lanes and reconsider destinations more often, with a cooldown to avoid jitter.
- **`fleeAtLowHealth`:** higher intellect improves retreat timing modestly and uses projectile evasion when eligible. Negative intellect suppresses retreat and reverses an emitted flee goal.
- **`moveInCircles` / `spin`:** high intellect can vary the circle's size/phase or spin speed. Negative intellect reverses the movement/rotation intent.
- **`goToMasterTarget`:** ordinary cursor-directed movers may refresh their predicted destination at higher intellect; special-effect blocks keep the direction captured from their own barrel so multi-direction builder arrays do not collapse onto the same point. **`boomerang`:** retains its outbound → short dwell → return cycle; higher intellect shortens the dwell without removing it, and the alternate `boomerangToMaster` returns to the master's current position.
- **Fixed-action controllers** such as `alwaysFire`, `mapAltToFire`, and `onlyAcceptInArc` retain their defined purpose at positive intellect; negative intellect reverses explicit action flags where applicable. Player-input controllers are not overridden by the AI intellect layer.

## Movement, unpredictability, and stability

Higher intellect changes both action quality and opportunity frequency. It can adjust movement power based on distance-to-goal and current speed, choose between stable tactical profiles, distribute a team's focus fire, infer movement intent, predict curved trajectories, route around wall tiles, evade projectiles, or temporarily shoot down imminent hostile projectiles. These decisions are deterministic within short decision buckets or held as persistent goals where possible; the AI should be harder to predict strategically, not jittery frame-to-frame.

`INTELLECT` does not modify the configured minion orbit radius, the classic minion orbit formula, or the positive `ORBIT_DISTANCE` spacing policy. Existing direct-chase protection remains in place so `mapTargetToGoal` cannot overwrite minion steering.
