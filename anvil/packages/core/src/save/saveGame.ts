import fs from "node:fs";
import path from "node:path";
import { err } from "@anvil/schema";
import {
  createGame,
  type CreateGameOptions,
  type GameHandle,
} from "../createGame.js";
import type { Entity } from "../world/World.js";

import type { CharacterSaveBlob, ZoneGraphState } from "../rpg/types.js";

export interface SaveGame {
  /** v1 original; v2 adds character + zones */
  v: 1 | 2;
  gameId: string;
  scene: string;
  seed: number;
  tick: number;
  entities: Entity[];
  genreState: Record<string, unknown>;
  /** RPG character sheet (inventory, equip, stats) */
  character?: CharacterSaveBlob;
  /** Zone graph progress */
  zones?: ZoneGraphState;
  savedAt: string;
}

export type GenreStateProvider = () => Record<string, unknown>;
export type GenreStateApplier = (state: Record<string, unknown>) => void;
export type CharacterProvider = () => CharacterSaveBlob | undefined;
export type CharacterApplier = (data: CharacterSaveBlob) => void;
export type ZonesProvider = () => ZoneGraphState | undefined;
export type ZonesApplier = (data: ZoneGraphState) => void;

const providers = new WeakMap<GameHandle, GenreStateProvider>();
const appliers = new WeakMap<GameHandle, GenreStateApplier>();
const charProviders = new WeakMap<GameHandle, CharacterProvider>();
const charAppliers = new WeakMap<GameHandle, CharacterApplier>();
const zoneProviders = new WeakMap<GameHandle, ZonesProvider>();
const zoneAppliers = new WeakMap<GameHandle, ZonesApplier>();

export function setGenreStateHooks(
  handle: GameHandle,
  get: GenreStateProvider,
  apply: GenreStateApplier,
): void {
  providers.set(handle, get);
  appliers.set(handle, apply);
}

/** Hook character sheet into save/load (inventory, equip, stats, xp). */
export function setCharacterSaveHooks(
  handle: GameHandle,
  get: CharacterProvider,
  apply: CharacterApplier,
): void {
  charProviders.set(handle, get);
  charAppliers.set(handle, apply);
}

/** Hook zone graph into save/load. */
export function setZoneSaveHooks(
  handle: GameHandle,
  get: ZonesProvider,
  apply: ZonesApplier,
): void {
  zoneProviders.set(handle, get);
  zoneAppliers.set(handle, apply);
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
  const getChar = charProviders.get(handle);
  const getZones = zoneProviders.get(handle);
  const character = getChar?.();
  const zones = getZones?.();
  return {
    v: character || zones ? 2 : 1,
    gameId: handle.game.id,
    scene: handle.scenes.current() ?? handle.game.entryScene,
    seed: handle.getSeed(),
    tick: handle.getTick(),
    entities: handle.world.all().map(cloneEntity),
    genreState: get ? get() : {},
    character,
    zones,
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

  if (
    (data.v !== 1 && data.v !== 2) ||
    !data.gameId ||
    !Array.isArray(data.entities)
  ) {
    throw Object.assign(new Error("Invalid save schema"), {
      anvilError: err("SCHEMA_INVALID", "Invalid save schema", {
        hint: "Expected SaveGame v1 or v2",
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

  const applyChar = charAppliers.get(handle);
  if (applyChar && data.character) applyChar(data.character);

  const applyZones = zoneAppliers.get(handle);
  if (applyZones && data.zones) applyZones(data.zones);

  return handle;
}
