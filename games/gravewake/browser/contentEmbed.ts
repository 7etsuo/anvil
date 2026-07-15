import type { ActorDef } from "@anvil/genre-topdown2d";
import type { AreaMapDef, ProgressionDef } from "../src/types.js";

import gravewarden from "../content/actors/gravewarden.json";
import scuttler from "../content/actors/scuttler.json";
import wretch from "../content/actors/wretch.json";
import crypt_guard from "../content/actors/crypt_guard.json";
import bellwarden from "../content/actors/bellwarden.json";
import town from "../content/areas/town.json";
import parish from "../content/areas/parish.json";
import crypt from "../content/areas/crypt.json";
import progression from "../content/progression.json";

export const embeddedActors: Record<string, ActorDef> = {
  gravewarden: gravewarden as ActorDef,
  scuttler: scuttler as ActorDef,
  wretch: wretch as ActorDef,
  crypt_guard: crypt_guard as ActorDef,
  bellwarden: bellwarden as ActorDef,
};

export const embeddedAreas: Record<string, AreaMapDef> = {
  town: town as AreaMapDef,
  parish: parish as AreaMapDef,
  crypt: crypt as AreaMapDef,
};

export const embeddedProgression = progression as ProgressionDef;
