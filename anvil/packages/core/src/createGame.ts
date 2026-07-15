import fs from "node:fs";
import path from "node:path";
import {
  type GameYaml,
  GameYamlSchema,
  err,
  type AnvilError,
} from "@anvil/schema";
import yaml from "yaml";
import { ANVIL_VERSION, Kernel } from "./kernel/Kernel.js";
import type { GenreModule } from "./modules/ModuleRegistry.js";
import type { RenderFacade } from "./render/RenderFacade.js";
import { NullRenderFacade } from "./render/RenderFacade.js";

export interface CreateGameOptions {
  root: string;
  headless?: boolean;
  seed?: number;
  renderer?: RenderFacade;
  maxDtSteps?: number;
  fixedDt?: number;
  modules?: GenreModule[];
  /** Skip filesystem root check (browser). Provide gameYaml. */
  browser?: boolean;
  /** Pre-parsed game descriptor (browser or tests). */
  gameYaml?: GameYaml;
}

export interface GameHandle {
  readonly world: Kernel["world"];
  readonly scenes: Kernel["scenes"];
  readonly events: Kernel["events"];
  readonly input: Kernel["input"];
  readonly assets: Kernel["assets"];
  readonly modules: Kernel["modules"];
  /** First-class engine services */
  readonly audio: Kernel["audio"];
  readonly cinema: Kernel["cinema"];
  readonly particles: Kernel["particles"];
  readonly quests: Kernel["quests"];
  readonly plugins: Kernel["plugins"];
  readonly ui: Kernel["ui"];
  readonly camera: Kernel["camera"];
  readonly abilities: Kernel["abilities"];
  readonly kernel: Kernel;
  readonly game: GameYaml;
  readonly root: string;
  readonly version: string;
  tick(dtWallSeconds: number): void;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  getSeed(): number;
  getTime(): number;
  getTick(): number;
  dispose(): void;
}

export async function createGame(
  opts: CreateGameOptions,
): Promise<GameHandle> {
  const root = opts.browser ? opts.root : path.resolve(opts.root);

  let game: GameYaml;
  if (opts.gameYaml) {
    const parsed = GameYamlSchema.safeParse(opts.gameYaml);
    if (!parsed.success) {
      const ae: AnvilError = err(
        "SCHEMA_INVALID",
        parsed.error.errors.map((x) => x.message).join("; "),
        { hint: "See specs/S-SCHEMA.md" },
      );
      throw Object.assign(new Error(ae.message), { anvilError: ae });
    }
    game = parsed.data;
  } else {
    if (!opts.browser) {
      if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
        throw Object.assign(new Error(`Game root not found: ${root}`), {
          anvilError: err("IO_ERROR", `Game root not found: ${root}`, {
            path: root,
          }),
        });
      }
    }
    const yamlPath = path.join(root, "game.yaml");
    if (!fs.existsSync(yamlPath)) {
      throw Object.assign(new Error("game.yaml missing"), {
        anvilError: err("IO_ERROR", "game.yaml missing", { path: yamlPath }),
      });
    }
    let raw: unknown;
    try {
      raw = yaml.parse(fs.readFileSync(yamlPath, "utf8"));
    } catch (e) {
      throw Object.assign(new Error("Failed to parse game.yaml"), {
        anvilError: err("SCHEMA_INVALID", String(e), { path: yamlPath }),
      });
    }
    const parsed = GameYamlSchema.safeParse(raw);
    if (!parsed.success) {
      const ae: AnvilError = err(
        "SCHEMA_INVALID",
        parsed.error.errors.map((x) => x.message).join("; "),
        { path: yamlPath, hint: "See specs/S-SCHEMA.md" },
      );
      throw Object.assign(new Error(ae.message), { anvilError: ae });
    }
    game = parsed.data;
  }

  const seed = opts.seed ?? game.seed ?? 1;
  const headless = opts.headless ?? true;
  const renderer = opts.renderer ?? new NullRenderFacade();
  void headless;

  const kernel = new Kernel({
    gameRoot: root,
    assetsRoot: game.assetsRoot,
    seed,
    fixedDt: opts.fixedDt,
    maxDtSteps: opts.maxDtSteps,
    renderer,
    browser: opts.browser ?? false,
  });

  // Only init if the host has not already attached a canvas (browser games)
  const maybeCanvas = (renderer as unknown as { getCanvas?: () => unknown })
    .getCanvas?.();
  if (!maybeCanvas) {
    await renderer.init(800, 600);
  }

  // Browser presentation owns the canvas — Kernel must not clear/draw over it.
  if (opts.browser) {
    kernel.setSkipDefaultDraw(true);
  }

  // Built-in empty main scene
  kernel.registerScene("main", () => ({
    update() {},
  }));

  for (const mod of opts.modules ?? []) {
    kernel.registerModule(mod);
  }

  // Load audio cue table from content/audio.json (node)
  if (!opts.browser) {
    kernel.audio.loadCuesFromFile(root, game.contentRoot);
  }

  try {
    if (!kernel.scenes.current()) {
      // ensure entry scene registered — main always is
      kernel.scenes.replace(game.entryScene);
    }
  } catch (e) {
    kernel.dispose();
    throw Object.assign(new Error(String(e)), {
      anvilError: err("LAUNCH_FAIL", String(e), {
        path: game.entryScene,
        hint: "Register entryScene via modules or use main",
      }),
    });
  }

  return {
    world: kernel.world,
    scenes: kernel.scenes,
    events: kernel.events,
    input: kernel.input,
    assets: kernel.assets,
    modules: kernel.modules,
    audio: kernel.audio,
    cinema: kernel.cinema,
    particles: kernel.particles,
    quests: kernel.quests,
    plugins: kernel.plugins,
    ui: kernel.ui,
    camera: kernel.camera,
    abilities: kernel.abilities,
    kernel,
    game,
    root,
    version: ANVIL_VERSION,
    tick: (dt) => kernel.tick(dt),
    pause: () => kernel.pause(),
    resume: () => kernel.resume(),
    isPaused: () => kernel.isPaused(),
    getSeed: () => kernel.getSeed(),
    getTime: () => kernel.getTime(),
    getTick: () => kernel.getTick(),
    dispose: () => kernel.dispose(),
  };
}
