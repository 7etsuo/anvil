/** Shared RPG primitives for ARPG / gear games (Anvil core). */

export type EquipSlot =
  | "weapon"
  | "offhand"
  | "head"
  | "chest"
  | "hands"
  | "feet"
  | "ring"
  | "amulet"
  | "trinket";

export const EQUIP_SLOTS: readonly EquipSlot[] = [
  "weapon",
  "offhand",
  "head",
  "chest",
  "hands",
  "feet",
  "ring",
  "amulet",
  "trinket",
] as const;

/** Flat combat stats — games may ignore unused fields. */
export interface Stats {
  maxHp: number;
  damage: number;
  armor: number;
  speed: number;
  critChance: number;
  critMult: number;
  /** Extra bags of holding, etc. */
  [key: string]: number;
}

export const ZERO_STATS: Stats = {
  maxHp: 0,
  damage: 0,
  armor: 0,
  speed: 0,
  critChance: 0,
  critMult: 0,
};

export type ItemRarity = "common" | "magic" | "rare" | "unique" | "set";

/**
 * Visual layer for paper-doll / Diablo-style gear appearance.
 * Paths are asset keys (e.g. "gear/rusty_sword.png").
 */
export interface ItemVisual {
  /** Sprite path drawn over the body when equipped */
  sprite?: string;
  /** Optional replace body base when this item is worn (usually chest) */
  bodyVariant?: string;
  /** Offset as fraction of body size (0 = center) */
  ox?: number;
  oy?: number;
  /**
   * Scale vs body size (1 = full body — almost never correct).
   * Typical: weapon ~0.35–0.45, head ~0.25–0.32, chest ~0.4–0.55.
   */
  scale?: number;
  /** Draw order — higher on top. Defaults by slot. */
  z?: number;
}

/** Content definition (JSON). */
export interface ItemDef {
  id: string;
  name: string;
  rarity?: ItemRarity;
  /** Stackable stack size; omit or 1 = unique instance */
  maxStack?: number;
  /** If set, can equip to this slot */
  slot?: EquipSlot;
  /**
   * Base stats at `itemLevel` (default level 1).
   * Instances scale these via rollItemInstance / itemLevel system.
   */
  stats?: Partial<Stats>;
  /**
   * Content base item level for `stats` (default 1).
   * Dropped instances get their own itemLevel ≥ this.
   */
  itemLevel?: number;
  /** Flavor / icon path */
  icon?: string;
  /** Diablo-style paper-doll visuals */
  visual?: ItemVisual;
  flavor?: string;
  /** Game-specific payload */
  data?: Record<string, unknown>;
}

/** Resolved equipped layer for renderers. */
export interface EquippedVisualLayer {
  slot: EquipSlot;
  defId: string;
  sprite: string;
  ox: number;
  oy: number;
  scale: number;
  z: number;
}

/** Runtime inventory row. */
export interface ItemStack {
  /** Stable instance id (uuid-ish) */
  uid: string;
  defId: string;
  qty: number;
  /**
   * Instance item level (power). Stats are usually fully stored in rolledStats
   * for this level.
   */
  itemLevel?: number;
  /**
   * Required character level to equip. Typically === itemLevel.
   * Character level ≥ reqLevel may equip (level 12 can wear req 10).
   */
  reqLevel?: number;
  /** Rolled / scaled stats for this instance (preferred over def.stats when set). */
  rolledStats?: Partial<Stats>;
  data?: Record<string, unknown>;
}

/**
 * Fully resolved, serializable item information for UI and agent observers.
 * Runtime ownership remains keyed by uid; definitions are flattened here so a
 * consumer does not need a second content lookup to understand the item.
 */
export interface CharacterItemView extends ItemStack {
  name: string;
  rarity: ItemRarity;
  slot?: EquipSlot;
  icon?: string;
  flavor?: string;
  maxStack: number;
  stats: Partial<Stats>;
  canEquip: boolean;
  equippedSlot?: EquipSlot;
}

/** Diablo-style paper doll + capacity-limited backpack snapshot. */
export interface CharacterInventoryView {
  capacity: number;
  used: number;
  free: number;
  /** Stable bag positions; empty cells are null. Equipped items are excluded. */
  bag: Array<CharacterItemView | null>;
  /** Every supported paper-doll slot is present, even when empty. */
  equipment: Record<EquipSlot, CharacterItemView | null>;
}

export interface CharacterSaveBlob {
  level: number;
  xp: number;
  gold: number;
  baseStats: Stats;
  inventory: ItemStack[];
  equipped: Partial<Record<EquipSlot, string | null>>;
  /** uid of equipped stack, or null */
  inventoryCapacity: number;
}

export interface ZoneNode {
  id: string;
  /** Optional map/content ref */
  mapId?: string;
  /** Edges: direction or named exit → target zone id */
  exits: Record<string, string>;
  /** Require clear flag for some exits */
  requireClear?: string[];
  data?: Record<string, unknown>;
}

export interface ZoneGraphDef {
  start: string;
  nodes: ZoneNode[];
}

export interface ZoneGraphState {
  current: string;
  visited: string[];
  cleared: string[];
}
