# Spec: `@anvil/core` current public contract

**Milestones:** M1–M9 plus RPG/engine extensions

Core owns deterministic simulation time, world/scenes/events/input, asset and
render abstractions, save/observe/test entry points, and reusable game systems.
It must never import Phaser.

## Primary entry points

```ts
createGame(opts: CreateGameOptions): Promise<GameHandle>
validateProject(root: string): Promise<ValidationResult>
runTests(root: string, opts?: TestOpts): Promise<TestReport>
observe(handle: GameHandle, opts?: ObserveOpts): Promise<ObserveSnapshot>
saveGame(handle: GameHandle, slot?: string): Promise<void>
loadGame(root: string, slot?: string, opts?: Partial<CreateGameOptions>): Promise<GameHandle>
```

The public barrel also exports agent ACI/replay, RPG/itemization, combat,
abilities/resources, AI/path/procgen, UI/FX/audio, content validation, plugins,
tile maps/spatial hashes, and run-state helpers. Inspect
`packages/core/src/index.ts` for the exhaustive symbol list; this spec defines
ownership and the stable primary shapes.

## Game creation

```ts
interface CreateGameOptions {
  root: string;
  headless?: boolean;
  seed?: number;
  renderer?: RenderFacade;
  maxDtSteps?: number;
  fixedDt?: number;
  modules?: GenreModule[];
  browser?: boolean;
  gameYaml?: GameYaml;
}
```

- Non-browser creation resolves and verifies a real root, then reads
  `game.yaml` unless `gameYaml` is supplied.
- Browser creation uses `browser: true` and should supply a parsed/embedded
  manifest plus renderer.
- The default renderer is `NullRenderFacade`, including in a browser. A host
  that wants canvas/Phaser rendering must pass it explicitly.
- Seed resolution is explicit option, manifest seed, then 1.
- Core does not discover/import runtime modules by manifest id. The CLI or host
  loads `GenreModule` values and passes `modules`.
- A no-op `main` scene is registered before modules; the selected entry scene
  is entered before `createGame` resolves.
- Browser presentation owns drawing, so core sets skip-default-draw.
- `createGame` accepts project schema v1 or v2 through `GameYamlSchema`; it does
  not run the schema-v2 authoring compiler.

## GameHandle

The returned handle exposes:

```ts
interface GameHandle {
  readonly world: World;
  readonly scenes: SceneManager;
  readonly events: EventBus;
  readonly input: InputMap;
  readonly assets: AssetServer;
  readonly modules: ModuleRegistry;
  readonly audio: AudioSystem;
  readonly cinema: CinematicSystem;
  readonly particles: ParticleSystem;
  readonly quests: QuestSystem;
  readonly plugins: PluginRegistry;
  readonly ui: UiKit;
  readonly camera: ViewCamera;
  readonly abilities: AbilitySystem;
  readonly statuses: StatusSystem;
  readonly projectiles: ProjectileSystem;
  readonly resources: ResourcePool;
  readonly interactables: InteractableSystem;
  readonly triggers: TriggerSystem;
  readonly floatText: FloatTextSystem;
  readonly transitions: ScreenTransition;
  readonly threat: ThreatTable;
  readonly death: DeathSystem;
  readonly kernel: Kernel;
  readonly game: GameYaml;
  readonly root: string;
  readonly version: string;
  tick(dtWallSeconds: number): void;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  getSeed(): number;
  getTime(): number;
  getTick(): number;
  dispose(): void;
}
```

`kernel` is exposed by the current handle for advanced engine consumers. Games
should prefer the named services; ARPG title definitions intentionally never
receive it.

## World

`World.spawn(init)` returns the entity id. Ids are unique; generated ids are
`e_<n>`. `destroy` is idempotent. `query(...keys)` returns entities where every
named top-level component is present. `all`, `get`, `has`, and `clear` provide
the remaining storage operations.

Core entity fields are `id`, `tags`, optional `transform`, `sprite`, `health`,
`collider`, and `lifetime`, plus an always-present `data` extension record.
Genre-specific state should use typed services or documented `data` fields.

## Scenes

`SceneManager` supports `register`, `push`, `pop`, `replace`, `current`, and
`update`. A factory receives `SceneContext` containing world/events/input/assets,
data, seed/random, and optional public services for particles, quests, audio,
statuses, abilities, projectiles, resources, interactables, triggers, float
text, transitions, threat, and death.

Transitions emit `scene:exit` and `scene:enter`. Popping an empty stack throws.
An unknown entry scene becomes `LAUNCH_FAIL` during creation.

## InputMap

Input is expressed as logical actions. The map supports action definition,
keyboard and gamepad button/axis binding, rebinding/export/import, raw host key
delivery, held/pressed/released queries, scripted `setDown`, and snapshots.
Short key taps are latched between simulation steps.

Default keyboard actions include:

| Actions | Bindings |
|---------|----------|
| Move | W/A/S/D; forward/back also W/S |
| Confirm/shoot | Space; confirm also Enter |
| Cancel/skip cinematic | Escape |
| End turn | E |
| Inventory/interact/map | I/F/M |
| Card slots/choices | Digit0–Digit9 |
| Enemy selection | Tab |
| Turn | ArrowLeft/ArrowRight |

Default gamepad mappings include confirm/cancel/shoot/interact/inventory and
two movement axes. Gamepad support is implemented; older “OOS v1” statements
are obsolete.

## Modules and scheduling

```ts
interface GenreModule {
  id: string;
  register(kernel: KernelInternals): void;
  schemas?(): Record<string, unknown>;
  defaultScenes?(): Array<{ name: string; factory: SceneFactory }>;
}
```

The registry supports `register`, `get`, and `list`. Kernel module registration
calls `register`, then installs declared default scenes. Systems use numeric
priority; lower priorities update first. Unknown manifest ids are handled by
validation/host loaders, not by `ModuleRegistry` itself.

## Time and deterministic random

The kernel uses a fixed timestep (default 1/60), caps wall delta at 0.25
seconds, and limits catch-up steps (default 5). Pause freezes simulation time
and systems. `random()` and `randomInt()` derive from the configured seed.

Agents/tests should use `agentStep` or controlled `tick` calls and never use
wall time as simulation authority.

## Assets and rendering

`AssetServer` resolves project-relative paths inside the game root, exposes
browser/node texture and audio handles, tracks missing paths, resolves video,
supports preload, and returns deterministic labelled/color greyboxes for
missing images.

Core supplies null and canvas facades; `@anvil/render-phaser` supplies Phaser.
Only facade methods may cross the core/renderer boundary.

## Observation and agent ACI

`ObserveSnapshot` version 1 contains version/scene/time/tick/seed/pause,
simplified entities, input, UI, genre and engine state, a summary,
`allowedActions`, and optional screenshot. It is unrelated to project schema
v1/v2.

`agentStep`, `observeDiff`, `ReplayRecorder`, and `playReplay` are implemented.
See [`../05_AGENT_COMPUTER_INTERFACE.md`](../05_AGENT_COMPUTER_INTERFACE.md).

## Save models

`saveGame` writes `saves/<slot>.json` atomically in Node or
`anvil_save_<gameId>_<slot>` in browser storage. `SaveGame` v1 stores runtime
entities and genre state; v2 optionally adds character and zone state through
registered hooks. `loadGame` accepts v1/v2 and recreates the game with caller
supplied modules/renderer/browser manifest as needed.

For ARPG continuation, the separate `RunStateV1` helpers store a character,
area/position, seed, and free-form flags under
`anvil_run_<gameId>_<slot>`.

## Verification obligations

Changes to core must retain seed reproducibility, fixed-step/pause behavior,
world and scene lifecycle, input edge latching/rebinding/gamepad tests,
asset-root safety/greyboxing, save compatibility, observe/replay behavior, and
the affected first-class service tests. Public changes require synchronized
barrel, spec, example/title, and changelog updates.
