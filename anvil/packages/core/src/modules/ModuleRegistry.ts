import type { SceneFactory } from "../scene/SceneManager.js";

export interface KernelInternals {
  addSystem(
    name: string,
    priority: number,
    fn: (dt: number) => void,
  ): void;
  registerScene(name: string, factory: SceneFactory): void;
  setGenreObserve?(fn: () => Record<string, unknown>): void;
  /** First-class services (present on real Kernel) */
  particles?: import("../fx/ParticleSystem.js").ParticleSystem;
  quests?: import("../quest/QuestSystem.js").QuestSystem;
  plugins?: import("../plugins/PluginRegistry.js").PluginRegistry;
  ui?: import("../ui/UiKit.js").UiKit;
  audio?: import("../audio/AudioSystem.js").AudioSystem;
  statuses?: import("../combat/StatusSystem.js").StatusSystem;
  abilities?: import("../ability/AbilitySystem.js").AbilitySystem;
  world?: import("../world/World.js").World;
  events?: import("../events/EventBus.js").EventBus;
  input?: import("../input/InputMap.js").InputMap;
}

export interface GenreModule {
  id: string;
  register(kernel: KernelInternals): void;
  schemas?(): Record<string, unknown>;
  defaultScenes?(): Array<{ name: string; factory: SceneFactory }>;
}

export class ModuleRegistry {
  private mods = new Map<string, GenreModule>();

  register(mod: GenreModule): void {
    this.mods.set(mod.id, mod);
  }

  get(id: string): GenreModule | undefined {
    return this.mods.get(id);
  }

  list(): string[] {
    return [...this.mods.keys()];
  }
}
