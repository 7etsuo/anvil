import type { ItemStack } from "./types.js";

export type UidFn = () => string;

let uidSeq = 0;
export function defaultUid(): string {
  uidSeq += 1;
  return `itm_${Date.now().toString(36)}_${uidSeq}`;
}

export class Inventory {
  private slots: ItemStack[] = [];
  capacity: number;
  private uidFn: UidFn;

  constructor(capacity = 40, uidFn: UidFn = defaultUid) {
    this.capacity = capacity;
    this.uidFn = uidFn;
  }

  all(): readonly ItemStack[] {
    return this.slots;
  }

  get(uid: string): ItemStack | undefined {
    return this.slots.find((s) => s.uid === uid);
  }

  findByDef(defId: string): ItemStack | undefined {
    return this.slots.find((s) => s.defId === defId);
  }

  count(): number {
    return this.slots.length;
  }

  isFull(): boolean {
    return this.slots.length >= this.capacity;
  }

  /**
   * Add item. Stacks if same defId and stackable (maxStack > 1).
   * Returns false if inventory full.
   */
  add(
    defId: string,
    qty = 1,
    opts: {
      maxStack?: number;
      rolledStats?: ItemStack["rolledStats"];
      itemLevel?: number;
      reqLevel?: number;
      data?: Record<string, unknown>;
      uid?: string;
    } = {},
  ): ItemStack | null {
    const maxStack = opts.maxStack ?? 1;
    // Leveled gear is never stacked (each roll is unique)
    const uniqueInstance =
      opts.itemLevel != null || opts.reqLevel != null || opts.rolledStats != null;
    if (maxStack > 1 && !uniqueInstance) {
      const existing = this.slots.find(
        (s) =>
          s.defId === defId &&
          s.qty < maxStack &&
          JSON.stringify(s.rolledStats ?? {}) ===
            JSON.stringify(opts.rolledStats ?? {}),
      );
      if (existing) {
        const room = maxStack - existing.qty;
        const take = Math.min(room, qty);
        existing.qty += take;
        qty -= take;
        if (qty <= 0) return existing;
      }
    }

    if (this.isFull()) return null;
    const stack: ItemStack = {
      uid: opts.uid ?? this.uidFn(),
      defId,
      qty,
      itemLevel: opts.itemLevel,
      reqLevel: opts.reqLevel,
      rolledStats: opts.rolledStats,
      data: opts.data,
    };
    this.slots.push(stack);
    return stack;
  }

  /** Remove by uid; returns removed stack or null. */
  remove(uid: string, qty = 1): ItemStack | null {
    const i = this.slots.findIndex((s) => s.uid === uid);
    if (i < 0) return null;
    const s = this.slots[i]!;
    if (s.qty > qty) {
      s.qty -= qty;
      return { ...s, qty };
    }
    this.slots.splice(i, 1);
    return s;
  }

  clear(): void {
    this.slots = [];
  }

  toJSON(): ItemStack[] {
    return this.slots.map((s) => ({ ...s }));
  }

  loadJSON(rows: ItemStack[]): void {
    this.slots = rows.map((s) => ({ ...s }));
  }
}
