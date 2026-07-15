import { AssetServer } from "../assets/AssetServer.js";
import { AudioSystem } from "../audio/AudioSystem.js";
import { CinematicSystem } from "../cinema/CinematicSystem.js";
import { EventBus } from "../events/EventBus.js";
import { ParticleSystem } from "../fx/ParticleSystem.js";
import { InputMap } from "../input/InputMap.js";
import {
  type GenreModule,
  type KernelInternals,
  ModuleRegistry,
} from "../modules/ModuleRegistry.js";
import { PluginRegistry } from "../plugins/PluginRegistry.js";
import { QuestSystem } from "../quest/QuestSystem.js";
import type { CanvasRenderFacade } from "../render/CanvasRenderFacade.js";
import type { RenderFacade } from "../render/RenderFacade.js";
import { NullRenderFacade } from "../render/RenderFacade.js";
import { SceneManager } from "../scene/SceneManager.js";
import { createAnimationSystem } from "../systems/AnimationSystem.js";
import { UiKit } from "../ui/UiKit.js";
import { World } from "../world/World.js";
import { SeededRng } from "./SeededRng.js";

/** Engine semver exposed on observe / GameHandle */
export const ANVIL_VERSION = "0.5.1";

export interface SystemEntry {
  name: string;
  priority: number;
  fn: (dt: number) => void;
}

export class Kernel implements KernelInternals {
  readonly world = new World();
  readonly events = new EventBus();
  readonly input = new InputMap();
  readonly modules = new ModuleRegistry();
  readonly plugins = new PluginRegistry();
  readonly particles = new ParticleSystem();
  readonly quests = new QuestSystem();
  readonly ui = new UiKit();
  readonly assets: AssetServer;
  readonly scenes: SceneManager;
  readonly renderer: RenderFacade;
  readonly audio: AudioSystem;
  readonly cinema: CinematicSystem;

  private systems: SystemEntry[] = [];
  private rng: SeededRng;
  private seed: number;
  private time = 0;
  private tickCount = 0;
  private paused = false;
  private accumulator = 0;
  private fixedDt: number;
  private maxDtSteps: number;
  private disposed = false;
  private clearColor = "#1a1a2e";
  private genreObserve: () => Record<string, unknown> = () => ({});
  /** Soft entity budget (observe warns; does not hard-fail). */
  readonly entityBudget = 500;
  private lastTickMs = 0;
  private tickMsEma = 0;
  private budgetWarned = false;

  constructor(opts: {
    gameRoot: string;
    assetsRoot?: string;
    seed?: number;
    fixedDt?: number;
    maxDtSteps?: number;
    renderer?: RenderFacade;
    browser?: boolean;
  }) {
    this.seed = opts.seed ?? 1;
    this.rng = new SeededRng(this.seed);
    this.fixedDt = opts.fixedDt ?? 1 / 60;
    this.maxDtSteps = opts.maxDtSteps ?? 5;
    this.renderer = opts.renderer ?? new NullRenderFacade();
    this.assets = new AssetServer(
      opts.gameRoot,
      opts.assetsRoot ?? "assets",
      opts.browser ?? false,
    );
    this.input.installDefaults();
    this.scenes = new SceneManager({
      world: this.world,
      events: this.events,
      input: this.input,
      assets: this.assets,
      seed: this.seed,
      random: () => this.rng.random(),
      particles: this.particles,
      quests: this.quests,
    });
    this.audio = new AudioSystem(this.assets, this.events);
    this.cinema = new CinematicSystem(this.assets, this.events, this.input);
    this.world.setHooks({
      onSpawn: (id) => this.events.emit("entity:spawn", { id }),
      onDestroy: (id) => this.events.emit("entity:destroy", { id }),
    });

    // Built-in systems (priority ascending = earlier)
    this.addSystem("cinema", 50, () => this.cinema.update());
    this.addSystem("animation", 300, createAnimationSystem(this.world));
    this.addSystem("particles", 350, (dt) => this.particles.update(dt));
    this.addSystem("lifetime", 500, (dt) => {
      for (const e of this.world.query("lifetime")) {
        const lt = e.lifetime!;
        lt.remainingMs -= dt * 1000;
        if (lt.remainingMs <= 0) this.world.destroy(e.id);
      }
    });
    this.addSystem("plugins", 900, (dt) => this.plugins.update(dt));

    // Wire canvas / phaser assets if applicable
    const r = this.renderer as CanvasRenderFacade;
    if (typeof r.setAssetServer === "function") {
      r.setAssetServer(this.assets);
    }
  }

  addSystem(name: string, priority: number, fn: (dt: number) => void): void {
    this.systems.push({ name, priority, fn });
    this.systems.sort((a, b) => a.priority - b.priority);
  }

  registerScene(
    name: string,
    factory: Parameters<SceneManager["register"]>[1],
  ): void {
    this.scenes.register(name, factory);
  }

  registerModule(mod: GenreModule): void {
    this.modules.register(mod);
    mod.register(this);
    for (const s of mod.defaultScenes?.() ?? []) {
      this.registerScene(s.name, s.factory);
    }
  }

  setGenreObserve(fn: () => Record<string, unknown>): void {
    this.genreObserve = fn;
  }

  getGenreObserve(): Record<string, unknown> {
    return this.genreObserve();
  }

  random(): number {
    return this.rng.random();
  }

  randomInt(min: number, maxExclusive: number): number {
    return this.rng.randomInt(min, maxExclusive);
  }

  getSeed(): number {
    return this.seed;
  }

  getTime(): number {
    return this.time;
  }

  getTick(): number {
    return this.tickCount;
  }

  setClearColor(c: string): void {
    this.clearColor = c;
  }

  pause(): void {
    if (!this.paused) {
      this.paused = true;
      this.events.emit("game:pause", {});
    }
  }

  resume(): void {
    if (this.paused) {
      this.paused = false;
      this.events.emit("game:resume", {});
    }
  }

  isPaused(): boolean {
    return this.paused;
  }

  tick(dtWallSeconds: number): void {
    if (this.disposed) return;
    const t0 =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    this.accumulator += Math.min(dtWallSeconds, 0.25);
    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < this.maxDtSteps) {
      this.input.beginStep();
      if (!this.paused && !this.cinema.isPlaying()) {
        this.runSystems(this.fixedDt);
        this.scenes.update(this.fixedDt);
        this.time += this.fixedDt;
        this.tickCount++;
      } else if (this.cinema.isPlaying()) {
        this.cinema.update();
      }
      this.input.endFrame();
      this.accumulator -= this.fixedDt;
      steps++;
    }
    if (!this.cinema.isPlaying()) {
      this.renderer.beginFrame();
      this.renderer.clear(this.clearColor);
      this.drawEntities();
      this.renderer.endFrame();
    }
    const t1 =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    this.lastTickMs = t1 - t0;
    this.tickMsEma =
      this.tickMsEma === 0
        ? this.lastTickMs
        : this.tickMsEma * 0.9 + this.lastTickMs * 0.1;
    const n = this.world.all().length;
    if (!this.budgetWarned && n > this.entityBudget) {
      this.budgetWarned = true;
      this.events.emit("engine:budget_warn", {
        entities: n,
        budget: this.entityBudget,
      });
    }
  }

  private drawEntities(): void {
    for (const e of this.world.query("transform")) {
      const t = e.transform!;
      if (e.sprite && e.sprite.frames.length) {
        const framePath =
          e.sprite.frames[
            Math.min(e.sprite.frame, e.sprite.frames.length - 1)
          ]!;
        this.renderer.drawSprite(framePath, t.x, t.y, {
          rotation: t.rot,
        });
      } else {
        const label = e.tags[0] ?? e.id;
        this.renderer.drawQuad(t.x, t.y, 16, 16, "#4a90d9", label);
      }
    }
  }

  private runSystems(dt: number): void {
    for (const s of this.systems) s.fn(dt);
  }

  /** Snapshot of first-class engine services (for observe / agents). */
  engineSnapshot(): Record<string, unknown> {
    const entities = this.world.all().length;
    return {
      version: ANVIL_VERSION,
      modules: this.modules.list(),
      plugins: this.plugins.list(),
      particles: this.particles.particles.length,
      questsActive: this.quests.listActive().map((q) => q.defId),
      questsCompleted: this.quests.listCompleted().map((q) => q.defId),
      systems: this.systems.map((s) => s.name),
      metrics: {
        lastTickMs: Math.round(this.lastTickMs * 1000) / 1000,
        tickMsEma: Math.round(this.tickMsEma * 1000) / 1000,
        entities,
        entityBudget: this.entityBudget,
        overEntityBudget: entities > this.entityBudget,
      },
    };
  }

  dispose(): void {
    this.disposed = true;
    this.cinema.stop(false);
    this.plugins.dispose();
    this.particles.clear();
    this.audio.stopMusic();
    this.renderer.dispose();
    this.world.clear();
  }
}
