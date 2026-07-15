import type { AbilitySystem } from "../ability/AbilitySystem.js";
import type { AssetServer } from "../assets/AssetServer.js";
import type { AudioSystem } from "../audio/AudioSystem.js";
import type { DeathSystem } from "../combat/DeathSystem.js";
import type { ProjectileSystem } from "../combat/ProjectileSystem.js";
import type { StatusSystem } from "../combat/StatusSystem.js";
import type { ThreatTable } from "../combat/ThreatTable.js";
import type { EventBus } from "../events/EventBus.js";
import type { FloatTextSystem } from "../fx/FloatText.js";
import type { ParticleSystem } from "../fx/ParticleSystem.js";
import type { ScreenTransition } from "../fx/ScreenTransition.js";
import type { InputMap } from "../input/InputMap.js";
import type { QuestSystem } from "../quest/QuestSystem.js";
import type { ResourcePool } from "../rpg/ResourcePool.js";
import type { InteractableSystem } from "../world/Interactables.js";
import type { TriggerSystem } from "../world/Triggers.js";
import type { World } from "../world/World.js";

export interface SceneContext {
  world: World;
  events: EventBus;
  input: InputMap;
  assets: AssetServer;
  data?: unknown;
  seed?: number;
  random?: () => number;
  /** First-class engine services (when run under Kernel) */
  particles?: ParticleSystem;
  quests?: QuestSystem;
  audio?: AudioSystem;
  statuses?: StatusSystem;
  abilities?: AbilitySystem;
  projectiles?: ProjectileSystem;
  resources?: ResourcePool;
  interactables?: InteractableSystem;
  triggers?: TriggerSystem;
  floatText?: FloatTextSystem;
  transitions?: ScreenTransition;
  threat?: ThreatTable;
  death?: DeathSystem;
}

export interface Scene {
  enter?(): void;
  exit?(): void;
  update(dt: number): void;
}

export type SceneFactory = (ctx: SceneContext) => Scene;

export class SceneManager {
  private factories = new Map<string, SceneFactory>();
  private stack: { name: string; scene: Scene }[] = [];
  private ctx: SceneContext;

  constructor(ctx: SceneContext) {
    this.ctx = ctx;
  }

  register(name: string, factory: SceneFactory): void {
    this.factories.set(name, factory);
  }

  push(name: string, data?: unknown): void {
    const factory = this.factories.get(name);
    if (!factory) throw new Error(`Unknown scene: ${name}`);
    const scene = factory({ ...this.ctx, data });
    this.stack.push({ name, scene });
    this.ctx.events.emit("scene:enter", { name });
    scene.enter?.();
  }

  pop(): void {
    const top = this.stack.pop();
    if (!top) throw new Error("Scene stack empty");
    top.scene.exit?.();
    this.ctx.events.emit("scene:exit", { name: top.name });
  }

  replace(name: string, data?: unknown): void {
    if (this.stack.length > 0) this.pop();
    this.push(name, data);
  }

  current(): string | null {
    return this.stack.length ? this.stack[this.stack.length - 1]!.name : null;
  }

  update(dt: number): void {
    const top = this.stack[this.stack.length - 1];
    top?.scene.update(dt);
  }
}
