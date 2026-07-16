# Spec: Agent-native ACI (v0.5)

**Goal:** Coding agents can author and repair games through a **small,
structured** loop without Phaser docs or raw keyboard codes.

## Research drivers

| Source | Takeaway for Anvil |
|--------|-------------------|
| SWE-agent (arXiv:2405.15793) | Interface design dominates success; keep tool count small |
| ReAct / TAO | Thought → **Action** → **Observation** loop |
| GameCraft-Bench | Verify with **playable/tests**, not compile-only |
| Agents.md / ACI notes | JSON errors + observe + test; no bash thrashing |

## Canonical loop

```
pnpm anvil tools          → discover surface
pnpm anvil validate       → schema OK
edit content JSON
pnpm anvil test           → pass/fail (primary)
on fail: pnpm anvil observe --json  (read summary first)
agentStep / fix content
pnpm anvil test
pnpm anvil doctor         → one-shot health
```

## Programmatic API

| API | Purpose |
|-----|---------|
| `agentStep(handle, actions, frames?)` | Structured act + advance sim |
| `AgentAction` | `move`, `tap`, `press`, `wait`, … |
| `observe(handle)` | Full snapshot + `summary` + `allowedActions` |
| `observeDiff(a,b)` | Compact delta for prompts |
| `ReplayRecorder` / `playReplay` | Deterministic action tapes |
| `AGENT_TOOL_CATALOG` | Machine-readable tool list |

## CLI

| Command | Output |
|---------|--------|
| `anvil tools [--json]` | Catalog + recommended loop |
| `anvil doctor [path]` | validate + test summary, exit 0/1 |
| `anvil observe` | includes `summary` |
| `anvil test` | unchanged primary gate |

## Test failure diagnosis (agent-critical)

On `TEST_FAIL` / `TEST_TIMEOUT`, `runTests` attaches:

```json
{
  "diagnosis": {
    "summary": "scene=main tick=12 …",
    "path": "genre.foo",
    "actual": null,
    "hint": "Expected … Fix … re-test.",
    "entities": [{ "id": "player", "tags": ["player"], "hp": 10 }]
  }
}
```

Agents should read **diagnosis before** re-running observe dumps.

## Metrics on observe.engine

```json
"metrics": {
  "lastTickMs": 0.4,
  "tickMsEma": 0.5,
  "entities": 12,
  "entityBudget": 500,
  "overEntityBudget": false
}
```

## Content schemas (validate)

`anvil validate` walks `content/**/*.json` and applies Zod schemas by folder:

| Folder | Schema |
|--------|--------|
| `items/` | ItemDef |
| `loot/` | LootTable (+ warn unknown item ids) |
| `quests/` | QuestDef |
| `actors/` | ActorDef |
| `maps/` / `areas/` | Map / Area |
| `cards/` | CardDef |
| `audio.json` | cues map |

Errors use `SCHEMA_INVALID` / `REF_MISSING` with `path` + `hint` for agents.

This core content walk is not the schema-v2 authoring compiler. For v2 intent,
traits, prefabs, triggers, machines, and source hashes, call `compileProject`
from `@anvil/authoring` in the current host/title workflow. Generic CLI
integration remains pending.

## Rules for implementers

1. Do **not** grow the ACI without a concrete agent need and machine-readable
   discovery.
2. Prefer **content JSON** edits over new TypeScript for balance/content.  
3. Errors always `{ ok:false, errors:[{ code, message, path?, hint? }] }`.  
4. Screenshots optional; JSON is the default sense channel.  
5. Test failures must include **diagnosis** for agents.  
6. Keep planned commands out of current quick starts until live help/tests
   prove them.
