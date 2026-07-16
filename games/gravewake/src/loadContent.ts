import { compileProject } from "@anvil/authoring";
import {
  materializeArpgContent,
  type ArpgLootTable,
} from "@anvil/genre-arpg";
import type { ActorDef } from "@anvil/genre-topdown2d";
import type { ItemDef } from "@anvil/core";
import type {
  AreaMapDef,
  GravewakeAuthoringData,
  ProgressionDef,
} from "./types.js";

export interface GravewakeContent {
  actors: Record<string, ActorDef>;
  areas: Record<string, AreaMapDef>;
  progression: ProgressionDef;
  items: Record<string, ItemDef>;
  lootTables: Record<string, ArpgLootTable>;
  authoring: GravewakeAuthoringData;
}

/** Node/headless content loader backed by the canonical schema-v2 compiler. */
export function loadGravewakeContent(gameRoot: string): GravewakeContent {
  const compiled = compileProject(gameRoot);
  if (!compiled.ok) {
    const details = compiled.errors
      .map((error) => `${error.code}${error.path ? ` (${error.path})` : ""}: ${error.message}`)
      .join("\n");
    throw new Error(`Gravewake authoring compilation failed:\n${details}`);
  }
  const content = materializeArpgContent<AreaMapDef, ProgressionDef>(compiled.ir);
  if (!content.progression) throw new Error("Gravewake content/progression.json missing from compiled IR");
  return {
    actors: content.actors,
    areas: content.areas,
    progression: content.progression,
    items: content.items,
    lootTables: content.lootTables,
    authoring: {
      sourceHash: content.sourceHash,
      rules: content.rules,
      actorPrefabs: content.authoring.actorPrefabs,
      prefabs: content.authoring.prefabs,
    },
  };
}
