import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateContentTree } from "./validateContentTree.js";
import { validateProject } from "../validate.js";

function tmpGame(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "anvil-content-"));
  fs.writeFileSync(
    path.join(d, "game.yaml"),
    `id: t
title: T
genre: none
modules: []
entryScene: main
schemaVersion: 1
`,
  );
  fs.mkdirSync(path.join(d, "content", "items"), { recursive: true });
  return d;
}

describe("validateContentTree", () => {
  it("flags invalid item JSON", () => {
    const d = tmpGame();
    fs.writeFileSync(
      path.join(d, "content", "items", "bad.json"),
      JSON.stringify({ id: "bad" }), // missing name
    );
    const r = validateContentTree(d, "content");
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]!.path).toContain("items/bad.json");
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("accepts valid item and integrates with validateProject", async () => {
    const d = tmpGame();
    fs.writeFileSync(
      path.join(d, "content", "items", "sword.json"),
      JSON.stringify({
        id: "sword",
        name: "Sword",
        slot: "weapon",
        stats: { damage: 3 },
      }),
    );
    const r = validateContentTree(d, "content");
    expect(r.errors.length).toBe(0);
    expect(r.checked).toBeGreaterThanOrEqual(1);

    const v = await validateProject(d);
    expect(v.ok).toBe(true);
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("warns loot → missing item when catalog exists", () => {
    const d = tmpGame();
    fs.writeFileSync(
      path.join(d, "content", "items", "sword.json"),
      JSON.stringify({ id: "sword", name: "Sword" }),
    );
    fs.mkdirSync(path.join(d, "content", "loot"), { recursive: true });
    fs.writeFileSync(
      path.join(d, "content", "loot", "t1.json"),
      JSON.stringify({
        id: "t1",
        entries: [{ item: "nope", weight: 1 }],
      }),
    );
    const r = validateContentTree(d, "content");
    expect(r.warnings.some((w) => w.code === "REF_MISSING")).toBe(true);
    fs.rmSync(d, { recursive: true, force: true });
  });
});
