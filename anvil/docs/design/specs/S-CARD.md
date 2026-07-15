# Spec: genre-card (complete behavior)

**Milestone:** M3  
**Research:** GameCraft card family; data-driven effects.

## 1. Battle model

```ts
interface BattleState {
  phase: 'player_turn' | 'resolve' | 'enemy_turn' | 'win' | 'lose'
  energy: number
  energyMax: number
  handSize: number            // default 5
  hand: string[]              // card **instance** ids
  draw: string[]
  discard: string[]
  /** instanceId -> defId */
  cardDefs: Record<string, string>
  player: { hp: number; maxHp: number; block: number; statuses: StatusInst[] }
  enemies: Array<{
    id: string
    defId: string
    hp: number
    maxHp: number
    block: number
    intent?: EnemyIntent
    intentIndex: number
    statuses: StatusInst[]
  }>
  selectedEnemyIndex: number  // default 0 among living
  won: boolean                // true iff phase==='win'
  lost: boolean
}

interface StatusInst { id: 'weak' | 'vulnerable'; turns: number }
```

## 2. Turn rules (normative)

1. **Enter `player_turn`:** energy = energyMax; draw until `hand.length === handSize` or draw empty after reshuffle attempt; roll/show enemy intents; tick down statuses with `turns` at **start** of player turn (expire ≤0).  
2. **Play card (slot i):** if phase≠player_turn reject; if cost > energy reject; energy -= cost; card hand→discard; phase=`resolve`; apply effects in order; then phase=`player_turn` unless win/lose.  
3. **End turn:** phase=`enemy_turn`; discard all hand to discard; run each living enemy intent; clear **player** block only; enemy block remains until their next intent resolves as needed; phase=`player_turn`.  
4. **Win** when all enemies hp ≤ 0 → phase=`win`, won=true. **Lose** when player hp ≤ 0 → phase=`lose`, lost=true.  

### Damage algorithm

```
function outgoingMul(attacker): weak ? 0.75 : 1
function incomingMul(target): vulnerable ? 1.5 : 1
raw = floor(amount * outgoingMul * incomingMul)
absorbed = min(target.block, raw)
target.block -= absorbed
target.hp -= (raw - absorbed)
```

Block effect: add to target.block (default self).

## 3. Effects (complete v1 ops)

| op | Semantics |
|----|-----------|
| `damage` | amount reduced by target block first; rest to hp; block -= absorbed |
| `block` | add to target block (usually self) |
| `draw` | draw N from draw pile; shuffle discard into draw if needed |
| `apply_status` | v1 statuses: `weak` (0.75 dmg out), `vulnerable` (1.5 dmg in), duration turns |

**Target resolution:** `self` | `enemy` (first living / selected) | `all_enemies`

## 4. Enemy intent

```ts
type EnemyIntent =
  | { kind: 'attack'; amount: number }
  | { kind: 'block'; amount: number }
  | { kind: 'buff'; status: string; amount: number }
```

Shown at start of player turn; executed on enemy turn.

## 5. Content files

- `content/cards/*.json` — CardDef  
- `content/enemies/*.json` — hp, intents pattern list  
- `content/battles/*.json` — player hp, energyMax, enemy list, starting deck  

## 6. Input actions (S-CORE names)

`play_card_0`..`play_card_9`, `end_turn`, `select_enemy_next`

Tests: use S-TEST convenience `play_card` + `args.slot`.

## 7. Observe genre blob

```json
{
  "genre": {
    "battle": {
      "phase": "player_turn",
      "energy": 3,
      "hand": ["inst_1"],
      "won": false,
      "lost": false,
      "player": { "hp": 50, "maxHp": 50, "block": 0 },
      "enemies": [{ "id": "e1", "hp": 40, "maxHp": 40, "block": 0 }]
    }
  }
}
```

Assert win via `genre.battle.phase` eq `win` **or** `genre.battle.won` eq true.

## 8. Tests (required)

- Play slot 0 strike reduces enemy hp  
- Block absorbs damage  
- Win condition  
- Lose condition  
- Draw reshuffle  

## 9. Diagram

Normative phases: `player_turn` → `resolve` → `player_turn` | `enemy_turn` → `player_turn` | `win`/`lose`.  
Also `08` / `12`.
