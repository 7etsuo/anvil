# 10 — Observe, test, replay, and evaluation

Anvil combines deterministic headless scenarios with structured state and
optional visual capture. Agents should verify behavior, not infer success from
compilation alone.

## Observe

```bash
pnpm anvil observe --root ./game --json
pnpm anvil observe --root ./game --shot
```

The snapshot contains runtime version, observation schema version, scene,
time/tick/seed, pause state, simplified entities, input, genre and engine
state, a concise summary, allowed actions, and optional screenshot path.

Observe after a failed scenario, after a visual change, and before claiming an
interaction is fixed. Prefer summary and `observeDiff` over repeatedly placing
the entire state in model context.

## Scenario tests

The normative JSON DSL is [`specs/S-TEST.md`](./specs/S-TEST.md). Scenarios
declare a seed and ordered tick/action/assertion steps. The runner launches the
entry scene headlessly, applies semantic actions, and returns structured
results/nonzero process status on failure.

Example:

```json
{
  "id": "card_win_seed1",
  "seed": 1,
  "steps": [
    { "tick": 0, "action": "play_card", "args": { "slot": 0 } },
    { "tick": 1, "action": "end_turn" },
    { "tick": 20, "assert": { "path": "genre.battle.won", "eq": true } }
  ]
}
```

A package that cannot enter its entry scene fails the launch gate.

## Semantic stepping and diffs

`agentStep` accepts move/press/release/tap/wait/set-down actions. It advances
the fixed-step simulation and returns frames/tick/time. `observeDiff` reports
entity additions/removals, health/position changes, scene changes, genre
changes, and a concise summary.

## Replay is implemented

`ReplayRecorder(seed)` records semantic action frames and emits `ReplayTape`
version 1. `playReplay(handle, tape)` requires the handle seed to match before
replaying at the fixed timestep. Replay is programmatic; there is no dedicated
CLI replay command.

```ts
const tape = new ReplayRecorder(game.getSeed());
tape.record({ type: "move", dir: "right" }, 30);
tape.record({ type: "tap", action: "shoot" });
playReplay(freshGame, tape.toJSON());
```

## Evaluation policy

CI uses deterministic pass/fail evidence rather than an LLM judge. Internal
playtest rubrics may assess mechanics, depth, functional feedback, and
presentation, but they do not replace launch, scenario, connectivity,
authoring, or build gates.

Schema-v2 intent requirements can name verifier ids. The current compiler
retains those ids, while generic CLI execution/coverage mapping remains a
pending M10 integration task. Gravewake maps them through its title tests and
scenario files.
