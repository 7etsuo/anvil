import { materializeArpgContent } from "@anvil/genre-arpg";
import type { ActorDef } from "@anvil/genre-topdown2d";
import type { ItemDef } from "@anvil/core";
import gameIr from "virtual:anvil-game-ir";
import type {
  AreaMapDef,
  GravewakeAuthoringData,
  ProgressionDef,
} from "../src/types.js";

/** Browser content is generated from the same immutable IR used headlessly. */
const content = materializeArpgContent<AreaMapDef, ProgressionDef>(gameIr);

export const embeddedActors: Record<string, ActorDef> = content.actors;
export const embeddedAreas: Record<string, AreaMapDef> = content.areas;
export const embeddedProgression: ProgressionDef = content.progression;
export const embeddedItems: Record<string, ItemDef> = content.items;
export const embeddedLoot = content.lootTables;
export const embeddedAuthoring: GravewakeAuthoringData = {
  sourceHash: content.sourceHash,
  rules: content.rules,
  actorPrefabs: content.authoring.actorPrefabs,
  prefabs: content.authoring.prefabs,
};
