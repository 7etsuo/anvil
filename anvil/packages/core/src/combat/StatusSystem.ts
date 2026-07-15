/**
 * Buff / debuff status effects — duration, stacks, stat mods, DoT ticks.
 */

import type { Stats } from "../rpg/types.js";
import type { DamageType } from "./Damage.js";

export type StatusStackMode = "refresh" | "stack" | "ignore";

export type StatusFlags = {
  stun?: boolean;
  root?: boolean;
  silence?: boolean;
};

export interface StatusDef {
  id: string;
  name?: string;
  /** Base duration when applied */
  durationMs: number;
  maxStacks?: number;
  stackMode?: StatusStackMode;
  /** Flat stat mods while active (multiplied by stacks) */
  statMods?: Partial<Stats>;
  /** Damage per tick */
  tickDamage?: number;
  tickIntervalMs?: number;
  damageType?: DamageType;
  tags?: string[];
  flags?: StatusFlags;
}

export interface ActiveStatus {
  defId: string;
  remainingMs: number;
  stacks: number;
  tickAccMs: number;
  sourceId?: string;
}

export type StatusTickDamage = {
  entityId: string;
  defId: string;
  amount: number;
  damageType: DamageType;
  sourceId?: string;
};

export type StatusExpireEvent = {
  entityId: string;
  defId: string;
};

/**
 * Per-entity status lists. Register defs, apply/remove, tick DoTs.
 */
export class StatusSystem {
  private defs = new Map<string, StatusDef>();
  /** entityId → active statuses */
  private byEntity = new Map<string, ActiveStatus[]>();

  register(def: StatusDef): void {
    this.defs.set(def.id, def);
  }

  registerAll(defs: StatusDef[]): void {
    for (const d of defs) this.register(d);
  }

  getDef(id: string): StatusDef | undefined {
    return this.defs.get(id);
  }

  listDefs(): StatusDef[] {
    return [...this.defs.values()];
  }

  /**
   * Apply or refresh a status. Returns false if def missing or stackMode ignore
   * and already present.
   */
  apply(
    entityId: string,
    defId: string,
    opts?: { sourceId?: string; durationMs?: number; stacks?: number },
  ): boolean {
    const def = this.defs.get(defId);
    if (!def) return false;

    const list = this.byEntity.get(entityId) ?? [];
    const existing = list.find((s) => s.defId === defId);
    const mode = def.stackMode ?? "refresh";
    const addStacks = Math.max(1, opts?.stacks ?? 1);
    const duration = opts?.durationMs ?? def.durationMs;

    if (existing) {
      if (mode === "ignore") return false;
      if (mode === "refresh") {
        existing.remainingMs = Math.max(existing.remainingMs, duration);
        existing.sourceId = opts?.sourceId ?? existing.sourceId;
      } else {
        // stack
        const max = def.maxStacks ?? 99;
        existing.stacks = Math.min(max, existing.stacks + addStacks);
        existing.remainingMs = Math.max(existing.remainingMs, duration);
        existing.sourceId = opts?.sourceId ?? existing.sourceId;
      }
      this.byEntity.set(entityId, list);
      return true;
    }

    list.push({
      defId,
      remainingMs: duration,
      stacks: Math.min(def.maxStacks ?? 99, addStacks),
      tickAccMs: 0,
      sourceId: opts?.sourceId,
    });
    this.byEntity.set(entityId, list);
    return true;
  }

  remove(entityId: string, defId: string): boolean {
    const list = this.byEntity.get(entityId);
    if (!list) return false;
    const next = list.filter((s) => s.defId !== defId);
    if (next.length === list.length) return false;
    if (next.length === 0) this.byEntity.delete(entityId);
    else this.byEntity.set(entityId, next);
    return true;
  }

  clear(entityId: string): void {
    this.byEntity.delete(entityId);
  }

  clearAll(): void {
    this.byEntity.clear();
  }

  getActive(entityId: string): ActiveStatus[] {
    return [...(this.byEntity.get(entityId) ?? [])];
  }

  has(entityId: string, defId: string): boolean {
    return (this.byEntity.get(entityId) ?? []).some((s) => s.defId === defId);
  }

  /** Sum stat mods from all active statuses on entity. */
  aggregateMods(entityId: string): Partial<Stats> {
    const out: Partial<Stats> = {};
    for (const s of this.byEntity.get(entityId) ?? []) {
      const def = this.defs.get(s.defId);
      if (!def?.statMods) continue;
      for (const [k, v] of Object.entries(def.statMods)) {
        if (typeof v !== "number") continue;
        out[k] = (out[k] ?? 0) + v * s.stacks;
      }
    }
    return out;
  }

  hasFlag(entityId: string, flag: keyof StatusFlags): boolean {
    for (const s of this.byEntity.get(entityId) ?? []) {
      const def = this.defs.get(s.defId);
      if (def?.flags?.[flag]) return true;
    }
    return false;
  }

  isStunned(entityId: string): boolean {
    return this.hasFlag(entityId, "stun");
  }

  isRooted(entityId: string): boolean {
    return this.hasFlag(entityId, "root");
  }

  /**
   * Advance timers; returns DoT applications this frame.
   * Expired statuses are removed.
   */
  tick(dtMs: number): {
    ticks: StatusTickDamage[];
    expired: StatusExpireEvent[];
  } {
    const ticks: StatusTickDamage[] = [];
    const expired: StatusExpireEvent[] = [];

    for (const [entityId, list] of this.byEntity) {
      const next: ActiveStatus[] = [];
      for (const s of list) {
        const def = this.defs.get(s.defId);
        if (!def) continue;

        s.remainingMs -= dtMs;
        if (s.remainingMs <= 0) {
          expired.push({ entityId, defId: s.defId });
          continue;
        }

        if (def.tickDamage && def.tickDamage > 0) {
          const interval = def.tickIntervalMs ?? 1000;
          s.tickAccMs += dtMs;
          while (s.tickAccMs >= interval) {
            s.tickAccMs -= interval;
            ticks.push({
              entityId,
              defId: s.defId,
              amount: def.tickDamage * s.stacks,
              damageType: def.damageType ?? "poison",
              sourceId: s.sourceId,
            });
          }
        }
        next.push(s);
      }
      if (next.length === 0) this.byEntity.delete(entityId);
      else this.byEntity.set(entityId, next);
    }

    return { ticks, expired };
  }

  /** Snapshot for save / observe */
  serialize(): Record<string, ActiveStatus[]> {
    const out: Record<string, ActiveStatus[]> = {};
    for (const [k, v] of this.byEntity) {
      out[k] = v.map((s) => ({ ...s }));
    }
    return out;
  }

  deserialize(data: Record<string, ActiveStatus[]>): void {
    this.byEntity.clear();
    for (const [k, v] of Object.entries(data)) {
      this.byEntity.set(
        k,
        v.map((s) => ({ ...s })),
      );
    }
  }
}

/** Built-in status pack games can register with one call. */
export const BUILTIN_STATUS_DEFS: StatusDef[] = [
  {
    id: "chill",
    name: "Chill",
    durationMs: 2500,
    stackMode: "refresh",
    statMods: { speed: -40 },
    damageType: "cold",
    tags: ["crowd_control", "cold"],
    flags: { root: false },
  },
  {
    id: "burn",
    name: "Burn",
    durationMs: 3000,
    stackMode: "stack",
    maxStacks: 3,
    tickDamage: 3,
    tickIntervalMs: 500,
    damageType: "fire",
    tags: ["dot", "fire"],
  },
  {
    id: "poison",
    name: "Poison",
    durationMs: 4000,
    stackMode: "stack",
    maxStacks: 5,
    tickDamage: 2,
    tickIntervalMs: 750,
    damageType: "poison",
    tags: ["dot", "poison"],
  },
  {
    id: "stun",
    name: "Stun",
    durationMs: 800,
    stackMode: "refresh",
    flags: { stun: true },
    tags: ["crowd_control"],
  },
  {
    id: "blessed",
    name: "Blessed",
    durationMs: 5000,
    stackMode: "refresh",
    statMods: { damage: 3, armor: 2 },
    damageType: "holy",
    tags: ["buff", "holy"],
  },
  {
    id: "armor_break",
    name: "Armor Break",
    durationMs: 4000,
    stackMode: "stack",
    maxStacks: 3,
    statMods: { armor: -4 },
    tags: ["debuff"],
  },
];
