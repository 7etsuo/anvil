import fs from "node:fs";
import path from "node:path";
import { GameIntentSchema, GameYamlSchema, LegacyGameYamlSchema, err, sortDiagnostics } from "@anvil/schema";
import yaml from "yaml";
import type { MigrationChange, MigrationResult } from "./types.js";

export function migrateProject(root: string, options: { write?: boolean } = {}): MigrationResult {
  const absoluteRoot = path.resolve(root);
  const manifestPath = path.join(absoluteRoot, "game.yaml");
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, errors: [err("IO_ERROR", "game.yaml missing", { path: manifestPath })] };
  }
  const beforeManifest = fs.readFileSync(manifestPath, "utf8");
  let raw: unknown;
  try {
    raw = yaml.parse(beforeManifest);
  } catch (cause) {
    return { ok: false, errors: [err("SCHEMA_INVALID", `YAML parse error: ${cause instanceof Error ? cause.message : String(cause)}`, { path: manifestPath })] };
  }

  const current = GameYamlSchema.safeParse(raw);
  if (current.success && current.data.schemaVersion === 2) {
    const intentPath = path.join(absoluteRoot, current.data.intent);
    if (!fs.existsSync(intentPath)) {
      return { ok: false, errors: [err("INTENT_INVALID", `${current.data.intent} missing`, { path: current.data.intent, hint: "Create the intent contract before using this v2 project." })] };
    }
    try {
      const intent = GameIntentSchema.safeParse(yaml.parse(fs.readFileSync(intentPath, "utf8")));
      if (!intent.success) throw new Error(intent.error.issues.map((issue) => issue.message).join("; "));
    } catch (cause) {
      return { ok: false, errors: [err("INTENT_INVALID", cause instanceof Error ? cause.message : String(cause), { path: current.data.intent })] };
    }
    return { ok: true, root: absoluteRoot, fromVersion: 2, toVersion: 2, changed: false, written: false, changes: [] };
  }

  const legacy = LegacyGameYamlSchema.safeParse(raw);
  if (!legacy.success) {
    return {
      ok: false,
      errors: sortDiagnostics(legacy.error.issues.map((issue) => err("SCHEMA_INVALID", issue.message, { path: `game.yaml/${issue.path.join(".")}` }))),
    };
  }

  const nextManifest = { ...legacy.data, intent: "game.spec.yaml", schemaVersion: 2 as const };
  const afterManifest = yaml.stringify(nextManifest, { lineWidth: 0 });
  const intentPath = path.join(absoluteRoot, "game.spec.yaml");
  const intentExists = fs.existsSync(intentPath);
  const intent = {
    schemaVersion: 2 as const,
    summary: `${legacy.data.title} is an Anvil game. Replace this migration summary with the intended player experience.`,
    quality: "playable" as const,
    players: { min: 1, max: 1 },
    platforms: ["web" as const],
    requirements: [
      { id: "lifecycle.start", category: "lifecycle" as const, priority: "must" as const, description: "The game starts in a playable state.", weight: 10, verify: ["smoke"] },
      { id: "input.responds", category: "input" as const, priority: "must" as const, description: "Primary player input produces visible state change.", weight: 10, verify: ["smoke"] },
      { id: "lifecycle.restart", category: "restart" as const, priority: "should" as const, description: "The player can restart after a terminal state.", weight: 7, verify: [] },
    ],
  };
  GameIntentSchema.parse(intent);
  const afterIntent = yaml.stringify(intent, { lineWidth: 0 });
  const changes: MigrationChange[] = [
    { path: "game.yaml", action: "update", before: beforeManifest, after: afterManifest },
  ];
  if (!intentExists) changes.push({ path: "game.spec.yaml", action: "create", after: afterIntent });
  else {
    try {
      GameIntentSchema.parse(yaml.parse(fs.readFileSync(intentPath, "utf8")));
    } catch (cause) {
      return { ok: false, errors: [err("INTENT_INVALID", `Existing game.spec.yaml is invalid: ${cause instanceof Error ? cause.message : String(cause)}`, { path: "game.spec.yaml", hint: "Fix or move the existing file before migration; it will not be overwritten." })] };
    }
  }

  if (options.write) {
    try {
      writeMigration(absoluteRoot, changes);
    } catch (cause) {
      return {
        ok: false,
        errors: [
          err("IO_ERROR", `Migration write failed: ${cause instanceof Error ? cause.message : String(cause)}`, {
            path: absoluteRoot,
            hint: "The original game.yaml remains the active schema boundary. Check permissions and retry.",
          }),
        ],
      };
    }
  }
  return { ok: true, root: absoluteRoot, fromVersion: 1, toVersion: 2, changed: true, written: options.write === true, changes };
}

function writeMigration(root: string, changes: readonly MigrationChange[]): void {
  const tempFiles: Array<{ temp: string; target: string }> = [];
  try {
    for (const change of changes) {
      const target = path.resolve(root, change.path);
      if (!target.startsWith(`${root}${path.sep}`)) throw new Error(`Migration path escapes root: ${change.path}`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const temp = `${target}.anvil-migrate-${process.pid}.tmp`;
      fs.writeFileSync(temp, change.after, { encoding: "utf8", flag: "wx" });
      tempFiles.push({ temp, target });
    }
    // Commit supporting files first; game.yaml is the version boundary and last commit.
    tempFiles.sort((a, b) => (a.target.endsWith("game.yaml") ? 1 : b.target.endsWith("game.yaml") ? -1 : 0));
    for (const file of tempFiles) fs.renameSync(file.temp, file.target);
  } catch (cause) {
    for (const file of tempFiles) fs.rmSync(file.temp, { force: true });
    throw cause;
  }
}
