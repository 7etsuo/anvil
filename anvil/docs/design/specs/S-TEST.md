# Spec: JSON scenario DSL and `TestReport`

**Milestone:** M1+

## Discovery and launch

`runTests(root, opts)` recursively loads `tests/**/*.json`, sorted by path.
TypeScript scenario discovery is **not implemented**. If no JSON scenarios
exist, the runner performs a one-tick launch smoke.

Each scenario creates a fresh headless game with caller-supplied modules and
seed override. Core reads `game.yaml`, enters the entry scene, and returns
`LAUNCH_FAIL` if creation fails. It does not run the schema-v2 authoring
compiler; an authoring-aware title must compile in its own module/test boundary.

## Scenario shape

```ts
interface TestScenario {
  id: string;
  seed?: number;
  maxTicks?: number;       // default 10000
  strictAssets?: boolean;
  steps: TestStep[];
}

type TestStep = {
  tick: number;
  setDown?: Record<string, boolean>;
  setUp?: string[];
  action?: string;
  args?: Record<string, unknown>;
  assert?: Assertion;
  wait?: number;
};
```

Steps are sorted by absolute tick. `setDown`/`setUp` modify semantic InputMap
actions. A generic `action` is pulsed as a release/end-frame/press edge.
Convenience actions are:

| Step | Pulse |
|------|-------|
| `action: "play_card", args: { slot: N }` | `play_card_N` |
| `action: "end_turn"` | `end_turn` |
| any other action string | that semantic action |

`wait: N` immediately advances N fixed ticks while retaining the current input
state. Prefer explicit future tick numbers when assertion timing must be easy
to read.

## Assertions

```ts
type Assertion =
  | { path: string; eq: unknown }
  | { path: string; neq: unknown }
  | { path: string; exists: boolean }
  | { path: string; gt?: number; lt?: number; gte?: number; lte?: number };
```

Paths use dot-separated object/array keys on `ObserveSnapshot`, for example
`genre.battle.enemies.0.hp`. Equality is JSON structural equality. Numeric
comparisons apply only when the observed value is a number.

## Report and diagnosis

```ts
interface TestReport {
  ok: boolean;
  results: Array<{
    id: string;
    pass: boolean;
    ticks?: number;
    error?: { code: string; message: string; path?: string };
    diagnosis?: {
      summary: string;
      path?: string;
      actual?: unknown;
      hint: string;
      entities?: Array<{ id: string; tags: string[]; hp?: number }>;
    };
  }>;
}
```

Failed assertions return `TEST_FAIL` plus a compact diagnosis. Unprocessed
steps after `maxTicks` return `TEST_TIMEOUT`. Unexpected runner exceptions
return `INTERNAL`. Strict asset mode fails with `ASSET_MISSING` for paths the
running game requested and recorded as missing.

The CLI prints JSON or a human summary and exits 1 when any result fails.
