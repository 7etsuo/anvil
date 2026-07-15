export type {
  CreateGameOptions,
  GameHandle,
} from "./createGame.js";
export { createGame } from "./createGame.js";
export { validateProject } from "./validate.js";
export type { ObserveOpts, ObserveSnapshot } from "./observe.js";
export { observe } from "./observe.js";
export type { TestOpts, TestReport } from "./test/runTests.js";
export { runTests } from "./test/runTests.js";

export { World } from "./world/World.js";
export type { Entity, EntityInit, Collider } from "./world/World.js";
export { EventBus } from "./events/EventBus.js";
export { InputMap } from "./input/InputMap.js";
export { SceneManager } from "./scene/SceneManager.js";
export type {
  Scene,
  SceneContext,
  SceneFactory,
} from "./scene/SceneManager.js";
export { AssetServer } from "./assets/AssetServer.js";
export type { TextureHandle, AudioHandle } from "./assets/AssetServer.js";
export {
  collectRequiredAssets,
  listMissingAssets,
} from "./assets/scanMissing.js";
export type { RenderFacade } from "./render/RenderFacade.js";
export { NullRenderFacade } from "./render/RenderFacade.js";
export { CanvasRenderFacade } from "./render/CanvasRenderFacade.js";
export { Kernel } from "./kernel/Kernel.js";
export type { GenreModule, KernelInternals } from "./modules/ModuleRegistry.js";
export { ModuleRegistry } from "./modules/ModuleRegistry.js";
export { AudioSystem } from "./audio/AudioSystem.js";
export { CinematicSystem } from "./cinema/CinematicSystem.js";
export type { CinematicDef } from "./cinema/CinematicSystem.js";
export {
  saveGame,
  loadGame,
  setGenreStateHooks,
} from "./save/saveGame.js";
export type { SaveGame } from "./save/saveGame.js";
