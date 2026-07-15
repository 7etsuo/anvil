export type AiId = "none" | "chase_melee" | "keep_distance_ranged";
export type TeamId = "player" | "enemy" | "neutral";
export type AnimState = "idle" | "walk" | "attack" | "death";

export interface ActorDef {
  id: string;
  name?: string;
  hp: number;
  speed: number;
  ai?: AiId;
  team?: TeamId;
  /** Circle collider radius; default 12 */
  radius?: number;
  contactDamage?: number;
  meleeRange?: number;
  /** Preferred band for keep_distance_ranged */
  preferredRange?: number;
  preferredRangeBand?: number;
  projectileDamage?: number;
  projectileSpeed?: number;
  projectileCooldownMs?: number;
  projectileLifetimeMs?: number;
  animations?: Partial<Record<AnimState, string[]>>;
  skills?: string[];
}

export interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapSpawn {
  actor: string;
  x: number;
  y: number;
  team?: TeamId;
}

export interface MapDef {
  id: string;
  width: number;
  height: number;
  walls: WallRect[];
  spawns: MapSpawn[];
  background?: string;
}

export interface ActorRuntime {
  entityId: string;
  actorId: string;
  team: TeamId;
  ai: AiId;
  speed: number;
  radius: number;
  vx: number;
  vy: number;
  contactDamage: number;
  meleeRange: number;
  preferredRange: number;
  preferredRangeBand: number;
  projectileDamage: number;
  projectileSpeed: number;
  projectileCooldownMs: number;
  projectileLifetimeMs: number;
  contactCooldownMs: number;
  contactTimerMs: number;
  iframeMs: number;
  iframeRemainingMs: number;
  projectileTimerMs: number;
  animState: AnimState;
  flipX: boolean;
  attackAnimMs: number;
  dead: boolean;
  immovable: boolean;
  /** Spawn / leash anchor (world) */
  homeX: number;
  homeY: number;
  /** Only chase after player enters aggro radius */
  aggro: boolean;
  /** Idle wander phase (ms) */
  wanderMs: number;
  wanderAng: number;
}

export const DEFAULT_RADIUS = 12;
export const CONTACT_COOLDOWN_MS = 500;
export const IFRAME_MS = 300;
export const EPSILON_SPEED = 1e-3;
