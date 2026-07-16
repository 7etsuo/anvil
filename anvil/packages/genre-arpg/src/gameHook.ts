import type {
  AudioSystem,
  EventBus,
  GenreModule,
  InputMap,
  SceneContext,
} from "@anvil/core";

export type ArpgSceneServices = Omit<SceneContext, "assets" | "data" | "seed">;

export interface ArpgRegistrationServices {
  readonly events?: EventBus;
  readonly audio?: AudioSystem;
}

export interface ArpgGameSession<TObservation extends Record<string, unknown>> {
  update(dt: number, input: InputMap): void;
  observe(): TObservation;
  dispose?(): void;
}

export interface ArpgGameDefinition<
  TContent,
  TObservation extends Record<string, unknown>,
  TSession extends ArpgGameSession<TObservation>,
> {
  readonly id: string;
  readonly scene?: string;
  readonly observeKey?: string;
  readonly content: TContent | ((gameRoot: string) => TContent);
  readonly register?: (services: ArpgRegistrationServices) => void;
  readonly create: (services: ArpgSceneServices, content: TContent) => TSession;
}

export interface ArpgGameBinding<TSession> {
  readonly module: GenreModule;
  getSession(): TSession | null;
}

/**
 * Define an ARPG title without exposing renderer, KernelInternals, scene
 * registration, or scheduler ownership to game code.
 */
export function defineArpgGame<
  TContent,
  TObservation extends Record<string, unknown>,
  TSession extends ArpgGameSession<TObservation>,
>(definition: ArpgGameDefinition<TContent, TObservation, TSession>): ArpgGameBinding<TSession> {
  let session: TSession | null = null;
  const module: GenreModule = {
    id: definition.id,
    register(kernel): void {
      definition.register?.({ events: kernel.events, audio: kernel.audio });
      kernel.setGenreObserve?.(() => {
        if (!session) return {};
        return { [definition.observeKey ?? definition.id]: session.observe() };
      });
    },
    defaultScenes() {
      return [{
        name: definition.scene ?? "main",
        factory: (ctx) => {
          for (const entity of ctx.world.all()) ctx.world.destroy(entity.id);
          const content = typeof definition.content === "function"
            ? (definition.content as (gameRoot: string) => TContent)(ctx.assets.getGameRoot())
            : definition.content;
          const { assets: _assets, data: _data, seed: _seed, ...services } = ctx;
          session = definition.create(services, content);
          const current = session;
          return {
            update(dt: number) { current.update(dt, ctx.input); },
            exit() {
              current.dispose?.();
              if (session === current) session = null;
            },
          };
        },
      }];
    },
  };
  return { module, getSession: () => session };
}
