/**
 * Generic skill / talent tree: nodes, points, prerequisites.
 */

export type SkillNodeId = string;

export type SkillNodeDef = {
  id: SkillNodeId;
  name: string;
  description?: string;
  /** Max ranks (default 1) */
  maxRank?: number;
  /** Point cost per rank (default 1) */
  cost?: number;
  /** Must have these nodes at rank >= 1 */
  requires?: SkillNodeId[];
  /** Optional min character level */
  reqLevel?: number;
  /** Game payload (ability unlock, stat bonus, etc.) */
  data?: Record<string, unknown>;
  tags?: string[];
};

export type SkillTreeDef = {
  id: string;
  name?: string;
  nodes: SkillNodeDef[];
  /** Starting free points */
  startPoints?: number;
};

export type SkillTreeState = {
  treeId: string;
  /** Unspent points */
  points: number;
  /** nodeId → rank */
  ranks: Record<SkillNodeId, number>;
};

export class SkillTree {
  private def: SkillTreeDef;
  private nodes = new Map<SkillNodeId, SkillNodeDef>();
  private state: SkillTreeState;

  constructor(def: SkillTreeDef, state?: Partial<SkillTreeState>) {
    this.def = def;
    for (const n of def.nodes) this.nodes.set(n.id, n);
    this.state = {
      treeId: def.id,
      points: state?.points ?? def.startPoints ?? 0,
      ranks: { ...(state?.ranks ?? {}) },
    };
  }

  getDef(): SkillTreeDef {
    return this.def;
  }

  getState(): SkillTreeState {
    return {
      treeId: this.state.treeId,
      points: this.state.points,
      ranks: { ...this.state.ranks },
    };
  }

  rank(nodeId: SkillNodeId): number {
    return this.state.ranks[nodeId] ?? 0;
  }

  addPoints(n: number): void {
    this.state.points = Math.max(0, this.state.points + n);
  }

  /** Whether prereqs + points + max rank allow another rank. */
  canUnlock(nodeId: SkillNodeId, characterLevel = 99): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    const max = node.maxRank ?? 1;
    const cur = this.rank(nodeId);
    if (cur >= max) return false;
    const cost = node.cost ?? 1;
    if (this.state.points < cost) return false;
    if ((node.reqLevel ?? 0) > characterLevel) return false;
    for (const req of node.requires ?? []) {
      if (this.rank(req) < 1) return false;
    }
    return true;
  }

  /** Nodes that can consume a point now; useful for UI/prompt decisions. */
  unlockable(characterLevel = 99): SkillNodeDef[] {
    return this.def.nodes.filter((node) =>
      this.canUnlock(node.id, characterLevel),
    );
  }

  /** True once every node has reached its maximum rank. */
  isComplete(): boolean {
    return this.def.nodes.every(
      (node) => this.rank(node.id) >= (node.maxRank ?? 1),
    );
  }

  /**
   * Spend points to raise rank. Returns false if locked.
   */
  unlock(nodeId: SkillNodeId, characterLevel = 99): boolean {
    if (!this.canUnlock(nodeId, characterLevel)) return false;
    const node = this.nodes.get(nodeId)!;
    const cost = node.cost ?? 1;
    this.state.points -= cost;
    this.state.ranks[nodeId] = this.rank(nodeId) + 1;
    return true;
  }

  /** All unlocked nodes (rank >= 1). */
  unlocked(): Array<{ node: SkillNodeDef; rank: number }> {
    const out: Array<{ node: SkillNodeDef; rank: number }> = [];
    for (const [id, rank] of Object.entries(this.state.ranks)) {
      if (rank < 1) continue;
      const node = this.nodes.get(id);
      if (node) out.push({ node, rank });
    }
    return out;
  }

  /** Merge data payloads from unlocked nodes (shallow). */
  aggregateData(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const { node, rank } of this.unlocked()) {
      if (!node.data) continue;
      for (const [k, v] of Object.entries(node.data)) {
        if (typeof v === "number") {
          out[k] = (typeof out[k] === "number" ? (out[k] as number) : 0) + v * rank;
        } else if (out[k] === undefined) {
          out[k] = v;
        }
      }
    }
    return out;
  }

  serialize(): SkillTreeState {
    return this.getState();
  }

  static deserialize(def: SkillTreeDef, state: SkillTreeState): SkillTree {
    return new SkillTree(def, state);
  }
}

/** Small sample tree for tests / templates. */
export const SAMPLE_COMBAT_TREE: SkillTreeDef = {
  id: "combat",
  name: "Combat",
  startPoints: 1,
  nodes: [
    {
      id: "power",
      name: "Power",
      maxRank: 3,
      data: { damageBonus: 2 },
    },
    {
      id: "iron_skin",
      name: "Iron Skin",
      maxRank: 3,
      data: { armorBonus: 2 },
    },
    {
      id: "whirlwind",
      name: "Whirlwind",
      requires: ["power"],
      reqLevel: 3,
      data: { unlockAbility: "whirl" },
    },
    {
      id: "smite",
      name: "Smite",
      requires: ["power", "iron_skin"],
      reqLevel: 5,
      data: { unlockAbility: "smite" },
    },
  ],
};
