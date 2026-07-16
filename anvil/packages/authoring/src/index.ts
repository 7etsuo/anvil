export type {
  AnvilGameIR,
  CapabilityDescriptor,
  CapabilityKind,
  CompileResult,
  MigrationChange,
  MigrationResult,
  ResolvedPrefab,
} from "./types.js";
export { capabilityCatalog, capabilitiesForGame } from "./capabilities.js";
export { canonicalJson, compileProject, deepMerge } from "./compiler.js";
export { migrateProject } from "./migrate.js";
