# Command System Cleanup

This update gives the command surface a consistent set of namespaces and retains the earlier spellings as aliases. The UI catalog and `/dev help` are generated from the same command groups.

## Canonical namespaces

- `/help`, `/players`, `/modes`, `/where`, `/team me` for information.
- `/team next`, `/team spawn`, `/teams setup`, and `/wave set` for team and wave actions.
- `/entity ...` for spawn, transform, kill, destroy, heal, size, color, team, score, points, and property assignment.
- `/world set` for room/config properties.
- `/server ...` for announcements, closure, repeat count, and the active entity ID.
- `/player ...` for God Mode and moderation actions.

## Behavior improvements

- Command names and entity selectors are case-insensitive. Class export names and property names preserve their case.
- Repeated whitespace is normalized before parsing.
- Prefix matching respects command boundaries, so `/killall` no longer executes as `/kill`.
- Incomplete entity/world edits, missing moderation targets, invalid groups, invalid class exports, malformed numeric arguments, and unsupported team layouts return a usage message instead of executing.
- Numeric property values accept integers, decimals, zero, and negatives; `true`/`false` are treated as booleans. Entity SIZE is stored as a number.
- No-argument toggles and destructive actions reject stray arguments.
- The `/chat` command library is searchable. Canonical commands are shown prominently and legacy spellings are listed as subdued aliases.
- `/dev help` and the chat catalog share one source of truth. Existing developer permission checks still guard restricted commands.

Run `npm run test:commands` for catalog, rendered UI, normalization, validation, and recent-command history checks.
