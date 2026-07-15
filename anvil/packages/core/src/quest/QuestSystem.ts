/**
 * Quest / objective system — flags, steps, completion.
 */

export type QuestStatus = "inactive" | "active" | "completed" | "failed";

export interface QuestStep {
  id: string;
  description: string;
  /** Flag that completes this step when true */
  completeFlag?: string;
  /** Count target (e.g. kills) */
  countKey?: string;
  countTarget?: number;
}

export interface QuestDef {
  id: string;
  title: string;
  description?: string;
  steps: QuestStep[];
  /** Auto-activate on start */
  autoStart?: boolean;
  rewards?: { xp?: number; gold?: number; items?: string[] };
}

export interface QuestRuntime {
  defId: string;
  status: QuestStatus;
  stepIndex: number;
  counts: Record<string, number>;
}

export class QuestSystem {
  private defs = new Map<string, QuestDef>();
  private active = new Map<string, QuestRuntime>();
  private flags = new Map<string, boolean>();

  register(def: QuestDef): void {
    this.defs.set(def.id, def);
    if (def.autoStart) this.start(def.id);
  }

  registerAll(defs: QuestDef[]): void {
    for (const d of defs) this.register(d);
  }

  start(questId: string): boolean {
    const def = this.defs.get(questId);
    if (!def) return false;
    if (this.active.get(questId)?.status === "completed") return false;
    this.active.set(questId, {
      defId: questId,
      status: "active",
      stepIndex: 0,
      counts: {},
    });
    return true;
  }

  setFlag(flag: string, value = true): void {
    this.flags.set(flag, value);
    this.recheck();
  }

  getFlag(flag: string): boolean {
    return this.flags.get(flag) === true;
  }

  /** Increment counter (kills, collect). */
  addCount(key: string, n = 1): void {
    for (const rt of this.active.values()) {
      if (rt.status !== "active") continue;
      rt.counts[key] = (rt.counts[key] ?? 0) + n;
    }
    this.recheck();
  }

  private recheck(): void {
    for (const rt of this.active.values()) {
      if (rt.status !== "active") continue;
      const def = this.defs.get(rt.defId);
      if (!def) continue;
      while (rt.stepIndex < def.steps.length) {
        const step = def.steps[rt.stepIndex]!;
        let done = false;
        if (step.completeFlag && this.getFlag(step.completeFlag)) done = true;
        if (
          step.countKey &&
          step.countTarget !== undefined &&
          (rt.counts[step.countKey] ?? 0) >= step.countTarget
        ) {
          done = true;
        }
        if (!done) break;
        rt.stepIndex++;
      }
      if (rt.stepIndex >= def.steps.length) {
        rt.status = "completed";
      }
    }
  }

  get(questId: string): QuestRuntime | undefined {
    return this.active.get(questId);
  }

  listActive(): QuestRuntime[] {
    return [...this.active.values()].filter((q) => q.status === "active");
  }

  listCompleted(): QuestRuntime[] {
    return [...this.active.values()].filter((q) => q.status === "completed");
  }

  /** Current objective text for HUD. */
  currentObjective(questId: string): string | null {
    const rt = this.active.get(questId);
    const def = this.defs.get(questId);
    if (!rt || !def || rt.status !== "active") return null;
    const step = def.steps[rt.stepIndex];
    if (!step) return null;
    if (step.countKey && step.countTarget) {
      const c = rt.counts[step.countKey] ?? 0;
      return `${step.description} (${c}/${step.countTarget})`;
    }
    return step.description;
  }

  toJSON(): {
    flags: Record<string, boolean>;
    active: QuestRuntime[];
  } {
    return {
      flags: Object.fromEntries(this.flags),
      active: [...this.active.values()],
    };
  }

  loadJSON(data: {
    flags?: Record<string, boolean>;
    active?: QuestRuntime[];
  }): void {
    this.flags = new Map(Object.entries(data.flags ?? {}));
    this.active = new Map(
      (data.active ?? []).map((q) => [q.defId, { ...q, counts: { ...q.counts } }]),
    );
  }
}
