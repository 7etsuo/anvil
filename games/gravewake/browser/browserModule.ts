import type {
  GenreModule,
  KernelInternals,
  SceneContext,
} from "@anvil/core";
import { GravewakeGame } from "../src/GravewakeGame.js";
import {
  embeddedActors,
  embeddedAreas,
  embeddedItems,
  embeddedLoot,
  embeddedProgression,
} from "./contentEmbed.js";

let game: GravewakeGame | null = null;

export function getBrowserGravewake(): GravewakeGame | null {
  return game;
}

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
            embeddedItems,
            embeddedLoot,
            ctx.random ?? Math.random,
            {
              particles: ctx.particles,
              quests: ctx.quests,
              events: ctx.events,
              audio: ctx.audio,
              statuses: ctx.statuses,
              abilities: ctx.abilities,
              projectiles: ctx.projectiles,
              resources: ctx.resources,
              interactables: ctx.interactables,
              triggers: ctx.triggers,
              floatText: ctx.floatText,
              transitions: ctx.transitions,
              threat: ctx.threat,
              death: ctx.death,
            },
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
