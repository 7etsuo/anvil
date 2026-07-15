import type {
  GenreModule,
  KernelInternals,
  SceneContext,
} from "@anvil/core";
import { loadVnContent } from "./loadContent.js";
import { VnRuntime } from "./VnRuntime.js";

export type VnApi = {
  runtime: VnRuntime | null;
  advance: () => boolean;
  choose: (index: number) => boolean;
};

let activeApi: VnApi | null = null;

export function getVnApi(): VnApi | null {
  return activeApi;
}

export const vnModule: GenreModule = {
  id: "genre-vn",

  register(
    kernel: KernelInternals & {
      setGenreObserve?: (fn: () => Record<string, unknown>) => void;
    },
  ): void {
    kernel.setGenreObserve?.(() => {
      const api = getVnApi();
      if (!api?.runtime) return {};
      return { vn: api.runtime.observeBlob() };
    });
  },

  defaultScenes() {
    return [
      {
        name: "main",
        factory: (ctx: SceneContext) => createVnScene(ctx),
      },
      {
        name: "vn",
        factory: (ctx: SceneContext) => createVnScene(ctx),
      },
    ];
  },
};

function createVnScene(ctx: SceneContext) {
  const gameRoot = ctx.assets.getGameRoot();
  const scripts = loadVnContent(gameRoot, "content");
  const ids = Object.keys(scripts);
  if (ids.length === 0) {
    return {
      enter() {
        console.warn("genre-vn: no scripts in content/scripts");
      },
      update() {},
    };
  }

  const script = scripts[ids[0]!]!;
  const runtime = new VnRuntime(script, (endingId) => {
    ctx.events.emit("vn:ended", { endingId });
  });

  activeApi = {
    runtime,
    advance: () => runtime.advance(),
    choose: (i) => runtime.choose(i),
  };

  ctx.events.emit("genre-vn:ready", { runtime });

  return {
    enter() {},
    update(_dt: number) {
      runtime.update(ctx.input);
      ctx.events.emit("genre-vn:ui", runtime.observeBlob());
    },
    exit() {
      if (activeApi?.runtime === runtime) activeApi = null;
    },
  };
}
