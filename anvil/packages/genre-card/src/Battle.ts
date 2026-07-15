import type {
  BattleDef,
  BattleState,
  CardDef,
  Effect,
  EnemyDef,
  EnemyIntent,
  Fighter,
  StatusId,
  StatusInst,
} from "./types.js";

export type Rng = () => number;

let instCounter = 1;

function nextInst(): string {
  return `inst_${instCounter++}`;
}

export function resetInstCounter(n = 1): void {
  instCounter = n;
}

function hasStatus(f: Fighter, id: StatusId): boolean {
  return f.statuses.some((s) => s.id === id && s.turns > 0);
}

function applyStatus(f: Fighter, id: StatusId, turns: number): void {
  const existing = f.statuses.find((s) => s.id === id);
  if (existing) existing.turns = Math.max(existing.turns, turns);
  else f.statuses.push({ id, turns });
}

function tickStatuses(f: Fighter): void {
  f.statuses = f.statuses
    .map((s) => ({ ...s, turns: s.turns - 1 }))
    .filter((s) => s.turns > 0) as StatusInst[];
}

function outgoingMul(attacker: Fighter): number {
  return hasStatus(attacker, "weak") ? 0.75 : 1;
}

function incomingMul(target: Fighter): number {
  return hasStatus(target, "vulnerable") ? 1.5 : 1;
}

export function dealDamage(
  attacker: Fighter | null,
  target: Fighter,
  amount: number,
): void {
  const out = attacker ? outgoingMul(attacker) : 1;
  const inc = incomingMul(target);
  const raw = Math.floor(amount * out * inc);
  const absorbed = Math.min(target.block, raw);
  target.block -= absorbed;
  target.hp -= raw - absorbed;
  if (target.hp < 0) target.hp = 0;
}

export class Battle {
  state: BattleState;
  private rng: Rng;

  constructor(
    battle: BattleDef,
    cards: Record<string, CardDef>,
    enemies: Record<string, EnemyDef>,
    rng: Rng = Math.random,
  ) {
    this.rng = rng;
    resetInstCounter(1);

    const cardDefs: Record<string, string> = {};
    const draw: string[] = [];
    for (const defId of battle.deck) {
      if (!cards[defId]) throw new Error(`Unknown card in deck: ${defId}`);
      const inst = nextInst();
      cardDefs[inst] = defId;
      draw.push(inst);
    }
    this.shuffle(draw);

    const enemyFighters: Fighter[] = battle.enemies.map((defId, i) => {
      const def = enemies[defId];
      if (!def) throw new Error(`Unknown enemy: ${defId}`);
      return {
        id: `enemy_${i}`,
        defId,
        hp: def.hp,
        maxHp: def.hp,
        block: 0,
        statuses: [],
        intentIndex: 0,
      };
    });

    this.state = {
      phase: "player_turn",
      energy: battle.energyMax,
      energyMax: battle.energyMax,
      handSize: battle.handSize ?? 5,
      hand: [],
      draw,
      discard: [],
      cardDefs,
      defs: cards,
      player: {
        id: "player",
        hp: battle.playerHp,
        maxHp: battle.playerHp,
        block: 0,
        statuses: [],
        intentIndex: 0,
      },
      enemies: enemyFighters,
      selectedEnemyIndex: 0,
      won: false,
      lost: false,
    };

    this.enterPlayerTurn();
  }

  private shuffle(arr: string[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
  }

  private livingEnemies(): Fighter[] {
    return this.state.enemies.filter((e) => e.hp > 0);
  }

  private clampSelected(): void {
    const living = this.livingEnemies();
    if (living.length === 0) {
      this.state.selectedEnemyIndex = 0;
      return;
    }
    // selectedEnemyIndex indexes into full enemies array — keep pointing at living
    if (
      this.state.selectedEnemyIndex >= this.state.enemies.length ||
      this.state.enemies[this.state.selectedEnemyIndex]!.hp <= 0
    ) {
      const first = this.state.enemies.findIndex((e) => e.hp > 0);
      this.state.selectedEnemyIndex = first >= 0 ? first : 0;
    }
  }

  private checkWinLose(): void {
    if (this.state.player.hp <= 0) {
      this.state.phase = "lose";
      this.state.lost = true;
      this.state.won = false;
      return;
    }
    if (this.livingEnemies().length === 0) {
      this.state.phase = "win";
      this.state.won = true;
      this.state.lost = false;
    }
  }

  private drawCards(n: number): void {
    for (let i = 0; i < n; i++) {
      if (this.state.draw.length === 0) {
        if (this.state.discard.length === 0) break;
        this.state.draw = [...this.state.discard];
        this.state.discard = [];
        this.shuffle(this.state.draw);
      }
      const c = this.state.draw.pop();
      if (c) this.state.hand.push(c);
    }
  }

  /** Attach enemy defs for intent rolling (called after construct via setEnemyDefs). */
  private enemyDefs: Record<string, EnemyDef> = {};

  setEnemyDefs(defs: Record<string, EnemyDef>): void {
    this.enemyDefs = defs;
    this.refreshIntents();
  }

  private refreshIntents(): void {
    for (const e of this.state.enemies) {
      if (e.hp <= 0 || !e.defId) {
        e.intent = undefined;
        continue;
      }
      const def = this.enemyDefs[e.defId];
      if (!def?.intents?.length) {
        e.intent = { kind: "attack", amount: 5 };
        continue;
      }
      e.intent = def.intents[e.intentIndex % def.intents.length];
    }
  }

  private enterPlayerTurn(): void {
    if (this.state.won || this.state.lost) return;
    this.state.phase = "player_turn";
    this.state.energy = this.state.energyMax;
    tickStatuses(this.state.player);
    for (const e of this.state.enemies) {
      if (e.hp > 0) tickStatuses(e);
    }
    this.drawCards(this.state.handSize - this.state.hand.length);
    this.refreshIntents();
    this.clampSelected();
    this.checkWinLose();
  }

  selectNextEnemy(): void {
    if (this.state.phase !== "player_turn") return;
    const livingIdx: number[] = [];
    this.state.enemies.forEach((e, i) => {
      if (e.hp > 0) livingIdx.push(i);
    });
    if (livingIdx.length === 0) return;
    const curPos = livingIdx.indexOf(this.state.selectedEnemyIndex);
    const next = livingIdx[(curPos + 1) % livingIdx.length]!;
    this.state.selectedEnemyIndex = next;
  }

  playSlot(slot: number): boolean {
    if (this.state.phase !== "player_turn") return false;
    if (slot < 0 || slot >= this.state.hand.length) return false;
    const inst = this.state.hand[slot]!;
    const defId = this.state.cardDefs[inst]!;
    const def = this.state.defs[defId]!;
    if (def.cost > this.state.energy) return false;

    this.state.energy -= def.cost;
    this.state.hand.splice(slot, 1);
    this.state.discard.push(inst);
    this.state.phase = "resolve";
    this.applyEffects(def.effects, this.state.player);
    this.checkWinLose();
    if (!this.state.won && !this.state.lost) {
      this.state.phase = "player_turn";
    }
    return true;
  }

  endTurn(): void {
    if (this.state.phase !== "player_turn") return;
    this.state.phase = "enemy_turn";
    // discard hand
    this.state.discard.push(...this.state.hand);
    this.state.hand = [];

    for (const e of this.state.enemies) {
      if (e.hp <= 0) continue;
      this.runEnemyIntent(e);
      e.intentIndex++;
      this.checkWinLose();
      if (this.state.lost || this.state.won) return;
    }

    // clear player block only
    this.state.player.block = 0;
    if (!this.state.won && !this.state.lost) {
      this.enterPlayerTurn();
    }
  }

  private runEnemyIntent(e: Fighter): void {
    const intent: EnemyIntent =
      e.intent ?? { kind: "attack", amount: 5 };
    if (intent.kind === "attack") {
      dealDamage(e, this.state.player, intent.amount);
    } else if (intent.kind === "block") {
      e.block += intent.amount;
    } else if (intent.kind === "buff") {
      const st = intent.status === "vulnerable" ? "vulnerable" : "weak";
      applyStatus(e, st, intent.amount);
    }
  }

  private applyEffects(effects: Effect[], caster: Fighter): void {
    for (const ef of effects) {
      if (ef.op === "damage") {
        const targets = this.resolveTargets(ef.target, caster);
        for (const t of targets) dealDamage(caster, t, ef.amount);
      } else if (ef.op === "block") {
        const target = ef.target ?? "self";
        const targets = this.resolveTargets(target === "enemy" ? "enemy" : "self", caster);
        for (const t of targets) t.block += ef.amount;
      } else if (ef.op === "draw") {
        this.drawCards(ef.amount);
      } else if (ef.op === "apply_status") {
        const targets = this.resolveTargets(ef.target, caster);
        for (const t of targets) applyStatus(t, ef.status, ef.amount);
      }
    }
  }

  private resolveTargets(
    target: "self" | "enemy" | "all_enemies",
    caster: Fighter,
  ): Fighter[] {
    if (target === "self") return [caster.id === "player" ? this.state.player : caster];
    if (target === "all_enemies") return this.livingEnemies();
    // enemy — selected living
    this.clampSelected();
    const e = this.state.enemies[this.state.selectedEnemyIndex];
    if (e && e.hp > 0) return [e];
    const first = this.livingEnemies()[0];
    return first ? [first] : [];
  }

  /** Snapshot for observe (strip heavy defs). */
  observeBlob(): Record<string, unknown> {
    const s = this.state;
    return {
      phase: s.phase,
      energy: s.energy,
      energyMax: s.energyMax,
      hand: [...s.hand],
      handSize: s.handSize,
      drawCount: s.draw.length,
      discardCount: s.discard.length,
      won: s.won,
      lost: s.lost,
      selectedEnemyIndex: s.selectedEnemyIndex,
      player: {
        hp: s.player.hp,
        maxHp: s.player.maxHp,
        block: s.player.block,
        statuses: s.player.statuses,
      },
      enemies: s.enemies.map((e) => ({
        id: e.id,
        defId: e.defId,
        hp: e.hp,
        maxHp: e.maxHp,
        block: e.block,
        intent: e.intent,
        statuses: e.statuses,
      })),
      // hand card costs for UI/tests
      handCards: s.hand.map((inst) => {
        const defId = s.cardDefs[inst]!;
        const def = s.defs[defId]!;
        return { inst, defId, name: def.name, cost: def.cost };
      }),
    };
  }
}
