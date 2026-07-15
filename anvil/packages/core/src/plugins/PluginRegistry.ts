/**
 * Lightweight plugin registry for engine/game extensions.
 */

export interface AnvilPlugin {
  id: string;
  /** Called once when registered */
  register?: (api: PluginApi) => void;
  /** Optional per-frame hook */
  update?: (dt: number) => void;
  dispose?: () => void;
}

export interface PluginApi {
  on: (event: string, fn: (payload: unknown) => void) => void;
  emit: (event: string, payload?: unknown) => void;
  log: (msg: string) => void;
}

export class PluginRegistry {
  private plugins = new Map<string, AnvilPlugin>();
  private listeners = new Map<string, Array<(p: unknown) => void>>();

  private api: PluginApi = {
    on: (event, fn) => {
      const list = this.listeners.get(event) ?? [];
      list.push(fn);
      this.listeners.set(event, list);
    },
    emit: (event, payload) => {
      for (const fn of this.listeners.get(event) ?? []) fn(payload);
    },
    log: (msg) => console.log(`[plugin] ${msg}`),
  };

  register(plugin: AnvilPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }
    this.plugins.set(plugin.id, plugin);
    plugin.register?.(this.api);
  }

  get(id: string): AnvilPlugin | undefined {
    return this.plugins.get(id);
  }

  list(): string[] {
    return [...this.plugins.keys()];
  }

  update(dt: number): void {
    for (const p of this.plugins.values()) p.update?.(dt);
  }

  emit(event: string, payload?: unknown): void {
    this.api.emit(event, payload);
  }

  dispose(): void {
    for (const p of this.plugins.values()) p.dispose?.();
    this.plugins.clear();
    this.listeners.clear();
  }
}
