# Spec: `@anvil/core` — Complete Kernel Contract

**RFC 2119:** MUST / SHOULD / MAY  
**Milestone:** M1+ (save API M2)

## 1. Purpose

Own simulation time, world, scenes, events, input, assets (resolution types), observe/test entrypoints.  
MUST NOT `import 'phaser'`.

## 2. Public package API

```ts
export function createGame(opts: CreateGameOptions): Promise<GameHandle>
export function validateProject(root: string): Promise<ValidationResult>
export function runTests(root: string, opts?: TestOpts): Promise<TestReport>
export function observe(handle: GameHandle, opts?: ObserveOpts): Promise<ObserveSnapshot>
export function saveGame(handle: GameHandle, slot?: string): Promise<void>      // M2
export function loadGame(root: string, slot?: string): Promise<GameHandle>    // M2
```

### CreateGameOptions
```ts
interface CreateGameOptions {
  root: string                 // absolute path to game package; MUST be real directory
  headless?: boolean           // default false in browser, true in runTests
  seed?: number                // default from game.yaml or 1
  renderer?: RenderFacade      // default: Phaser in browser; NullRenderFacade if headless
  maxDtSteps?: number          // default 5
  fixedDt?: number             // default 1/60
}
```

### GameHandle
```ts
interface GameHandle {
  readonly world: World
  readonly scenes: SceneManager
  readonly events: EventBus
  readonly input: InputMap
  readonly assets: AssetServer
  readonly modules: ModuleRegistry
  tick(dtWallSeconds: number): void
  pause(): void
  resume(): void
  isPaused(): boolean
  getSeed(): number
  getTime(): number            // simulated seconds
  getTick(): number            // integer sim steps
  dispose(): void
}
```

## 3. World

```ts
interface World {
  spawn(init?: Partial<EntityInit>): string
  destroy(id: string): void
  get(id: string): Entity | undefined
  has(id: string): boolean
  query(...componentKeys: string[]): Entity[]
  all(): Entity[]
  clear(): void
}

interface Entity {
  id: string
  tags: string[]
  transform?: { x: number; y: number; z?: number; rot?: number }
  sprite?: { frames: string[]; fps: number; loop: boolean; frame: number }
  health?: { hp: number; max: number }
  collider?: { kind: 'circle'; r: number } | { kind: 'aabb'; w: number; h: number }
  lifetime?: { remainingMs: number }
  data: Record<string, unknown>
}

interface EntityInit {
  id?: string                  // auto-generated if omitted: e_<n>
  tags?: string[]
  transform?: Entity['transform']
  sprite?: Omit<NonNullable<Entity['sprite']>, 'frame'> & { frame?: number }
  health?: Entity['health']
  collider?: Entity['collider']
  lifetime?: Entity['lifetime']
  data?: Record<string, unknown>
}
```

**Invariants:** ids unique; destroy is idempotent; query = entities that have all named top-level component keys present.

## 4. SceneManager

```ts
interface SceneManager {
  register(name: string, factory: SceneFactory): void
  push(name: string, data?: unknown): void
  pop(): void
  replace(name: string, data?: unknown): void
  current(): string | null
}

type SceneFactory = (ctx: SceneContext) => Scene
interface SceneContext {
  world: World
  events: EventBus
  input: InputMap
  assets: AssetServer
  data?: unknown
}
interface Scene {
  enter?(): void
  exit?(): void
  update(dt: number): void
  /** optional draw using render facade via kernel */
}
```

Emits `scene:exit` then `scene:enter` on transitions. pop on empty stack MUST throw → `INTERNAL` if uncaught at API; createGame MUST register `entryScene` before start.

## 5. EventBus

```ts
type EventHandler = (payload: unknown) => void
interface EventBus {
  on(event: string, handler: EventHandler): () => void  // returns unsubscribe
  once(event: string, handler: EventHandler): void
  emit(event: string, payload?: unknown): void
  off(event: string, handler: EventHandler): void
}
```

### Core events (MUST emit)

| Event | Payload |
|-------|---------|
| `scene:enter` | `{ name: string }` |
| `scene:exit` | `{ name: string }` |
| `entity:spawn` | `{ id: string }` |
| `entity:destroy` | `{ id: string }` |
| `game:pause` | `{}` |
| `game:resume` | `{}` |

Genre events SHOULD use `domain:action` form.

## 6. InputMap (complete)

```ts
interface InputMap {
  /** register logical action; idempotent */
  defineAction(name: string): void
  /** bind key code (KeyboardEvent.code) to action */
  bindKey(action: string, code: string): void
  /** true if held this sim frame */
  isDown(action: string): boolean
  /** true if transitioned up→down since last sim step */
  isPressed(action: string): boolean
  /** true if transitioned down→up since last sim step */
  isReleased(action: string): boolean
  /** headless/tests: force state before tick */
  setDown(action: string, down: boolean): void
  /** clear all pressed/released edges after systems read them — kernel calls end of step */
  endFrame(): void
  /** snapshot for observe */
  snapshot(): Record<string, boolean>
}
```

### Default key bindings (browser)

| Action | Key `code` |
|--------|------------|
| `move_up` | KeyW |
| `move_down` | KeyS |
| `move_left` | KeyA |
| `move_right` | KeyD |
| `confirm` | Space / Enter |
| `cancel` | Escape |
| `shoot` | Space |
| `end_turn` | KeyE |
| `play_card_0` … `play_card_9` | Digit0…Digit9 |
| `select_enemy_next` | Tab |
| `turn_left` | ArrowLeft |
| `turn_right` | ArrowRight |
| `move_forward` | KeyW |
| `move_back` | KeyS |
| `choice_0` … `choice_9` | Digit0…Digit9 |
| `skip_cinematic` | Escape / Space |

Genres MUST use these names (or defineAction additional). Gamepad OOS v1.

### Headless input for tests

Scenario steps set actions via `setDown` before ticks (see S-TEST).

## 7. ModuleRegistry

```ts
interface GenreModule {
  id: string
  register(kernel: KernelInternals): void
  schemas?(): Record<string, unknown>  // Zod schemas keyed by content path pattern
  defaultScenes?(): Array<{ name: string; factory: SceneFactory }>
}

interface ModuleRegistry {
  register(mod: GenreModule): void
  get(id: string): GenreModule | undefined
  list(): string[]
}
```

Unknown module id in game.yaml → `MODULE_UNKNOWN`.

### System registration (inside register)

```ts
kernel.addSystem(name: string, priority: number, fn: (dt: number, world: World) => void): void
```

Default priorities (lower runs first): Input 0, Genre 100–199, Collision 200, Anim 300, Audio 400, Lifetime 500.

## 8. AssetServer

```ts
interface AssetServer {
  /** resolve path relative to assetsRoot; no '..' segments */
  resolve(path: string): string
  has(path: string): boolean
  /** texture handle or greybox marker */
  getTexture(path: string): TextureHandle
  getAudio(path: string): AudioHandle | null
  missing(): string[]          // paths requested but missing
  preload(paths: string[]): Promise<void>
}
```

Greybox: see S-ASSETS.

## 9. Kernel time / RNG

```ts
// accessible via handle
random(): number           // [0,1)
randomInt(min: number, maxExclusive: number): number
```

MUST be deterministic given seed. pause freezes sim time; wall clock still may call tick but accumulator does not advance systems when paused.

### Fixed timestep algorithm (normative)

```
accumulator += min(dtWall, 0.25)
steps = 0
while accumulator >= fixedDt and steps < maxDtSteps:
  if not paused: runSystems(fixedDt); tick++
  accumulator -= fixedDt
  steps++
alpha = accumulator / fixedDt   // for render interpolation if used
render(alpha)
input.endFrame()
```

## 10. ObserveSnapshot (versioned)

```ts
interface ObserveSnapshot {
  anvilVersion: string
  schemaVersion: 1
  scene: string | null
  time: number
  tick: number
  seed: number
  paused: boolean
  entities: Array<{
    id: string
    tags: string[]
    x?: number
    y?: number
    hp?: number
    maxHp?: number
  }>
  input: Record<string, boolean>
  ui: Record<string, unknown>
  genre: Record<string, unknown>
  screenshot?: string          // relative path if shot requested
}
```

## 11. Save / load (M2 — REQ-K11)

```ts
interface SaveGame {
  v: 1
  gameId: string
  scene: string
  seed: number
  tick: number
  entities: Entity[]
  genreState: Record<string, unknown>
  savedAt: string              // ISO timestamp informational only
}
```

- Default slot file: `{root}/saves/slot0.json`  
- `saveGame` writes atomic temp+rename  
- `loadGame` validates schema then createGame + restore  
- Genres MUST document `genreState` keys in their S-*  
- Failures: `IO_ERROR`, `SCHEMA_INVALID`  

## 12. Required unit tests

- seed reproducibility (10 random() values)  
- pause stops entity motion under constant input inject  
- spawn/destroy/query  
- scene replace emits exit/enter  
- input setDown visible in isDown for one step  
