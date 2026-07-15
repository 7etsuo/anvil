import fs from "node:fs";
import path from "node:path";
import {
  type AnvilError,
  type ValidationResult,
  AssetPath,
  GameYamlSchema,
  ModuleId,
  err,
  normalizeModules,
} from "@anvil/schema";
import yaml from "yaml";

export async function validateProject(root: string): Promise<ValidationResult> {
  const errors: AnvilError[] = [];
  const warnings: AnvilError[] = [];
  const abs = path.resolve(root);

  if (!fs.existsSync(abs)) {
    return {
      ok: false,
      errors: [err("IO_ERROR", `Root does not exist: ${abs}`, { path: abs })],
    };
  }

  const yamlPath = path.join(abs, "game.yaml");
  if (!fs.existsSync(yamlPath)) {
    return {
      ok: false,
      errors: [
        err("IO_ERROR", "game.yaml missing", {
          path: yamlPath,
          hint: "Run anvil new or create game.yaml",
        }),
      ],
    };
  }

  let raw: unknown;
  try {
    raw = yaml.parse(fs.readFileSync(yamlPath, "utf8"));
  } catch (e) {
    return {
      ok: false,
      errors: [
        err("SCHEMA_INVALID", `YAML parse error: ${e}`, { path: yamlPath }),
      ],
    };
  }

  const parsed = GameYamlSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.errors) {
      errors.push(
        err("SCHEMA_INVALID", issue.message, {
          path: `game.yaml/${issue.path.join(".")}`,
          hint: "See specs/S-SCHEMA.md",
          example: {
            id: "hello-empty",
            title: "Hello Empty",
            genre: "none",
            modules: [],
            entryScene: "main",
          },
        }),
      );
    }
    return { ok: false, errors };
  }

  const game = parsed.data;
  const modules = normalizeModules(game.genre, game.modules);
  for (const m of modules) {
    const check = ModuleId.safeParse(m);
    if (!check.success) {
      errors.push(
        err("MODULE_UNKNOWN", `Unknown module: ${m}`, {
          path: "game.yaml/modules",
          hint: "Allowed: genre-card, genre-topdown2d, genre-vn, genre-shmup, genre-fps2, genre-net",
        }),
      );
    }
  }

  const contentDir = path.join(abs, game.contentRoot);
  if (game.genre !== "none" && !fs.existsSync(contentDir)) {
    warnings.push(
      err("IO_ERROR", `contentRoot missing: ${game.contentRoot}`, {
        path: contentDir,
        hint: "Create content/ or set contentRoot",
      }),
    );
  }

  // assets/manifest.yaml (S04)
  const manifestPath = path.join(abs, game.assetsRoot, "manifest.yaml");
  if (fs.existsSync(manifestPath)) {
    try {
      const man = yaml.parse(fs.readFileSync(manifestPath, "utf8")) as {
        required?: unknown;
      };
      if (man.required !== undefined && !Array.isArray(man.required)) {
        errors.push(
          err("SCHEMA_INVALID", "manifest.required must be string array", {
            path: manifestPath,
          }),
        );
      } else if (Array.isArray(man.required)) {
        for (const [i, p] of man.required.entries()) {
          if (typeof p !== "string") {
            errors.push(
              err("SCHEMA_INVALID", `manifest.required[${i}] not string`, {
                path: manifestPath,
              }),
            );
            continue;
          }
          const ap = AssetPath.safeParse(p);
          if (!ap.success) {
            errors.push(
              err("SCHEMA_INVALID", `Invalid asset path in manifest: ${p}`, {
                path: `${manifestPath}[${i}]`,
                hint: "Relative paths only, no '..'",
              }),
            );
          }
        }
      }
    } catch (e) {
      errors.push(
        err("SCHEMA_INVALID", `manifest.yaml parse error: ${e}`, {
          path: manifestPath,
        }),
      );
    }
  }

  // content/audio.json optional shape
  const audioPath = path.join(abs, game.contentRoot, "audio.json");
  if (fs.existsSync(audioPath)) {
    try {
      const a = JSON.parse(fs.readFileSync(audioPath, "utf8")) as {
        cues?: unknown;
      };
      if (a.cues !== undefined && (typeof a.cues !== "object" || a.cues === null)) {
        errors.push(
          err("SCHEMA_INVALID", "audio.json cues must be object", {
            path: audioPath,
          }),
        );
      }
    } catch (e) {
      errors.push(
        err("SCHEMA_INVALID", `audio.json parse error: ${e}`, {
          path: audioPath,
        }),
      );
    }
  }

  if (errors.length) return { ok: false, errors };
  return warnings.length ? { ok: true, warnings } : { ok: true };
}
