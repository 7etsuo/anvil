import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  type GameYaml,
  GameYamlSchema,
  normalizeModules,
} from "@anvil/schema";
import type { GenreModule } from "@anvil/core";
import yaml from "yaml";

export function readGameYaml(root: string): GameYaml {
  const raw = yaml.parse(
    fs.readFileSync(path.join(root, "game.yaml"), "utf8"),
  );
  return GameYamlSchema.parse(raw);
}

export async function loadModulesForRoot(root: string): Promise<GenreModule[]> {
  const game = readGameYaml(root);
  return loadModulesForGame(game, root);
}

export async function loadModulesForGame(
  game: GameYaml,
  root = process.cwd(),
): Promise<GenreModule[]> {
  const ids = normalizeModules(game.genre, game.modules);
  const out: GenreModule[] = [];
  for (const id of ids) {
    if (id.startsWith("./") || id.startsWith("../")) {
      const abs = path.resolve(root, id);
      const mod = await import(pathToFileURL(abs).href);
      const gmod: GenreModule | undefined =
        mod.default ?? mod.gravewakeModule ?? mod.module;
      if (!gmod || typeof gmod.register !== "function") {
        throw new Error(
          `Relative module ${id} must export default GenreModule (or gravewakeModule)`,
        );
      }
      out.push(gmod);
      continue;
    }
    if (id === "genre-card") {
      const m = await import("@anvil/genre-card");
      out.push(m.cardModule);
    } else if (id === "genre-topdown2d") {
      const m = await import("@anvil/genre-topdown2d");
      out.push(m.topdownModule);
    } else if (id === "genre-vn") {
      const m = await import("@anvil/genre-vn");
      out.push(m.vnModule);
    } else if (id === "genre-shmup") {
      const m = await import("@anvil/genre-shmup");
      out.push(m.shmupModule);
    } else if (id === "genre-fps2") {
      const m = await import("@anvil/genre-fps2");
      out.push(m.fps2Module);
    } else if (id === "genre-net") {
      const m = await import("@anvil/genre-net");
      out.push(m.netModule);
    }
  }
  return out;
}
