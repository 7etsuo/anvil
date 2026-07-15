/**
 * Back-compat facade for item level APIs.
 * Implementation lives in itemization.ts (stat budget model).
 */

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

/** @deprecated use ScaleItemStatsOpts */
export type ItemLevelOpts = import("./itemization.js").ScaleItemStatsOpts;
