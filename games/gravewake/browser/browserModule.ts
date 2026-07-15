import type {
  GenreModule,
  KernelInternals,
  SceneContext,
} from "@anvil/core";
import { GravewakeGame } from "../src/GravewakeGame.js";
import {
  embeddedActors,
  embeddedAreas,
  embeddedProgression,
} from "./contentEmbed.js";

let game: GravewakeGame | null = null;

export function getBrowserGravewake(): GravewakeGame | null {
  return game;
}

/** Browser-safe module (content embedded — no node:fs). */
export const browserGravewakeModule: GenreModule = {
  id: "gravewake",

  register(
    kernel: KernelInternals & {
      setGenreObserve?: (fn: () => Record<string, unknown>) => void;
    },
  ): void {
    kernel.setGenreObserve?.(() => {
      if (!game) return {};
      return { gravewake: game.observeBlob() };
    });
  },

  defaultScenes() {
    return [
      {
        name: "main",
        factory: (ctx: SceneContext) => {
          for (const e of ctx.world.all()) ctx.world.destroy(e.id);
          game = new GravewakeGame(
            ctx.world,
            embeddedActors,
            embeddedAreas,
            embeddedProgression,
            ctx.random ?? Math.random,
          );
          return {
            enter() {},
            update(dt: number) {
              game?.update(dt, ctx.input);
            },
            exit() {
              game = null;
            },
          };
        },
      },
    ];
  },
};
