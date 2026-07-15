# 10 — Observe, Test, and Evaluation

**Research:** GameCraft-Bench three desiderata (arXiv:2606.17861); GameDevBench visual feedback (arXiv:2602.11103); GameGen-Verifier (arXiv:2605.07442).

## 1. Desiderata → Anvil features

| Desideratum | Anvil |
|-------------|-------|
| **I Engine grounding** | Real kernel + genre systems + browser/headless host |
| **II Artifact completeness** | `anvil new` full package; test launch gate |
| **III Interactive verification** | `anvil test` scenarios + `anvil observe` |

## 2. Observe (agent eyes)

### 2.1 API
- `anvil observe --json`  
- `anvil observe --shot`  

### 2.2 When agents must observe
After any failed test; after visual changes; before claiming “done.”

### 2.3 Implementation notes
- Headless: canvas or offscreen render for shot  
- JSON must include scene, entities, genre state  

## 3. Test model

### 3.1–3.2 Test DSL

**Authoritative:** [`specs/S-TEST.md`](./specs/S-TEST.md)

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

### 3.3 Launch gate
If game fails to enter entry scene → score 0 for package (GC BUILD=0 analogue).

## 4. Evaluation rubric for Anvil demos (internal)

Borrowed categories from GameCraft (weights adjustable):

| Category | Weight | Meaning |
|----------|--------|---------|
| Mechanics | 0.35 | Core loop works |
| Depth | 0.25 | Enough content for demo |
| Functional visuals | 0.20 | Feedback readable (even greybox labels) |
| Presentation | 0.20 | Optional art polish |

Anvil CI uses **pass/fail tests**, not LLM judges, for reliability.

## 5. Replay (phase 2+)

Future: record input traces → replay (GameCraft Π).  
v1: scripted test steps sufficient.

## 6. Sequence: failed test recovery

See swimlane in `12_SEQUENCES_AND_SWIMLANES.md` § Debug.
