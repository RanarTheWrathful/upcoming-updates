# INTELLECT and Minion Orbit Baseline

The standard `minion` controller has been restored to the original project orbit behavior as the baseline for future tuning. It uses its target-relative vector to determine the goal, preserves the original leash and repel behavior, and lowers movement power near the configured orbit band. It no longer calculates an independent persistent world-space orbit angle or selects a fixed attack stance.

INTELLECT still affects target selection, aiming prediction, and eligible projectile evasion. A detected projectile dodge can temporarily override the normal minion movement goal; once the dodge expires, the minion resumes its normal orbit logic. INTELLECT does not change orbit radius.

Positive configured `ORBIT_DISTANCE` values retain the previously requested wider-spacing policy. Explicit zero/negative values are not expanded. The direct-chase safeguard also remains so a `mapTargetToGoal` controller cannot replace minion steering with a straight-line ram.

Orbit-specific intellect tiers are intentionally not layered onto the baseline in this revision. The restored behavior can be play-tested first, then any higher-intellect orbital tactics can be added incrementally without changing the `INTELLECT: 1` baseline.
