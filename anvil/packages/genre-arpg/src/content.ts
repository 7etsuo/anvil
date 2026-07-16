import type { ItemDef } from "@anvil/core";
import type { ActorDef } from "@anvil/genre-topdown2d";
import type { StateMachineDef, TraitDef, TriggerDef } from "@anvil/schema";

export interface ArpgCompiledIr {
  readonly sourceHash: string;
  readonly traits: Readonly<Record<string, Readonly<TraitDef>>>;
  readonly prefabs: Readonly<Record<string, {
    readonly id: string;
    readonly traits: readonly string[];
    readonly components: Readonly<Record<string, unknown>>;
  }>>;
  readonly triggers: Readonly<Record<string, Readonly<TriggerDef>>>;
  readonly machines: Readonly<Record<string, Readonly<StateMachineDef>>>;
  readonly content: Readonly<Record<string, unknown>>;
}

export interface ArpgActorDef extends ActorDef {
  prefab?: string;
  traits?: string[];
}

export interface ArpgLootTable {
  id: string;
  entries: Array<{ item: string; weight: number; min?: number; max?: number }>;
}

export interface MaterializedArpgContent<
  TArea extends { id: string } = { id: string },
  TProgression = unknown,
> {
  readonly sourceHash: string;
  readonly actors: Record<string, ArpgActorDef>;
  readonly areas: Record<string, TArea>;
  readonly items: Record<string, ItemDef>;
  readonly lootTables: Record<string, ArpgLootTable>;
  readonly progression: TProgression;
  readonly rules: {
    readonly triggers: Readonly<Record<string, Readonly<TriggerDef>>>;
    readonly machines: Readonly<Record<string, Readonly<StateMachineDef>>>;
  };
  readonly authoring: {
    readonly prefabs: Readonly<Record<string, { readonly traits: readonly string[] }>>;
    readonly actorPrefabs: Readonly<Record<string, string | null>>;
  };
  readonly raw: Readonly<Record<string, unknown>>;
}

/** Materialize canonical ARPG content without filesystem or Node dependencies. */
export function materializeArpgContent<
  TArea extends { id: string } = { id: string },
  TProgression = unknown,
>(ir: ArpgCompiledIr): MaterializedArpgContent<TArea, TProgression> {
  const actors: Record<string, ArpgActorDef> = {};
  const actorPrefabs: Record<string, string | null> = {};
  for (const [sourcePath, value] of contentEntries(ir.content, "actors/")) {
    const authored = requireRecord(value, sourcePath);
    const id = requireString(authored.id, `${sourcePath}/id`);
    const prefabId = optionalString(authored.prefab, `${sourcePath}/prefab`);
    let base: Record<string, unknown> = {};
    let traits: string[] = [];
    if (prefabId) {
      const prefab = ir.prefabs[prefabId];
      if (!prefab) throw new Error(`ARPG actor '${id}' references unknown prefab '${prefabId}' at ${sourcePath}`);
      const component = prefab.components.actor;
      if (component !== undefined) base = requireRecord(component, `prefab:${prefabId}/components/actor`);
      traits = [...prefab.traits];
    }
    const merged = deepMerge(base, authored);
    if (typeof merged.hp !== "number" || merged.hp <= 0) {
      throw new Error(`ARPG actor '${id}' requires positive numeric hp after prefab resolution`);
    }
    if (typeof merged.speed !== "number" || merged.speed < 0) {
      throw new Error(`ARPG actor '${id}' requires non-negative numeric speed after prefab resolution`);
    }
    actors[id] = {
      ...(merged as unknown as ActorDef),
      id,
      ...(prefabId ? { prefab: prefabId } : {}),
      ...(traits.length ? { traits } : {}),
    };
    actorPrefabs[id] = prefabId ?? null;
  }

  const progression = ir.content["progression.json"] as TProgression;
  return {
    sourceHash: ir.sourceHash,
    actors,
    areas: extractById<TArea>(ir.content, "areas/"),
    items: extractById<ItemDef>(ir.content, "items/"),
    lootTables: extractById<ArpgLootTable>(ir.content, "loot/"),
    progression,
    rules: { triggers: ir.triggers, machines: ir.machines },
    authoring: {
      prefabs: Object.fromEntries(
        Object.entries(ir.prefabs).map(([id, prefab]) => [id, { traits: [...prefab.traits] }]),
      ),
      actorPrefabs,
    },
    raw: ir.content,
  };
}

function extractById<T extends { id: string }>(content: Readonly<Record<string, unknown>>, prefix: string): Record<string, T> {
  const output: Record<string, T> = {};
  for (const [sourcePath, value] of contentEntries(content, prefix)) {
    const record = requireRecord(value, sourcePath);
    const id = requireString(record.id, `${sourcePath}/id`);
    output[id] = clone(record) as T;
  }
  return output;
}

function contentEntries(content: Readonly<Record<string, unknown>>, prefix: string): Array<[string, unknown]> {
  return Object.entries(content)
    .filter(([sourcePath]) => sourcePath.startsWith(prefix) && sourcePath.endsWith(".json"))
    .sort(([a], [b]) => a.localeCompare(b));
}

function requireRecord(value: unknown, at: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected object at ${at}`);
  }
  return clone(value as Record<string, unknown>);
}

function requireString(value: unknown, at: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Expected non-empty string at ${at}`);
  return value;
}

function optionalString(value: unknown, at: string): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, at);
}

function deepMerge(base: Readonly<Record<string, unknown>>, incoming: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const output: Record<string, unknown> = clone(base);
  for (const [key, next] of Object.entries(incoming)) {
    const previous = output[key];
    output[key] = isRecord(previous) && isRecord(next) ? deepMerge(previous, next) : clone(next);
  }
  return output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}
