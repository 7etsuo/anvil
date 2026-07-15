/**
 * Chests, shrines, levers, doors — interact-in-range primitives.
 */

export type InteractableKind =
  | "chest"
  | "shrine"
  | "lever"
  | "door"
  | "npc"
  | "custom";

export type InteractableDef = {
  id: string;
  kind: InteractableKind;
  x: number;
  y: number;
  /** Interaction radius */
  radius?: number;
  label?: string;
  /** One-shot (chest) vs toggle (lever) vs reusable (shrine with cooldown) */
  once?: boolean;
  cooldownMs?: number;
  /** Locked until flag/key */
  locked?: boolean;
  requireFlag?: string;
  requireItem?: string;
  data?: Record<string, unknown>;
};

export type InteractableState = {
  def: InteractableDef;
  used: boolean;
  open?: boolean;
  cooldownRemainingMs: number;
};

export type InteractResult =
  | { ok: true; id: string; kind: InteractableKind; firstUse: boolean }
  | { ok: false; reason: string };

export class InteractableSystem {
  private items = new Map<string, InteractableState>();
  private flags = new Set<string>();

  setFlag(flag: string, on = true): void {
    if (on) this.flags.add(flag);
    else this.flags.delete(flag);
  }

  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }

  register(def: InteractableDef): void {
    this.items.set(def.id, {
      def: { radius: 40, once: def.kind === "chest", ...def },
      used: false,
      open: def.kind === "door" ? false : undefined,
      cooldownRemainingMs: 0,
    });
  }

  registerAll(defs: InteractableDef[]): void {
    for (const d of defs) this.register(d);
  }

  get(id: string): InteractableState | undefined {
    return this.items.get(id);
  }

  all(): InteractableState[] {
    return [...this.items.values()];
  }

  tick(dtMs: number): void {
    for (const s of this.items.values()) {
      if (s.cooldownRemainingMs > 0) {
        s.cooldownRemainingMs = Math.max(0, s.cooldownRemainingMs - dtMs);
      }
    }
  }

  /**
   * Nearest interactable in range of (x,y).
   */
  nearest(
    x: number,
    y: number,
    maxDist = 80,
  ): InteractableState | null {
    let best: InteractableState | null = null;
    let bestD = maxDist;
    for (const s of this.items.values()) {
      const r = s.def.radius ?? 40;
      const d = Math.hypot(s.def.x - x, s.def.y - y);
      if (d <= Math.max(r, maxDist) && d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  /**
   * Attempt interaction. `hasItem` optional for key checks.
   */
  interact(
    id: string,
    opts?: { hasItem?: (itemId: string) => boolean },
  ): InteractResult {
    const s = this.items.get(id);
    if (!s) return { ok: false, reason: "missing" };
    if (s.def.locked) return { ok: false, reason: "locked" };
    if (s.def.requireFlag && !this.flags.has(s.def.requireFlag)) {
      return { ok: false, reason: "flag" };
    }
    if (s.def.requireItem && opts?.hasItem && !opts.hasItem(s.def.requireItem)) {
      return { ok: false, reason: "item" };
    }
    if (s.def.once && s.used) return { ok: false, reason: "used" };
    if (s.cooldownRemainingMs > 0) return { ok: false, reason: "cooldown" };

    const firstUse = !s.used;
    s.used = true;
    if (s.def.kind === "lever" || s.def.kind === "door") {
      s.open = !s.open;
      if (!s.def.once) s.used = false;
    }
    if (s.def.cooldownMs) {
      s.cooldownRemainingMs = s.def.cooldownMs;
      if (!s.def.once) s.used = false;
    }
    return { ok: true, id: s.def.id, kind: s.def.kind, firstUse };
  }

  /** Interact with nearest in range. */
  interactNearest(
    x: number,
    y: number,
    opts?: { hasItem?: (itemId: string) => boolean; maxDist?: number },
  ): InteractResult {
    const n = this.nearest(x, y, opts?.maxDist ?? 80);
    if (!n) return { ok: false, reason: "none" };
    return this.interact(n.def.id, opts);
  }

  clear(): void {
    this.items.clear();
  }
}
