import type { EquipSlot, ItemStack } from "./types.js";
import { EQUIP_SLOTS } from "./types.js";
import type { Inventory } from "./Inventory.js";
import type { ItemDef } from "./types.js";
import { canEquipAtLevel, stackReqLevel } from "./itemization.js";

export type ItemDefLookup = (defId: string) => ItemDef | undefined;

/**
 * Equipment map: slot → inventory uid (item stays in bag when equipped,
 * or games may use exclusive equip — here items stay referenced by uid in bag).
 */
export class Equipment {
  private worn: Partial<Record<EquipSlot, string | null>> = {};

  constructor() {
    for (const s of EQUIP_SLOTS) this.worn[s] = null;
  }

  get(slot: EquipSlot): string | null {
    return this.worn[slot] ?? null;
  }

  all(): Partial<Record<EquipSlot, string | null>> {
    return { ...this.worn };
  }

  /**
   * Equip stack uid into slot if def.slot matches.
   * Returns previously equipped uid (or null).
   */
  equip(
    slot: EquipSlot,
    uid: string,
    inv: Inventory,
    lookup: ItemDefLookup,
    characterLevel = 999,
  ): { ok: boolean; previous: string | null; error?: string; reqLevel?: number } {
    const stack = inv.get(uid);
    if (!stack) return { ok: false, previous: null, error: "missing_item" };
    const def = lookup(stack.defId);
    if (!def?.slot) return { ok: false, previous: null, error: "not_equippable" };
    if (def.slot !== slot) {
      return { ok: false, previous: null, error: "wrong_slot" };
    }
    const req = stackReqLevel(stack, def);
    if (!canEquipAtLevel(characterLevel, stack, def)) {
      return {
        ok: false,
        previous: null,
        error: "level_req",
        reqLevel: req,
      };
    }
    const previous = this.worn[slot] ?? null;
    this.worn[slot] = uid;
    if (previous !== uid) {
      inv.setEquipped(uid, true);
      if (previous) inv.setEquipped(previous, false);
    }
    return { ok: true, previous };
  }

  /** Auto-equip to def.slot (respects reqLevel vs characterLevel). */
  equipAuto(
    uid: string,
    inv: Inventory,
    lookup: ItemDefLookup,
    characterLevel = 999,
  ): {
    ok: boolean;
    slot?: EquipSlot;
    previous: string | null;
    error?: string;
    reqLevel?: number;
  } {
    const stack = inv.get(uid);
    if (!stack) return { ok: false, previous: null, error: "missing_item" };
    const def = lookup(stack.defId);
    if (!def?.slot) return { ok: false, previous: null, error: "not_equippable" };
    const r = this.equip(def.slot, uid, inv, lookup, characterLevel);
    return { ...r, slot: def.slot };
  }

  unequip(slot: EquipSlot, inv?: Inventory): string | null {
    const prev = this.worn[slot] ?? null;
    // Returning an item to a full bag would silently exceed capacity.
    if (prev && inv?.isFull()) return null;
    this.worn[slot] = null;
    if (prev) inv?.setEquipped(prev, false);
    return prev;
  }

  /**
   * Stat mods from all worn items.
   * Prefer instance rolledStats (leveled); fall back to def.stats.
   */
  gearMods(inv: Inventory, lookup: ItemDefLookup): Array<Partial<import("./types.js").Stats>> {
    const mods: Array<Partial<import("./types.js").Stats>> = [];
    for (const slot of EQUIP_SLOTS) {
      const uid = this.worn[slot];
      if (!uid) continue;
      const stack = inv.get(uid);
      if (!stack) continue;
      const def = lookup(stack.defId);
      if (stack.rolledStats && Object.keys(stack.rolledStats).length) {
        mods.push(stack.rolledStats);
      } else if (def?.stats) {
        mods.push(def.stats);
      }
      // Socketed gems (stack.data.sockets: gem def ids)
      const sockets = stack.data?.sockets as Array<string | null> | undefined;
      if (sockets?.length) {
        for (const gemId of sockets) {
          if (!gemId) continue;
          const gem = lookup(gemId);
          if (gem?.stats) mods.push(gem.stats);
        }
      }
    }
    return mods;
  }

  toJSON(): Partial<Record<EquipSlot, string | null>> {
    return { ...this.worn };
  }

  loadJSON(
    data: Partial<Record<EquipSlot, string | null>>,
    inv?: Inventory,
  ): void {
    inv?.clearEquipped();
    for (const s of EQUIP_SLOTS) {
      const uid = data[s] ?? null;
      this.worn[s] = uid;
      if (uid) inv?.setEquipped(uid, true);
    }
  }

  /** Helper: resolve worn stacks */
  wornStacks(inv: Inventory): Array<{ slot: EquipSlot; stack: ItemStack }> {
    const out: Array<{ slot: EquipSlot; stack: ItemStack }> = [];
    for (const slot of EQUIP_SLOTS) {
      const uid = this.worn[slot];
      if (!uid) continue;
      const stack = inv.get(uid);
      if (stack) out.push({ slot, stack });
    }
    return out;
  }
}
