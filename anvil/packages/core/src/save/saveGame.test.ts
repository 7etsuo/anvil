import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createGame } from "../createGame.js";
import { loadGame, saveGame } from "./saveGame.js";

function tmpGame(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anvil-save-"));
  fs.writeFileSync(
    path.join(dir, "game.yaml"),
    `id: save-test
title: Save Test
genre: none
modules: []
entryScene: main
seed: 7
schemaVersion: 1
`,
  );
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  fs.mkdirSync(path.join(dir, "content"), { recursive: true });
  return dir;
}

describe("saveGame/loadGame", () => {
  it("preserves entity hp and position", async () => {
    const root = tmpGame();
    const handle = await createGame({ root, headless: true, seed: 7 });
    handle.world.spawn({
      id: "hero",
      tags: ["player"],
      transform: { x: 42, y: 99 },
      health: { hp: 17, max: 100 },
    });
    handle.tick(1 / 60);
    await saveGame(handle, "slot0");
    handle.dispose();

    const loaded = await loadGame(root, "slot0", { headless: true });
    const hero = loaded.world.get("hero");
    expect(hero?.health?.hp).toBe(17);
    expect(hero?.transform?.x).toBe(42);
    expect(hero?.transform?.y).toBe(99);
    expect(loaded.getSeed()).toBe(7);
    loaded.dispose();
  });

  it("missing file → IO_ERROR", async () => {
    const root = tmpGame();
    await expect(loadGame(root, "nope", { headless: true })).rejects.toMatchObject({
      anvilError: { code: "IO_ERROR" },
    });
  });

  it("corrupt JSON → SCHEMA_INVALID", async () => {
    const root = tmpGame();
    const file = path.join(root, "saves", "slot0.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "{not json", "utf8");
    await expect(loadGame(root, "slot0", { headless: true })).rejects.toMatchObject({
      anvilError: { code: "SCHEMA_INVALID" },
    });
  });
});
