/**
 * Lightweight run-state snapshot (sheet + zone + free-form game flags).
 * Complements full saveGame entity dumps for ARPG session continue.
 */

import type { CharacterSaveBlob } from "../rpg/types.js";

export type RunStateV1 = {
  v: 1;
  gameId: string;
  areaId: string;
  playerX: number;
  playerY: number;
  character: CharacterSaveBlob;
  /** Quest flags, kills, threat, etc. */
  flags: Record<string, unknown>;
  seed: number;
  savedAt: string;
};

export function buildRunState(input: {
  gameId: string;
  areaId: string;
  playerX: number;
  playerY: number;
  character: CharacterSaveBlob;
  flags?: Record<string, unknown>;
  seed: number;
}): RunStateV1 {
  return {
    v: 1,
    gameId: input.gameId,
    areaId: input.areaId,
    playerX: input.playerX,
    playerY: input.playerY,
    character: input.character,
    flags: input.flags ?? {},
    seed: input.seed,
    savedAt: new Date().toISOString(),
  };
}

export function serializeRunState(state: RunStateV1): string {
  return JSON.stringify(state);
}

export function parseRunState(raw: string): RunStateV1 | null {
  try {
    const j = JSON.parse(raw) as RunStateV1;
    if (j?.v !== 1 || !j.character || !j.areaId) return null;
    return j;
  } catch {
    return null;
  }
}

export function saveRunToLocalStorage(
  state: RunStateV1,
  slot = "run0",
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    `anvil_run_${state.gameId}_${slot}`,
    serializeRunState(state),
  );
}

export function loadRunFromLocalStorage(
  gameId: string,
  slot = "run0",
): RunStateV1 | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(`anvil_run_${gameId}_${slot}`);
  if (!raw) return null;
  return parseRunState(raw);
}
