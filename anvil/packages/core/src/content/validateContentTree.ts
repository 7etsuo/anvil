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
  const itemIds = new Set<string>();

  for (const rel of files) {
    const full = path.join(absContent, rel);
    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(full, "utf8"));
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

    // Cross-ref: collect item ids
    if (rel.includes("items/") && parsed.data && typeof parsed.data === "object") {
      const id = (parsed.data as { id?: string }).id;
      if (id) {
        if (itemIds.has(id)) {
          errors.push(
            err("SCHEMA_INVALID", `Duplicate item id: ${id}`, {
              path: `${contentRoot}/${rel}`,
            }),
          );
        }
        itemIds.add(id);
      }
    }
  }

  // Cross-ref loot → items
  for (const rel of files) {
    if (!rel.includes("loot/")) continue;
    const full = path.join(absContent, rel);
    try {
      const data = JSON.parse(fs.readFileSync(full, "utf8")) as {
        entries?: Array<{ item: string }>;
      };
      for (const e of data.entries ?? []) {
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
    } catch {
      /* already reported parse errors */
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
