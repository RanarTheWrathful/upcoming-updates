# Command Guide

The command system uses a smaller, consistent vocabulary while preserving the old spellings as aliases. Command names are case-insensitive; class export names and property names retain their case. Extra whitespace is normalized.

## Public commands

- `/help` — show the public command guide. Aliases: `/commands`, `/cmd`, `/?`, `/h`.
- `/players` — list connected players. Aliases: `/player list`, `/who`, `/online`.
- `/modes` — list voteable modes. Alias: `/mode list`.
- `/where` — show your coordinates. Aliases: `/find loc`, `/pos`, `/coordinates`, `/location`.
- `/team me` — show your team. Aliases: `/my team`, `/see team`, `/team?`.
- `/vote <mode>` — vote for the next mode.
- `/team next <id>` — choose your next-spawn team. Alias: `/set team <id>`.
- `/score cheat <score>` — choose a starting score within server limits.
- `/reset` and `/self destruct` — available only when game rules permit.

## Developer commands

### Server

- `/dev help` — full command reference. Alias: `/dev commands`.
- `/tda <key>` — authenticate or toggle developer access. Never share or persist the key.
- `/server announce <message>` — server-wide announcement. Alias: `/broadcast <message>`.
- `/server close` — close the arena. Alias: `/close server`.
- `/server repeat <count>` — repeat the next command; maximum is permission-dependent. Alias: `/repeat <count>`.
- `/server id <number>` — set the ID matched by the `ID` entity selector. Alias: `/define ID <number>`.
- `/player god` — toggle developer God Mode. Alias: `/tgm`.

### Teams and world

- `/teams setup <mode>` — `ffa`, `1 team`, `2 teams`, `3 teams`, or `tdm`. Legacy alias: `/team setup <mode>`.
- `/team spawn <id>` — team for newly spawned developer entities. Alias: `/creation team <id>`.
- `/wave set <number>` — set Siege/boss wave. Alias: `/set wave <number>`.
- `/ai toggle`, `/growth toggle`, `/plague toggle`, `/graveyard toggle` — toggle the respective setting. Legacy aliases start with `/toggle`.
- `/world set <room|config> <property> <value>` — modify a room or server configuration property. Alias: `/propertize global ...`. Numeric values including decimals, zero, and negative numbers are parsed as numbers; `true` and `false` become booleans.

### Entities

- `/entity spawn <classExport> <x> <y>`
- `/entity transform <group> <classExport>`
- `/entity kill <group>` — kill matching entities.
- `/entity destroy <group>` — kill and remove matching entities.
- `/entity heal <group>`
- `/entity size <group> <size>`
- `/entity color <group> <color>`
- `/entity team <group> <teamID>`
- `/entity points <group> <points>`
- `/entity score <group> <score>`
- `/entity set <group> <property> <value>` — includes properties such as `INTELLECT`.

Supported selectors: `projectiles`, `polygons`, `enemies`, `players`, `bots`, `bosses`, `walls`, `misc`, `self`, `ID`, and `all`. Selector names are case-insensitive. Class export and property names remain case-sensitive.

Legacy entity commands (`/spawn`, `/transform`, `/kill`, `/obliterate`, `/heal`, `/size`, `/color`, `/team`, `/points`, `/score`, and `/propertize entity`) remain available.

### Player moderation

- `/player mute <IP>` — alias `/pMute`.
- `/player unmute <IP>` — alias `/pUnmute`.
- `/player kick <IP>` — alias `/pKick`.
- `/player ban <IP>` — alias `/pBan`.
- `/player unban <IP>` — alias `/pUnban`.

All developer operations continue to require developer authorization. Canonical names simplify the interface; aliases do not bypass permission checks.
