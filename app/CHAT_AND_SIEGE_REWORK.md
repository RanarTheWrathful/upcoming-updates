# Chat and Siege Rework

## Chat and commands
- Rebuilt `/chat` with a responsive dark interface, server/mode/player status chips, live message polling, feed search, a message composer with a character counter, and clickable command shortcuts.
- Command results are stored per submitting IP and shown after a redirect, preventing a page refresh from resubmitting the action.
- Added common aliases and case-insensitive matching for known command names while preserving argument casing.
- Restricted command feedback is returned without exposing developer-only player identifiers to normal sessions.

## Siege neutral-area penalty
- Neutral combat entities (`team === -100`) are monitored while in the central `nest` area, actual `edge` tiles, or outside the map bounds. The designated `spw0` spawn area is excluded.
- After 30 seconds of continuous residence in the monitored area, the entity loses health at 10% of its maximum health per second.
- Siege neutral turret bots do not decay while inside `spw0`; their existing decay resumes elsewhere, including actual map borders and outside the room.
- Leaving the area resets the timer. The timer also resets outside Siege or when the entity is no longer eligible.
- Projectiles, food, walls, structures, and dominators are excluded.
- The check runs in the main entity iteration before activation-based AI updates, so inactive/out-of-view entities are still checked.

## Validation
- `node --check server.js` passed.
- `node --check lib/siegeNeutralZonePenalty/siegeNeutralZonePenalty.js` passed.
- `node tests/siegeNeutralZonePenalty.test.js` passed.
- `node tests/siegeWavePolicy.test.js` passed.
- Chat HTML/render smoke tests passed.
- The repository's full `npm test` script could not run because this supplied archive is missing `tests/loadProtection.test.js`, which it references first.
- Gameplay/server integration has not been tested in a running session.

## Developer command catalog expansion
- Replaced the short hard-coded command sidebar with a shared command catalog used by both the `/chat` interface and `/dev help` output.
- The catalog now includes public commands, aliases, server/mode controls, entity operations, property editing, and player moderation. Developer entries are rendered only for sessions with developer access.
- Kept privileged command execution and permission gates unchanged; the catalog describes current handlers rather than creating new privileged operations.
- Made `/where` and `/my team` work for regular players as safe self-information commands, matching the aliases already advertised in the chat interface.
- Focused smoke test verified all catalog categories and the 35 sampled command forms render for a developer session, while developer-only examples remain absent from public help.

## Automatic score-based entity upgrades
- Added `lib/autoUpgradeRules/autoUpgradeRules.js`, which checks scored tank entities every simulation cycle, even when their AI is outside its activation radius.
- Configure rules in `AUTO_UPGRADE_RULES` with a unique `id`, score threshold, and exact `Class` export name(s). Optional `modes` and `from` restrictions are supported.
- Player bodies and bots receive every target in a score-based rule as selectable upgrades when the threshold is reached. Bots uniformly choose among available options and a skip action; only unmanaged non-bot NPCs auto-transform. Choosing a player/bot option completes the relevant rule.
- Player-controlled minions are excluded from automatic transformation and independent bot upgrade decisions.
- No default class/score rule is enabled because no target export or score amount was specified. See `AUTO_UPGRADES.md` for configuration syntax.

## Siege team -1 border exemption
- Team `-1` no longer receives Siege `spw0` spawn-zone damage or Siege dead-border damage while on `edge` tiles/outside the room.
- The exemption is scoped to Siege and does not change other modes' border behavior.

## Added focused validation
- `node tests/devCommandCatalog.test.js` passed (33 developer commands and public/private visibility checks).
- `node tests/autoUpgradeRules.test.js` passed.
- `node tests/siegeNeutralZonePenalty.test.js` passed.
- `node tests/siegeWavePolicy.test.js` passed.
