# Game mode settings

## Select a mode without editing code

`GAME_MODE` selects a specific file in `Game Modes/` by filename, without `.js`. Matching is case-insensitive.

Examples:

```sh
GAME_MODE="The Denied" npm start
GAME_MODE="The Expanse" npm start
GAME_MODE="The Cubed Crusades P1(The Divided)" npm start
```

Set the same variable in your hosting provider's environment settings when deploying. When `GAME_MODE` is set, it takes precedence over `SERVER_TYPE`.

Without `GAME_MODE`, `SERVER_TYPE` chooses the existing server behavior:

- `testing` starts **The Denied**.
- `normal` chooses from the normal rotation, using valid saved votes when available.
- `lore` follows the lore-mode sequence.
- The legacy `JJ's Reasearch Facility` server type remains supported.

Invalid mode names and invalid critical settings now throw a readable startup error before the server lock file is written.

## How settings are combined

1. `config.js` contains shared defaults.
2. `Game Modes/<mode name>.js` contains only the settings that mode wants to override.
3. `lib/modeConfig.js` recursively merges nested plain objects and validates critical settings.

This means a mode can override only one enemy-intensity setting without accidentally erasing the others. For example:

```js
ENEMY_INTENSITY: {
  THRASHERS: 250,
},
```

The Expanse keeps the shared `CRASHERS` and `SENTINELS` values while replacing `THRASHERS` with `250`.

**Arrays are replaced as a whole**, not merged. This is intentional for `ROOM_SETUP`, `TEAMS`, `BOT_TEAMS`, and food distribution tables.

## Common mode settings

- `MODE`: internal gameplay mode identifier.
- `WIDTH`, `HEIGHT`: world dimensions.
- `gameSpeed`: simulation speed multiplier; must be positive.
- `ROOM_SETUP`: non-empty, rectangular grid of room-type labels.
- `FOOD_AMOUNT`: non-negative food population scale. `0` disables natural food population when food spawning is enabled.
- `SPAWN_FOOD`: enables or disables food spawning. This flag is separate from `FOOD_AMOUNT`.
- `BOTS`: non-negative bot count.
- `TEAMS`, `BOT_TEAMS`: numeric team arrays or the legacy string `"color"`.
- `ENEMY_INTENSITY`: partial or complete per-category natural-enemy intensity values. Missing values inherit the defaults in `config.js`.
- `BOSS_LIMIT`: partial or complete per-category boss caps. Missing values inherit the defaults in `config.js`.
- `SPAWN_*`: explicit switches for enemy/boss categories. Unspecified switches default to `false`, unless a shared or mode config sets them.

## Editing safely

Keep a setting in `config.js` when it should affect all modes, and add it to a mode file only when that mode needs different behavior. Keep `ROOM_SETUP` rows the same length. Run `npm test` after changing mode settings; the suite validates every mode file and checks several easy-to-miss definition-link and stat issues.
