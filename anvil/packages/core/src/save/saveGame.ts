import fs from "node:fs";
import path from "node:path";
import { err } from "@anvil/schema";
import {
  createGame,
  type CreateGameOptions,
  type GameHandle,
} from "../createGame.js";
import type { Entity } from "../world/World.js";

export interface SaveGame {
  v: 1;
  gameId: string;
  scene: string;
  seed: number;
  tick: number;
  entities: Entity[];
  genreState: Record<string, unknown>;
  savedAt: string;
}

export type GenreStateProvider = () => Record<string, unknown>;
export type GenreStateApplier = (state: Record<string, unknown>) => void;

const providers = new WeakMap<GameHandle, GenreStateProvider>();
const appliers = new WeakMap<GameHandle, GenreStateApplier>();

export function setGenreStateHooks(
  handle: GameHandle,
  get: GenreStateProvider,
  apply: GenreStateApplier,
): void {
  providers.set(handle, get);
  appliers.set(handle, apply);
}

function slotPath(root: string, slot = "slot0"): string {
  return path.join(root, "saves", `${slot}.json`);
}

export async function saveGame(
  handle: GameHandle,
  slot = "slot0",
): Promise<void> {
  if (handle.assets.isBrowser()) {
    const data = buildSave(handle);
    try {
      localStorage.setItem(
        `anvil_save_${handle.game.id}_${slot}`,
        JSON.stringify(data),
      );
    } catch (e) {
      throw Object.assign(new Error(String(e)), {
        anvilError: err("IO_ERROR", String(e)),
      });
    }
    return;
  }

  const file = slotPath(handle.root, slot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const data = buildSave(handle);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

function buildSave(handle: GameHandle): SaveGame {
  const get = providers.get(handle);
  return {
    v: 1,
    gameId: handle.game.id,
    scene: handle.scenes.current() ?? handle.game.entryScene,
    seed: handle.getSeed(),
    tick: handle.getTick(),
    entities: handle.world.all().map(cloneEntity),
    genreState: get ? get() : {},
    savedAt: new Date().toISOString(),
  };
}

function cloneEntity(e: Entity): Entity {
  return JSON.parse(JSON.stringify(e)) as Entity;
}

export async function loadGame(
  root: string,
  slot = "slot0",
  createOpts: Partial<CreateGameOptions> = {},
): Promise<GameHandle> {
  let raw: string;
  const absRoot = path.resolve(root);

  if (createOpts.browser) {
    const key = `anvil_save_${createOpts.gameYaml?.id ?? "game"}_${slot}`;
    const s =
      typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    if (!s) {
      throw Object.assign(new Error("Save not found"), {
        anvilError: err("IO_ERROR", "Save not found", { path: key }),
      });
    }
    raw = s;
  } else {
    const file = slotPath(absRoot, slot);
    if (!fs.existsSync(file)) {
      throw Object.assign(new Error("Save not found"), {
        anvilError: err("IO_ERROR", "Save not found", { path: file }),
      });
    }
    raw = fs.readFileSync(file, "utf8");
  }

  let data: SaveGame;
  try {
    data = JSON.parse(raw) as SaveGame;
  } catch (e) {
    throw Object.assign(new Error("Corrupt save"), {
      anvilError: err("SCHEMA_INVALID", String(e)),
    });
  }

  if (data.v !== 1 || !data.gameId || !Array.isArray(data.entities)) {
    throw Object.assign(new Error("Invalid save schema"), {
      anvilError: err("SCHEMA_INVALID", "Invalid save schema", {
        hint: "Expected SaveGame v1",
      }),
    });
  }

  const handle = await createGame({
    root: absRoot,
    headless: createOpts.headless ?? true,
    seed: data.seed,
    modules: createOpts.modules,
    browser: createOpts.browser,
    gameYaml: createOpts.gameYaml,
    renderer: createOpts.renderer,
  });

  handle.world.clear();
  for (const e of data.entities) {
    handle.world.spawn({
      id: e.id,
      tags: e.tags,
      transform: e.transform,
      sprite: e.sprite
        ? {
            frames: e.sprite.frames,
            fps: e.sprite.fps,
            loop: e.sprite.loop,
            frame: e.sprite.frame,
          }
        : undefined,
      health: e.health,
      collider: e.collider,
      lifetime: e.lifetime,
      data: e.data,
    });
  }

  try {
    handle.scenes.replace(data.scene);
  } catch {
    handle.scenes.replace(handle.game.entryScene);
  }

  const apply = appliers.get(handle);
  if (apply && data.genreState) apply(data.genreState);

  return handle;
}
