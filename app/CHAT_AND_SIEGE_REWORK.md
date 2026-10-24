# Chat and Siege Rework

## Chat and commands
- Rebuilt `/chat` with a responsive dark interface, server/mode/player status chips, live message polling, feed search, a message composer with a character counter, and clickable command shortcuts.
- Command results are stored per submitting IP and shown after a redirect, preventing a page refresh from resubmitting the action.
- Added common aliases and case-insensitive matching for known command names while preserving argument casing.
- Restricted command feedback is returned without exposing developer-only player identifiers to normal sessions.

## Siege neutral-area penalty
- Neutral combat entities (`team === -100`) are monitored while in the central `nest` area, border `spw0` tiles, `edge` tiles, or outside the map bounds.
- After 30 seconds of continuous residence in the combined penalty area, the entity loses health at 10% of its maximum health per second.
- Leaving the area resets the timer. The timer also resets outside Siege or when the entity is no longer eligible.
- Projectiles, food, walls, structures, and dominators are excluded.
- The check runs in the main entity iteration before activation-based AI updates, so inactive/out-of-view entities are still checked.

## Validation
- `node --check server.js` passed.
- `node --check lib/siegeNeutralZonePenalty.js` passed.
- `node tests/siegeNeutralZonePenalty.test.js` passed.
- `node tests/siegeWavePolicy.test.js` passed.
- Chat HTML/render smoke tests passed.
- The repository's full `npm test` script could not run because this supplied archive is missing `tests/loadProtection.test.js`, which it references first.
- Gameplay/server integration has not been tested in a running session.
