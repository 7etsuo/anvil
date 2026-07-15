import type {
  GenreModule,
  KernelInternals,
  SceneContext,
} from "@anvil/core";
import {
  createLoopbackSession,
  type LoopbackSession,
} from "./loopbackSession.js";

/**
 * genre-net spike module (S-NET / M8).
 * Headless: boots a local loopback 2-peer session for observe/tests.
 * Not a production multiplayer stack.
 */
export type NetApi = {
  session: LoopbackSession | null;
};

let activeApi: NetApi | null = null;

export function getNetApi(): NetApi | null {
  return activeApi;
}

export const netModule: GenreModule = {
  id: "genre-net",

  register(
    kernel: KernelInternals & {
      setGenreObserve?: (fn: () => Record<string, unknown>) => void;
    },
  ): void {
    kernel.setGenreObserve?.(() => {
      const api = getNetApi();
      if (!api?.session) return {};
      return {
        net: {
          spike: true,
          host: api.session.host.observeBlob(),
          client: api.session.client.observeBlob(),
        },
      };
    });
  },

  defaultScenes() {
    return [
      {
        name: "main",
        factory: (ctx: SceneContext) => createNetScene(ctx),
      },
      {
        name: "net",
        factory: (ctx: SceneContext) => createNetScene(ctx),
      },
    ];
  },
};

function createNetScene(_ctx: SceneContext) {
  const session = createLoopbackSession({ moveSpeed: 180 });
  activeApi = { session };

  return {
    enter() {},
    update(_dt: number) {
      session.stepBoth(1);
    },
    exit() {
      session.close();
      if (activeApi?.session === session) activeApi = null;
    },
  };
}
