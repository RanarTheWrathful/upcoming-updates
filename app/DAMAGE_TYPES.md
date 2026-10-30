# Entity Damage Types

Entities may define `DAMAGE_TYPE` to control how outgoing collision damage is calculated. The default is `"velocity"`, preserving the original movement-speed multiplier and kinetic `DAMAGE_EFFECTS` collision modifier.

| Value | Damage source | Speed treatment | Repeated contact |
| --- | --- | --- | --- |
| `velocity` | Entity's own calculated damage | Original velocity multiplier and kinetic `DAMAGE_EFFECTS` modifiers | Existing behavior |
| `collision` | Entity's own calculated damage | Fixed 1.0 multiplier; no velocity or kinetic modifier | Normal collision damage |
| `collisionMaster` | Master's calculated body damage | Fixed 1.0 multiplier; no velocity or kinetic modifier | Normal collision damage |
| `impact` | Entity's own calculated damage | Fixed 1.0 multiplier; no velocity or kinetic modifier | Full, then half, quarter, one-eighth, etc. on successive physics passes while the pair remains in contact; resets after a pass without contact |
| `velocityMaster` | Master's calculated body damage | Original velocity multiplier and kinetic `DAMAGE_EFFECTS` modifiers | Existing behavior |

## Damage compensation and speed independence

The speed-independent modes use a fixed `1.0` multiplier. This is the legacy velocity-mode result when an entity is travelling at its nominal `maxSpeed`, so these modes retain normal-speed damage while avoiding both the penalty for moving slowly and the bonus for moving unusually fast. For example, if the velocity mode would multiply damage by `0.5` at a particular slow speed or by `1.8` at an unusually high speed, `collision`, `collisionMaster`, and `impact` remain at `1.0` instead.

The kinetic `DAMAGE_EFFECTS` modifier is also bypassed for all three speed-independent modes. This closes a second route by which relative movement could change damage even after the explicit velocity multiplier was disabled.

Speed-independent entity pairs are allowed only one damage application per physics collision pass, even if the collision resolver reaches the same pair through more than one branch. A fast projectile can still hit different targets along its actual swept path, but extra resolver calls cannot multiply damage against the same target during one pass. Velocity-only pairs retain the original collision behavior.

## Impact diminishing returns

For an `impact` entity, each valid continuous-contact physics pass applies half the outgoing damage of the previous pass: 100%, 50%, 25%, 12.5%, and so on. A duplicate resolver call for the same entity pair in one pass is suppressed. If the pair is absent from a complete collision pass, its contact history is cleared and the next contact starts at 100% again.

The falloff is per entity pair. If both entities use `impact`, both outgoing damage directions diminish using the same contact count. If only one does, only that entity's outgoing damage diminishes.

## Examples

```js
exports.trap = {
  PARENT: [exports.genericEntity],
  DAMAGE_TYPE: "collision",
};

exports.rammingImpact = {
  PARENT: [exports.genericEntity],
  DAMAGE_TYPE: "impact",
};

exports.masterDrivenHitbox = {
  PARENT: [exports.genericEntity],
  DAMAGE_TYPE: "collisionMaster",
};
```

`collisionMaster` uses the immediate `master.damage` value when available, which is the master's body damage after its current skill modifiers. It falls back to the entity's own damage if no usable master damage value exists.

The shared `trap` base uses `"collision"`, not `"impact"`, so trap subclasses receive speed-independent damage without automatically entering the diminishing-return behavior. Individual trap classes can opt into `"impact"` explicitly when that behavior is desired.
