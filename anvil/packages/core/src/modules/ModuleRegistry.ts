import type { SceneFactory } from "../scene/SceneManager.js";

export interface KernelInternals {
  addSystem(
    name: string,
    priority: number,
    fn: (dt: number) => void,
  ): void;
  registerScene(name: string, factory: SceneFactory): void;
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
