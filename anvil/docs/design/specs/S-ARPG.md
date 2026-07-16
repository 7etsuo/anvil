# Spec: declarative ARPG authoring and runtime

**Milestone:** M11

**Package:** `@anvil/genre-arpg`

**Depends on:** S-AUTHORING, S-RPG, S-TOPDOWN, S-AGENT

## Implementation status

| Surface | Status in this checkout |
|---------|-------------------------|
| `materializeArpgContent` | Implemented and tested |
| `ArpgRuleRuntime` | Implemented and tested |
| `defineArpgGame` restricted hook | Implemented and tested |
| `arpgModule` export | Implemented |
| Vite/Node immutable-IR use in Gravewake | Implemented |
| Gravewake declarative archetypes/campaign rules/provenance | Implemented |
| Generic CLI loader for `genre-arpg` | **Not implemented** |
| `anvil new --genre arpg` | **Not implemented** |
| Full repository gate | **Not green**; blocked by pending CLI integration tests |

## 1. Purpose and boundary

`@anvil/genre-arpg` turns schema-v2 authoring IR into a browser-safe
action-RPG runtime layer above core and topdown2d. Reusable ARPG mechanics live
here or in core; title lore, balance, maps, art, and named skills remain in the
game.

The IR is the shared Node/browser content source. Traits and prefabs reduce
copied actor fields. Finite triggers and state machines drive campaign rules.
The title hook cannot take renderer, kernel, scene-registration, or scheduler
ownership.

## 2. Materialize compiled content

```ts
import { compileProject } from "@anvil/authoring";
import { materializeArpgContent } from "@anvil/genre-arpg";

const result = compileProject(root);
if (!result.ok) throw new Error("Authoring compilation failed");
const content = materializeArpgContent(result.ir);
```

`materializeArpgContent(ir)`:

1. extracts actors, areas, items, loot tables, and progression from canonical
   content-relative IR paths;
2. resolves each actor's optional prefab;
3. merges `prefab.components.actor` beneath authored actor overrides;
4. retains source hash, actor-prefab mapping, trait provenance, and rules;
5. rejects missing prefabs and actors without positive `hp` or non-negative
   `speed`; and
6. performs no filesystem access.

The materialized object contains `actors`, `areas`, `items`, `lootTables`,
`progression`, `rules`, `authoring`, `raw`, and `sourceHash`.

## 3. Rule runtime

`ArpgRuleRuntime` executes the S-AUTHORING condition/effect language.

- `dispatch(event, data, context)` evaluates triggers and at most one
  transition per state machine in deterministic id order.
- `update(dtMs, context)` advances a logical clock and evaluates persistent
  conditions.
- `set_flag`, `add_counter`, and `emit` are built in. Other effects go to the
  title/engine adapter supplied by the caller.
- `once` and `cooldownMs` use logical time, never wall-clock time.
- Value paths read `event`, `state`, `flags`, and `counters`.
- Nested dispatch is queued and bounded so cyclic authored events cannot hang
  the simulation.
- Snapshots expose logical time, current states, flags, counters, fired
  triggers, transitions, and the last event.

## 4. Restricted title hook

`defineArpgGame(definition)` returns an `ArpgGameBinding` with a `module` and
`getSession()` accessor.

```ts
import { defineArpgGame } from "@anvil/genre-arpg";

const binding = defineArpgGame({
  id: "my-arpg",
  content,
  create(services, compiledContent) {
    return {
      update(dt, input) { /* title-specific orchestration */ },
      observe() { return { ready: true }; },
    };
  },
});

export default binding.module;
```

`create` receives the public scene services minus assets/data/seed plus the
definition's content. It does not receive `Kernel`, `KernelInternals`, renderer
access, scene registration, or scheduling controls. Optional `register`
receives only event and audio services. The factory owns cleanup and registers
the session's structured observation under `observeKey` or the title id.

## 5. Browser compiler bridge

Use `anvilGameIr` from `@anvil/authoring/vite` and import
`virtual:anvil-game-ir`. Then call `materializeArpgContent` in the browser. This
keeps filesystem/compiler code out of the browser graph while consuming the
same content hash as headless play.

See the production example:

- [`../../../../games/gravewake/src/loadContent.ts`](../../../../games/gravewake/src/loadContent.ts)
- [`../../../../games/gravewake/src/module.ts`](../../../../games/gravewake/src/module.ts)
- [`../../../../games/gravewake/browser/contentEmbed.ts`](../../../../games/gravewake/browser/contentEmbed.ts)
- [`../../../../games/gravewake/vite.config.ts`](../../../../games/gravewake/vite.config.ts)

## 6. Current CLI limitation

`GameYamlSchema` and module normalization know the `arpg` genre and
`genre-arpg` id. The CLI's runtime module loader does not yet import
`@anvil/genre-arpg`; unknown non-relative ids are currently skipped. Gravewake
still runs because it also declares `./dist/module.js`, whose default export is
the title module created by `defineArpgGame`.

Do not use `anvil new --genre arpg` or assume that a manifest containing only
`modules: [genre-arpg]` will launch a generic ARPG. Complete the M11 CLI tasks
first.

## 7. Gravewake acceptance status

| Condition | Status |
|-----------|--------|
| Declares `genre: arpg`; consumes ARPG package in Node/browser | Pass |
| Uses canonical compiled IR in both environments | Pass |
| Materializes actor prefab/trait archetypes with provenance | Pass |
| Dispatches area, kill, boss, and level events | Pass |
| Drives campaign state through authored rules | Pass |
| Preserves movement, inventory, progression, combat, and web build tests | Pass in title test/build commands |
| Complete repository check | Pending due to CLI integration failures |

Tasks: [`../20_FULL_TASK_BREAKDOWN.md`](../20_FULL_TASK_BREAKDOWN.md#M11--declarative-arpg-runtime-and-gravewake-integration).
