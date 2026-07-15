import type {
  GenreModule,
  KernelInternals,
  SceneContext,
} from "@anvil/core";
import { GravewakeGame } from "./GravewakeGame.js";
import { loadGravewakeContent } from "./loadContent.js";

export type GravewakeApi = {
  game: GravewakeGame | null;
};

let activeApi: GravewakeApi | null = null;

export function getGravewakeApi(): GravewakeApi | null {
  return activeApi;
}

export const gravewakeModule: GenreModule = {
  id: "gravewake",

  register(
    kernel: KernelInternals & {
      setGenreObserve?: (fn: () => Record<string, unknown>) => void;
    },
  ): void {
    kernel.setGenreObserve?.(() => {
      const api = getGravewakeApi();
      if (!api?.game) return {};
      return { gravewake: api.game.observeBlob() };
    });
  },

  defaultScenes() {
    return [
      {
        name: "main",
        factory: (ctx: SceneContext) => createGravewakeScene(ctx),
      },
      {
        name: "play",
        factory: (ctx: SceneContext) => createGravewakeScene(ctx),
      },
    ];
  },
};

function createGravewakeScene(ctx: SceneContext) {
  const root = ctx.assets.getGameRoot();
  const content = loadGravewakeContent(root);
  const rng = ctx.random ?? Math.random;

  for (const e of ctx.world.all()) ctx.world.destroy(e.id);

  const game = new GravewakeGame(
    ctx.world,
    content.actors,
    content.areas,
    content.progression,
    rng,
  );

  activeApi = { game };
  ctx.events.emit("gravewake:ready", { game });

  return {
    enter() {},
    update(dt: number) {
      game.update(dt, ctx.input);
      ctx.events.emit("gravewake:ui", game.observeBlob());
    },
    exit() {
      if (activeApi?.game === game) activeApi = null;
    },
  };
}

export default gravewakeModule;
