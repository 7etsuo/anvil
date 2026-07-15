export type StatusId = "weak" | "vulnerable";

export interface StatusInst {
  id: StatusId;
  turns: number;
}

export type EnemyIntent =
  | { kind: "attack"; amount: number }
  | { kind: "block"; amount: number }
  | { kind: "buff"; status: string; amount: number };

export type Effect =
  | { op: "damage"; amount: number; target: "enemy" | "all_enemies" | "self" }
  | { op: "block"; amount: number; target?: "self" | "enemy" }
  | { op: "draw"; amount: number }
  | {
      op: "apply_status";
      status: StatusId;
      amount: number;
      target: "enemy" | "self" | "all_enemies";
    };

export interface CardDef {
  id: string;
  name: string;
  cost: number;
  art?: string;
  effects: Effect[];
  tags?: string[];
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  art?: string;
  intents: EnemyIntent[];
}

export interface BattleDef {
  id: string;
  playerHp: number;
  energyMax: number;
  handSize?: number;
  deck: string[];
  enemies: string[];
}

export type BattlePhase =
  | "player_turn"
  | "resolve"
  | "enemy_turn"
  | "win"
  | "lose";

export interface Fighter {
  id: string;
  defId?: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: StatusInst[];
  intent?: EnemyIntent;
  intentIndex: number;
}

export interface BattleState {
  phase: BattlePhase;
  energy: number;
  energyMax: number;
  handSize: number;
  hand: string[];
  draw: string[];
  discard: string[];
  cardDefs: Record<string, string>;
  defs: Record<string, CardDef>;
  player: Fighter;
  enemies: Fighter[];
  selectedEnemyIndex: number;
  won: boolean;
  lost: boolean;
}
