import path from "node:path";
import type { AnvilError } from "@anvil/schema";
import { compileProject } from "./compiler.js";
import type { AnvilGameIR } from "./types.js";

export const ANVIL_IR_MODULE_ID = "virtual:anvil-game-ir";
const RESOLVED_IR_MODULE_ID = `\0${ANVIL_IR_MODULE_ID}`;

export interface AnvilIrPluginOptions {
  /** Absolute or configuration-relative game root. Defaults to process.cwd(). */
  root?: string;
}

/** Minimal structural Vite plugin type; avoids making Vite a runtime dependency. */
export interface AnvilIrVitePlugin {
  readonly name: string;
  readonly enforce: "pre";
  buildStart(): void;
  resolveId(id: string): string | undefined;
  load(id: string): string | undefined;
  configureServer(server: {
    watcher: { add(paths: string[]): void };
    moduleGraph: {
      getModuleById(id: string): unknown;
      invalidateModule(module: unknown): void;
    };
  }): void;
  handleHotUpdate(context: { file: string }): void;
}

/** Compile schema-v2 authoring data once and inject immutable IR into Vite. */
export function anvilGameIr(options: AnvilIrPluginOptions = {}): AnvilIrVitePlugin {
  const root = path.resolve(options.root ?? process.cwd());
  let code = "";
  let server: Parameters<AnvilIrVitePlugin["configureServer"]>[0] | undefined;

  const compile = (): void => {
    const result = compileProject(root);
    if (!result.ok) throw new Error(formatDiagnostics(result.errors));
    code = serializeIr(result.ir);
  };

  return {
    name: "anvil-game-ir",
    enforce: "pre",
    buildStart: compile,
    resolveId(id) {
      return id === ANVIL_IR_MODULE_ID ? RESOLVED_IR_MODULE_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_IR_MODULE_ID) return undefined;
      if (!code) compile();
      return code;
    },
    configureServer(nextServer) {
      server = nextServer;
      server.watcher.add([
        path.join(root, "game.yaml"),
        path.join(root, "game.spec.yaml"),
        path.join(root, "content"),
      ]);
    },
    handleHotUpdate(context) {
      if (!isAuthoringSource(root, context.file)) return;
      compile();
      const module = server?.moduleGraph.getModuleById(RESOLVED_IR_MODULE_ID);
      if (module) server?.moduleGraph.invalidateModule(module);
    },
  };
}

export function serializeIr(ir: AnvilGameIR): string {
  return [
    "const deepFreeze = (value) => {",
    "  if (value && typeof value === 'object' && !Object.isFrozen(value)) {",
    "    Object.freeze(value);",
    "    for (const nested of Object.values(value)) deepFreeze(nested);",
    "  }",
    "  return value;",
    "};",
    `const ir = deepFreeze(${JSON.stringify(ir)});`,
    "export default ir;",
  ].join("\n");
}

function isAuthoringSource(root: string, file: string): boolean {
  const relative = path.relative(root, path.resolve(file)).replace(/\\/g, "/");
  return relative === "game.yaml" || relative === "game.spec.yaml" || relative.startsWith("content/");
}

function formatDiagnostics(errors: readonly AnvilError[]): string {
  const lines = ["Anvil IR compilation failed:"];
  for (const error of errors) {
    const at = error.path ? ` (${error.path})` : "";
    lines.push(`- ${error.code}${at}: ${error.message}`);
    if (error.hint) lines.push(`  hint: ${error.hint}`);
  }
  return lines.join("\n");
}
