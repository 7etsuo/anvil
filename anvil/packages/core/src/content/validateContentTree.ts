/**
 * Walk contentRoot and validate JSON against Zod schemas (agent-facing).
 */
import fs from "node:fs";
import path from "node:path";
import {
  type AnvilError,
  err,
  schemaForContentPath,
} from "@anvil/schema";

export interface ContentValidateResult {
  errors: AnvilError[];
  warnings: AnvilError[];
  checked: number;
}

type ContentRecord = Record<string, unknown>;

function contentCategory(rel: string): string | null {
  const top = rel.replace(/\\/g, "/").split("/")[0]?.toLowerCase();
  return top && top !== rel ? top : null;
}

function recordValue(data: unknown): ContentRecord | null {
  return data !== null && typeof data === "object"
    ? (data as ContentRecord)
    : null;
}

function assetRefs(rel: string, data: unknown): Array<{ path: string; field: string }> {
  const refs: Array<{ path: string; field: string }> = [];
  const obj = recordValue(data);
  if (!obj) return refs;
  const category = contentCategory(rel);

  const add = (value: unknown, field: string) => {
    if (typeof value === "string") refs.push({ path: value, field });
  };

  if (rel === "audio.json" || rel.endsWith("/audio.json")) {
    const cues = recordValue(obj.cues);
    for (const [id, value] of Object.entries(cues ?? {})) {
      add(value, `cues.${id}`);
    }
  }
  if (category === "items") {
    add(obj.icon, "icon");
    const visual = recordValue(obj.visual);
    add(visual?.sprite, "visual.sprite");
    add(visual?.bodyVariant, "visual.bodyVariant");
  }
  if (category === "actors") {
    const animations = recordValue(obj.animations);
    for (const [state, frames] of Object.entries(animations ?? {})) {
      if (!Array.isArray(frames)) continue;
      frames.forEach((frame, i) => add(frame, `animations.${state}.${i}`));
    }
  }
  if (category === "maps" || category === "areas") {
    add(obj.background, "background");
  }
  return refs;
}

function walkJsonFiles(dir: string, base: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkJsonFiles(full, base, out);
    else if (name.endsWith(".json")) {
      out.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  }
}

/**
 * Validate all content JSON under contentRoot using folder conventions.
 * Unknown paths are skipped (warning once if many untyped files).
 */
export function validateContentTree(
  gameRoot: string,
  contentRoot = "content",
  assetsRoot = "assets",
): ContentValidateResult {
  const errors: AnvilError[] = [];
  const warnings: AnvilError[] = [];
  const absContent = path.join(path.resolve(gameRoot), contentRoot);
  if (!fs.existsSync(absContent)) {
    return { errors, warnings, checked: 0 };
  }

  const files: string[] = [];
  walkJsonFiles(absContent, absContent, files);
  let checked = 0;
  let untyped = 0;
  const parsedFiles = new Map<string, unknown>();
  const idsByCategory = new Map<string, Map<string, string>>();

  for (const rel of files) {
    const full = path.join(absContent, rel);
    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(full, "utf8"));
      parsedFiles.set(rel, data);
    } catch (e) {
      errors.push(
        err("SCHEMA_INVALID", `JSON parse error: ${e}`, {
          path: `${contentRoot}/${rel}`,
          hint: "Fix JSON syntax (trailing commas, quotes)",
        }),
      );
      continue;
    }

    const schema = schemaForContentPath(rel);
    if (!schema) {
      untyped++;
      continue;
    }

    const parsed = schema.safeParse(data);
    checked++;
    if (!parsed.success) {
      for (const issue of parsed.error.errors) {
        errors.push(
          err("SCHEMA_INVALID", issue.message, {
            path: `${contentRoot}/${rel}/${issue.path.join(".")}`,
            hint: `Content failed schema for ${rel.split("/")[0] ?? "file"}`,
            example:
              rel.includes("items/")
                ? {
                    id: "rusty_sword",
                    name: "Rusty Sword",
                    slot: "weapon",
                    stats: { damage: 5 },
                  }
                : undefined,
          }),
        );
      }
      continue;
    }

    const category = contentCategory(rel);
    const id = recordValue(parsed.data)?.id;
    if (category && typeof id === "string") {
      const ids = idsByCategory.get(category) ?? new Map<string, string>();
      const previous = ids.get(id);
      if (previous) {
        errors.push(
          err("SCHEMA_INVALID", `Duplicate ${category} id: ${id}`, {
            path: `${contentRoot}/${rel}`,
            hint: `First defined in ${contentRoot}/${previous}`,
          }),
        );
      } else {
        ids.set(id, rel);
      }
      idsByCategory.set(category, ids);
    }
  }

  const itemIds = idsByCategory.get("items") ?? new Map<string, string>();
  const actorIds = idsByCategory.get("actors") ?? new Map<string, string>();
  const areaIds = idsByCategory.get("areas") ?? new Map<string, string>();

  for (const [rel, raw] of parsedFiles) {
    const data = recordValue(raw);
    if (!data) continue;
    const category = contentCategory(rel);

    // Cross-ref loot → items
    if (category === "loot" && Array.isArray(data.entries)) {
      for (const entry of data.entries) {
        const e = recordValue(entry);
        if (!e || typeof e.item !== "string") continue;
        if (e.item === "gold") continue;
        if (itemIds.size > 0 && !itemIds.has(e.item)) {
          // only warn if we have an items catalog
          warnings.push(
            err("REF_MISSING", `Loot references unknown item '${e.item}'`, {
              path: `${contentRoot}/${rel}`,
              hint: "Add content/items/<id>.json or fix loot entry",
            }),
          );
        }
      }
    }

    // Cross-ref map/area spawns → actors (S-SCHEMA §4).
    if (
      (category === "maps" || category === "areas") &&
      actorIds.size > 0 &&
      Array.isArray(data.spawns)
    ) {
      data.spawns.forEach((spawn, i) => {
        const actor = recordValue(spawn)?.actor;
        if (typeof actor === "string" && !actorIds.has(actor)) {
          errors.push(
            err("REF_MISSING", `Spawn references unknown actor '${actor}'`, {
              path: `${contentRoot}/${rel}/spawns.${i}.actor`,
              hint: `Add ${contentRoot}/actors/${actor}.json or fix the actor id`,
            }),
          );
        }
      });
    }

    // Multi-area games: portal and edge destinations must resolve.
    if (category === "areas" && areaIds.size > 0) {
      for (const field of ["portals", "exits"] as const) {
        const links = data[field];
        if (!Array.isArray(links)) continue;
        links.forEach((link, i) => {
          const target = recordValue(link)?.to;
          if (typeof target === "string" && !areaIds.has(target)) {
            errors.push(
              err("REF_MISSING", `${field} references unknown area '${target}'`, {
                path: `${contentRoot}/${rel}/${field}.${i}.to`,
                hint: `Add ${contentRoot}/areas/${target}.json or fix the destination`,
              }),
            );
          }
        });
      }
    }

    // Every schema-declared asset path should exist under assetsRoot.
    for (const ref of assetRefs(rel, data)) {
      if (ref.path.includes("..") || path.isAbsolute(ref.path)) continue;
      if (!fs.existsSync(path.join(path.resolve(gameRoot), assetsRoot, ref.path))) {
        warnings.push(
          err("ASSET_MISSING", `Content references missing asset '${ref.path}'`, {
            path: `${contentRoot}/${rel}/${ref.field}`,
            hint: `Add ${assetsRoot}/${ref.path} or update the content path`,
          }),
        );
      }
    }
  }

  if (untyped > 0 && checked === 0) {
    warnings.push(
      err("SCHEMA_INVALID", `${untyped} content JSON files had no schema mapping`, {
        path: contentRoot,
        hint: "Use folders: items/, loot/, quests/, actors/, maps/, cards/, …",
      }),
    );
  }

  return { errors, warnings, checked };
}
