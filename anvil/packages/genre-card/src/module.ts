import type {
  GenreModule,
  KernelInternals,
  SceneContext,
} from "@anvil/core";
import { Battle } from "./Battle.js";
import { loadCardContent } from "./loadContent.js";

export type CardBattleApi = {
  battle: Battle | null;
  playSlot: (slot: number) => boolean;
  endTurn: () => void;
  selectNextEnemy: () => void;
};

let activeApi: CardBattleApi | null = null;

export function getCardBattleApi(): CardBattleApi | null {
  return activeApi;
}

export const cardModule: GenreModule = {
  id: "genre-card",

  register(kernel: KernelInternals & {
    setGenreObserve?: (fn: () => Record<string, unknown>) => void;
  }): void {
    // Always re-hook for each createGame (new Kernel instance)
    kernel.setGenreObserve?.(() => {
      const api = getCardBattleApi();
      if (!api?.battle) return {};
      return { battle: api.battle.observeBlob() };
    });
  },

  defaultScenes() {
    return [
      {
        name: "battle",
        factory: (ctx: SceneContext) => createBattleScene(ctx),
      },
      {
        name: "main",
        factory: (ctx: SceneContext) => createBattleScene(ctx),
      },
    ];
  },
};

function createBattleScene(ctx: SceneContext) {
  const gameRoot = ctx.assets.getGameRoot();
  const content = loadCardContent(gameRoot, "content");
  const battleIds = Object.keys(content.battles);
  if (battleIds.length === 0) {
    return {
      enter() {
        console.warn("genre-card: no battles in content/battles");
      },
      update() {},
    };
  }

  const battleDef = content.battles[battleIds[0]!]!;
  const rng = ctx.random ?? Math.random;
  const battle = new Battle(battleDef, content.cards, content.enemies, rng);
  battle.setEnemyDefs(content.enemies);

  activeApi = {
    battle,
    playSlot: (s) => battle.playSlot(s),
    endTurn: () => battle.endTurn(),
    selectNextEnemy: () => battle.selectNextEnemy(),
  };

  ctx.events.emit("genre-card:ready", { battle });

  return {
    enter() {},
    update(_dt: number) {
      // isPressed = edge (S-CORE); works with test action pulses
      for (let i = 0; i < 10; i++) {
        if (ctx.input.isPressed(`play_card_${i}`)) battle.playSlot(i);
      }
      if (ctx.input.isPressed("end_turn")) battle.endTurn();
      if (ctx.input.isPressed("select_enemy_next")) battle.selectNextEnemy();

      ctx.events.emit("genre-card:ui", battle.observeBlob());
    },
    exit() {
      if (activeApi?.battle === battle) activeApi = null;
    },
  };
}
