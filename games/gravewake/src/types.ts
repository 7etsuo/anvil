import type {
  CharacterInventoryView,
  EquipSlot,
  EquippedVisualLayer,
  ItemRarity,
  LevelProgress,
  StatBreakdown,
  Stats,
} from "@anvil/core";
import type { ArpgRuleSnapshot } from "@anvil/genre-arpg";
import type { StateMachineDef, TriggerDef } from "@anvil/schema";

export type AreaId = string;

export type AreaKind = "hub" | "overworld" | "dungeon";

export interface GravewakeAuthoringData {
  readonly sourceHash: string;
  readonly rules: {
    readonly triggers: Readonly<Record<string, Readonly<TriggerDef>>>;
    readonly machines: Readonly<Record<string, Readonly<StateMachineDef>>>;
  };
  readonly actorPrefabs: Readonly<Record<string, string | null>>;
  readonly prefabs: Readonly<Record<string, { readonly traits: readonly string[] }>>;
}

export interface EdgeExit {
  edge: "north" | "south" | "east" | "west";
  to: AreaId;
  spawnX: number;
  spawnY: number;
  requireClear?: boolean;
  label?: string;
}

export interface PortalDef {
  x: number;
  y: number;
  w: number;
  h: number;
  to: AreaId;
  spawnX: number;
  spawnY: number;
  /** Shown over portal */
  label?: string;
  requireClear?: boolean;
  /** Hub / overworld marker color hint */
  kind?: "dungeon" | "hub" | "boss";
}

export interface RespawnDef {
  /** Ms between spawn waves */
  intervalMs: number;
  /** Cap of living enemies in this zone */
  maxLiving: number;
  /** Enemies per wave [min,max] */
  packSize: [number, number];
  packTable: string[];
  /** Initial fill on enter [min,max] */
  initialPack?: [number, number];
}

export interface AreaMapDef {
  id: AreaId;
  name: string;
  kind: AreaKind;
  width: number;
  height: number;
  walls: Array<{ x: number; y: number; w: number; h: number }>;
  spawns: Array<{
    actor: string;
    x: number;
    y: number;
    team?: "player" | "enemy" | "neutral";
  }>;
  portals?: PortalDef[];
  exits?: EdgeExit[];
  background?: string;
  /** Static one-shot pack (legacy / bosses in spawns) */
  packTable?: string[];
  packCount?: [number, number];
  /** Continuous respawn for open world / dungeons */
  respawn?: RespawnDef;
  /** Base difficulty tier for this zone (0=safe, 1=wastes, 2=crypt, …) */
  threat?: number;
  lootTable?: string;
  /** If true, re-roll random layout density on enter */
  endless?: boolean;
}

export interface ProgressionDef {
  xpPerKill: Record<string, number>;
  xpToLevel: number[];
  /** Continue beyond the authored cumulative thresholds. */
  xpCurve?: {
    growth: number;
    maxLevel?: number;
  };
  meleeDamage: number;
  meleeRange: number;
  startGold: number;
  potionHeal: number;
  whirlDamageMul?: number;
  smiteDamageMul?: number;
  smiteRange?: number;
  /** Global difficulty scale per player level above 1 */
  threatPerLevel?: number;
  /** Extra threat every N kills */
  threatPerKills?: number;
}

export type SkillId = "slash" | "whirl" | "smite" | "potion";

export interface GravewakeCombatStats extends Stats {
  resistPhysical: number;
  resistFire: number;
  resistCold: number;
  resistLightning: number;
  resistPoison: number;
  resistHoly: number;
  resistArcane: number;
}

export interface GravewakeInventoryRow {
  uid: string;
  defId: string;
  name: string;
  qty: number;
  slot?: EquipSlot;
  rarity: ItemRarity;
  itemLevel?: number;
  reqLevel?: number;
  canEquip: boolean;
  rolledStats?: Partial<Stats>;
}

export interface GravewakeSkillPanelState {
  points: number;
  pending: boolean;
  nodes: Array<{
    id: string;
    name: string;
    rank: number;
    maxRank: number;
    canUnlock: boolean;
    requires: string[];
    reqLevel: number;
    description: string;
  }>;
}

export interface GravewakeCraftPanelState {
  recipes: Array<{
    id: string;
    name: string;
    can: boolean;
    inputs: Array<{ itemId: string; qty: number }>;
    outputId: string;
    cost?: Record<string, number>;
  }>;
}

export interface GravewakeVendorPanelState {
  offers: Array<{
    id: string;
    itemId: string;
    name: string;
    price: Record<string, number>;
    stock?: number;
  }>;
  sellable: Array<{
    uid: string;
    defId: string;
    name: string;
    qty: number;
    value: number;
    rarity: ItemRarity;
  }>;
}

/** Stable game-to-renderer/agent observation contract. */
export interface GravewakeObservation {
  title: "Gravewake";
  area: AreaId;
  areaName: string;
  areaKind: AreaKind;
  procgen: boolean;
  threat: number;
  xp: number;
  level: number;
  xpProgress: LevelProgress;
  gold: number;
  wallet: Record<string, number>;
  mana: number;
  manaMax: number;
  stamina: number;
  staminaMax: number;
  potions: number;
  victory: false;
  milestoneBoss: boolean;
  bossSlainOnce: boolean;
  bossesKilled: number;
  lost: boolean;
  livingEnemies: number;
  kills: number;
  timeAlive: number;
  exitHint: string;
  inventoryOpen: boolean;
  statsOpen: boolean;
  skillsOpen: boolean;
  craftOpen: boolean;
  vendorOpen: boolean;
  pendingSkillChoice: boolean;
  skillPanel: GravewakeSkillPanelState;
  craftPanel: GravewakeCraftPanelState;
  vendorPanel: GravewakeVendorPanelState;
  lootCompare: { text: string; color: string; t: number } | null;
  shards: number;
  inventory: GravewakeInventoryRow[];
  /** Engine-owned paper doll + capacity-limited backpack snapshot. */
  inventoryView: CharacterInventoryView;
  equipped: Record<string, string | null>;
  stats: GravewakeCombatStats;
  sheetStats: Stats;
  combatStats: GravewakeCombatStats;
  statBreakdown: StatBreakdown;
  hp: number;
  maxHp: number;
  cds: Record<SkillId, number>;
  lastSkill: SkillId;
  quest: string | null;
  fog: number[][] | null;
  interactables: Array<{
    id: string;
    kind: string;
    used: boolean;
    x: number;
    y: number;
  }>;
  visualLayers: EquippedVisualLayer[];
  bodyVariant: string | null;
  portals: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    label?: string;
    kind?: "dungeon" | "hub" | "boss";
    to: AreaId;
  }>;
  walls: Array<{ x: number; y: number; w: number; h: number }>;
  mapW: number;
  mapH: number;
  /** Compiled source provenance so agents can connect runtime state to authored data. */
  authoring: {
    sourceHash: string;
    actorPrefabs: Readonly<Record<string, string | null>>;
    prefabs: Readonly<Record<string, { readonly traits: readonly string[] }>>;
  };
  /** Executable trigger/state-machine state owned by genre-arpg. */
  declarative: ArpgRuleSnapshot;
  topdown: Record<string, unknown>;
  [key: string]: unknown;
}
