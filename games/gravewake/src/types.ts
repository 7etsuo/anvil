export type AreaId = string;

export type AreaKind = "hub" | "overworld" | "dungeon";

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
