import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const cli = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist/index.js",
);
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anvil-cli-v2-"));
  roots.push(root);
  return root;
}

function run(args: string[]): string {
  return execFileSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

describe("Anvil v2 CLI", () => {
  it("scaffolds, validates, describes, and reports capabilities", () => {
    const root = tempRoot();
    run(["new", "cli-test", "--root", root]);
    expect(fs.readFileSync(path.join(root, "game.yaml"), "utf8")).toContain("schemaVersion: 2");
    expect(fs.existsSync(path.join(root, "game.spec.yaml"))).toBe(true);

    expect(JSON.parse(run(["validate", root, "--json"]))).toMatchObject({ ok: true });
    const description = JSON.parse(run(["describe", root, "--json"]));
    expect(description).toMatchObject({
      ok: true,
      manifest: { id: "cli-test", schemaVersion: 2 },
      counts: { requirements: 2 },
    });
    expect(description.sourceHash).toMatch(/^[0-9a-f]{64}$/);

    const capabilities = JSON.parse(run(["capabilities", root, "--json"]));
    expect(capabilities.capabilities.map((item: { id: string }) => item.id)).toEqual([
      "authoring-v2",
      "core",
    ]);
  });

  it("previews migration without mutation and applies it on request", () => {
    const root = tempRoot();
    fs.writeFileSync(
      path.join(root, "game.yaml"),
      "id: legacy-cli\ntitle: Legacy CLI\ngenre: none\nmodules: []\nentryScene: main\nschemaVersion: 1\n",
    );
    const before = fs.readFileSync(path.join(root, "game.yaml"), "utf8");
    const preview = JSON.parse(run(["migrate", root, "--json"]));
    expect(preview).toMatchObject({ ok: true, changed: true, written: false });
    expect(fs.readFileSync(path.join(root, "game.yaml"), "utf8")).toBe(before);

    const applied = JSON.parse(run(["migrate", root, "--write", "--json"]));
    expect(applied).toMatchObject({ ok: true, changed: true, written: true });
    expect(JSON.parse(run(["validate", root, "--json"]))).toMatchObject({ ok: true });
  });

  it("scaffolds a valid ARPG project with the declarative runtime", () => {
    const root = tempRoot();
    run(["new", "agent-arpg", "--genre", "arpg", "--root", root]);
    const manifest = fs.readFileSync(path.join(root, "game.yaml"), "utf8");
    expect(manifest).toContain("genre: arpg");
    expect(manifest).toContain("genre-arpg");
    expect(JSON.parse(run(["validate", root, "--json"]))).toMatchObject({ ok: true });
    expect(JSON.parse(run(["test", root, "--json"]))).toMatchObject({ ok: true });
  });
});
