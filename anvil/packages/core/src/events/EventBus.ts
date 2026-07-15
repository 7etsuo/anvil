export type EventHandler = (payload: unknown) => void;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  once(event: string, handler: EventHandler): void {
    const wrap: EventHandler = (payload) => {
      this.off(event, wrap);
      handler(payload);
    };
    this.on(event, wrap);
  }

  emit(event: string, payload?: unknown): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of [...set]) h(payload);
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }
}
