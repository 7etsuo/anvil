import type {
  GenreModule,
  KernelInternals,
  SceneContext,
} from "@anvil/core";
import { loadShmupContent } from "./loadContent.js";
import { ShmupSim } from "./ShmupSim.js";
import type { StageDef, WaveDef } from "./types.js";

export type ShmupApi = {
  sim: ShmupSim | null;
};

let activeApi: ShmupApi | null = null;

export function getShmupApi(): ShmupApi | null {
  return activeApi;
}

export const shmupModule: GenreModule = {
  id: "genre-shmup",

  register(
    kernel: KernelInternals & {
      setGenreObserve?: (fn: () => Record<string, unknown>) => void;
    },
  ): void {
    kernel.setGenreObserve?.(() => {
      const api = getShmupApi();
      if (!api?.sim) return {};
      return { shmup: api.sim.observeBlob() };
    });
  },

  defaultScenes() {
    return [
      {
        name: "main",
        factory: (ctx: SceneContext) => createShmupScene(ctx),
      },
      {
        name: "play",
        factory: (ctx: SceneContext) => createShmupScene(ctx),
      },
    ];
  },
};

function createShmupScene(ctx: SceneContext) {
  const gameRoot = ctx.assets.getGameRoot();
  const content = loadShmupContent(gameRoot, "content");

  let stage: StageDef | null = null;
  const stageIds = Object.keys(content.stages);
  if (stageIds.length > 0) {
    stage = content.stages[stageIds[0]!]!;
  } else {
    // Compose stage from waves dir if no stages/
    const waves = Object.values(content.waves);
    if (waves.length === 0) {
      return {
        enter() {
          console.warn("genre-shmup: no stages or waves in content");
        },
        update() {},
      };
    }
    stage = {
      id: "auto",
      waves: waves as WaveDef[],
    };
  }

  for (const e of ctx.world.all()) ctx.world.destroy(e.id);

  const sim = new ShmupSim(
    ctx.world,
    stage,
    content.enemies,
    content.waves,
  );

  activeApi = { sim };
  ctx.events.emit("genre-shmup:ready", { sim });

  return {
    enter() {},
    update(dt: number) {
      sim.update(dt, ctx.input);
      ctx.events.emit("genre-shmup:ui", sim.observeBlob());
    },
    exit() {
      if (activeApi?.sim === sim) activeApi = null;
    },
  };
}
