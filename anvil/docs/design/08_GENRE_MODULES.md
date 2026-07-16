# 08 — Genre modules

Genre modules register deterministic systems, schemas, scenes, and structured
observation on the core kernel. They contain reusable genre mechanics, not
title lore or balance.

## Runtime interface

```ts
interface GenreModule {
  id: string;
  register(kernel: KernelInternals): void;
  schemas?(): Record<string, unknown>;
  defaultScenes?(): Array<{ name: string; factory: SceneFactory }>;
}
```

`KernelInternals` is an engine-module interface. Ordinary game code should use
`GameHandle` and `SceneContext`; ARPG title code should use the narrower
`defineArpgGame` services.

## Implemented module map

| Module | Role | Status |
|--------|------|--------|
| `genre-card` | Deck/hand/energy/turn battle and enemy intents | Implemented |
| `genre-topdown2d` | Movement, collision, actors, AI, projectiles, maps/navigation | Implemented |
| `genre-vn` | Line/choice/jump/end script graph | Implemented |
| `genre-shmup` | Scrolling ship, waves, bullet patterns, score/lives | Implemented |
| `genre-fps2` | Grid DDA raycast, yaw, billboards, hitscan | Implemented |
| `genre-net` | Experimental transport-neutral replication | Implemented spike |
| `genre-arpg` | Compiled content materialization, finite campaign rules, restricted title hook | Implemented library; generic CLI loader pending |

Production-oriented authoritative multiplayer lives in the modifier package
`@anvil/net-colyseus`, not in a primary `game.yaml` genre.

## Selection and loading

`game.yaml` declares one primary `genre` and zero or more modules.
`normalizeModules` auto-adds the matching built-in genre module. The CLI loader
currently imports card, topdown2d, VN, shmup, FPS2, and genre-net by id, plus
project-relative modules. Its `genre-arpg` branch is missing; Gravewake includes
a relative compiled title module as its runtime entry.

Do not assume schema recognition proves loader support. See
[`specs/S-CLI.md`](./specs/S-CLI.md) and [`specs/S-ARPG.md`](./specs/S-ARPG.md).

## Composition rules

- Keep one primary genre in the manifest.
- Additional modules must have distinct ids and compatible system ownership.
- Use events/public services for cross-module cooperation.
- A reusable mechanic requested by a title should extend core or a genre
  package, not become permanent title-only engine code.
- A genre may depend on another genre only when its contract says so; ARPG
  explicitly builds above topdown2d.

## Minimum examples

Executable hello packages cover every established primary genre except ARPG.
Gravewake is the current ARPG reference until the generic starter task lands.
