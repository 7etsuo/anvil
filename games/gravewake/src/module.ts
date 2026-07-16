import {
  getGameReadyAudioCues,
  installGameAudio,
  type InputMap,
} from "@anvil/core";
import {
  defineArpgGame,
  type ArpgGameSession,
} from "@anvil/genre-arpg";
import { GravewakeGame } from "./GravewakeGame.js";
import {
  loadGravewakeContent,
  type GravewakeContent,
} from "./loadContent.js";
import type { GravewakeObservation } from "./types.js";

interface GravewakeSession extends ArpgGameSession<GravewakeObservation> {
  readonly game: GravewakeGame;
}

const binding = defineArpgGame<
  GravewakeContent,
  GravewakeObservation,
  GravewakeSession
>({
  id: "gravewake",
  content: loadGravewakeContent,
  register({ events, audio }): void {
    // Headless catalog install is optional; browser installs its embedded cues.
    if (!events || !audio || typeof process === "undefined") return;
    try {
      installGameAudio(events, audio, getGameReadyAudioCues("audio"));
    } catch {
      /* optional local catalog */
    }
  },
  create(ctx, content): GravewakeSession {
    const game = new GravewakeGame(
      ctx.world,
      content.actors,
      content.areas,
      content.progression,
      content.items,
      content.lootTables,
      ctx.random ?? Math.random,
      ctx,
      content.authoring,
    );
    return {
      game,
      update(dt: number, input: InputMap): void {
        game.update(dt, input);
      },
      observe(): GravewakeObservation {
        return game.observeBlob();
      },
    };
  },
});

export type GravewakeApi = { game: GravewakeGame | null };

export function getGravewakeApi(): GravewakeApi | null {
  const session = binding.getSession();
  return session ? { game: session.game } : null;
}

export const gravewakeModule = binding.module;
export default gravewakeModule;
