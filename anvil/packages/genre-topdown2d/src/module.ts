import type {
  GenreModule,
  KernelInternals,
  SceneContext,
} from "@anvil/core";
import { loadTopdownContent } from "./loadContent.js";
import { TopdownSim } from "./TopdownSim.js";

export type TopdownApi = {
  sim: TopdownSim | null;
  restart: () => void;
};

let activeApi: TopdownApi | null = null;

export function getTopdownApi(): TopdownApi | null {
  return activeApi;
}

export const topdownModule: GenreModule = {
  id: "genre-topdown2d",

  register(
    kernel: KernelInternals & {
      setGenreObserve?: (fn: () => Record<string, unknown>) => void;
    },
  ): void {
    kernel.setGenreObserve?.(() => {
      const api = getTopdownApi();
      if (!api?.sim) return {};
      return { topdown: api.sim.observeBlob() };
    });
  },

  defaultScenes() {
    return [
      {
        name: "main",
        factory: (ctx: SceneContext) => createTopdownScene(ctx),
      },
      {
        name: "play",
        factory: (ctx: SceneContext) => createTopdownScene(ctx),
      },
    ];
  },
};

function createTopdownScene(ctx: SceneContext) {
  const gameRoot = ctx.assets.getGameRoot();
  const content = loadTopdownContent(gameRoot, "content");
  const mapIds = Object.keys(content.maps);
  if (mapIds.length === 0) {
    return {
      enter() {
        console.warn("genre-topdown2d: no maps in content/maps");
      },
      update() {},
    };
  }

  const map = content.maps[mapIds[0]!]!;
  const rng = ctx.random ?? Math.random;
  // Clear leftover entities when re-entering
  for (const e of ctx.world.all()) ctx.world.destroy(e.id);

  const sim = new TopdownSim(ctx.world, map, content.actors, rng);

  activeApi = {
    sim,
    restart: () => sim.restart(),
  };

  ctx.events.emit("genre-topdown2d:ready", { sim });

  return {
    enter() {},
    update(dt: number) {
      sim.update(dt, ctx.input);
      ctx.events.emit("genre-topdown2d:ui", sim.observeBlob());
    },
    exit() {
      if (activeApi?.sim === sim) activeApi = null;
    },
  };
}
