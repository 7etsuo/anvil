import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compileProject, deepMerge } from "./compiler.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anvil-authoring-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "content"));
  fs.writeFileSync(
    path.join(root, "game.yaml"),
    `id: authoring-test\ntitle: Authoring Test\ngenre: topdown2d\nmodules: []\nentryScene: main\nseed: 7\nschemaVersion: 2\n`,
  );
  fs.writeFileSync(
    path.join(root, "game.spec.yaml"),
    `schemaVersion: 2\nsummary: Deterministic authoring compiler test.\nquality: excellent\nrequirements:\n  - id: lifecycle.start\n    category: lifecycle\n    priority: must\n    description: Start in a playable state.\n    weight: 10\n    verify: [smoke]\n`,
  );
  return root;
}

function json(root: string, relative: string, value: unknown): void {
  const target = path.join(root, "content", relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2));
}

describe("compileProject", () => {
  it("emits deterministic deeply frozen IR with resolved prefabs", () => {
    const root = project();
    json(root, "traits/living.json", {
      id: "living",
      components: {
        health: { hp: 10, max: 10 },
        slots: [{ id: "weapon", count: 1 }],
        tags: ["living"],
      },
    });
    json(root, "traits/elite.json", {
      id: "elite",
      requires: ["living"],
      components: {
        health: { hp: 20 },
        slots: [
          { id: "weapon", count: 2 },
          { id: "affix", count: 1 },
        ],
        tags: ["elite"],
      },
    });
    json(root, "prefabs/base.json", {
      id: "base-enemy",
      traits: ["living"],
      components: { actor: { speed: 2 } },
    });
    json(root, "prefabs/elite.json", {
      id: "elite-enemy",
      parent: "base-enemy",
      traits: ["elite"],
      components: { actor: { speed: 3 } },
    });
    json(root, "triggers/spawn.json", {
      id: "spawn-elite",
      when: { op: "event", name: "room.enter" },
      then: [{ op: "spawn", prefab: "elite-enemy", at: { x: 4, y: 5 } }],
    });
    json(root, "machines/door.json", {
      id: "door",
      initial: "closed",
      states: [
        { id: "closed", transitions: [{ to: "open", when: { op: "flag", key: "room.clear" } }] },
        { id: "open", enter: [{ op: "emit", event: "door.opened" }] },
      ],
    });

    const first = compileProject(root);
    const second = compileProject(root);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.ir.sourceHash).toBe(second.ir.sourceHash);
    expect(first.ir.capabilities.map((item) => item.id)).toEqual([
      "authoring-v2",
      "core",
      "genre-topdown2d",
    ]);
    expect(first.ir.prefabs["elite-enemy"]?.components).toMatchObject({
      health: { hp: 20, max: 10 },
      actor: { speed: 3 },
      slots: [
        { id: "weapon", count: 2 },
        { id: "affix", count: 1 },
      ],
      tags: ["elite"],
    });
    expect(Object.isFrozen(first.ir)).toBe(true);
    expect(Object.isFrozen(first.ir.prefabs["elite-enemy"]?.components)).toBe(true);
  });

  it("returns actionable migration, cycle, conflict, and reference diagnostics", () => {
    const legacy = project();
    fs.writeFileSync(path.join(legacy, "game.yaml"), `id: old\ntitle: Old\ngenre: none\nmodules: []\nentryScene: main\nschemaVersion: 1\n`);
    const legacyResult = compileProject(legacy);
    expect(legacyResult.ok).toBe(false);
    if (!legacyResult.ok) {
      expect(legacyResult.errors[0]?.code).toBe("MIGRATION_REQUIRED");
      expect(legacyResult.errors[0]?.fixes?.[0]?.safe).toBe(true);
    }

    const root = project();
    json(root, "traits/a.json", { id: "a", conflicts: ["b"], components: {} });
    json(root, "traits/b.json", { id: "b", components: {} });
    json(root, "prefabs/a.json", { id: "a", parent: "b", traits: ["a", "b"] });
    json(root, "prefabs/b.json", { id: "b", parent: "a" });
    const result = compileProject(root);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toEqual(
        expect.arrayContaining(["PREFAB_CYCLE", "PREFAB_CONFLICT"]),
      );
      expect(result.errors.map((error) => error.path)).toEqual(
        [...result.errors].sort((a, b) => (a.path ?? "").localeCompare(b.path ?? "") || a.code.localeCompare(b.code) || a.message.localeCompare(b.message)).map((error) => error.path),
      );
    }
  });

  it("distinguishes unsupported future schemas from migratable v1", () => {
    const root = project();
    fs.writeFileSync(
      path.join(root, "game.yaml"),
      `id: future\ntitle: Future\ngenre: none\nmodules: []\nentryScene: main\nschemaVersion: 99\n`,
    );
    const result = compileProject(root);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.code).toBe("SCHEMA_VERSION_UNSUPPORTED");
  });

  it("rejects invalid state targets and spawn prefab references", () => {
    const machineRoot = project();
    json(machineRoot, "machines/bad.json", {
      id: "bad",
      initial: "missing",
      states: [{ id: "only", transitions: [{ to: "other", when: { op: "always" } }] }],
    });
    const machine = compileProject(machineRoot);
    expect(machine.ok).toBe(false);
    if (!machine.ok) expect(machine.errors.every((error) => error.code === "COMPILE_FAILED")).toBe(true);

    const spawnRoot = project();
    json(spawnRoot, "triggers/bad.json", {
      id: "bad-spawn",
      when: { op: "always" },
      then: [{ op: "spawn", prefab: "missing" }],
    });
    const spawn = compileProject(spawnRoot);
    expect(spawn.ok).toBe(false);
    if (!spawn.ok) expect(spawn.errors[0]?.code).toBe("REF_MISSING");
  });
});

describe("deepMerge", () => {
  it("merges objects and keyed arrays but replaces ordinary arrays", () => {
    expect(
      deepMerge(
        { nested: { a: 1, b: 2 }, keyed: [{ id: "a", n: 1 }], plain: [1, 2] },
        { nested: { b: 3 }, keyed: [{ id: "a", n: 2 }, { id: "b", n: 1 }], plain: [3] },
      ),
    ).toEqual({
      nested: { a: 1, b: 3 },
      keyed: [{ id: "a", n: 2 }, { id: "b", n: 1 }],
      plain: [3],
    });
  });
});
