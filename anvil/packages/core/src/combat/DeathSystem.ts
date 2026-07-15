/**
 * Death / corpse / revive lifecycle hooks.
 */

export type DeathPhase = "alive" | "dying" | "corpse" | "removed" | "revived";

export type DeathRecord = {
  entityId: string;
  phase: DeathPhase;
  /** Time spent in current phase (ms) */
  phaseMs: number;
  killerId?: string;
  x: number;
  y: number;
  /** Corpse linger before removed */
  corpseMs: number;
  /** Dying animation window */
  dyingMs: number;
  canRevive: boolean;
  data?: Record<string, unknown>;
};

export type DeathSystemOpts = {
  dyingMs?: number;
  corpseMs?: number;
};

export type DeathEvent =
  | { type: "dying"; record: DeathRecord }
  | { type: "corpse"; record: DeathRecord }
  | { type: "removed"; record: DeathRecord }
  | { type: "revived"; record: DeathRecord };

/**
 * Track entity death phases. Games call markDead; system advances timers.
 */
export class DeathSystem {
  private records = new Map<string, DeathRecord>();
  private dyingMs: number;
  private corpseMs: number;

  constructor(opts: DeathSystemOpts = {}) {
    this.dyingMs = opts.dyingMs ?? 400;
    this.corpseMs = opts.corpseMs ?? 8000;
  }

  markDead(
    entityId: string,
    opts: {
      x: number;
      y: number;
      killerId?: string;
      dyingMs?: number;
      corpseMs?: number;
      canRevive?: boolean;
      data?: Record<string, unknown>;
    },
  ): DeathRecord {
    const rec: DeathRecord = {
      entityId,
      phase: "dying",
      phaseMs: 0,
      killerId: opts.killerId,
      x: opts.x,
      y: opts.y,
      dyingMs: opts.dyingMs ?? this.dyingMs,
      corpseMs: opts.corpseMs ?? this.corpseMs,
      canRevive: opts.canRevive ?? false,
      data: opts.data,
    };
    this.records.set(entityId, rec);
    return rec;
  }

  get(entityId: string): DeathRecord | undefined {
    return this.records.get(entityId);
  }

  isDead(entityId: string): boolean {
    const p = this.records.get(entityId)?.phase;
    return p === "dying" || p === "corpse" || p === "removed";
  }

  revive(entityId: string, hp = 1): DeathRecord | null {
    const rec = this.records.get(entityId);
    if (!rec || !rec.canRevive) return null;
    if (rec.phase === "removed") return null;
    rec.phase = "revived";
    rec.phaseMs = 0;
    rec.data = { ...rec.data, reviveHp: hp };
    return rec;
  }

  /** Clear revived/removed from tracking after game handled them. */
  forget(entityId: string): void {
    this.records.delete(entityId);
  }

  all(): DeathRecord[] {
    return [...this.records.values()];
  }

  /**
   * Advance phases. Returns events for game to react (loot on corpse, destroy on removed).
   */
  tick(dtMs: number): DeathEvent[] {
    const events: DeathEvent[] = [];
    for (const rec of this.records.values()) {
      if (rec.phase === "removed" || rec.phase === "revived" || rec.phase === "alive") {
        continue;
      }
      rec.phaseMs += dtMs;
      if (rec.phase === "dying" && rec.phaseMs >= rec.dyingMs) {
        rec.phase = "corpse";
        rec.phaseMs = 0;
        events.push({ type: "corpse", record: rec });
      } else if (rec.phase === "corpse" && rec.phaseMs >= rec.corpseMs) {
        rec.phase = "removed";
        rec.phaseMs = 0;
        events.push({ type: "removed", record: rec });
      }
    }
    return events;
  }
}
