export type Collider =
  | { kind: "circle"; r: number }
  | { kind: "aabb"; w: number; h: number };

export interface Entity {
  id: string;
  tags: string[];
  transform?: { x: number; y: number; z?: number; rot?: number };
  sprite?: {
    frames: string[];
    fps: number;
    loop: boolean;
    frame: number;
  };
  health?: { hp: number; max: number };
  collider?: Collider;
  lifetime?: { remainingMs: number };
  data: Record<string, unknown>;
}

export type EntityInit = {
  id?: string;
  tags?: string[];
  transform?: Entity["transform"];
  sprite?: Omit<NonNullable<Entity["sprite"]>, "frame"> & { frame?: number };
  health?: Entity["health"];
  collider?: Entity["collider"];
  lifetime?: Entity["lifetime"];
  data?: Record<string, unknown>;
};

export class World {
  private entities = new Map<string, Entity>();
  private nextId = 1;
  private onSpawn?: (id: string) => void;
  private onDestroy?: (id: string) => void;

  setHooks(hooks: {
    onSpawn?: (id: string) => void;
    onDestroy?: (id: string) => void;
  }): void {
    this.onSpawn = hooks.onSpawn;
    this.onDestroy = hooks.onDestroy;
  }

  spawn(init: EntityInit = {}): string {
    const id = init.id ?? `e_${this.nextId++}`;
    if (this.entities.has(id)) {
      throw new Error(`Entity id already exists: ${id}`);
    }
    const entity: Entity = {
      id,
      tags: init.tags ? [...init.tags] : [],
      transform: init.transform ? { ...init.transform } : undefined,
      sprite: init.sprite
        ? {
            frames: [...init.sprite.frames],
            fps: init.sprite.fps,
            loop: init.sprite.loop,
            frame: init.sprite.frame ?? 0,
          }
        : undefined,
      health: init.health ? { ...init.health } : undefined,
      collider: init.collider ? { ...init.collider } : undefined,
      lifetime: init.lifetime ? { ...init.lifetime } : undefined,
      data: init.data ? { ...init.data } : {},
    };
    this.entities.set(id, entity);
    this.onSpawn?.(id);
    return id;
  }

  destroy(id: string): void {
    if (!this.entities.has(id)) return;
    this.entities.delete(id);
    this.onDestroy?.(id);
  }

  get(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  has(id: string): boolean {
    return this.entities.has(id);
  }

  query(...componentKeys: string[]): Entity[] {
    const keys = componentKeys as (keyof Entity)[];
    return [...this.entities.values()].filter((e) =>
      keys.every((k) => e[k] !== undefined),
    );
  }

  all(): Entity[] {
    return [...this.entities.values()];
  }

  clear(): void {
    const ids = [...this.entities.keys()];
    for (const id of ids) this.destroy(id);
  }
}
