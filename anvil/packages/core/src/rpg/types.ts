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

/** Content definition (JSON). */
export interface ItemDef {
  id: string;
  name: string;
  rarity?: ItemRarity;
  /** Stackable stack size; omit or 1 = unique instance */
  maxStack?: number;
  /** If set, can equip to this slot */
  slot?: EquipSlot;
  /** Flat stat mods when equipped (or consumed by game rules) */
  stats?: Partial<Stats>;
  /** Flavor / icon path */
  icon?: string;
  flavor?: string;
  /** Game-specific payload */
  data?: Record<string, unknown>;
}

/** Runtime inventory row. */
export interface ItemStack {
  /** Stable instance id (uuid-ish) */
  uid: string;
  defId: string;
  qty: number;
  /** Rolled affixes etc. */
  rolledStats?: Partial<Stats>;
  data?: Record<string, unknown>;
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
