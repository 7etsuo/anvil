#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  createGame,
  listMissingAssets,
  observe,
  runTests,
  validateProject,
} from "@anvil/core";

const VERSION = "0.1.0";

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
      default:
        usageError(`Unknown command: ${cmd}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({ ok: false, errors: [{ code: "INTERNAL", message: msg }] }, null, 2));
    process.exit(3);
  }
}

function printHelp(): void {
  console.log(`anvil ${VERSION}
Commands:
  version
  new <name> [--genre none|card|...] [--root <dir>]
  validate [path] [--json]
  test [path] [--json] [--seed N] [--strict-assets]
  observe [--root path] [--json] [--shot]
  dev [path]
  assets missing [path] [--json]
  observe --shot writes artifacts/observe.png
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
  if (genre !== "none") {
    usageError(`Genre '${genre}' not available until later milestone (M1: none only)`);
  }
  const base = getFlag(args, "--root")
    ? path.resolve(getFlag(args, "--root")!)
    : path.resolve(process.cwd(), name!);
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
  const report = await runTests(root, {
    seed: seed ? Number(seed) : undefined,
    strictAssets: hasFlag(args, "--strict-assets"),
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

async function cmdObserve(args: string[]): Promise<void> {
  const root = projectRoot(args);
  const handle = await createGame({ root, headless: true });
  handle.tick(1 / 60);
  const snap = await observe(handle, { shot: hasFlag(args, "--shot") });
  console.log(JSON.stringify(snap, null, 2));
  if (hasFlag(args, "--shot") && snap.screenshot) {
    console.error(`screenshot written: ${snap.screenshot}`);
  }
  handle.dispose();
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
  const handle = await createGame({ root, headless: true });
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

main();
