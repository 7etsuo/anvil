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
export type {
  RenderFacade,
  DrawSpriteOpts,
  DrawTextOpts,
} from "./render/RenderFacade.js";
export { NullRenderFacade } from "./render/RenderFacade.js";
export { CanvasRenderFacade } from "./render/CanvasRenderFacade.js";
export { ANVIL_VERSION, Kernel } from "./kernel/Kernel.js";
export type { GenreModule, KernelInternals } from "./modules/ModuleRegistry.js";
export { ModuleRegistry } from "./modules/ModuleRegistry.js";
export { AudioSystem } from "./audio/AudioSystem.js";
export { CinematicSystem } from "./cinema/CinematicSystem.js";
export type { CinematicDef } from "./cinema/CinematicSystem.js";
export {
  saveGame,
  loadGame,
  setGenreStateHooks,
  setCharacterSaveHooks,
  setZoneSaveHooks,
} from "./save/saveGame.js";
export type { SaveGame } from "./save/saveGame.js";
export {
  attachCharacterSheet,
  attachZoneGraph,
} from "./engine/attach.js";

// Agent-native ACI (structured act / observe / replay)
export * from "./agent/index.js";

// RPG systems (inventory, equip, stats, loot, zones)
export * from "./rpg/index.js";

// UI
export { UiKit, DEFAULT_UI_THEME } from "./ui/UiKit.js";
export type { UiRect, UiPointer, UiTheme } from "./ui/UiKit.js";

// FX
export { ParticleSystem } from "./fx/ParticleSystem.js";
export type { Particle, ParticleBurstOpts } from "./fx/ParticleSystem.js";

// Combat feel
export {
  applyHitstun,
  applyIframes,
  applyKnockback,
  tickCombatBody,
  canBeHit,
  registerHit,
} from "./combat/CombatFeel.js";
export type { CombatBody } from "./combat/CombatFeel.js";

// Pathfinding + AI
export { astar, wallsToGrid } from "./path/astar.js";
export type { Grid, Point } from "./path/astar.js";
export { createAiAgent, tickAi } from "./ai/AiHelpers.js";
export type { AiAgent, AiMode } from "./ai/AiHelpers.js";

// Quests
export { QuestSystem } from "./quest/QuestSystem.js";
export type {
  QuestDef,
  QuestStep,
  QuestStatus,
  QuestRuntime,
} from "./quest/QuestSystem.js";

// Content pipeline
export {
  validateItemDefs,
  validateLootTables,
  rollLootTable,
} from "./content/validateContent.js";
export type {
  ValidationIssue,
  ItemDefLike,
  LootTableLike,
} from "./content/validateContent.js";

// Plugins
export { PluginRegistry } from "./plugins/PluginRegistry.js";
export type { AnvilPlugin, PluginApi } from "./plugins/PluginRegistry.js";

// Map builder
export { MapBuilder } from "./map/MapBuilder.js";
export type { BuiltMap, MapWall, MapSpawn } from "./map/MapBuilder.js";

// Platform packaging (manifest only — real Electron shell is @anvil/desktop)
export {
  createPackageManifest,
  serializeManifest,
} from "./platform/packageGame.js";
export type { GamePackageManifest } from "./platform/packageGame.js";

// Audio channel type
export type { AudioChannel, AudioCues } from "./audio/AudioSystem.js";
