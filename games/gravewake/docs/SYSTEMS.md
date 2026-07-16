# Gravewake technical systems

This is the current implementation map for the game layer. Gravewake uses
Anvil APIs only. Reusable mechanics belong in `anvil/packages/*`; this title
owns content, balance, presentation, and orchestration.

## Stack and project boundary

| Concern | Current implementation |
|---------|------------------------|
| Language/build | TypeScript, pnpm, Vite |
| Runtime | `@anvil/core` plus `@anvil/genre-topdown2d` |
| Authoring | `@anvil/schema` and `@anvil/authoring` schema-v2 compiler |
| Genre layer | `@anvil/genre-arpg` materializer, rules, restricted hook |
| Browser rendering | Anvil canvas facade/services plus Gravewake presentation code |
| Source content | `content/**/*.json`, `game.yaml`, `game.spec.yaml` |
| Browser asset root | `public/assets/` |
| Save | Anvil `RunStateV1` in browser local storage |

The title never imports Phaser. `defineArpgGame` does not expose renderer,
kernel internals, scene registration, or scheduler ownership to the game
session.

## Authoring and load flow

### Node/headless

1. [`../src/loadContent.ts`](../src/loadContent.ts) calls
   `compileProject(gameRoot)`.
2. Compilation parses intent and all JSON, resolves traits/prefabs, validates
   rule references, freezes the IR, and records a content hash.
3. `materializeArpgContent` extracts actors, areas, items, loot, progression,
   rules, and provenance.
4. [`../src/module.ts`](../src/module.ts) creates the restricted Gravewake
   session.

### Browser

1. [`../vite.config.ts`](../vite.config.ts) runs `anvilGameIr({ root })` on the
   host.
2. The plugin exposes `virtual:anvil-game-ir`.
3. [`../browser/contentEmbed.ts`](../browser/contentEmbed.ts) materializes that
   IR without filesystem access.
4. [`../browser/browserModule.ts`](../browser/browserModule.ts) creates the same
   title behavior with browser-safe content and public Anvil services.

## Runtime ownership

| Anvil-owned reusable system | Gravewake-owned use |
|-----------------------------|---------------------|
| World, scene, events, input, fixed-step kernel | Single `main` session and title update orchestration |
| `TopdownSim`, navigation, procgen, collision | Area definitions, spawn tables, click-to-engage behavior |
| Character sheet, inventory, equipment, itemization | Starting stats/items, balance, UI presentation |
| Abilities, resources, projectiles, damage/status/death | Slash/Whirl/Smite/potion configuration and feedback |
| Loot, wallet, vendor, crafting, sockets, skill tree | Gravewake item/recipe/offer data and panel behavior |
| Quests, interactables, triggers, transitions, minimap | Current quest, shrines/chests/portals, area UX |
| Authoring compiler and ARPG rule runtime | Campaign trigger data and adapter effects |
| Audio, particles, float text, camera | Cue selection and title-specific rendering composition |
| Run-state serialization/local-storage helpers | Slot, flags, save events, restore policy |

## Areas and procedural generation

The runtime uses one Anvil scene and switches area state inside the title
session. Ashen Lychgate is fixed. Ashen Wastes uses `generateOverworld`; the
three dungeons use `generateDungeon`. Authored area JSON supplies identity,
nominal dimensions, threat, portals/exits, pack tables, and boss spawns.

The generated geometry preserves required spawn, portal, boss/objective, and
encounter regions with player clearance. `NavGrid` handles click paths and AI
routes; rejected click targets show explicit no-path feedback. Instance tests
exercise landmark reachability and clearance.

## Combat and progression

- Slash is a physical melee attack with 260 ms cooldown.
- Whirl is physical AoE, costs 18 stamina, and has 800 ms cooldown.
- Smite is a holy projectile toward the nearest target, costs 12 mana, and has
  620 ms cooldown.
- Potions consume one inventory resource and have 400 ms cooldown.
- Character stats are base plus rolled/equipped gear, skill-tree bonuses, and
  temporary status modifiers.
- Enemy HP/damage/speed scale from area threat, level, total kills, and bosses.

Exact authored numbers are in [`PROGRESSION.md`](./PROGRESSION.md). Actor,
item, and area JSON remain authoritative for entity-specific values.

## Panels and interaction

Gameplay pauses movement while a panel is open. Inventory exposes the
engine-owned paper-doll/backpack view and title-rendered equip/unequip,
equip-best, sell, and sell-junk actions. Separate panels expose stat breakdown,
skill choices, crafting/socket recipes, and vendor offers. `F` resolves nearby
engine interactables such as loot, shrines, chests, and waypoints.

## Save contract

`saveRun()` builds Anvil `RunStateV1` with:

- `gameId`, schema `v`, seed, saved timestamp;
- current area and player coordinates;
- serialized character sheet, inventory, equipment, XP, level, and gold; and
- flags for kills, boss count/history, elapsed time, skill tree, wallet, and
  pending skill choice.

The browser writes `anvil_run_gravewake_run0` every 15 seconds while playing
and after important game events. Restore validates the area id, loads the
character and flags, enters the saved area/position, and re-synchronizes
runtime stats. Current HP and generated instance geometry are not serialized.

Death currently requires a reload; there is no in-session respawn or explicit
currency/XP penalty.

## Structured observation

`GravewakeObservation` includes area/procgen state, threat, progression,
resources, combat outcome, panels, inventory/equipment/stat breakdown,
cooldowns, quest/fog/interactables, world geometry, source provenance, and the
ARPG rule snapshot. Consumers should use this contract instead of scraping the
canvas.

The engine-level observe snapshot remains version 1; the project manifest is
schema v2. These are independent version protocols.

## Verification

| Check | Evidence |
|-------|----------|
| Type boundaries | `pnpm typecheck` |
| Style/renderer boundary | `pnpm lint` |
| IR/provenance | `pnpm test:authoring` |
| Procedural connectivity | `pnpm test:instances` |
| XP/level curve | `pnpm test:progression` |
| Item-level loot | `pnpm test:loot` |
| Headless scenarios | final stage of `pnpm test` |
| Browser graph/build | `pnpm build:web` |

## Current limitations

- There is no cinematic or multiplayer layer in the title.
- Death recovery is reload-based.
- The generic Anvil CLI cannot scaffold or load an ARPG by built-in id yet;
  Gravewake declares a relative compiled title module.
- Historical one-dungeon filenames and scene diagrams are not the live
  architecture.
