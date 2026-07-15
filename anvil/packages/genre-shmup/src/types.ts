export type BulletPattern =
  | { kind: "down"; speed: number }
  | { kind: "aim_player"; speed: number }
  | { kind: "fan"; speed: number; count: number; spreadDeg: number };

export interface EnemyDef {
  id: string;
  name?: string;
  hp: number;
  speed?: number;
  radius?: number;
  score?: number;
  /** Fire pattern while alive; optional */
  fire?: BulletPattern;
  fireCooldownMs?: number;
}

export interface WaveSpawn {
  enemy: string;
  x: number;
  y: number;
  pattern?: BulletPattern["kind"] | string;
  speed?: number;
  /** Override fire pattern kind for this spawn's movement */
  movePattern?: "down" | "aim_player";
}

export interface WaveDef {
  id: string;
  /** Battle time (seconds) when wave spawns */
  t: number;
  spawns: WaveSpawn[];
}

export interface StageDef {
  id: string;
  width?: number;
  height?: number;
  playerX?: number;
  playerY?: number;
  playerSpeed?: number;
  fireCooldownMs?: number;
  bulletSpeed?: number;
  lives?: number;
  waves: WaveDef[];
}

export const DEFAULT_WIDTH = 240;
export const DEFAULT_HEIGHT = 320;
export const DEFAULT_LIVES = 3;
export const PLAYER_IFRAME_MS = 1000;
export const PLAYER_RADIUS = 8;
export const BULLET_RADIUS = 3;
