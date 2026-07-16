# Spec: `@anvil/schema`

**Milestones:** M1 manifest/content schemas; M10 intent and declarative authoring

## 1. Manifest schema

The current `GameYamlSchema` accepts both migration-era versions:

```ts
{
  id: /^[a-z0-9-]+$/,
  title: string,
  version: string = "0.0.0",
  anvil?: string,
  genre: "none" | "card" | "topdown2d" | "vn" | "shmup" | "fps2" | "arpg",
  modules: string[] = [],
  entryScene: string,
  seed?: integer,
  contentRoot: string = "content",
  assetsRoot: string = "assets",
  intent: relativePath = "game.spec.yaml",
  schemaVersion: 1 | 2 = 1,
}
```

`LegacyGameYamlSchema` accepts version 1 only and omits `intent`. `intent` is
parsed/defaulted by `GameYamlSchema` for either version, but only the v2
authoring compiler reads and requires the referenced file.

Built-in module ids are `genre-card`, `genre-topdown2d`, `genre-vn`,
`genre-shmup`, `genre-fps2`, `genre-arpg`, and `genre-net`; `core` is implicit.
The manifest's module array is a string array so project-relative and custom
module ids can also be declared.

`normalizeModules(genre, modules)` removes explicit `core` and auto-appends the
matching built-in genre module. It does not prove that the CLI can load every
normalized id; `genre-arpg` loader wiring is pending.

## 2. Safe shared primitives

```ts
AssetPath = nonEmptyString without ".." and without a leading "/"
EntityId = /^[a-zA-Z0-9_.:-]+$/
```

Content, intent, and asset paths are project-relative. Runtime filesystem
boundaries perform additional root-containment checks.

## 3. Schema-v2 intent

`GameIntentSchema` requires:

- `schemaVersion: 2`;
- a non-empty summary;
- `quality`: `smoke`, `playable`, or `excellent` (default `playable`);
- players with integer `min >= 1` and `max >= min`;
- at least one platform from `web`, `desktop`, `mobile`; and
- at least one uniquely identified requirement.

Requirements have a category, priority (`must`, `should`, `could`),
description, weight from 1–10, and zero or more verifier ids. The full authoring
contract is [`S-AUTHORING.md`](./S-AUTHORING.md).

## 4. Declarative authoring schemas

| Schema | Required shape |
|--------|----------------|
| `TraitDefSchema` | `id`, `requires[]`, `conflicts[]`, `components{}` |
| `PrefabDefSchema` | `id`, optional `parent`, ordered `traits[]`, `components{}` |
| `TriggerDefSchema` | `id`, `when`, non-empty `then[]`, optional `else[]`, `once`, `cooldownMs` |
| `StateMachineDefSchema` | `id`, valid `initial`, non-empty states with local transition targets |

Conditions and effects are finite discriminated unions; see
[`S-AUTHORING.md`](./S-AUTHORING.md#rule-dsl).

## 5. Content path registry

The core/genre validator and the v2 compiler have different responsibilities.
The compiler retains every JSON file by its path and gives special treatment
to traits, prefabs, triggers, and machines. Runtime genres validate their own
content shapes.

| Path | Principal owner |
|------|-----------------|
| `content/meta.json` | schema/core |
| `content/cards/*.json`, `battles/*.json` | genre-card |
| `content/actors/*.json` | topdown2d, shmup, fps2, or ARPG materializer |
| `content/maps/*.json` | topdown2d/fps2 |
| `content/scripts/*.json` | genre-vn |
| `content/waves/*.json` | genre-shmup |
| `content/weapons/*.json` | genre-fps2 |
| `content/areas/*.json`, `items/*.json`, `loot/*.json`, `progression.json` | genre-arpg/core RPG |
| `content/traits/*.json`, `prefabs/*.json`, `triggers/*.json`, `machines/*.json` | authoring compiler |
| `content/audio.json`, `cinematics.json` | core media services |

Detailed genre field tables live in their component specs and exported Zod
schemas. Those exports are authoritative when an older prose example differs.

## 6. Referential integrity

Core validation parses JSON and checks known genre references and assets. The
authoring compiler additionally checks duplicate declarative ids, prefab
parents, trait requirements/conflicts, actor prefab references, spawn prefab
references, cycles, and state-machine targets. ARPG materialization then checks
the resolved actor requirements.

## 7. Validation result

```ts
type ValidationResult =
  | { ok: true; warnings?: AnvilError[] }
  | { ok: false; errors: AnvilError[] };
```

`compileProject` has its own `CompileResult` with either immutable `ir` plus
warnings or sorted errors.

## 8. Optional asset manifest

`assets/manifest.yaml` contains a `required` array of project-relative paths:

```yaml
required:
  - actors/player.png
  - audio/hit.ogg
```

Missing files warn by default and fail strict asset validation.
