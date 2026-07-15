import type {
  GenreModule,
  KernelInternals,
  SceneContext,
} from "@anvil/core";
import { Fps2Sim } from "./Fps2Sim.js";
import { loadFps2Content } from "./loadContent.js";
import type { Fps2LevelDef, Fps2MapDef } from "./types.js";

export type Fps2Api = {
  sim: Fps2Sim | null;
  shoot: () => void;
};

let activeApi: Fps2Api | null = null;

export function getFps2Api(): Fps2Api | null {
  return activeApi;
}

export const fps2Module: GenreModule = {
  id: "genre-fps2",

  register(
    kernel: KernelInternals & {
      setGenreObserve?: (fn: () => Record<string, unknown>) => void;
    },
  ): void {
    kernel.setGenreObserve?.(() => {
      const api = getFps2Api();
      if (!api?.sim) return {};
      return { fps2: api.sim.observeBlob() };
    });
  },

  defaultScenes() {
    return [
      {
        name: "main",
        factory: (ctx: SceneContext) => createFps2Scene(ctx),
      },
      {
        name: "play",
        factory: (ctx: SceneContext) => createFps2Scene(ctx),
      },
    ];
  },
};

function createFps2Scene(ctx: SceneContext) {
  const gameRoot = ctx.assets.getGameRoot();
  const content = loadFps2Content(gameRoot, "content");
  const mapIds = Object.keys(content.maps);
  if (mapIds.length === 0) {
    return {
      enter() {
        console.warn("genre-fps2: no maps in content/maps");
      },
      update() {},
    };
  }

  let map: Fps2MapDef = content.maps[mapIds[0]!]!;
  let level: Fps2LevelDef;

  const levelIds = Object.keys(content.levels);
  if (levelIds.length > 0) {
    level = content.levels[levelIds[0]!]!;
    if (content.maps[level.map]) map = content.maps[level.map]!;
  } else {
    level = {
      id: "auto",
      map: map.id,
    };
  }

  const sim = new Fps2Sim(map, level);
  activeApi = {
    sim,
    shoot: () => sim.shoot(),
  };
  ctx.events.emit("genre-fps2:ready", { sim });

  return {
    enter() {},
    update(dt: number) {
      sim.update(dt, ctx.input);
      ctx.events.emit("genre-fps2:ui", sim.observeBlob());
    },
    exit() {
      if (activeApi?.sim === sim) activeApi = null;
    },
  };
}
