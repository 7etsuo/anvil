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

// Combat events
export {
  COMBAT_HIT,
  COMBAT_KILL,
  COMBAT_HEAL,
  COMBAT_CRIT,
  emitHit,
  emitKill,
  emitHeal,
  onCombatHit,
  onCombatKill,
} from "./combat/CombatEvents.js";
export type {
  CombatHitEvent,
  CombatKillEvent,
  CombatHealEvent,
} from "./combat/CombatEvents.js";

// Damage types + resists
export {
  DAMAGE_TYPES,
  DAMAGE_TYPE_RESIST,
  RESIST_CAP,
  isDamageType,
  resistStatKey,
  getResist,
  mitigateDamage,
  resolveDamage,
} from "./combat/Damage.js";
export type {
  DamageType,
  ResistStatKey,
  ResistMap,
  DamagePacket,
  DamageResult,
} from "./combat/Damage.js";

// Status effects
export {
  StatusSystem,
  BUILTIN_STATUS_DEFS,
} from "./combat/StatusSystem.js";
export type {
  StatusDef,
  StatusStackMode,
  StatusFlags,
  ActiveStatus,
  StatusTickDamage,
  StatusExpireEvent,
} from "./combat/StatusSystem.js";

// Combat → audio bridge
export {
  wireCombatAudio,
  installGameAudio,
  DEFAULT_COMBAT_AUDIO_CUES,
} from "./audio/wireCombatAudio.js";
export type {
  CombatAudioCueMap,
  WireCombatAudioOpts,
} from "./audio/wireCombatAudio.js";

// View camera
export { ViewCamera } from "./camera/ViewCamera.js";
export type { CameraMode, IsoMetrics, ViewCameraOpts } from "./camera/ViewCamera.js";

// Abilities
export { AbilitySystem } from "./ability/AbilitySystem.js";
export type {
  AbilityDef,
  AbilityTargeting,
  AbilityCastContext,
  AbilityCastResult,
  AbilityCastHandler,
} from "./ability/AbilitySystem.js";

// Actor animation SM
export { ActorAnimController } from "./anim/ActorAnim.js";
export type {
  ActorAnimState,
  ActorAnimClips,
  ActorAnimOpts,
} from "./anim/ActorAnim.js";

// Spatial hash
export { SpatialHash } from "./spatial/SpatialHash.js";
export type { SpatialItem } from "./spatial/SpatialHash.js";

// Tilemap
export { TileMap } from "./map/TileMap.js";
export type { TileMapData, TileDef, TileId } from "./map/TileMap.js";

// Loot policy + item level
export {
  dropFromTable,
  LOOT_GOLD_RADIUS,
  LOOT_ITEM_RADIUS,
} from "./rpg/LootPolicy.js";
export type {
  DropResult,
  LootPolicyOpts,
  LootTableLike as LootPolicyTable,
} from "./rpg/LootPolicy.js";
export {
  DEFAULT_ITEMIZATION,
  itemPowerFactor,
  scaleStatsForItemLevel,
  rollDropItemLevel,
  computeReqLevel,
  rollItemInstance,
  stackReqLevel,
  canEquipAtLevel,
  itemPowerScore,
} from "./rpg/itemization.js";
export type {
  ItemizationConfig,
  ScaleItemStatsOpts,
  RolledItemInstance,
} from "./rpg/itemization.js";

// Run state save
export {
  buildRunState,
  serializeRunState,
  parseRunState,
  saveRunToLocalStorage,
  loadRunFromLocalStorage,
} from "./save/runState.js";
export type { RunStateV1 } from "./save/runState.js";

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
export { validateContentTree } from "./content/validateContentTree.js";
export type { ContentValidateResult } from "./content/validateContentTree.js";

// Plugins
export { PluginRegistry } from "./plugins/PluginRegistry.js";
export type { AnvilPlugin, PluginApi } from "./plugins/PluginRegistry.js";

// Map builder + procedural generation
export { MapBuilder } from "./map/MapBuilder.js";
export type { BuiltMap, MapWall, MapSpawn } from "./map/MapBuilder.js";
export {
  generateDungeon,
  generateOverworld,
  procgenRng,
} from "./map/Procgen.js";
export type {
  DungeonGenOpts,
  OverworldGenOpts,
  ProcMapResult,
  ProcgenRng,
} from "./map/Procgen.js";

// Platform packaging (manifest only — real Electron shell is @anvil/desktop)
export {
  createPackageManifest,
  serializeManifest,
} from "./platform/packageGame.js";
export type { GamePackageManifest } from "./platform/packageGame.js";

// Audio catalog (bundled CC0 library)
export type { AudioChannel, AudioCues } from "./audio/AudioSystem.js";
export {
  resolveBundledAudioRoot,
  loadBundledAudioCatalog,
  buildCatalogFromDisk,
  writeBundledAudioCatalog,
  clearBundledAudioCatalogCache,
  listBundledAudio,
  getSuggestedAudioCues,
  cuesForAssetRoot,
  getGameReadyAudioCues,
} from "./audio/AudioCatalog.js";
export type {
  BundledAudioCatalog,
  BundledAudioEntry,
  BundledAudioKind,
  BundledAudioChannel,
  ListBundledAudioFilter,
} from "./audio/AudioCatalog.js";
