import type { ZoneGraphDef, ZoneGraphState, ZoneNode } from "./types.js";

/**
 * Room / zone graph for multi-area games (dungeons, overworld hubs).
 * Does not load maps itself — games bind `mapId` / content when `current` changes.
 */
export class ZoneGraph {
  private byId = new Map<string, ZoneNode>();
  state: ZoneGraphState;

  constructor(def: ZoneGraphDef) {
    for (const n of def.nodes) this.byId.set(n.id, n);
    if (!this.byId.has(def.start)) {
      throw new Error(`ZoneGraph start unknown: ${def.start}`);
    }
    this.state = {
      current: def.start,
      visited: [def.start],
      cleared: [],
    };
  }

  current(): ZoneNode {
    return this.byId.get(this.state.current)!;
  }

  node(id: string): ZoneNode | undefined {
    return this.byId.get(id);
  }

  markCleared(zoneId = this.state.current): void {
    if (!this.state.cleared.includes(zoneId)) {
      this.state.cleared.push(zoneId);
    }
  }

  isCleared(zoneId: string): boolean {
    return this.state.cleared.includes(zoneId);
  }

  /**
   * Travel via named exit (e.g. "east", "door_a").
   * Returns new zone id or null if blocked/missing.
   */
  travel(
    exitKey: string,
    opts?: { force?: boolean },
  ): { ok: boolean; zoneId?: string; error?: string } {
    const here = this.current();
    const target = here.exits[exitKey];
    if (!target) return { ok: false, error: "no_exit" };
    if (!this.byId.has(target)) return { ok: false, error: "bad_target" };

    const needsClear = here.requireClear?.includes(exitKey);
    if (needsClear && !opts?.force && !this.isCleared(here.id)) {
      return { ok: false, error: "require_clear" };
    }

    this.state.current = target;
    if (!this.state.visited.includes(target)) {
      this.state.visited.push(target);
    }
    return { ok: true, zoneId: target };
  }

  /** List available exit keys from current zone. */
  exits(): string[] {
    return Object.keys(this.current().exits);
  }

  toJSON(): ZoneGraphState {
    return {
      current: this.state.current,
      visited: [...this.state.visited],
      cleared: [...this.state.cleared],
    };
  }

  loadJSON(state: ZoneGraphState): void {
    if (!this.byId.has(state.current)) {
      throw new Error(`ZoneGraph load unknown current: ${state.current}`);
    }
    this.state = {
      current: state.current,
      visited: [...state.visited],
      cleared: [...state.cleared],
    };
  }
}
