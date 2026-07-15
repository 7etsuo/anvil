export type AreaId = "town" | "parish" | "crypt";

export interface EdgeExit {
  edge: "north" | "south" | "east" | "west";
  to: AreaId;
  spawnX: number;
  spawnY: number;
  requireClear?: boolean;
  label?: string;
}

export interface AreaMapDef {
  id: AreaId;
  width: number;
  height: number;
  walls: Array<{ x: number; y: number; w: number; h: number }>;
  spawns: Array<{
    actor: string;
    x: number;
    y: number;
    team?: "player" | "enemy" | "neutral";
  }>;
  portals?: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    to: AreaId;
    spawnX: number;
    spawnY: number;
    requireClear?: boolean;
  }>;
  exits?: EdgeExit[];
  background?: string;
  /** Random enemy pool for this zone */
  packTable?: string[];
  /** [min, max] random pack size */
  packCount?: [number, number];
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
}

export type SkillId = "slash" | "whirl" | "smite" | "potion";
