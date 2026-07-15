import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// dist/ -> ../recipes ; src/ -> ../recipes
const recipesDir = path.resolve(here, "../recipes");

export function listRecipes(): string[] {
  if (!fs.existsSync(recipesDir)) return [];
  return fs
    .readdirSync(recipesDir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => f.replace(/\.ya?ml$/, ""))
    .sort();
}

export function showRecipe(id: string): string | null {
  const candidates = [
    path.join(recipesDir, `${id}.yaml`),
    path.join(recipesDir, `${id}.yml`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  return null;
}
