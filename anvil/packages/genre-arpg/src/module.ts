import type { GenreModule } from "@anvil/core";

/**
 * Capability marker for ARPG projects. A title supplies its constrained scene
 * through defineArpgGame; keeping this base module inert avoids duplicate
 * worlds and keeps the runtime browser-safe.
 */
export const arpgModule: GenreModule = {
  id: "genre-arpg",
  register(): void {},
  schemas: () => ({
    actors: "content/actors/*.json",
    areas: "content/areas/*.json",
    traits: "content/traits/*.json",
    prefabs: "content/prefabs/*.json",
    triggers: "content/triggers/*.json",
    machines: "content/machines/*.json",
  }),
};
