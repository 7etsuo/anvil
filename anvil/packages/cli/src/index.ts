#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AGENT_TOOL_CATALOG,
  ANVIL_VERSION,
  createGame,
  listMissingAssets,
  observe,
  runTests,
  validateProject,
} from "@anvil/core";
import { listRecipes, showRecipe } from "@anvil/recipes";
import { loadModulesForRoot } from "./loadModules.js";

const VERSION = ANVIL_VERSION;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === "help" || cmd === "--help") {
    printHelp();
    process.exit(0);
  }

  if (cmd === "version" || cmd === "--version" || cmd === "-v") {
    console.log(VERSION);
    process.exit(0);
  }

  try {
    switch (cmd) {
      case "new":
        await cmdNew(args.slice(1));
        break;
      case "validate":
        await cmdValidate(args.slice(1));
        break;
      case "test":
        await cmdTest(args.slice(1));
        break;
      case "observe":
        await cmdObserve(args.slice(1));
        break;
      case "dev":
        await cmdDev(args.slice(1));
        break;
      case "assets":
        if (args[1] === "missing") await cmdAssetsMissing(args.slice(2));
        else usageError("Unknown assets subcommand");
        break;
      case "recipe":
        if (args[1] === "list") cmdRecipeList();
        else if (args[1] === "show" && args[2]) cmdRecipeShow(args[2]);
        else usageError("recipe list | recipe show <id>");
        break;
      case "build":
        await cmdBuild(args.slice(1));
        break;
      case "tools":
        cmdTools(args.slice(1));
        break;
      case "doctor":
        await cmdDoctor(args.slice(1));
        break;
      default:
        usageError(`Unknown command: ${cmd}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify(
        { ok: false, errors: [{ code: "INTERNAL", message: msg }] },
        null,
        2,
      ),
    );
    process.exit(3);
  }
}

function printHelp(): void {
  console.log(`anvil ${VERSION}
Commands:
  version
  new <name> [--genre none|card|topdown2d|vn|shmup|fps2] [--root <dir>]
  validate [path] [--json]
  test [path] [--json] [--seed N] [--strict-assets]
  observe [--root path] [--json] [--shot]
  dev [path] [--port N]
  build [path] [--out dir]
  assets missing [path] [--json]
  recipe list | recipe show <id>
  tools [--json]
  doctor [path] [--json]
`);
}

function usageError(msg: string): never {
  console.error(JSON.stringify({
    ok: false,
    errors: [{ code: "INVALID_ARGS", message: msg }],
  }));
  process.exit(2);
}

function getFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return undefined;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function projectRoot(args: string[]): string {
  const root = getFlag(args, "--root");
  if (root) return path.resolve(root);
  const pos = args.find((a) => !a.startsWith("-"));
  return path.resolve(pos ?? process.cwd());
}

async function cmdNew(args: string[]): Promise<void> {
  const name = args.find((a) => !a.startsWith("-") && a !== "none");
  if (!name) usageError("anvil new <name> required");
  const genre = getFlag(args, "--genre") ?? "none";
  const supported = [
    "none",
    "card",
    "topdown2d",
    "vn",
    "shmup",
    "fps2",
  ] as const;
  if (!(supported as readonly string[]).includes(genre)) {
    usageError(
      `Genre '${genre}' not available yet (supported: ${supported.join(", ")})`,
    );
  }
  const base = getFlag(args, "--root")
    ? path.resolve(getFlag(args, "--root")!)
    : path.resolve(process.cwd(), name!);

  const genreTemplate: Record<string, string> = {
    card: "card-starter",
    topdown2d: "topdown-starter",
    vn: "vn-starter",
    shmup: "shmup-starter",
    fps2: "fps2-starter",
  };
  const templateName = genreTemplate[genre];
  if (templateName) {
    const starterPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      `../../../templates/${templateName}`,
    );
    if (fs.existsSync(starterPath)) {
      copyDir(starterPath, base);
      const gy = path.join(base, "game.yaml");
      let text = fs.readFileSync(gy, "utf8");
      const id = name!.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
      text = text.replace(/^id:.*$/m, `id: ${id}`);
      text = text.replace(/^title:.*$/m, `title: ${name}`);
      fs.writeFileSync(gy, text);
      console.log(base);
      return;
    }
  }

  fs.mkdirSync(base, { recursive: true });
  fs.mkdirSync(path.join(base, "content"), { recursive: true });
  fs.mkdirSync(path.join(base, "assets"), { recursive: true });
  fs.mkdirSync(path.join(base, "tests"), { recursive: true });
  const id = name!.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  fs.writeFileSync(
    path.join(base, "game.yaml"),
    `id: ${id}
title: ${name}
genre: none
modules: []
entryScene: main
seed: 1
schemaVersion: 1
`,
  );
  fs.writeFileSync(
    path.join(base, "tests", "smoke.json"),
    JSON.stringify(
      {
        id: "smoke",
        seed: 1,
        maxTicks: 10,
        steps: [
          { tick: 0, assert: { path: "scene", eq: "main" } },
          { tick: 1, assert: { path: "tick", gte: 0 } },
        ],
      },
      null,
      2,
    ),
  );
  console.log(base);
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

async function cmdValidate(args: string[]): Promise<void> {
  const root = projectRoot(args);
  const result = await validateProject(root);
  if (hasFlag(args, "--json") || true) {
    console.log(JSON.stringify(result, null, 2));
  }
  process.exit(result.ok ? 0 : 1);
}

async function cmdTest(args: string[]): Promise<void> {
  const root = projectRoot(args);
  const seed = getFlag(args, "--seed");
  const modules = await loadModulesForRoot(root);
  const report = await runTests(root, {
    seed: seed ? Number(seed) : undefined,
    strictAssets: hasFlag(args, "--strict-assets"),
    modules,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

async function cmdObserve(args: string[]): Promise<void> {
  const root = projectRoot(args);
  const modules = await loadModulesForRoot(root);
  const handle = await createGame({ root, headless: true, modules });
  handle.tick(1 / 60);
  const snap = await observe(handle, { shot: hasFlag(args, "--shot") });
  console.log(JSON.stringify(snap, null, 2));
  if (hasFlag(args, "--shot") && snap.screenshot) {
    console.error(`screenshot written: ${snap.screenshot}`);
  }
  handle.dispose();
}

function cmdRecipeList(): void {
  const ids = listRecipes();
  if (ids.length === 0) console.log("(no recipes)");
  else ids.forEach((id) => console.log(id));
}

function cmdRecipeShow(id: string): void {
  const body = showRecipe(id);
  if (!body) {
    usageError(`Unknown recipe: ${id}`);
  }
  console.log(body);
}

async function cmdDev(args: string[]): Promise<void> {
  const root = projectRoot(args);
  const v = await validateProject(root);
  if (!v.ok) {
    console.error(JSON.stringify(v, null, 2));
    process.exit(1);
  }

  const viteConfig = path.join(root, "vite.config.ts");
  const hasVite = fs.existsSync(viteConfig) || fs.existsSync(path.join(root, "vite.config.js"));
  const port = getFlag(args, "--port") ?? "5173";

  if (hasVite) {
    const { spawn } = await import("node:child_process");
    console.log(`Anvil dev — starting Vite for ${root}`);
    const child = spawn(
      "pnpm",
      ["exec", "vite", "--config", viteConfig, "--port", port],
      {
        cwd: root,
        stdio: "inherit",
        shell: process.platform === "win32",
      },
    );
    child.on("exit", (code) => process.exit(code ?? 0));
    return;
  }

  // Fallback: headless smoke when no Vite project
  console.log(`Anvil dev (headless) — no vite.config in ${root}`);
  const handle = await createGame({ root, headless: true });
  for (let i = 0; i < 60; i++) handle.tick(1 / 60);
  const snap = await observe(handle);
  console.log(
    `scene=${snap.scene} tick=${snap.tick} entities=${snap.entities.length}`,
  );
  handle.dispose();
}

async function cmdAssetsMissing(args: string[]): Promise<void> {
  const root = projectRoot(args);
  const modules = await loadModulesForRoot(root);
  const handle = await createGame({ root, headless: true, modules });
  const missing = listMissingAssets(
    handle.root,
    handle.game.contentRoot,
    handle.game.assetsRoot,
    handle.assets,
  );
  if (hasFlag(args, "--json")) console.log(JSON.stringify(missing));
  else {
    if (missing.length === 0) console.log("(none)");
    else missing.forEach((m) => console.log(m));
  }
  handle.dispose();
  process.exit(0);
}

/** Self-describing ACI for coding agents (SWE-agent: small explicit tool surface). */
function cmdTools(args: string[]): void {
  const payload = {
    ok: true,
    anvilVersion: VERSION,
    tools: AGENT_TOOL_CATALOG,
    agentLoop: [
      "validate",
      "edit content JSON",
      "test",
      "on fail: observe (use summary + diff)",
      "fix",
      "re-test",
    ],
    notes: [
      "Prefer structured AgentAction via agentStep() over raw KeyW.",
      "Keep prompts on observe.summary / observeDiff — not full dumps.",
      "Do not import phaser from game content; use Anvil APIs.",
    ],
  };
  console.log(JSON.stringify(payload, null, hasFlag(args, "--json") ? 0 : 2));
}

/** One-shot health check for agents. */
async function cmdDoctor(args: string[]): Promise<void> {
  const root = projectRoot(args);
  const v = await validateProject(root);
  let testOk: boolean | null = null;
  let testSummary: unknown = null;
  if (v.ok) {
    try {
      const modules = await loadModulesForRoot(root);
      const report = await runTests(root, {
        modules,
        seed: getFlag(args, "--seed")
          ? Number(getFlag(args, "--seed"))
          : undefined,
      });
      testOk = report.ok;
      testSummary = {
        ok: report.ok,
        passed: report.results.filter((r) => r.pass).length,
        failed: report.results.filter((r) => !r.pass).length,
        total: report.results.length,
        failures: report.results
          .filter((r) => !r.pass)
          .map((r) => ({
            id: r.id,
            code: r.error?.code,
            message: r.error?.message,
            path: r.error?.path,
          })),
      };
    } catch (e) {
      testOk = false;
      testSummary = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
  const out = {
    ok: v.ok && testOk === true,
    anvilVersion: VERSION,
    root,
    validate: v,
    test: testSummary,
    next:
      !v.ok
        ? "Fix validate errors, then re-run doctor"
        : testOk
          ? "Healthy — iterate with content edits + anvil test"
          : "Run anvil observe --root <path> --json and read summary",
  };
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
}

/**
 * Static export (S-CLI / M6).
 * - Projects with vite.config: `vite build` → `--out` (default dist/)
 * - Otherwise: data package (game.yaml + content + assets + minimal index.html)
 */
async function cmdBuild(args: string[]): Promise<void> {
  const root = projectRoot(args);
  const outFlag = getFlag(args, "--out");
  const out = path.resolve(outFlag ?? path.join(root, "dist"));

  // Refuse escaping game root when --out is relative weirdness: still allow absolute outs
  const v = await validateProject(root);
  if (!v.ok) {
    console.error(JSON.stringify(v, null, 2));
    process.exit(1);
  }

  const viteConfigTs = path.join(root, "vite.config.ts");
  const viteConfigJs = path.join(root, "vite.config.js");
  const hasVite = fs.existsSync(viteConfigTs) || fs.existsSync(viteConfigJs);

  fs.mkdirSync(out, { recursive: true });

  if (hasVite) {
    const { spawnSync } = await import("node:child_process");
    const config = fs.existsSync(viteConfigTs) ? viteConfigTs : viteConfigJs;
    const r = spawnSync(
      "pnpm",
      [
        "exec",
        "vite",
        "build",
        "--config",
        config,
        "--outDir",
        out,
        "--emptyOutDir",
      ],
      {
        cwd: root,
        encoding: "utf8",
        shell: process.platform === "win32",
      },
    );
    if (r.status !== 0) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            errors: [
              {
                code: "INTERNAL",
                message: r.stderr || r.stdout || "vite build failed",
                path: root,
                hint: "Ensure vite is installed and vite.config builds cleanly",
              },
            ],
          },
          null,
          2,
        ),
      );
      process.exit(r.status === 2 ? 2 : 3);
    }
  } else {
    emitDataPackage(root, out);
  }

  // Always ensure data snapshot alongside web build
  const dataDir = path.join(out, "anvil-data");
  emitDataPackage(root, dataDir, { skipIndex: hasVite });

  console.log(
    JSON.stringify(
      {
        ok: true,
        out,
        mode: hasVite ? "vite" : "data",
      },
      null,
      2,
    ),
  );
}

function emitDataPackage(
  root: string,
  out: string,
  opts: { skipIndex?: boolean } = {},
): void {
  fs.mkdirSync(out, { recursive: true });
  const gy = path.join(root, "game.yaml");
  if (fs.existsSync(gy)) {
    fs.copyFileSync(gy, path.join(out, "game.yaml"));
  }
  for (const dir of ["content", "assets", "tests"]) {
    const src = path.join(root, dir);
    if (fs.existsSync(src)) copyDir(src, path.join(out, dir));
  }
  if (!opts.skipIndex) {
    let title = "Anvil game";
    let id = "game";
    let genre = "none";
    try {
      const text = fs.readFileSync(path.join(root, "game.yaml"), "utf8");
      const t = text.match(/^title:\s*(.+)$/m);
      const i = text.match(/^id:\s*(.+)$/m);
      const g = text.match(/^genre:\s*(.+)$/m);
      if (t) title = t[1]!.trim();
      if (i) id = i[1]!.trim();
      if (g) genre = g[1]!.trim();
    } catch {
      /* ignore */
    }
    fs.writeFileSync(
      path.join(out, "index.html"),
      `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #12121a; color: #e8e8f0; margin: 2rem; }
    code { background: #2a2a3a; padding: 0.1em 0.35em; border-radius: 4px; }
    a { color: #8ab4ff; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>Anvil static data package (<code>${escapeHtml(id)}</code>, genre <code>${escapeHtml(genre)}</code>).</p>
  <p>Headless: <code>anvil test .</code> · Browser shell: add <code>vite.config.ts</code> then <code>anvil build</code> / <code>anvil dev</code>.</p>
  <p>This folder includes <code>game.yaml</code>, <code>content/</code>, <code>assets/</code>, <code>tests/</code>.</p>
</body>
</html>
`,
    );
  }
  fs.writeFileSync(
    path.join(out, "anvil-build.json"),
    JSON.stringify(
      {
        anvilVersion: VERSION,
        builtAt: new Date().toISOString(),
        root: path.basename(root),
      },
      null,
      2,
    ),
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main();
