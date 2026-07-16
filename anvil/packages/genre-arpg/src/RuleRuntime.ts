import type { Condition, Effect, StateMachineDef, TriggerDef } from "@anvil/schema";

export type ArpgQuestStatus = "inactive" | "active" | "complete";

export interface ArpgRuleContext {
  readonly areaId?: string;
  readonly entityAreas?: Readonly<Record<string, string>>;
  readonly state?: Readonly<Record<string, unknown>>;
  readonly hasItem?: (itemId: string, count: number) => boolean;
  readonly questStatus?: (questId: string) => ArpgQuestStatus;
  readonly applyEffect?: (effect: Effect, event: ArpgRuleEvent | null) => void;
  readonly emit?: (event: string, data: Readonly<Record<string, unknown>>) => void;
}

export interface ArpgRuleEvent {
  readonly name: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface ArpgRuleSnapshot {
  readonly timeMs: number;
  readonly flags: Readonly<Record<string, boolean>>;
  readonly counters: Readonly<Record<string, number>>;
  readonly machines: Readonly<Record<string, string>>;
  readonly firedTriggers: readonly string[];
  readonly transitions: readonly string[];
  readonly lastEvent: ArpgRuleEvent | null;
}

interface QueuedEvaluation {
  event: ArpgRuleEvent | null;
  context: ArpgRuleContext;
}

const MAX_EVALUATIONS_PER_DRAIN = 256;

/** Deterministic executor for Anvil's finite authoring rule language. */
export class ArpgRuleRuntime {
  private readonly triggers: Array<Readonly<TriggerDef>>;
  private readonly machines: Array<Readonly<StateMachineDef>>;
  private readonly flags = new Map<string, boolean>();
  private readonly counters = new Map<string, number>();
  private readonly machineStates = new Map<string, string>();
  private readonly fired = new Set<string>();
  private readonly lastFiredAt = new Map<string, number>();
  private readonly firedTriggers: string[] = [];
  private readonly transitions: string[] = [];
  private readonly queue: QueuedEvaluation[] = [];
  private draining = false;
  private initialized = false;
  private timeMs = 0;
  private lastEvent: ArpgRuleEvent | null = null;

  constructor(
    triggers: Readonly<Record<string, Readonly<TriggerDef>>> = {},
    machines: Readonly<Record<string, Readonly<StateMachineDef>>> = {},
  ) {
    this.triggers = Object.values(triggers).sort((a, b) => a.id.localeCompare(b.id));
    this.machines = Object.values(machines).sort((a, b) => a.id.localeCompare(b.id));
    for (const machine of this.machines) this.machineStates.set(machine.id, machine.initial);
  }

  dispatch(event: string, data: Readonly<Record<string, unknown>> = {}, context: ArpgRuleContext = {}): void {
    this.queue.push({ event: { name: event, data: clone(data) }, context });
    this.drain();
  }

  update(dtMs: number, context: ArpgRuleContext = {}): void {
    if (!Number.isFinite(dtMs) || dtMs < 0) throw new Error("ARPG rule dtMs must be a finite non-negative number");
    this.timeMs += dtMs;
    this.queue.push({ event: null, context });
    this.drain();
  }

  setFlag(key: string, value: boolean): void {
    this.flags.set(key, value);
  }

  flag(key: string): boolean {
    return this.flags.get(key) ?? false;
  }

  counter(key: string): number {
    return this.counters.get(key) ?? 0;
  }

  snapshot(): ArpgRuleSnapshot {
    return {
      timeMs: this.timeMs,
      flags: orderedObject(this.flags),
      counters: orderedObject(this.counters),
      machines: orderedObject(this.machineStates),
      firedTriggers: [...this.firedTriggers],
      transitions: [...this.transitions],
      lastEvent: this.lastEvent ? clone(this.lastEvent) : null,
    };
  }

  private drain(): void {
    if (this.draining) return;
    this.draining = true;
    try {
      let count = 0;
      while (this.queue.length) {
        count += 1;
        if (count > MAX_EVALUATIONS_PER_DRAIN) {
          this.queue.length = 0;
          throw new Error(`ARPG authored event cycle exceeded ${MAX_EVALUATIONS_PER_DRAIN} evaluations`);
        }
        const next = this.queue.shift()!;
        this.initialize(next.context);
        this.evaluate(next.event, next.context);
      }
    } finally {
      this.draining = false;
    }
  }

  private initialize(context: ArpgRuleContext): void {
    if (this.initialized) return;
    this.initialized = true;
    for (const machine of this.machines) {
      const state = machine.states.find((candidate) => candidate.id === machine.initial);
      if (state) this.executeAll(state.enter, null, context);
    }
  }

  private evaluate(event: ArpgRuleEvent | null, context: ArpgRuleContext): void {
    if (event) this.lastEvent = event;
    for (const trigger of this.triggers) {
      if (trigger.once && this.fired.has(trigger.id)) continue;
      const previous = this.lastFiredAt.get(trigger.id);
      if (previous !== undefined && this.timeMs - previous < trigger.cooldownMs) continue;
      const matches = this.matches(trigger.when, event, context);
      if (matches) {
        this.executeAll(trigger.then, event, context);
        this.fired.add(trigger.id);
        this.lastFiredAt.set(trigger.id, this.timeMs);
        this.firedTriggers.push(trigger.id);
      } else if (trigger.else) {
        this.executeAll(trigger.else, event, context);
      }
    }
    for (const machine of this.machines) this.transition(machine, event, context);
  }

  private transition(machine: Readonly<StateMachineDef>, event: ArpgRuleEvent | null, context: ArpgRuleContext): void {
    const currentId = this.machineStates.get(machine.id) ?? machine.initial;
    const current = machine.states.find((state) => state.id === currentId);
    if (!current) throw new Error(`ARPG machine '${machine.id}' has unknown runtime state '${currentId}'`);
    const selected = current.transitions.find((candidate) => this.matches(candidate.when, event, context));
    if (!selected) return;
    const next = machine.states.find((state) => state.id === selected.to);
    if (!next) throw new Error(`ARPG machine '${machine.id}' transitions to unknown state '${selected.to}'`);
    this.executeAll(current.exit, event, context);
    this.executeAll(selected.effects, event, context);
    this.machineStates.set(machine.id, next.id);
    this.transitions.push(`${machine.id}:${current.id}->${next.id}`);
    this.executeAll(next.enter, event, context);
  }

  private matches(condition: Condition, event: ArpgRuleEvent | null, context: ArpgRuleContext): boolean {
    switch (condition.op) {
      case "always": return true;
      case "all": return condition.conditions.every((child) => this.matches(child, event, context));
      case "any": return condition.conditions.some((child) => this.matches(child, event, context));
      case "not": return !this.matches(condition.condition, event, context);
      case "flag": return this.flag(condition.key) === condition.eq;
      case "event": return event?.name === condition.name;
      case "area": return condition.entity
        ? context.entityAreas?.[condition.entity] === condition.id
        : context.areaId === condition.id;
      case "has_item": return context.hasItem?.(condition.item, condition.count) ?? false;
      case "quest": return (context.questStatus?.(condition.id) ?? "inactive") === condition.status;
      case "compare": return compare(
        this.value(condition.left, event, context),
        condition.cmp,
        this.value(condition.right, event, context),
      );
    }
  }

  private value(value: string | number | boolean | null | { path: string }, event: ArpgRuleEvent | null, context: ArpgRuleContext): unknown {
    if (!value || typeof value !== "object" || !("path" in value)) return value;
    return readPath({
      event: event ? { name: event.name, ...event.data } : null,
      state: context.state ?? {},
      flags: Object.fromEntries(this.flags),
      counters: Object.fromEntries(this.counters),
    }, value.path);
  }

  private executeAll(effects: readonly Effect[], event: ArpgRuleEvent | null, context: ArpgRuleContext): void {
    for (const effect of effects) this.execute(effect, event, context);
  }

  private execute(effect: Effect, event: ArpgRuleEvent | null, context: ArpgRuleContext): void {
    if (effect.op === "set_flag") {
      this.flags.set(effect.key, effect.value);
      return;
    }
    if (effect.op === "add_counter") {
      this.counters.set(effect.key, this.counter(effect.key) + effect.amount);
      return;
    }
    if (effect.op === "emit") {
      const data = clone(effect.data ?? {});
      context.emit?.(effect.event, data);
      this.queue.push({ event: { name: effect.event, data }, context });
      return;
    }
    context.applyEffect?.(effect, event);
  }
}

function compare(left: unknown, op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte", right: unknown): boolean {
  if (op === "eq") return left === right;
  if (op === "neq") return left !== right;
  if (typeof left !== "number" || typeof right !== "number") return false;
  if (op === "gt") return left > right;
  if (op === "gte") return left >= right;
  if (op === "lt") return left < right;
  return left <= right;
}

function readPath(root: unknown, path: string): unknown {
  let cursor = root;
  for (const segment of path.split(".")) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function orderedObject<T>(map: ReadonlyMap<string, T>): Record<string, T> {
  return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
