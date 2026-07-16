# Spec: Agent-native authoring substrate (Anvil v2)

**Milestone:** M10 · **Packages:** `@anvil/schema`, `@anvil/authoring`, `@anvil/cli`

## 1. Scope

M10 establishes a model-agnostic, deterministic authoring boundary for coding
assistants. It does not add an LLM, renderer, or game-specific content. Source
files compile into an immutable intermediate representation (IR) before runtime
or verification consumes them.

## 2. Version boundary

- `game.yaml` MUST contain `schemaVersion: 2`.
- Schema v1 projects do not validate or launch directly.
- `anvil migrate [path]` previews the v1-to-v2 changes without writing.
- `anvil migrate [path] --write` performs the migration transactionally.
- Migration is idempotent and never rewrites content files.

## 3. `game.yaml` v2

```yaml
id: example-game
title: Example Game
version: 0.0.0
anvil: ">=0.8.0"
genre: topdown2d
modules: [genre-topdown2d]
entryScene: main
seed: 1
contentRoot: content
assetsRoot: assets
intent: game.spec.yaml
schemaVersion: 2
```

The v1 fields retain their meaning. `intent` is a safe project-relative path
and defaults to `game.spec.yaml`.

## 4. Intent contract

`game.spec.yaml` is required for validation and compilation:

```yaml
schemaVersion: 2
summary: A concise statement of the intended game.
quality: playable
requirements:
  - id: lifecycle.start
    category: lifecycle
    priority: must
    description: The game starts in a playable state.
    weight: 10
    verify: [smoke]
```

Requirement categories are `lifecycle`, `input`, `spatial`, `rules`, `state`,
`win_loss`, `restart`, `feedback`, `content`, `presentation`, and
`accessibility`. Priorities are `must`, `should`, and `could`; weight is 1–10.
Requirement ids are unique.

## 5. Declarative authoring source

The compiler recognizes these optional folders below `contentRoot`:

| Path | Shape | Purpose |
|------|-------|---------|
| `traits/*.json` | `TraitDef` | reusable component bundles |
| `prefabs/*.json` | `PrefabDef` | parent + ordered traits + local components |
| `triggers/*.json` | `TriggerDef` | condition/effect rules |
| `machines/*.json` | `StateMachineDef` | finite state machines |

Unknown content continues to be carried into the IR as canonical JSON.
Arbitrary JavaScript is not valid declarative content.

### 5.1 Prefab composition

- A prefab has at most one parent and an ordered trait list.
- Composition order is parent, traits in listed order, then prefab components.
- Later scalar values win; plain objects merge recursively.
- Arrays replace, except arrays consisting only of objects with unique string
  `id` fields, which merge by id while preserving stable order.
- Parent cycles, trait conflicts, missing requirements, and unknown references
  are compile errors.

### 5.2 Rule DSL

Conditions and effects use finite discriminated unions. Supported conditions:
`always`, `all`, `any`, `not`, `flag`, `compare`, `event`, `area`, `has_item`,
and `quest`. Supported effects: `set_flag`, `add_counter`, `emit`, `spawn`,
`despawn`, `grant_item`, `remove_item`, `start_quest`, `advance_quest`, `scene`,
`damage`, `heal`, and `play_audio`.

State machines contain named states, optional enter/exit effects, transitions
with conditions/effects, a valid initial state, and only local state targets.

## 6. Intermediate representation

`compileProject(root)` returns `CompileResult`. A successful result contains:

```ts
interface AnvilGameIR {
  irVersion: 1
  schemaVersion: 2
  sourceHash: string
  manifest: GameYaml
  intent: GameIntent
  capabilities: CapabilityDescriptor[]
  traits: Record<string, TraitDef>
  prefabs: Record<string, ResolvedPrefab>
  triggers: Record<string, TriggerDef>
  machines: Record<string, StateMachineDef>
  content: Record<string, unknown>
}
```

All maps and arrays have stable ordering, `sourceHash` is SHA-256 over canonical
source data, and the returned graph is deeply frozen. Absolute paths and build
timestamps MUST NOT enter the IR or hash.

## 7. Capability descriptors

Every built-in module has a machine-readable descriptor with `id`, `version`,
`kind`, `summary`, `provides`, `contentKinds`, `actions`, `observePaths`, and
`constraints`. `anvil capabilities [path] --json` reports the selected project
capabilities. `anvil describe [path] --json` reports manifest, intent, source
hash, source counts, capabilities, and diagnostics.

## 8. Diagnostics

Compiler and validator errors use the extended `AnvilError` contract:

```ts
interface AnvilError {
  code: ErrorCode
  severity?: "error" | "warning" | "info"
  message: string
  path?: string
  actual?: unknown
  expected?: unknown
  hint?: string
  example?: unknown
  docs?: string
  fingerprint?: string
  fixes?: Array<{ id: string; title: string; safe: boolean }>
}
```

Fingerprints are stable for the same code/path/message. Diagnostics are sorted
by path, code, and message.

## 9. Security and determinism

- All source and migration paths stay inside the game root.
- No `eval`, dynamic code execution, network call, or image-generation API.
- Migration writes temporary files then renames them; failed writes leave the
  original descriptor intact.
- Compiler output is identical across repeated runs on unchanged source.

## 10. Acceptance

1. Schema v1 validation/launch fails with a migration diagnostic.
2. Preview migration performs no writes; write migration is idempotent.
3. All active examples, templates, and Gravewake validate as v2.
4. Compiler determinism, deep immutability, merge rules, cycle/conflict checks,
   state-machine references, and diagnostic ordering are unit tested.
5. `capabilities`, `describe`, `migrate`, `validate`, and `new` work in JSON
   agent workflows.
6. The full existing engine and Gravewake gate remains green.
