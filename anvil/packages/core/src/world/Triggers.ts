/**
 * Axis-aligned trigger volumes: enter / stay / exit events.
 */

export type TriggerVolume = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Optional tags for filtering */
  tags?: string[];
  data?: Record<string, unknown>;
  /** Only fire enter once ever */
  once?: boolean;
};

export type TriggerEvent = {
  type: "enter" | "exit" | "stay";
  triggerId: string;
  entityId: string;
  tags?: string[];
  data?: Record<string, unknown>;
};

export class TriggerSystem {
  private volumes = new Map<string, TriggerVolume>();
  /** entityId → set of trigger ids currently inside */
  private inside = new Map<string, Set<string>>();
  private onceFired = new Set<string>();

  register(v: TriggerVolume): void {
    this.volumes.set(v.id, v);
  }

  registerAll(vs: TriggerVolume[]): void {
    for (const v of vs) this.register(v);
  }

  remove(id: string): void {
    this.volumes.delete(id);
  }

  clear(): void {
    this.volumes.clear();
    this.inside.clear();
    this.onceFired.clear();
  }

  get(id: string): TriggerVolume | undefined {
    return this.volumes.get(id);
  }

  all(): TriggerVolume[] {
    return [...this.volumes.values()];
  }

  private contains(v: TriggerVolume, x: number, y: number): boolean {
    return x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h;
  }

  /**
   * Update entity positions; returns enter/exit/stay events.
   * `positions`: entityId → {x,y}
   */
  update(positions: Record<string, { x: number; y: number }>): TriggerEvent[] {
    const events: TriggerEvent[] = [];
    const entityIds = new Set([
      ...Object.keys(positions),
      ...this.inside.keys(),
    ]);

    for (const entityId of entityIds) {
      const pos = positions[entityId];
      const prev = this.inside.get(entityId) ?? new Set<string>();
      const now = new Set<string>();

      if (pos) {
        for (const v of this.volumes.values()) {
          if (!this.contains(v, pos.x, pos.y)) continue;
          if (v.once && this.onceFired.has(`${v.id}:${entityId}`)) continue;
          now.add(v.id);
        }
      }

      for (const tid of now) {
        const v = this.volumes.get(tid)!;
        if (!prev.has(tid)) {
          events.push({
            type: "enter",
            triggerId: tid,
            entityId,
            tags: v.tags,
            data: v.data,
          });
          if (v.once) this.onceFired.add(`${tid}:${entityId}`);
        } else {
          events.push({
            type: "stay",
            triggerId: tid,
            entityId,
            tags: v.tags,
            data: v.data,
          });
        }
      }
      for (const tid of prev) {
        if (!now.has(tid)) {
          const v = this.volumes.get(tid);
          events.push({
            type: "exit",
            triggerId: tid,
            entityId,
            tags: v?.tags,
            data: v?.data,
          });
        }
      }

      if (now.size === 0) this.inside.delete(entityId);
      else this.inside.set(entityId, now);
    }

    return events;
  }
}
