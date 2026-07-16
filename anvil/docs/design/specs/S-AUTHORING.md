# Spec: agent-native authoring substrate (schema v2)

**Milestone:** M10
**Packages:** `@anvil/schema`, `@anvil/authoring`, `@anvil/cli`

## Implementation status

| Surface | Status in this checkout |
|---------|-------------------------|
| Schema v2 manifest and intent schemas | Implemented |
| Traits, prefabs, triggers, and state-machine schemas | Implemented |
| `compileProject`, canonical hashing, immutable IR | Implemented |
| `migrateProject` preview/write API | Implemented |
| Capability catalog/project selection APIs | Implemented |
| `@anvil/authoring/vite` virtual IR bridge | Implemented |
| `anvil migrate`, `describe`, `capabilities` | **Not implemented** |
| Schema-v2 `anvil new` output | **Not implemented** |
| Compiler integration in core `validate`/`test`/`dev` | **Not implemented** |
| All examples/templates migrated to v2 | **Not implemented** |

This status table controls usage. Later sections describe the full contract;
they do not make pending CLI surfaces available.

## 1. Scope

The authoring package establishes a model-agnostic, deterministic boundary for
coding assistants. It does not embed an LLM, renderer, or game-specific
content. Source YAML/JSON compiles into an immutable intermediate
representation before an authoring-aware runtime or verifier consumes it.

## 2. Version boundary

There are two boundaries during the migration period:

- `@anvil/schema`, core runtime creation, and core project validation accept
  schema v1 and v2.
- `@anvil/authoring.compileProject(root)` requires `schemaVersion: 2` and a
  valid intent file. It returns `MIGRATION_REQUIRED` for v1.

Do not claim that every v1 project fails to validate or launch; that will only
be true after the pending CLI/runtime cutover.

Migration is currently programmatic:

```ts
import { migrateProject } from "@anvil/authoring";

const preview = migrateProject(root);                // no writes
const applied = migrateProject(root, { write: true });
```

It is idempotent, writes supporting files before using `game.yaml` as the
version commit point, and does not rewrite content files. Existing invalid
`game.spec.yaml` files are never overwritten.

## 3. `game.yaml` v2

```yaml
id: example-game
title: Example Game
version: 0.0.0
anvil: ">=0.7.0"
genre: topdown2d
modules: [genre-topdown2d]
entryScene: main
seed: 1
contentRoot: content
assetsRoot: assets
intent: game.spec.yaml
schemaVersion: 2
```

`intent` is a safe project-relative path and defaults to `game.spec.yaml`.
`modules` may include built-in ids or project-relative custom modules; the
compiler records capability descriptors but does not import runtime code.

## 4. Intent contract

The referenced intent file is required by `compileProject`:

```yaml
schemaVersion: 2
summary: A concise statement of the intended game.
quality: playable
players:
  min: 1
  max: 1
platforms: [web]
requirements:
  - id: lifecycle.start
    category: lifecycle
    priority: must
    description: The game starts in a playable state.
    weight: 10
    verify: [smoke]
```

Categories are `lifecycle`, `input`, `spatial`, `rules`, `state`, `win_loss`,
`restart`, `feedback`, `content`, `presentation`, and `accessibility`.
Priorities are `must`, `should`, and `could`; weight is 1–10. Requirement ids
must be unique. `quality` is `smoke`, `playable`, or `excellent`.

## 5. Declarative source

The compiler recognizes these folders below `contentRoot`:

| Path | Shape | Purpose |
|------|-------|---------|
| `traits/*.json` | `TraitDef` | Reusable component bundles with requirements/conflicts |
| `prefabs/*.json` | `PrefabDef` | Optional parent, ordered traits, local components |
| `triggers/*.json` | `TriggerDef` | Finite condition/effect rules |
| `machines/*.json` | `StateMachineDef` | Finite state machines |

All other JSON is retained under its content-relative path in `ir.content`.
The declarative compiler never executes arbitrary JavaScript.

### Prefab composition

- A prefab has at most one parent and an ordered trait list.
- Merge order is parent, traits in authored order, then prefab components.
- Later scalar values win; plain objects merge recursively.
- Arrays replace, except arrays made solely of objects with unique string `id`
  fields, which merge by id while retaining stable order.
- Cycles, unknown references, missing trait requirements, and declared trait
  conflicts are compile errors.
- An actor's `prefab` reference is checked during compilation, but genre-level
  actor requirements are checked during ARPG materialization.

### Rule DSL

Conditions are `always`, `all`, `any`, `not`, `flag`, `compare`, `event`,
`area`, `has_item`, and `quest`. Effects are `set_flag`, `add_counter`, `emit`,
`spawn`, `despawn`, `grant_item`, `remove_item`, `start_quest`,
`advance_quest`, `scene`, `damage`, `heal`, and `play_audio`.

State machines have an initial state, named states, optional enter/exit
effects, and transitions whose targets must exist in the same machine.

## 6. Compiler API and IR

```ts
import { compileProject } from "@anvil/authoring";

const result = compileProject(root);
if (!result.ok) {
  for (const diagnostic of result.errors) {
    console.error(diagnostic.code, diagnostic.path, diagnostic.message);
  }
  throw new Error("Compilation failed");
}

const ir = result.ir;
```

Successful results contain:

```ts
interface AnvilGameIR {
  irVersion: 1;
  schemaVersion: 2;
  sourceHash: string;
  manifest: GameYaml;
  intent: GameIntent;
  capabilities: readonly CapabilityDescriptor[];
  traits: Readonly<Record<string, TraitDef>>;
  prefabs: Readonly<Record<string, ResolvedPrefab>>;
  triggers: Readonly<Record<string, TriggerDef>>;
  machines: Readonly<Record<string, StateMachineDef>>;
  content: Readonly<Record<string, unknown>>;
}
```

Maps and arrays have stable ordering. `sourceHash` is SHA-256 over canonical
manifest, intent, and content data. Absolute paths and timestamps do not enter
the hash. The returned graph is deeply frozen.

## 7. Browser bridge

`@anvil/authoring/vite` exports `anvilGameIr({ root })`. The plugin compiles at
build start, watches `game.yaml`, `game.spec.yaml`, and `content/`, and exposes
`virtual:anvil-game-ir`. Compilation errors fail the build with formatted
diagnostics. Serialized IR is frozen again inside the browser module.

The plugin watches the default `game.spec.yaml` filename; projects that set a
different `intent` path compile correctly but do not currently add that custom
path to the watcher. Treat this as an implementation limitation.

## 8. Capability APIs

```ts
import {
  capabilityCatalog,
  capabilitiesForGame,
} from "@anvil/authoring";
```

Each descriptor contains `id`, `version`, `kind`, `summary`, `provides`,
`contentKinds`, `actions`, `observePaths`, `constraints`, and optional `docs`.
Unknown module ids become `custom` descriptors. The CLI projections described
in the original design are pending.

## 9. Diagnostics, security, and determinism

Compiler errors use `AnvilError` with stable fingerprints, structured actual
and expected values, documentation links, and optional safe-fix metadata.
Diagnostics are sorted by path, code, and message.

- All source and migration paths stay within the project root.
- There is no `eval`, dynamic content execution, network access, or
  image-generation API.
- Migration writes temporary files and commits `game.yaml` last.
- Repeated compilation of unchanged sources produces the same hash and IR.

Some current compiler hints mention `anvil migrate`; until the CLI task lands,
translate that hint to the `migrateProject` API shown above.

## 10. Acceptance status

| Acceptance condition | Status |
|----------------------|--------|
| v1 returns migration diagnostic from authoring compiler | Pass |
| Preview is read-only; write migration is idempotent | Pass |
| Compiler determinism, immutability, merge, cycle/conflict, and rule reference tests | Pass |
| Vite virtual IR bridge tests | Pass |
| All active examples/templates are v2 | Pending |
| CLI migrate/describe/capabilities and schema-v2 new | Pending |
| Authoring compiler used by generic validate/test/dev | Pending |
| Full repository gate green | Pending; three CLI integration tests fail |

Tasks: [`../20_FULL_TASK_BREAKDOWN.md`](../20_FULL_TASK_BREAKDOWN.md#M10--schema-v2-agent-native-authoring).
