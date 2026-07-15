export type AreaId = "town" | "parish" | "crypt";

/** Map-edge transition (Diablo-style zone change, not glowing portal UI). */
export interface EdgeExit {
  edge: "north" | "south" | "east" | "west";
  to: AreaId;
  spawnX: number;
  spawnY: number;
  /** Must clear living enemies first */
  requireClear?: boolean;
  /** Optional label for HUD only */
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
  /** @deprecated use exits */
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
}

export interface ProgressionDef {
  xpPerKill: Record<string, number>;
  xpToLevel: number[];
  meleeDamage: number;
  meleeRange: number;
  startGold: number;
  potionHeal: number;
}
