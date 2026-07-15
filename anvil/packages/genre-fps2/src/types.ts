/** cells[y][x] = 0 empty / >0 wall texture id */
export interface Fps2MapDef {
  id: string;
  cells: number[][];
  /** Tile size in world units (default 1) */
  tileSize?: number;
  playerStart?: { x: number; y: number; angle?: number };
  enemies?: Fps2EnemySpawn[];
  exit?: { x: number; y: number; radius?: number };
}

export interface Fps2EnemySpawn {
  id?: string;
  x: number;
  y: number;
  hp?: number;
  radius?: number;
}

export interface Fps2LevelDef {
  id: string;
  map: string;
  moveSpeed?: number;
  turnSpeed?: number;
  fov?: number;
  screenCols?: number;
  weaponDamage?: number;
  weaponMaxDist?: number;
  aimConeRad?: number;
  fireCooldownMs?: number;
  playerRadius?: number;
}

export interface WallHit {
  dist: number;
  mapX: number;
  mapY: number;
  side: 0 | 1;
  texId: number;
  wallX: number;
}

export interface Billboard {
  id: string;
  x: number;
  y: number;
  dist: number;
  angleDiff: number;
  hp: number;
  maxHp: number;
  dead: boolean;
}
