# Gravewake

Gravewake is an active Diablo-like ARPG built only on public Anvil APIs. It is
the repository's reference consumer for schema-v2 authoring and
`@anvil/genre-arpg`.

## Run the game

Requires Node.js 22+ and pnpm.

```bash
cd games/gravewake
pnpm install
pnpm play
```

Open the Vite URL, normally <http://127.0.0.1:5180/>. A click or key press
starts the run. The preplay script builds the required Anvil packages.

From the engine directory, `pnpm play` delegates to the same title command.

## Current world loop

| Area | Runtime role |
|------|--------------|
| Ashen Lychgate | Fixed safe hub, Ash Shrine/vendor, crafting and inventory management |
| Ashen Wastes | 3200×2400 procedural overworld, timed packs, hub exit, three dungeon portals |
| Bellcrypt | Procedural threat-2 delve with Bellwarden |
| Howling Catacombs | Procedural threat-3 delve with Death Knight |
| Bonekeep | Procedural threat-4 delve with Bone Tyrant |

Generated combat areas reserve and connect spawn, encounter, objective,
portal, and exit regions before enemies are placed. Boss kills are milestones;
the game does not enter a victory state. Packs continue to spawn and threat
continues to scale.

## Controls

| Input | Action |
|-------|--------|
| Left mouse | Move; click an enemy to path toward and auto-attack it |
| Right mouse or Space | Slash |
| W/A/S/D or arrows | Screen-oriented movement; cancels click path |
| 1 | Use a health potion |
| 2 | Whirl (18 stamina) |
| 3 | Smite (12 mana) |
| F | Interact, loot, or use a nearby shrine/chest/waypoint |
| I | Toggle equipment and 32-slot backpack |
| C | Toggle base/gear/final character stats |
| T | Toggle skill choices |
| K | Toggle crafting/socket panel |
| X | Toggle vendor/trade panel |
| Y | Socket the next available gem into eligible worn gear |
| Escape | Close open panels |

Inventory mouse controls are rendered in the panel: left-click equips or
unequips; the panel provides **Equip Best** and **Sell Junk**; right-click (or
the indicated modified click) sells eligible bag items. Number keys select
skill, crafting, and vendor rows while their panels are open.

## Authoring architecture

[`game.yaml`](./game.yaml) declares schema v2, genre `arpg`, and the relative
compiled title module. [`game.spec.yaml`](./game.spec.yaml) records player-facing
intent and verifier ids.

```text
game.yaml + game.spec.yaml + content/**/*.json
                 │
          @anvil/authoring
                 │
       immutable AnvilGameIR
          ┌──────┴──────┐
     Node/headless   Vite virtual module
          └──────┬──────┘
         @anvil/genre-arpg
                 │
        Gravewake title session
```

- Node/headless loading: [`src/loadContent.ts`](./src/loadContent.ts)
- Restricted title module: [`src/module.ts`](./src/module.ts)
- Browser compiler bridge: [`vite.config.ts`](./vite.config.ts)
- Browser materialization: [`browser/contentEmbed.ts`](./browser/contentEmbed.ts)
- Runtime observation contract: [`src/types.ts`](./src/types.ts)

Content includes five areas, 18 actors (player plus 17 enemies/bosses), 21
items, four loot tables, progression data, traits/prefabs, five triggers, and a
campaign state machine. The compiled source hash and declarative rule snapshot
are exposed to agents through Gravewake's structured observation.

## Current systems

- Click navigation and A* pathing with visible no-path feedback
- Procedural overworld/dungeons with reachable required landmarks
- Melee, Whirl, Smite projectile, potions, resources, damage types, statuses,
  elites, particles, audio, floating combat text, and screen transitions
- Level-100 XP curve, skill choices, item-level loot, equipment stats, gems,
  crafting, vendor buy/sell, full paper doll, and 32-slot inventory
- Timed enemy packs, threat scaling, one quest chain, minimap fog, shrines,
  chests, and three milestone bosses
- Run-state persistence every 15 seconds and after important inventory,
  progression, and travel events

Detailed current numbers are in [`docs/PROGRESSION.md`](./docs/PROGRESSION.md)
and technical ownership is in [`docs/SYSTEMS.md`](./docs/SYSTEMS.md).

## Save and death behavior

The browser saves slot `run0` under local-storage key
`anvil_run_gravewake_run0`. It stores character/inventory/equipment, area and
position, seed, kills, bosses, elapsed time, skill tree, wallet, and pending
skill choice.

Death currently shows a fallen overlay and requires a page reload. Reloading
restores the latest saved run; there is no implemented XP or gold-loss penalty.
This is a current limitation, not the older design's town-respawn flow.

## Verification

From `games/gravewake/`:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm validate
pnpm build:web
```

`pnpm test` builds Node/browser code, checks generated instance connectivity,
progression, loot levels, authoring provenance, and the CLI scenarios.

From `anvil/`, `pnpm check` is the intended full engine/title gate. It is not
currently green because three M10/M11 CLI integration tests cover commands and
scaffolds that have not been implemented. See
[`../../anvil/docs/design/16_PLANNING_STATUS_AND_GAPS.md`](../../anvil/docs/design/16_PLANNING_STATUS_AND_GAPS.md).

## Known scope limits

There are no cinematics or multiplayer in the current title. Dungeons are
procedural rather than the historical fixed 12-room Bellcrypt design. The
detailed original design bible remains under [`docs/`](./docs/) as an archive;
do not use its old controls, numbers, filenames, or one-dungeon scope as a
runtime contract.
