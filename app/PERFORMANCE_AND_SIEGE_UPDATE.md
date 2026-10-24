# Performance and Siege update

- Collision broad-phase AABB arrays are reused between cycles to reduce per-cycle allocations and garbage-collection pressure.
- Simple, polygon, and reverse collision handlers reject non-overlapping pairs using squared distance before calculating a square root.
- Anti-lag performance console warnings are commented out (the underlying protection logic remains enabled).
- Disconnected normal player bodies are made invulnerable and retained for 120 seconds. Reconnecting with the same IP and case-insensitive player name reclaims the same body and rebinds its input controller.
- Siege now waits 5 seconds after a clear, announces a 10-second countdown, and does not spawn the next wave until that countdown ends.
- Siege wave-clear counting ignores polygons/food and projectile-like entities.

Validation: Node.js syntax checks passed for all JavaScript files in this archive. The available Siege wave-policy test passed. Full runtime gameplay/load testing was not available in this environment.
