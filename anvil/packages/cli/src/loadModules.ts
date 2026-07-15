import fs from "node:fs";
import path from "node:path";
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
  return loadModulesForGame(game);
}

export async function loadModulesForGame(
  game: GameYaml,
): Promise<GenreModule[]> {
  const ids = normalizeModules(game.genre, game.modules);
  const out: GenreModule[] = [];
  for (const id of ids) {
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
    }
  }
  return out;
}
