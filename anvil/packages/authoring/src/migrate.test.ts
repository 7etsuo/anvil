import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compileProject } from "./compiler.js";
import { migrateProject } from "./migrate.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function legacyProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anvil-migrate-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "content"));
  fs.writeFileSync(
    path.join(root, "game.yaml"),
    `id: legacy\ntitle: Legacy Game\ngenre: none\nmodules: []\nentryScene: main\nseed: 3\nschemaVersion: 1\n`,
  );
  return root;
}

describe("migrateProject", () => {
  it("previews without writes, writes v2 transactionally, and is idempotent", () => {
    const root = legacyProject();
    const before = fs.readFileSync(path.join(root, "game.yaml"), "utf8");
    const preview = migrateProject(root);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.written).toBe(false);
    expect(preview.changes.map((change) => change.path)).toEqual(["game.yaml", "game.spec.yaml"]);
    expect(fs.readFileSync(path.join(root, "game.yaml"), "utf8")).toBe(before);
    expect(fs.existsSync(path.join(root, "game.spec.yaml"))).toBe(false);

    const applied = migrateProject(root, { write: true });
    expect(applied.ok && applied.written).toBe(true);
    expect(fs.existsSync(path.join(root, "game.spec.yaml"))).toBe(true);
    const compiled = compileProject(root);
    expect(compiled.ok).toBe(true);

    const again = migrateProject(root, { write: true });
    expect(again).toMatchObject({ ok: true, changed: false, written: false, changes: [] });
  });

  it("never overwrites an invalid pre-existing intent contract", () => {
    const root = legacyProject();
    fs.writeFileSync(path.join(root, "game.spec.yaml"), "not: an intent\n");
    const result = migrateProject(root, { write: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.code).toBe("INTENT_INVALID");
    expect(fs.readFileSync(path.join(root, "game.yaml"), "utf8")).toContain("schemaVersion: 1");
  });
});
