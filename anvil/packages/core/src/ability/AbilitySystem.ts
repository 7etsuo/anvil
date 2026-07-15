/**
 * Data-driven abilities: cooldown, cost hooks, range, targeting shape.
 * Games supply damage application via onCast callback / events.
 */

export type AbilityTargeting =
  | "self"
  | "nearest_enemy"
  | "direction_melee"
  | "aoe_around_self"
  | "point";

export interface AbilityDef {
  id: string;
  name?: string;
  /** Cooldown ms after successful cast */
  cooldownMs: number;
  /** Resource cost (game interprets — mana, stamina, potions) */
  cost?: number;
  costResource?: string;
  /** Max range for nearest/point (world units) */
  range?: number;
  /** AoE radius when aoe_around_self */
  aoeRadius?: number;
  /** Damage multiplier vs base damage (game applies) */
  damageMul?: number;
  targeting: AbilityTargeting;
  /** Optional VFX key for presentation */
  vfx?: string;
  tags?: string[];
}

export type AbilityCastContext = {
  casterId: string;
  x: number;
  y: number;
  facing?: number;
  baseDamage?: number;
  /** Optional aim point for point targeting */
  aimX?: number;
  aimY?: number;
};

export type AbilityCastResult = {
  ok: boolean;
  reason?: string;
  abilityId: string;
  damage?: number;
  targets?: string[];
};

export type AbilityCastHandler = (
  def: AbilityDef,
  ctx: AbilityCastContext,
) => AbilityCastResult | void;

/**
 * Per-entity ability cooldowns + cast gate.
 */
export class AbilitySystem {
  private defs = new Map<string, AbilityDef>();
  /** entityId → abilityId → remaining ms */
  private cd = new Map<string, Map<string, number>>();
  private castHandler: AbilityCastHandler | null = null;

  register(def: AbilityDef): void {
    this.defs.set(def.id, def);
  }

  registerAll(defs: AbilityDef[]): void {
    for (const d of defs) this.register(d);
  }

  get(id: string): AbilityDef | undefined {
    return this.defs.get(id);
  }

  list(): AbilityDef[] {
    return [...this.defs.values()];
  }

  /** Game provides how cast resolves (damage, projectiles, etc.). */
  setCastHandler(fn: AbilityCastHandler): void {
    this.castHandler = fn;
  }

  cooldownRemaining(entityId: string, abilityId: string): number {
    return this.cd.get(entityId)?.get(abilityId) ?? 0;
  }

  isReady(entityId: string, abilityId: string): boolean {
    return this.cooldownRemaining(entityId, abilityId) <= 0;
  }

  update(dtMs: number): void {
    for (const m of this.cd.values()) {
      for (const [id, t] of m) {
        const n = t - dtMs;
        if (n <= 0) m.delete(id);
        else m.set(id, n);
      }
    }
  }

  tryCast(
    entityId: string,
    abilityId: string,
    ctx: Omit<AbilityCastContext, "casterId">,
  ): AbilityCastResult {
    const def = this.defs.get(abilityId);
    if (!def) return { ok: false, reason: "unknown", abilityId };
    if (!this.isReady(entityId, abilityId)) {
      return { ok: false, reason: "cooldown", abilityId };
    }
    const full: AbilityCastContext = { ...ctx, casterId: entityId };
    let result: AbilityCastResult = { ok: true, abilityId };
    if (this.castHandler) {
      const r = this.castHandler(def, full);
      if (r) result = r;
    }
    if (result.ok) {
      let m = this.cd.get(entityId);
      if (!m) {
        m = new Map();
        this.cd.set(entityId, m);
      }
      m.set(abilityId, def.cooldownMs);
    }
    return result;
  }

  /** Snapshot cooldowns for observe/UI. */
  snapshot(entityId: string): Record<string, number> {
    const m = this.cd.get(entityId);
    if (!m) return {};
    return Object.fromEntries(m);
  }
}
