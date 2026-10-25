# Entity INTELLECT setting

Every entity defaults to `INTELLECT: 1`. You can set it in a class definition or change it at runtime using the entity property `intellect` (or alias `INTELLECT`) via developer tools. Values are accepted as any finite, non-negative number; there is no fixed upper cap.

If an entity has no AI controllers, INTELLECT has no behavioral effect. Controllers that make decisions interpret it differently:

- `nearestDifferentMaster` and `Dominator`: larger values expand acquisition range (operationally capped to protect server performance), increase target refresh frequency, and increasingly favor distant targets; low values scan a shorter range and reconsider targets more slowly.
- `wanderAroundMap`: larger values sample more candidate destinations and choose the farthest; lower values wait longer at each waypoint.
- `pathFinder`: larger values skip more waypoints and accept a wider arrival radius; lower values are more literal about path progression.
- `fleeAtLowHealth`: larger values retreat at higher health; lower values tolerate more damage before fleeing.
- `minion` and `hangOutNearMaster`: larger values stay closer to their master, while low values maintain a looser formation.

Scale behavior is intentionally nonlinear. `0.1` should be noticeably more sluggish/risky than `1`, while `100000000` produces extreme controller behavior without allowing unbounded range queries or infinite loops. Controllers that only enforce a fixed action (such as spin, teleport, or do-nothing) are not changed by INTELLECT.
