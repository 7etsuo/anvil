/**
 * Attach game-owned RPG state to save/load for a running handle.
 */
import type { CharacterSheet } from "../rpg/CharacterSheet.js";
import type { ZoneGraph } from "../rpg/ZoneGraph.js";
import type { GameHandle } from "../createGame.js";
import {
  setCharacterSaveHooks,
  setZoneSaveHooks,
} from "../save/saveGame.js";

export function attachCharacterSheet(
  handle: GameHandle,
  sheet: CharacterSheet,
): void {
  setCharacterSaveHooks(
    handle,
    () => sheet.toJSON(),
    (data) => sheet.loadJSON(data),
  );
}

export function attachZoneGraph(
  handle: GameHandle,
  graph: ZoneGraph,
): void {
  setZoneSaveHooks(
    handle,
    () => graph.toJSON(),
    (data) => graph.loadJSON(data),
  );
}
