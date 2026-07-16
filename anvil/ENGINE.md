# Using the Anvil engine

This is the current consumer guide for an AI agent building or maintaining a
game on Anvil. It separates APIs that work in this checkout from M10/M11 CLI
work that is still pending.

## Choose the correct authoring path

| Path | Use it for | Boundary |
|------|------------|----------|
| Schema v1 runtime | Existing examples, CLI scaffolds, card/topdown/VN/shmup/FPS games | `anvil new`, `validate`, `test`, `dev`, and `build` work now |
| Schema v2 compiled authoring | Intent contracts, traits, prefabs, rules, and ARPG projects | Use `@anvil/authoring` programmatically and wire the resulting IR explicitly |

Core's `GameYamlSchema`, `createGame`, and `validateProject` accept both schema
versions. `compileProject` deliberately accepts schema v2 only. The current
CLI does not yet run the authoring compiler as part of `validate`, `test`, or
`dev`.

## Create a conventional game

From `anvil/`:

```bash
pnpm install
pnpm -r run build
pnpm anvil new my-game --genre topdown2d
pnpm anvil validate my-game
pnpm anvil test my-game
pnpm anvil dev my-game
```

Supported scaffold genres are `none`, `card`, `topdown2d`, `vn`, `shmup`, and
`fps2`. Scaffolds currently use `schemaVersion: 1`.

At runtime, load the selected genre modules and pass them to `createGame`.
The CLI does this for built-in schema-v1 projects. Direct consumers use the
same public option:

```ts
import { createGame, observe } from "@anvil/core";
import { topdownModule } from "@anvil/genre-topdown2d";

const game = await createGame({
  root: "./my-game",
  headless: true,
  seed: 1,
  modules: [topdownModule],
});

game.tick(1 / 60);
const snapshot = await observe(game);
```

For a browser entry point, supply `browser: true`, a renderer, and an embedded
`gameYaml`; see
[`examples/hello-empty/src/main.ts`](./examples/hello-empty/src/main.ts).

## Agent action and observation loop

Use semantic actions rather than synthetic keyboard codes:

```ts
import {
  agentStep,
  createGame,
  observe,
  observeDiff,
} from "@anvil/core";

const game = await createGame({ root: "./my-game", headless: true, seed: 7 });

agentStep(game, { type: "move", dir: "right" }, 30);
agentStep(game, { type: "tap", action: "shoot" });

const before = await observe(game);
agentStep(game, { type: "wait", frames: 10 });
const after = await observe(game);
const changes = observeDiff(before, after);
```

Prefer `snapshot.summary` for prompt context and inspect the full snapshot only
when debugging. `ReplayRecorder` and `playReplay` are implemented for
deterministic action capture and replay. The CLI equivalents are:

```bash
pnpm anvil tools --json
pnpm anvil doctor ./my-game --json
pnpm anvil observe --root ./my-game --json
pnpm anvil test ./my-game --json
```

## Public runtime services

`createGame` returns a `GameHandle` with the public world and service surface.
Frequently used services include:

```ts
game.world;
game.scenes;
game.events;
game.input;
game.assets;
game.audio;
game.cinema;
game.particles;
game.quests;
game.ui;
game.camera;
game.abilities;
game.statuses;
game.projectiles;
game.resources;
game.interactables;
game.triggers;
game.floatText;
game.transitions;
game.threat;
game.death;
```

Reusable RPG helpers include inventory/equipment, character sheets, loot,
itemization, vendors, crafting, sockets, skill trees, zone graphs, run-state
saves, pathfinding, procedural maps, spatial hashes, tile maps, actor
animation, combat events, and damage/status systems. Use public exports from
`@anvil/core` and `@anvil/genre-topdown2d`; never import kernel internals or
Phaser in game code.

## Use schema-v2 authoring

A v2 project has both `game.yaml` and its intent file:

```yaml
# game.yaml
id: my-arpg
title: My ARPG
genre: arpg
modules: [genre-arpg, ./dist/module.js]
entryScene: main
contentRoot: content
assetsRoot: public/assets
intent: game.spec.yaml
schemaVersion: 2
```

```yaml
# game.spec.yaml
schemaVersion: 2
summary: A concise statement of the intended player experience.
quality: playable
requirements:
  - id: lifecycle.start
    category: lifecycle
    priority: must
    description: The player starts in a controllable state.
    weight: 10
    verify: [smoke]
```

Compile it in a Node/headless boundary:

```ts
import { compileProject } from "@anvil/authoring";

const result = compileProject("./my-arpg");
if (!result.ok) {
  throw new Error(result.errors.map((e) => `${e.code}: ${e.message}`).join("\n"));
}

const ir = result.ir; // deeply frozen, deterministic, content-hashed
```

For a Vite browser build, compile on the host and import the generated virtual
module so Node filesystem code never enters the browser graph:

```ts
// vite.config.ts
import { anvilGameIr } from "@anvil/authoring/vite";

export default { plugins: [anvilGameIr({ root: process.cwd() })] };
```

```ts
import gameIr from "virtual:anvil-game-ir";
```

Add a local declaration for the virtual module; Gravewake's working example is
[`../games/gravewake/browser/anvil-ir.d.ts`](../games/gravewake/browser/anvil-ir.d.ts).

### Migrate a v1 project

Migration exists as a library API, not a CLI command in this checkout:

```ts
import { migrateProject } from "@anvil/authoring";

const preview = migrateProject("./my-game");
if (!preview.ok) throw new Error(preview.errors[0]?.message);

// Review preview.changes first.
const applied = migrateProject("./my-game", { write: true });
```

The write is transactional and creates `game.spec.yaml` when it is absent.
Review the generated intent; its summary and acceptance requirements are only
a safe starting point.

Capability discovery is also currently programmatic:

```ts
import { capabilitiesForGame, capabilityCatalog } from "@anvil/authoring";
```

## Build a declarative ARPG

`@anvil/genre-arpg` consumes compiled IR without reading files:

```ts
import { compileProject } from "@anvil/authoring";
import { materializeArpgContent } from "@anvil/genre-arpg";

const result = compileProject("./my-arpg");
if (!result.ok) throw new Error("Authoring compilation failed");
const content = materializeArpgContent(result.ir);
```

The package also exports `ArpgRuleRuntime`, `defineArpgGame`, and `arpgModule`.
Use `defineArpgGame` for a title module: it gives the session public scene
services while withholding the renderer, `Kernel`, scene registration, and
scheduler ownership. See the complete working paths in
[`../games/gravewake/src/loadContent.ts`](../games/gravewake/src/loadContent.ts),
[`../games/gravewake/src/module.ts`](../games/gravewake/src/module.ts), and
[`../games/gravewake/vite.config.ts`](../games/gravewake/vite.config.ts).

Important current limitation: the generic CLI module loader does not yet load
`genre-arpg` by id and `anvil new --genre arpg` is unavailable. Gravewake works
because its manifest also loads its compiled relative title module. Treat the
generic loader/scaffold as pending M11 work.

## Packages

| Package | Current role |
|---------|--------------|
| `@anvil/core` | Kernel, world, scenes, input, save, agent ACI, RPG, UI, combat, audio, path, and observation |
| `@anvil/schema` | Manifest, intent, declarative rule schemas, and diagnostics |
| `@anvil/authoring` | Schema-v2 compiler, migration, capability descriptors, canonical IR |
| `@anvil/authoring/vite` | Host-side Vite IR bridge |
| `@anvil/genre-arpg` | ARPG IR materialization, finite rule runtime, restricted title hook |
| `@anvil/genre-card` | Card battle runtime |
| `@anvil/genre-topdown2d` | Top-down movement, collision, actors, maps, and navigation |
| `@anvil/genre-vn` | Visual-novel graph runtime |
| `@anvil/genre-shmup` | Scrolling-shooter runtime |
| `@anvil/genre-fps2` | Grid raycast FPS runtime |
| `@anvil/genre-net` | Experimental transport-neutral replication spike |
| `@anvil/net-colyseus` | Production-oriented authoritative multiplayer adapter |
| `@anvil/render-phaser` | The only package allowed to import Phaser |
| `@anvil/recipes` | Discoverable content recipes |
| `@anvil/desktop` | Electron shell for a built web game |

## Assets and audio

Game asset paths are relative to `assetsRoot`. Missing graphics can use the
engine's deterministic greybox path; production builds should validate the
manifest explicitly.

The repository includes a CC0 audio catalog under [`assets/audio/`](./assets/audio/):

```ts
import { getGameReadyAudioCues } from "@anvil/core";

game.audio.setCues(getGameReadyAudioCues("audio"));
game.audio.play("hit");
```

Use `pnpm anvil audio list --json` and
[`assets/audio/README.md`](./assets/audio/README.md) to select cues.

## Multiplayer and desktop

For authoritative multiplayer, use `@anvil/net-colyseus`; use
`@anvil/genre-net` only for experiments and compatibility tests. Start with
[`docs/NET_COMBAT_SAMPLE.md`](./docs/NET_COMBAT_SAMPLE.md) and
[`docs/design/specs/S-NET-COLYSEUS.md`](./docs/design/specs/S-NET-COLYSEUS.md).

The Electron shell loads an already-built web distribution. Set
`ANVIL_GAME_DIST` to its absolute directory and run `pnpm start` in
`packages/desktop`.

## Version and verification

The runtime reports `ANVIL_VERSION` (`0.7.0` in this checkout) through
`createGame().version` and `observe().engine`. Workspace package manifests and
authoring capability descriptor versions are separate internal axes; see
[`docs/design/22_RELEASE_AND_VERSIONING.md`](./docs/design/22_RELEASE_AND_VERSIONING.md).

Before handing off a game change, run its targeted tests and build. Before
handing off an engine change, run the affected package tests plus the widest
working gates described in [`docs/design/18_TESTING_AND_CI.md`](./docs/design/18_TESTING_AND_CI.md).
