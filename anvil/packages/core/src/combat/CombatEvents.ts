/**
 * Typed combat event bus helpers — any genre can emit/listen.
 * Uses EventBus string channels with typed payloads.
 */

import type { EventBus } from "../events/EventBus.js";

export type CombatHitEvent = {
  attackerId?: string;
  targetId: string;
  damage: number;
  x: number;
  y: number;
  crit?: boolean;
  abilityId?: string;
  /** physical | fire | cold | … — see combat/Damage.ts */
  damageType?: string;
  /** Raw before mitigation (optional telemetry) */
  rawDamage?: number;
  /** Status ids applied with this hit */
  statuses?: string[];
};

export type CombatKillEvent = {
  killerId?: string;
  targetId: string;
  actorId?: string;
  x: number;
  y: number;
  abilityId?: string;
};

export type CombatHealEvent = {
  targetId: string;
  amount: number;
  x: number;
  y: number;
};

export const COMBAT_HIT = "combat:hit";
export const COMBAT_KILL = "combat:kill";
export const COMBAT_HEAL = "combat:heal";
export const COMBAT_CRIT = "combat:crit";

export function emitHit(bus: EventBus, e: CombatHitEvent): void {
  bus.emit(COMBAT_HIT, e);
  if (e.crit) bus.emit(COMBAT_CRIT, e);
}

export function emitKill(bus: EventBus, e: CombatKillEvent): void {
  bus.emit(COMBAT_KILL, e);
}

export function emitHeal(bus: EventBus, e: CombatHealEvent): void {
  bus.emit(COMBAT_HEAL, e);
}

export function onCombatHit(
  bus: EventBus,
  fn: (e: CombatHitEvent) => void,
): () => void {
  return bus.on(COMBAT_HIT, (p) => fn(p as CombatHitEvent));
}

export function onCombatKill(
  bus: EventBus,
  fn: (e: CombatKillEvent) => void,
): () => void {
  return bus.on(COMBAT_KILL, (p) => fn(p as CombatKillEvent));
}
