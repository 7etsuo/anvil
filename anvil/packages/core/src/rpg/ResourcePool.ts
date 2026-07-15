/**
 * Mana / stamina / energy-style resource pools.
 */

export type ResourceId = string;

export type ResourceDef = {
  id: ResourceId;
  name?: string;
  max: number;
  /** Regen per second while not blocked */
  regenPerSec?: number;
  /** Delay after spend before regen (ms) */
  regenDelayMs?: number;
};

export type ResourceState = {
  id: ResourceId;
  current: number;
  max: number;
  regenPerSec: number;
  regenDelayMs: number;
  sinceSpendMs: number;
};

export class ResourcePool {
  private defs = new Map<ResourceId, ResourceDef>();
  /** entityId → resourceId → state */
  private byEntity = new Map<string, Map<ResourceId, ResourceState>>();

  register(def: ResourceDef): void {
    this.defs.set(def.id, def);
  }

  registerAll(defs: ResourceDef[]): void {
    for (const d of defs) this.register(d);
  }

  /** Attach default resources to an entity from registered defs. */
  attach(entityId: string, resourceIds?: ResourceId[]): void {
    const ids = resourceIds ?? [...this.defs.keys()];
    const map = this.byEntity.get(entityId) ?? new Map();
    for (const id of ids) {
      const def = this.defs.get(id);
      if (!def) continue;
      map.set(id, {
        id,
        current: def.max,
        max: def.max,
        regenPerSec: def.regenPerSec ?? 0,
        regenDelayMs: def.regenDelayMs ?? 0,
        sinceSpendMs: def.regenDelayMs ?? 0,
      });
    }
    this.byEntity.set(entityId, map);
  }

  detach(entityId: string): void {
    this.byEntity.delete(entityId);
  }

  get(entityId: string, resourceId: ResourceId): ResourceState | undefined {
    return this.byEntity.get(entityId)?.get(resourceId);
  }

  setMax(entityId: string, resourceId: ResourceId, max: number): void {
    const s = this.get(entityId, resourceId);
    if (!s) return;
    s.max = Math.max(1, max);
    s.current = Math.min(s.current, s.max);
  }

  /** True if enough resource. */
  canSpend(entityId: string, resourceId: ResourceId, amount: number): boolean {
    const s = this.get(entityId, resourceId);
    return !!s && s.current >= amount;
  }

  /**
   * Spend resource. Returns false if insufficient.
   */
  spend(entityId: string, resourceId: ResourceId, amount: number): boolean {
    const s = this.get(entityId, resourceId);
    if (!s || s.current < amount) return false;
    s.current -= amount;
    s.sinceSpendMs = 0;
    return true;
  }

  restore(entityId: string, resourceId: ResourceId, amount: number): void {
    const s = this.get(entityId, resourceId);
    if (!s) return;
    s.current = Math.min(s.max, s.current + amount);
  }

  fill(entityId: string, resourceId?: ResourceId): void {
    const map = this.byEntity.get(entityId);
    if (!map) return;
    if (resourceId) {
      const s = map.get(resourceId);
      if (s) s.current = s.max;
      return;
    }
    for (const s of map.values()) s.current = s.max;
  }

  tick(dtMs: number): void {
    const dtSec = dtMs / 1000;
    for (const map of this.byEntity.values()) {
      for (const s of map.values()) {
        s.sinceSpendMs += dtMs;
        if (s.regenPerSec <= 0) continue;
        if (s.sinceSpendMs < s.regenDelayMs) continue;
        if (s.current >= s.max) continue;
        s.current = Math.min(s.max, s.current + s.regenPerSec * dtSec);
      }
    }
  }

  snapshot(entityId: string): Record<string, { current: number; max: number }> {
    const out: Record<string, { current: number; max: number }> = {};
    for (const [id, s] of this.byEntity.get(entityId) ?? []) {
      out[id] = { current: s.current, max: s.max };
    }
    return out;
  }

  serialize(): Record<string, Record<string, ResourceState>> {
    const out: Record<string, Record<string, ResourceState>> = {};
    for (const [eid, map] of this.byEntity) {
      out[eid] = {};
      for (const [rid, s] of map) out[eid]![rid] = { ...s };
    }
    return out;
  }
}

export const DEFAULT_RESOURCES: ResourceDef[] = [
  {
    id: "mana",
    name: "Mana",
    max: 50,
    regenPerSec: 4,
    regenDelayMs: 800,
  },
  {
    id: "stamina",
    name: "Stamina",
    max: 100,
    regenPerSec: 12,
    regenDelayMs: 400,
  },
];
