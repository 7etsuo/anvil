import type {
  GenreModule,
  KernelInternals,
  SceneContext,
} from "@anvil/core";
import { getGameReadyAudioCues, installGameAudio } from "@anvil/core";
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
    if (kernel.audio && kernel.events) {
      try {
        installGameAudio(
          kernel.events,
          kernel.audio,
          getGameReadyAudioCues("audio"),
        );
      } catch {
        /* catalog optional in pure content mode */
      }
    }
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
        factory: (ctx: SceneContext) => {
          const root = ctx.assets.getGameRoot();
          const content = loadGravewakeContent(root);
          for (const e of ctx.world.all()) ctx.world.destroy(e.id);
          const game = new GravewakeGame(
            ctx.world,
            content.actors,
            content.areas,
            content.progression,
            content.items,
            content.lootTables,
            ctx.random ?? Math.random,
            {
              particles: ctx.particles,
              quests: ctx.quests,
              events: ctx.events,
              audio: ctx.audio,
              statuses: ctx.statuses,
              abilities: ctx.abilities,
            },
          );
          activeApi = { game };
          return {
            enter() {},
            update(dt: number) {
              game.update(dt, ctx.input);
            },
            exit() {
              if (activeApi?.game === game) activeApi = null;
            },
          };
        },
      },
    ];
  },
};

export default gravewakeModule;
