import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ANVIL_IR_MODULE_ID, anvilGameIr } from "./vite.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anvil-vite-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "content", "actors"), { recursive: true });
  fs.writeFileSync(path.join(root, "game.yaml"), "id: vite-test\ntitle: Vite Test\ngenre: arpg\nmodules: []\nentryScene: main\nschemaVersion: 2\n");
  fs.writeFileSync(path.join(root, "game.spec.yaml"), "schemaVersion: 2\nsummary: Vite compiler bridge test.\nrequirements:\n  - id: lifecycle.start\n    category: lifecycle\n    description: Start.\n    verify: [smoke]\n");
  fs.writeFileSync(path.join(root, "content", "actors", "hero.json"), JSON.stringify({ id: "hero", hp: 10, speed: 2 }));
  return root;
}

describe("anvilGameIr", () => {
  it("emits a browser module from the canonical compiler", () => {
    const plugin = anvilGameIr({ root: project() });
    plugin.buildStart();
    const resolved = plugin.resolveId(ANVIL_IR_MODULE_ID);
    expect(resolved).toBe(`\0${ANVIL_IR_MODULE_ID}`);
    const code = plugin.load(resolved!);
    expect(code).toContain('"sourceHash"');
    expect(code).toContain('"genre":"arpg"');
    expect(code).toContain("deepFreeze");
    expect(code).not.toContain("node:fs");
  });

  it("fails early with structured compiler diagnostics", () => {
    const root = project();
    fs.rmSync(path.join(root, "game.spec.yaml"));
    expect(() => anvilGameIr({ root }).buildStart()).toThrow(/INTENT_INVALID.*missing/);
  });
});
