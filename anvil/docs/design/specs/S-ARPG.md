# Spec: declarative ARPG authoring and runtime

**Milestone:** M11  
**Package:** `@anvil/genre-arpg`  
**Depends on:** S-AUTHORING, S-RPG, S-TOPDOWN, S-AGENT

## 1. Purpose

`genre-arpg` turns schema-v2 authoring data into a browser-safe action-RPG
runtime. It is a reusable layer above `core` and `genre-topdown2d`; title lore,
balance, maps, art, and named skills remain in the game.

The design is optimized for coding agents:

- one compiled, immutable IR is the source of truth in Node and browser builds;
- archetypes use composable traits and prefabs instead of copied actor fields;
- finite conditions, effects, triggers, and state machines execute at runtime;
- rule state and recent decisions are structured observations;
- game hooks cannot take renderer, kernel, or scheduler ownership.

## 2. Compiled content

`materializeArpgContent(ir)` MUST:

1. extract actors, areas, items, loot tables, and progression from canonical IR
   content paths;
2. resolve an actor's optional `prefab` from `ir.prefabs`;
3. merge `prefab.components.actor` beneath the actor's authored overrides;
4. retain prefab/trait provenance for observation and diagnostics;
5. reject missing prefabs and actors missing required top-down fields;
6. return the IR source hash and declarative rules with the materialized data.

The function MUST be deterministic and browser-safe. It MUST NOT read files.

## 3. Rule runtime

`ArpgRuleRuntime` executes the S-AUTHORING condition/effect language.

- `dispatch(event, data, context)` evaluates triggers and one transition per
  state machine in deterministic id order.
- `update(dtMs, context)` advances the logical clock and evaluates persistent
  conditions.
- `set_flag`, `add_counter`, and `emit` are built in. Other effects are passed
  to a typed title/engine adapter.
- `once` and `cooldownMs` are enforced by the logical clock, never wall time.
- value paths can read `event`, `state`, `flags`, and `counters`.
- snapshots expose logical time, current states, flags, counters, fired
  triggers, transitions, and the last event.

Invalid paths are `undefined`, comparisons are type-safe, nested dispatch is
queued, and a bounded drain prevents cyclic authored events from hanging play.

## 4. Restricted game hook

`defineArpgGame(definition)` creates a `GenreModule` and session accessor.
Definitions may load/provide compiled content and create a session with:

- world, input, deterministic random, and public `SceneContext` services;
- `update`, `observe`, and optional `dispose` lifecycle callbacks.

Definitions MUST NOT receive `Kernel`, `KernelInternals`, renderer access,
scene registration, or system scheduling. The factory owns scene cleanup and
registers the structured observation under the title's id.

## 5. Browser compiler bridge

`@anvil/authoring/vite` MUST compile the game root during Vite configuration
and expose `virtual:anvil-game-ir`. It MUST:

- fail the build with formatted compiler diagnostics;
- serialize the same immutable IR used by headless play;
- invalidate when `game.yaml`, the intent file, or content changes;
- keep Node built-ins and the authoring compiler out of the browser graph.

## 6. Gravewake acceptance

M11 is accepted when Gravewake:

- declares genre `arpg` and consumes `@anvil/genre-arpg` in Node and browser;
- loads canonical content from compiled IR in both environments;
- materializes every actor through authored prefab/trait archetypes;
- dispatches area-entry, enemy-kill, boss-kill, and level-up events;
- drives campaign state through authored triggers/state machines;
- exposes declarative rule state and source provenance in observations;
- retains connected instance movement, inventory, progression, combat, and
  browser production-build regressions;
- passes the complete repository check.

## 7. Research rationale

M11 follows the evidence that agent-authored interactive systems benefit from
structured executable world models, concise world scaffolds, semantic rules,
explicit action/observation boundaries, and verifier-driven execution. Anvil
implements these as versioned IR + finite rules + structured observations +
executable acceptance tests, while retaining ordinary TypeScript escape hatches
behind restricted genre hooks.
