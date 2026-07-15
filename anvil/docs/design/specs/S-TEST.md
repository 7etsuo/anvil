# Spec: Test Scenario DSL + TestReport

**Milestone:** M1

## 1. Discovery

`runTests(root)` loads:

1. All `tests/**/*.json` under game root  
2. Optional `tests/**/*.ts` exporting `scenarios` (M3+; JSON required M1)

## 2. Scenario JSON schema (normative)

```ts
interface TestScenario {
  id: string
  seed?: number                 // default game seed
  maxTicks?: number             // default 10000; exceed → TEST_TIMEOUT
  strictAssets?: boolean
  steps: TestStep[]
}

type TestStep =
  | { tick: number; setDown?: Record<string, boolean>; setUp?: string[] }
  | { tick: number; action: string; args?: Record<string, unknown> }
  | { tick: number; assert: Assertion }
  | { tick: number; wait?: number }   // wait N additional sim ticks (hold prior input)
```

**`tick`:** absolute simulated step index (integer). Steps MUST be processed in ascending tick order. Kernel advances from 0 to max needed.

### Named actions (unified)

Actions are **InputMap action names** (S-CORE).  
Optional convenience (card genre runner MAY expand):

| Convenience action | Expansion |
|--------------------|-----------|
| `play_card` + `args: { slot: 0 }` | `setDown play_card_0` for one step |
| `end_turn` | `setDown end_turn` edge |

**Do not use** free-form `play_card` with card id string — use hand **slot index**.

### Assertion

```ts
type Assertion =
  | { path: string; eq: unknown }
  | { path: string; neq: unknown }
  | { path: string; exists: boolean }
  | { path: string; gt?: number; lt?: number; gte?: number; lte?: number }
```

`path` is JSON path on ObserveSnapshot, e.g. `genre.battle.phase`, `entities.0.hp`.  
Dot segments; array index numeric.

## 3. TestReport

```ts
interface TestReport {
  ok: boolean
  results: Array<{
    id: string
    pass: boolean
    ticks?: number
    error?: { code: string; message: string; path?: string }
  }>
}
```

CLI: print JSON or human summary; exit `1` if any fail; `0` if all pass.

## 4. Launch gate

Before steps: load project, createGame headless, enter entryScene.  
Throw/fail → result `LAUNCH_FAIL`, scenario fail.

## 5. Example (card)

```json
{
  "id": "card_damage",
  "seed": 1,
  "maxTicks": 100,
  "steps": [
    { "tick": 0, "action": "play_card", "args": { "slot": 0 } },
    { "tick": 2, "assert": { "path": "genre.battle.enemies.0.hp", "lt": 100 } }
  ]
}
```

## 6. Required meta-tests (hello-empty)

- empty scenario with assert scene exists passes  
- assert false fails with TEST_FAIL  
