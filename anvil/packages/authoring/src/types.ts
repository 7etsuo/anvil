import type {
  AnvilError,
  GameIntent,
  GameYaml,
  StateMachineDef,
  TraitDef,
  TriggerDef,
} from "@anvil/schema";

export type CapabilityKind =
  | "core"
  | "genre"
  | "renderer"
  | "modifier"
  | "authoring"
  | "custom";

export interface CapabilityDescriptor {
  readonly id: string;
  readonly version: string;
  readonly kind: CapabilityKind;
  readonly summary: string;
  readonly provides: readonly string[];
  readonly contentKinds: readonly string[];
  readonly actions: readonly string[];
  readonly observePaths: readonly string[];
  readonly constraints: readonly string[];
  readonly docs?: string;
}

export interface ResolvedPrefab {
  readonly id: string;
  readonly parent?: string;
  readonly traits: readonly string[];
  readonly components: Readonly<Record<string, unknown>>;
}

export interface AnvilGameIR {
  readonly irVersion: 1;
  readonly schemaVersion: 2;
  readonly sourceHash: string;
  readonly manifest: Readonly<GameYaml>;
  readonly intent: Readonly<GameIntent>;
  readonly capabilities: readonly CapabilityDescriptor[];
  readonly traits: Readonly<Record<string, Readonly<TraitDef>>>;
  readonly prefabs: Readonly<Record<string, ResolvedPrefab>>;
  readonly triggers: Readonly<Record<string, Readonly<TriggerDef>>>;
  readonly machines: Readonly<Record<string, Readonly<StateMachineDef>>>;
  readonly content: Readonly<Record<string, unknown>>;
}

export type CompileResult =
  | { ok: true; ir: AnvilGameIR; warnings: AnvilError[] }
  | { ok: false; errors: AnvilError[] };

export interface MigrationChange {
  readonly path: string;
  readonly action: "create" | "update";
  readonly before?: string;
  readonly after: string;
}

export type MigrationResult =
  | {
      ok: true;
      root: string;
      fromVersion: 1 | 2;
      toVersion: 2;
      changed: boolean;
      written: boolean;
      changes: MigrationChange[];
    }
  | { ok: false; errors: AnvilError[] };
