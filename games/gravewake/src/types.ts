export type AreaId = "town" | "parish" | "crypt";

export interface PortalDef {
  x: number;
  y: number;
  w: number;
  h: number;
  to: AreaId;
  spawnX: number;
  spawnY: number;
  /** Require living enemies == 0 before use */
  requireClear?: boolean;
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
  portals?: PortalDef[];
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
