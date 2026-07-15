import type { ItemDef } from "@anvil/core";
import type { ActorDef } from "@anvil/genre-topdown2d";
import type { AreaMapDef, ProgressionDef } from "../src/types.js";

import gravewarden from "../content/actors/gravewarden.json";
import scuttler from "../content/actors/scuttler.json";
import wretch from "../content/actors/wretch.json";
import crypt_guard from "../content/actors/crypt_guard.json";
import bellwarden from "../content/actors/bellwarden.json";
import fallen from "../content/actors/fallen.json";
import raider from "../content/actors/raider.json";
import shade from "../content/actors/shade.json";
import town from "../content/areas/town.json";
import parish from "../content/areas/parish.json";
import crypt from "../content/areas/crypt.json";
import progression from "../content/progression.json";
import rusty_sword from "../content/items/rusty_sword.json";
import bone_cleaver from "../content/items/bone_cleaver.json";
import ash_mail from "../content/items/ash_mail.json";
import iron_helm from "../content/items/iron_helm.json";
import health_potion from "../content/items/health_potion.json";
import parish_pack from "../content/loot/parish_pack.json";
import crypt_pack from "../content/loot/crypt_pack.json";

export const embeddedActors: Record<string, ActorDef> = {
  gravewarden: gravewarden as ActorDef,
  scuttler: scuttler as ActorDef,
  wretch: wretch as ActorDef,
  crypt_guard: crypt_guard as ActorDef,
  bellwarden: bellwarden as ActorDef,
  fallen: fallen as ActorDef,
  raider: raider as ActorDef,
  shade: shade as ActorDef,
};

export const embeddedAreas: Record<string, AreaMapDef> = {
  town: town as AreaMapDef,
  parish: parish as AreaMapDef,
  crypt: crypt as AreaMapDef,
};

export const embeddedProgression = progression as ProgressionDef;

export const embeddedItems: Record<string, ItemDef> = {
  rusty_sword: rusty_sword as ItemDef,
  bone_cleaver: bone_cleaver as ItemDef,
  ash_mail: ash_mail as ItemDef,
  iron_helm: iron_helm as ItemDef,
  health_potion: health_potion as ItemDef,
};

export const embeddedLoot = {
  parish_pack: parish_pack as {
    id: string;
    entries: Array<{ item: string; weight: number; min?: number; max?: number }>;
  },
  crypt_pack: crypt_pack as {
    id: string;
    entries: Array<{ item: string; weight: number; min?: number; max?: number }>;
  },
};
