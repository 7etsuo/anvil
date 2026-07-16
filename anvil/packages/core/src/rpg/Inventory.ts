import type { ItemStack } from "./types.js";

export type UidFn = () => string;

let uidSeq = 0;
export function defaultUid(): string {
  uidSeq += 1;
  return `itm_${Date.now().toString(36)}_${uidSeq}`;
}

export class Inventory {
  private slots: ItemStack[] = [];
  /** Equipped items remain owned here by uid, but do not consume bag space. */
  private equipped = new Set<string>();
  capacity: number;
  private uidFn: UidFn;

  constructor(capacity = 40, uidFn: UidFn = defaultUid) {
    this.capacity = capacity;
    this.uidFn = uidFn;
  }

  all(): readonly ItemStack[] {
    return this.slots;
  }

  /** Items physically carried in the capacity-limited bag. */
  bag(): readonly ItemStack[] {
    return this.slots.filter((s) => !this.equipped.has(s.uid));
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

  usedSlots(): number {
    return this.slots.reduce(
      (used, stack) => used + (this.equipped.has(stack.uid) ? 0 : 1),
      0,
    );
  }

  freeSlots(): number {
    return Math.max(0, this.capacity - this.usedSlots());
  }

  isFull(): boolean {
    return this.usedSlots() >= this.capacity;
  }

  /** Equipment coordinates bag-capacity accounting without moving ownership. */
  setEquipped(uid: string, equipped: boolean): void {
    if (equipped && this.get(uid)) this.equipped.add(uid);
    else this.equipped.delete(uid);
  }

  isEquipped(uid: string): boolean {
    return this.equipped.has(uid);
  }

  clearEquipped(): void {
    this.equipped.clear();
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
    this.equipped.delete(uid);
    return s;
  }

  clear(): void {
    this.slots = [];
    this.equipped.clear();
  }

  toJSON(): ItemStack[] {
    return this.slots.map((s) => ({ ...s }));
  }

  loadJSON(rows: ItemStack[]): void {
    this.slots = rows.map((s) => ({ ...s }));
    this.equipped.clear();
  }
}
