# Spec: save and load

**Milestone:** M2 plus RPG extensions

## Full save API

```ts
saveGame(handle, slot = "slot0"): Promise<void>
loadGame(root, slot = "slot0", createOpts = {}): Promise<GameHandle>
```

Node saves use `<gameRoot>/saves/<slot>.json` and temp-file rename. Browser
saves use `anvil_save_<gameId>_<slot>` in local storage. Browser load callers
must supply matching `browser`, `gameYaml`, renderer, and modules through
`createOpts`.

## Save shape

```ts
interface SaveGame {
  v: 1 | 2;
  gameId: string;
  scene: string;
  seed: number;
  tick: number;
  entities: Entity[];
  genreState: Record<string, unknown>;
  character?: CharacterSaveBlob; // v2 extension
  zones?: ZoneGraphState;        // v2 extension
  savedAt: string;
}
```

`saveGame` selects v2 when a registered character or zone provider returns
data. Providers/appliers are registered per `GameHandle` through
`setGenreStateHooks`, `setCharacterSaveHooks`, and `setZoneSaveHooks` (or
character/zone attach helpers).

## Load behavior

1. Read the Node file or browser key.
2. Parse JSON and check version/game/entities minimum shape.
3. Recreate a game with the saved seed and supplied create options.
4. Clear/recreate entities and replace the saved scene, falling back to the
   manifest entry scene if necessary.
5. Apply registered genre/character/zone state when an applier is attached to
   the new handle.

Current limitation: the public `loadGame` API has no setup callback between
creating the new handle and looking up per-handle appliers. Ordinary callers
cannot assume v2 `character`, `zones`, or custom `genreState` will be restored
unless their creation/module path attaches those hooks to the new handle.
Verify this explicitly. Gravewake therefore uses the lighter run-state helpers
and restores its title state itself.

## Lightweight ARPG run state

`RunStateV1` stores game/area id, position, seed, character blob, free-form
flags, and timestamp. `saveRunToLocalStorage` and `loadRunFromLocalStorage`
namespace keys as `anvil_run_<gameId>_<slot>`. This is not a full world entity
snapshot and does not restore procedural geometry automatically.

## Failures and compatibility

Missing/corrupt storage returns `IO_ERROR` or `SCHEMA_INVALID`. Save versions,
project schema versions, authoring IR versions, and observe versions are
independent. Any breaking save-shape change requires migration tests and a
version bump for the save protocol.
