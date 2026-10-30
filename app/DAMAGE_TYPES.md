# Entity Damage Types

Entities may define `DAMAGE_TYPE` to control how their outgoing collision damage is calculated. The default is `"velocity"`, preserving the existing movement-speed damage multiplier.

| Value | Damage source | Speed multiplier | Repeated contact |
| --- | --- | --- | --- |
| `"velocity"` | Entity's own calculated damage | Yes | Normal per-collision damage |
| `"collision"` | Entity's own calculated damage | No | Normal per-collision damage |
| `"collisionMaster"` | Master's calculated body damage | No | Normal per-collision damage |
| `"velocityMaster"` | Master's calculated body damage | Yes | Normal per-collision damage |
| `"impact"` | Entity's own calculated damage | No | Full damage initially, then half damage on each successive collision iteration while contact persists; resets after separation |

Example definitions:

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

`collisionMaster` uses the immediate `master.damage` value when available, which is the master's body damage after its current skill modifiers. It falls back to the entity's own damage if no usable master damage value exists. For gun-created projectiles, the master is the owning tank rather than the specific gun, so the projectile uses the tank's body damage.

For `"impact"`, the first valid collision iteration deals 100% damage, the next deals 50%, then 25%, 12.5%, and so on. Duplicate collision processing for the same pair within one physics iteration is suppressed. If the pair is no longer colliding during a complete collision pass, its contact count is cleared, so the next collision starts again at 100%. The falloff applies independently to each side configured as `"impact"`; the other side retains its own damage mode.

The base `trap` definition uses `"collision"`, so traps and classes inheriting from traps do not gain extra damage simply by being launched or pushed faster. Other entity families retain the default `"velocity"` behavior unless explicitly configured.
