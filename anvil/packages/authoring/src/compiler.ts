import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  type AnvilError,
  type PrefabDef,
  type StateMachineDef,
  type TraitDef,
  type TriggerDef,
  GameIntentSchema,
  GameYamlSchema,
  PrefabDefSchema,
  StateMachineDefSchema,
  TraitDefSchema,
  TriggerDefSchema,
  err,
  sortDiagnostics,
} from "@anvil/schema";
import yaml from "yaml";
import { capabilitiesForGame } from "./capabilities.js";
import type { AnvilGameIR, CompileResult, ResolvedPrefab } from "./types.js";

type SourceKind = "traits" | "prefabs" | "triggers" | "machines";

export function compileProject(root: string): CompileResult {
  const absoluteRoot = path.resolve(root);
  const errors: AnvilError[] = [];
  const warnings: AnvilError[] = [];

  if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) {
    return { ok: false, errors: [err("IO_ERROR", `Root does not exist: ${absoluteRoot}`, { path: absoluteRoot })] };
  }

  const manifestPath = path.join(absoluteRoot, "game.yaml");
  const rawManifest = readYaml(manifestPath, "SCHEMA_INVALID", errors);
  if (rawManifest === undefined) return { ok: false, errors: sortDiagnostics(errors) };
  const version = objectValue(rawManifest, "schemaVersion");
  if (version === 1 || version === undefined) {
    errors.push(
      err("MIGRATION_REQUIRED", "Anvil schema v1 projects cannot compile or launch in v2.", {
        path: "game.yaml/schemaVersion",
        actual: version ?? 1,
        expected: 2,
        hint: "Preview with: anvil migrate <path>. Apply with: anvil migrate <path> --write.",
        docs: "docs/design/specs/S-AUTHORING.md#2-version-boundary",
        fixes: [{ id: "migrate-v1-v2", title: "Run the built-in v1 to v2 migration", safe: true }],
      }),
    );
    return { ok: false, errors: sortDiagnostics(errors) };
  }
  if (version !== 2) {
    errors.push(
      err("SCHEMA_VERSION_UNSUPPORTED", `Unsupported Anvil schema version: ${String(version)}`, {
        path: "game.yaml/schemaVersion",
        actual: version,
        expected: 2,
        hint: "Install an Anvil release that supports this schema version.",
      }),
    );
    return { ok: false, errors: sortDiagnostics(errors) };
  }
  const parsedManifest = GameYamlSchema.safeParse(rawManifest);
  if (!parsedManifest.success) {
    appendZodErrors(errors, "SCHEMA_INVALID", "game.yaml", parsedManifest.error.issues);
    return { ok: false, errors: sortDiagnostics(errors) };
  }
  const manifest = parsedManifest.data;

  const intentPath = safeProjectPath(absoluteRoot, manifest.intent);
  if (!intentPath) {
    errors.push(err("INTENT_INVALID", "Intent path escapes the game root.", { path: "game.yaml/intent", actual: manifest.intent, expected: "A project-relative path" }));
    return { ok: false, errors: sortDiagnostics(errors) };
  }
  const rawIntent = readYaml(intentPath, "INTENT_INVALID", errors);
  if (rawIntent === undefined) return { ok: false, errors: sortDiagnostics(errors) };
  const parsedIntent = GameIntentSchema.safeParse(rawIntent);
  if (!parsedIntent.success) {
    appendZodErrors(errors, "INTENT_INVALID", manifest.intent, parsedIntent.error.issues);
    return { ok: false, errors: sortDiagnostics(errors) };
  }
  const intent = parsedIntent.data;

  const contentDir = safeProjectPath(absoluteRoot, manifest.contentRoot);
  if (!contentDir) {
    return { ok: false, errors: [err("SCHEMA_INVALID", "contentRoot escapes the game root", { path: "game.yaml/contentRoot" })] };
  }

  const content: Record<string, unknown> = {};
  const traits = new Map<string, TraitDef>();
  const prefabs = new Map<string, PrefabDef>();
  const triggers = new Map<string, TriggerDef>();
  const machines = new Map<string, StateMachineDef>();

  if (fs.existsSync(contentDir)) {
    for (const absoluteFile of walkJson(contentDir)) {
      const relative = path.relative(contentDir, absoluteFile).replace(/\\/g, "/");
      let raw: unknown;
      try {
        raw = JSON.parse(fs.readFileSync(absoluteFile, "utf8"));
      } catch (cause) {
        errors.push(err("SCHEMA_INVALID", `JSON parse error: ${errorMessage(cause)}`, { path: `${manifest.contentRoot}/${relative}` }));
        continue;
      }
      content[relative] = raw;
      const kind = sourceKind(relative);
      if (!kind) continue;
      const sourcePath = `${manifest.contentRoot}/${relative}`;
      if (kind === "traits") parseDefinition(TraitDefSchema, raw, sourcePath, traits, errors);
      if (kind === "prefabs") parseDefinition(PrefabDefSchema, raw, sourcePath, prefabs, errors);
      if (kind === "triggers") parseDefinition(TriggerDefSchema, raw, sourcePath, triggers, errors);
      if (kind === "machines") parseDefinition(StateMachineDefSchema, raw, sourcePath, machines, errors);
    }
  }

  if (errors.length) return { ok: false, errors: sortDiagnostics(errors) };
  const resolvedPrefabs = resolvePrefabs(prefabs, traits, errors);
  validateSpawnReferences(triggers, machines, resolvedPrefabs, errors);
  validateContentPrefabReferences(content, resolvedPrefabs, errors);
  if (errors.length) return { ok: false, errors: sortDiagnostics(errors) };

  const canonicalSource = {
    manifest,
    intent,
    content: orderedRecord(content),
  };
  const sourceHash = crypto.createHash("sha256").update(canonicalJson(canonicalSource)).digest("hex");
  const ir: AnvilGameIR = {
    irVersion: 1,
    schemaVersion: 2,
    sourceHash,
    manifest,
    intent,
    capabilities: capabilitiesForGame(manifest),
    traits: mapRecord(traits),
    prefabs: mapRecord(resolvedPrefabs),
    triggers: mapRecord(triggers),
    machines: mapRecord(machines),
    content: orderedRecord(content),
  };
  return { ok: true, ir: deepFreeze(ir), warnings: sortDiagnostics(warnings) };
}

function validateContentPrefabReferences(
  content: Readonly<Record<string, unknown>>,
  prefabs: ReadonlyMap<string, ResolvedPrefab>,
  errors: AnvilError[],
): void {
  for (const [sourcePath, value] of Object.entries(content)) {
    if (!sourcePath.startsWith("actors/") || !value || typeof value !== "object" || Array.isArray(value)) continue;
    const prefab = (value as Record<string, unknown>).prefab;
    if (prefab === undefined) continue;
    if (typeof prefab !== "string" || !prefabs.has(prefab)) {
      errors.push(err("REF_MISSING", `Unknown actor prefab: ${String(prefab)}`, {
        path: `content/${sourcePath}/prefab`,
        actual: prefab,
        expected: "A prefab id declared under content/prefabs",
      }));
    }
  }
}

function readYaml(file: string, code: "SCHEMA_INVALID" | "INTENT_INVALID", errors: AnvilError[]): unknown | undefined {
  if (!fs.existsSync(file)) {
    errors.push(err(code, `${path.basename(file)} missing`, { path: file, hint: code === "INTENT_INVALID" ? "Create game.spec.yaml or run anvil migrate." : "Run anvil new or create game.yaml." }));
    return undefined;
  }
  try {
    return yaml.parse(fs.readFileSync(file, "utf8"));
  } catch (cause) {
    errors.push(err(code, `YAML parse error: ${errorMessage(cause)}`, { path: file }));
    return undefined;
  }
}

function appendZodErrors(errors: AnvilError[], code: "SCHEMA_INVALID" | "INTENT_INVALID" | "COMPILE_FAILED", file: string, issues: readonly { path: PropertyKey[]; message: string }[]): void {
  for (const issue of issues) {
    errors.push(err(code, issue.message, { path: issue.path.length ? `${file}/${issue.path.join(".")}` : file, docs: "docs/design/specs/S-AUTHORING.md" }));
  }
}

function parseDefinition<T extends { id: string }>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false; error: { issues: readonly { path: PropertyKey[]; message: string }[] } } }, raw: unknown, sourcePath: string, target: Map<string, T>, errors: AnvilError[]): void {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    appendZodErrors(errors, "COMPILE_FAILED", sourcePath, parsed.error.issues);
    return;
  }
  if (target.has(parsed.data.id)) {
    errors.push(err("COMPILE_FAILED", `Duplicate authoring id: ${parsed.data.id}`, { path: sourcePath, actual: parsed.data.id, expected: "A unique id in this content kind" }));
    return;
  }
  target.set(parsed.data.id, parsed.data);
}

function resolvePrefabs(prefabs: Map<string, PrefabDef>, traits: Map<string, TraitDef>, errors: AnvilError[]): Map<string, ResolvedPrefab> {
  const resolved = new Map<string, ResolvedPrefab>();
  const visiting: string[] = [];

  const visit = (id: string): ResolvedPrefab | undefined => {
    const cached = resolved.get(id);
    if (cached) return cached;
    const cycleAt = visiting.indexOf(id);
    if (cycleAt >= 0) {
      const cycle = [...visiting.slice(cycleAt), id];
      errors.push(err("PREFAB_CYCLE", `Prefab inheritance cycle: ${cycle.join(" -> ")}`, { path: `content/prefabs/${id}`, actual: cycle, expected: "Acyclic single-parent inheritance" }));
      return undefined;
    }
    const source = prefabs.get(id);
    if (!source) return undefined;
    visiting.push(id);
    let components: Record<string, unknown> = {};
    let selectedTraits: string[] = [];
    if (source.parent) {
      const parent = prefabs.get(source.parent);
      if (!parent) {
        errors.push(err("REF_MISSING", `Unknown parent prefab: ${source.parent}`, { path: `content/prefabs/${id}/parent`, actual: source.parent }));
      } else {
        const parentResolved = visit(parent.id);
        if (parentResolved) {
          components = deepMerge(components, parentResolved.components);
          selectedTraits = [...parentResolved.traits];
        }
      }
    }
    for (const traitId of source.traits) {
      const trait = traits.get(traitId);
      if (!trait) {
        errors.push(err("REF_MISSING", `Unknown trait: ${traitId}`, { path: `content/prefabs/${id}/traits`, actual: traitId }));
        continue;
      }
      if (!selectedTraits.includes(traitId)) selectedTraits.push(traitId);
      components = deepMerge(components, trait.components);
    }
    const selectedSet = new Set(selectedTraits);
    for (const traitId of selectedTraits) {
      const trait = traits.get(traitId);
      if (!trait) continue;
      for (const required of trait.requires) {
        if (!selectedSet.has(required)) {
          errors.push(err("PREFAB_CONFLICT", `Trait '${traitId}' requires '${required}'.`, { path: `content/prefabs/${id}/traits`, actual: selectedTraits, expected: `Include trait '${required}'` }));
        }
      }
      for (const conflict of trait.conflicts) {
        if (selectedSet.has(conflict)) {
          errors.push(err("PREFAB_CONFLICT", `Trait '${traitId}' conflicts with '${conflict}'.`, { path: `content/prefabs/${id}/traits`, actual: selectedTraits, expected: "Remove one conflicting trait" }));
        }
      }
    }
    components = deepMerge(components, source.components);
    visiting.pop();
    const value: ResolvedPrefab = { id, ...(source.parent ? { parent: source.parent } : {}), traits: selectedTraits, components };
    resolved.set(id, value);
    return value;
  };

  for (const id of [...prefabs.keys()].sort()) visit(id);
  return resolved;
}

function validateSpawnReferences(triggers: Map<string, TriggerDef>, machines: Map<string, StateMachineDef>, prefabs: Map<string, ResolvedPrefab>, errors: AnvilError[]): void {
  const checkEffects = (effects: readonly { op: string; prefab?: string }[], sourcePath: string) => {
    effects.forEach((effect, index) => {
      if (effect.op === "spawn" && effect.prefab && !prefabs.has(effect.prefab)) {
        errors.push(err("REF_MISSING", `Unknown spawn prefab: ${effect.prefab}`, { path: `${sourcePath}/${index}/prefab`, actual: effect.prefab }));
      }
    });
  };
  for (const trigger of triggers.values()) {
    checkEffects(trigger.then, `content/triggers/${trigger.id}/then`);
    checkEffects(trigger.else ?? [], `content/triggers/${trigger.id}/else`);
  }
  for (const machine of machines.values()) {
    machine.states.forEach((state, stateIndex) => {
      checkEffects(state.enter, `content/machines/${machine.id}/states/${stateIndex}/enter`);
      checkEffects(state.exit, `content/machines/${machine.id}/states/${stateIndex}/exit`);
      state.transitions.forEach((transition, transitionIndex) => checkEffects(transition.effects, `content/machines/${machine.id}/states/${stateIndex}/transitions/${transitionIndex}/effects`));
    });
  }
}

export function deepMerge(base: Readonly<Record<string, unknown>>, incoming: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const output: Record<string, unknown> = cloneJson(base);
  for (const key of Object.keys(incoming)) {
    const next = incoming[key];
    const previous = output[key];
    if (isPlainObject(previous) && isPlainObject(next)) output[key] = deepMerge(previous, next);
    else if (isKeyedArray(previous) && isKeyedArray(next)) output[key] = mergeKeyedArrays(previous, next);
    else output[key] = cloneJson(next);
  }
  return output;
}

function mergeKeyedArrays(base: readonly Record<string, unknown>[], incoming: readonly Record<string, unknown>[]): Record<string, unknown>[] {
  const output = base.map((value) => cloneJson(value));
  const indices = new Map(output.map((value, index) => [value.id as string, index]));
  for (const value of incoming) {
    const index = indices.get(value.id as string);
    if (index === undefined) {
      indices.set(value.id as string, output.length);
      output.push(cloneJson(value));
    } else {
      output[index] = deepMerge(output[index]!, value);
    }
  }
  return output;
}

function isKeyedArray(value: unknown): value is Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const ids = new Set<string>();
  for (const item of value) {
    if (!isPlainObject(item) || typeof item.id !== "string" || ids.has(item.id)) return false;
    ids.add(item.id);
  }
  return true;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => cloneJson(item)) as T;
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneJson(item)])) as T;
  return value;
}

function sourceKind(relative: string): SourceKind | null {
  const first = relative.split("/")[0];
  return first === "traits" || first === "prefabs" || first === "triggers" || first === "machines" ? first : null;
}

function walkJson(directory: string): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith(".")) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) out.push(absolute);
    }
  };
  walk(directory);
  return out;
}

function safeProjectPath(root: string, relative: string): string | null {
  const resolved = path.resolve(root, relative);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

function objectValue(value: unknown, key: string): unknown {
  return isPlainObject(value) ? value[key] : undefined;
}

function mapRecord<T>(source: Map<string, T>): Record<string, T> {
  return Object.fromEntries([...source.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function orderedRecord(source: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(source).sort().map((key) => [key, source[key]]));
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
