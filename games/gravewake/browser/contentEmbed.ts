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
import bone_hound from "../content/actors/bone_hound.json";
import thrall from "../content/actors/thrall.json";
import ash_ghoul from "../content/actors/ash_ghoul.json";
import plague_scuttler from "../content/actors/plague_scuttler.json";
import void_shade from "../content/actors/void_shade.json";
import crypt_archer from "../content/actors/crypt_archer.json";
import bone_brute from "../content/actors/bone_brute.json";
import hell_raider from "../content/actors/hell_raider.json";
import death_knight from "../content/actors/death_knight.json";
import bone_tyrant from "../content/actors/bone_tyrant.json";

import town from "../content/areas/town.json";
import wastes from "../content/areas/wastes.json";
import crypt from "../content/areas/crypt.json";
import catacombs from "../content/areas/catacombs.json";
import bonekeep from "../content/areas/bonekeep.json";
import progression from "../content/progression.json";

import rusty_sword from "../content/items/rusty_sword.json";
import bone_cleaver from "../content/items/bone_cleaver.json";
import ash_mail from "../content/items/ash_mail.json";
import iron_helm from "../content/items/iron_helm.json";
import health_potion from "../content/items/health_potion.json";
import grave_ring from "../content/items/grave_ring.json";
import tyrant_plate from "../content/items/tyrant_plate.json";
import warden_blade from "../content/items/warden_blade.json";
import ruby_gem from "../content/items/ruby_gem.json";
import sapphire_gem from "../content/items/sapphire_gem.json";
import emerald_gem from "../content/items/emerald_gem.json";
import topaz_gem from "../content/items/topaz_gem.json";
import warden_cloak from "../content/items/warden_cloak.json";

import wastes_pack from "../content/loot/wastes_pack.json";
import crypt_pack from "../content/loot/crypt_pack.json";
import boss_pack from "../content/loot/boss_pack.json";

export const embeddedActors: Record<string, ActorDef> = {
  gravewarden: gravewarden as ActorDef,
  scuttler: scuttler as ActorDef,
  wretch: wretch as ActorDef,
  crypt_guard: crypt_guard as ActorDef,
  bellwarden: bellwarden as ActorDef,
  fallen: fallen as ActorDef,
  raider: raider as ActorDef,
  shade: shade as ActorDef,
  bone_hound: bone_hound as ActorDef,
  thrall: thrall as ActorDef,
  ash_ghoul: ash_ghoul as ActorDef,
  plague_scuttler: plague_scuttler as ActorDef,
  void_shade: void_shade as ActorDef,
  crypt_archer: crypt_archer as ActorDef,
  bone_brute: bone_brute as ActorDef,
  hell_raider: hell_raider as ActorDef,
  death_knight: death_knight as ActorDef,
  bone_tyrant: bone_tyrant as ActorDef,
};

export const embeddedAreas: Record<string, AreaMapDef> = {
  town: town as AreaMapDef,
  wastes: wastes as AreaMapDef,
  crypt: crypt as AreaMapDef,
  catacombs: catacombs as AreaMapDef,
  bonekeep: bonekeep as AreaMapDef,
};

export const embeddedProgression = progression as ProgressionDef;

export const embeddedItems: Record<string, ItemDef> = {
  rusty_sword: rusty_sword as ItemDef,
  bone_cleaver: bone_cleaver as ItemDef,
  ash_mail: ash_mail as ItemDef,
  iron_helm: iron_helm as ItemDef,
  health_potion: health_potion as ItemDef,
  grave_ring: grave_ring as ItemDef,
  tyrant_plate: tyrant_plate as ItemDef,
  warden_blade: warden_blade as ItemDef,
  ruby_gem: ruby_gem as ItemDef,
  sapphire_gem: sapphire_gem as ItemDef,
  emerald_gem: emerald_gem as ItemDef,
  topaz_gem: topaz_gem as ItemDef,
  warden_cloak: warden_cloak as ItemDef,
};

export const embeddedLoot = {
  wastes_pack: wastes_pack as {
    id: string;
    entries: Array<{ item: string; weight: number; min?: number; max?: number }>;
  },
  crypt_pack: crypt_pack as {
    id: string;
    entries: Array<{ item: string; weight: number; min?: number; max?: number }>;
  },
  boss_pack: boss_pack as {
    id: string;
    entries: Array<{ item: string; weight: number; min?: number; max?: number }>;
  },
};
