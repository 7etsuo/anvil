/**
 * Aggro / threat table per tank/target.
 * Highest threat becomes preferred target for AI.
 */

export type ThreatEntry = {
  sourceId: string;
  threat: number;
  lastMs: number;
};

export class ThreatTable {
  /** targetId → list of aggro sources */
  private tables = new Map<string, ThreatEntry[]>();
  private timeMs = 0;
  /** Decay per second (absolute threat units) */
  decayPerSec = 2;
  /** Drop entry if no threat update for this long */
  staleMs = 15000;

  tick(dtMs: number): void {
    this.timeMs += dtMs;
    const decay = (this.decayPerSec * dtMs) / 1000;
    for (const [tid, list] of this.tables) {
      const next: ThreatEntry[] = [];
      for (const e of list) {
        if (this.timeMs - e.lastMs > this.staleMs) continue;
        e.threat = Math.max(0, e.threat - decay);
        if (e.threat > 0.01) next.push(e);
      }
      if (next.length === 0) this.tables.delete(tid);
      else this.tables.set(tid, next);
    }
  }

  /** Add threat from source toward target (e.g. damage dealt * weight). */
  add(targetId: string, sourceId: string, amount: number): void {
    if (amount <= 0) return;
    const list = this.tables.get(targetId) ?? [];
    let e = list.find((x) => x.sourceId === sourceId);
    if (!e) {
      e = { sourceId, threat: 0, lastMs: this.timeMs };
      list.push(e);
    }
    e.threat += amount;
    e.lastMs = this.timeMs;
    this.tables.set(targetId, list);
  }

  /** Healing generates threat on nearby enemies via game calling add on each. */
  clear(targetId: string): void {
    this.tables.delete(targetId);
  }

  clearAll(): void {
    this.tables.clear();
  }

  list(targetId: string): ThreatEntry[] {
    return [...(this.tables.get(targetId) ?? [])].sort(
      (a, b) => b.threat - a.threat,
    );
  }

  /** Top aggro source, or null. */
  top(targetId: string): ThreatEntry | null {
    const list = this.list(targetId);
    return list[0] ?? null;
  }

  topId(targetId: string): string | null {
    return this.top(targetId)?.sourceId ?? null;
  }

  serialize(): Record<string, ThreatEntry[]> {
    const out: Record<string, ThreatEntry[]> = {};
    for (const [k, v] of this.tables) {
      out[k] = v.map((e) => ({ ...e }));
    }
    return out;
  }
}
