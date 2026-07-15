export type * from "./types.js";
export { EQUIP_SLOTS, ZERO_STATS } from "./types.js";
export {
  emptyStats,
  addStats,
  computeFinalStats,
  applyArmor,
} from "./stats.js";
export { Inventory, defaultUid } from "./Inventory.js";
export { Equipment } from "./Equipment.js";
export type { ItemDefLookup } from "./Equipment.js";
export { CharacterSheet } from "./CharacterSheet.js";
export type {
  CharacterSheetOpts,
  LevelProgress,
  StatBreakdown,
} from "./CharacterSheet.js";
/** Single source of truth for gear level / stat budget math */
export {
  DEFAULT_ITEMIZATION,
  itemPowerFactor,
  qualityRoll,
  scaleStatsForItemLevel,
  rollDropItemLevel,
  computeReqLevel,
  rollItemInstance,
  stackReqLevel,
  canEquipAtLevel,
  itemPowerScore,
} from "./itemization.js";
export type {
  ItemizationConfig,
  ScaleItemStatsOpts,
  RolledItemInstance,
} from "./itemization.js";
export {
  spawnGroundLoot,
  spawnGoldPile,
  lootNear,
  tryPickupNearest,
} from "./Loot.js";
export type { GroundLootData } from "./Loot.js";
export {
  dropFromTable,
  LOOT_GOLD_RADIUS,
  LOOT_ITEM_RADIUS,
} from "./LootPolicy.js";
export type {
  DropResult,
  LootPolicyOpts,
  LootTableLike,
} from "./LootPolicy.js";
export { ZoneGraph } from "./ZoneGraph.js";
