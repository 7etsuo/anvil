# Spec: Agent-native ACI (v0.5)

**Goal:** Grok Build (and similar coding agents) can author/fix games via a **small, structured** loop without Phaser docs or raw keyboard codes.

## Research drivers

| Source | Takeaway for Anvil |
|--------|-------------------|
| SWE-agent (arXiv:2405.15793) | Interface design dominates success; keep tool count small |
| ReAct / TAO | Thought → **Action** → **Observation** loop |
| GameCraft-Bench | Verify with **playable/tests**, not compile-only |
| Agents.md / ACI notes | JSON errors + observe + test; no bash thrashing |

## Canonical loop

```
anvil tools          → discover surface
anvil validate       → schema OK
edit content JSON
anvil test           → pass/fail (primary)
on fail: anvil observe --json  (read summary first)
agentStep / fix content
anvil test
anvil doctor         → one-shot health
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

## Rules for implementers

1. Do **not** grow CLI past ~15 agent-facing tools without strong need.  
2. Prefer **content JSON** edits over new TypeScript for balance/content.  
3. Errors always `{ ok:false, errors:[{ code, message, path?, hint? }] }`.  
4. Screenshots optional; JSON is the default sense channel.  
5. Test failures must include **diagnosis** for agents.  

