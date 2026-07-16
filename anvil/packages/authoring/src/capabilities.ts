import type { GameYaml } from "@anvil/schema";
import { normalizeModules } from "@anvil/schema";
import type { CapabilityDescriptor } from "./types.js";

const VERSION = "0.9.0";

const DESCRIPTORS: Record<string, CapabilityDescriptor> = {
  core: {
    id: "core",
    version: VERSION,
    kind: "core",
    summary: "Deterministic scenes, entities, input, save, combat, RPG services, audio, UI, and observation.",
    provides: ["kernel", "scenes", "entities", "input", "save", "combat", "inventory", "quests", "ui", "audio", "observe", "replay"],
    contentKinds: ["items", "loot", "quests", "audio", "cinematics", "traits", "prefabs", "triggers", "machines"],
    actions: ["press", "release", "tap", "wait", "move", "move_stop"],
    observePaths: ["scene", "tick", "entities", "genre", "engine.metrics"],
    constraints: ["fixed timestep", "seeded RNG", "no renderer-specific game imports"],
    docs: "docs/design/specs/S-CORE.md",
  },
  "genre-card": {
    id: "genre-card",
    version: VERSION,
    kind: "genre",
    summary: "Turn-based deck battle runtime.",
    provides: ["cards", "decks", "turns", "enemy-intents", "statuses"],
    contentKinds: ["cards", "battles", "enemies"],
    actions: ["play_card", "end_turn"],
    observePaths: ["genre.phase", "genre.hand", "genre.energy", "genre.enemies"],
    constraints: ["deterministic card resolution"],
    docs: "docs/design/specs/S-CARD.md",
  },
  "genre-topdown2d": {
    id: "genre-topdown2d",
    version: VERSION,
    kind: "genre",
    summary: "Top-down movement, collision, actors, navigation, enemies, projectiles, and maps.",
    provides: ["topdown-movement", "collision", "pathfinding", "actors", "projectiles", "maps"],
    contentKinds: ["actors", "maps", "areas"],
    actions: ["move", "attack", "interact", "ability"],
    observePaths: ["entities[].transform", "entities[].health", "genre"],
    constraints: ["2D world coordinates", "collision geometry must leave reachable paths"],
    docs: "docs/design/specs/S-TOPDOWN.md",
  },
  "genre-arpg": {
    id: "genre-arpg",
    version: VERSION,
    kind: "genre",
    summary: "Declarative action-RPG content, archetypes, campaign rules, and restricted title hooks.",
    provides: ["arpg-content", "actor-prefabs", "rule-runtime", "state-machines", "restricted-game-hook"],
    contentKinds: ["actors", "areas", "items", "loot", "progression", "traits", "prefabs", "triggers", "machines"],
    actions: ["move", "attack", "interact", "ability", "inventory", "equip"],
    observePaths: ["genre.arpg", "genre.*.declarative", "genre.*.authoring"],
    constraints: ["compiled IR only", "finite declarative rules", "no renderer or kernel ownership in game hooks"],
    docs: "docs/design/specs/S-ARPG.md",
  },
  "genre-vn": {
    id: "genre-vn",
    version: VERSION,
    kind: "genre",
    summary: "Branching visual-novel dialogue graph runtime.",
    provides: ["dialogue", "choices", "portraits", "backgrounds"],
    contentKinds: ["scripts"],
    actions: ["advance", "choose"],
    observePaths: ["genre.node", "genre.line", "genre.choices"],
    constraints: ["all node references resolve"],
    docs: "docs/design/specs/S-VN.md",
  },
  "genre-shmup": {
    id: "genre-shmup",
    version: VERSION,
    kind: "genre",
    summary: "Scrolling shooter runtime with waves and bullet patterns.",
    provides: ["ship", "waves", "bullets", "score", "lives"],
    contentKinds: ["actors", "waves", "stages"],
    actions: ["move", "fire"],
    observePaths: ["genre.score", "genre.lives", "entities"],
    constraints: ["bounded bullet patterns"],
    docs: "docs/design/specs/S-SHMUP.md",
  },
  "genre-fps2": {
    id: "genre-fps2",
    version: VERSION,
    kind: "genre",
    summary: "Grid-based raycast first-person action runtime.",
    provides: ["raycast", "grid-map", "yaw", "hitscan", "billboards"],
    contentKinds: ["maps", "weapons", "enemies"],
    actions: ["move", "turn", "fire"],
    observePaths: ["genre.player", "genre.enemies", "genre.exit"],
    constraints: ["rectangular integer grid"],
    docs: "docs/design/specs/S-FPS2.md",
  },
  "genre-net": {
    id: "genre-net",
    version: VERSION,
    kind: "modifier",
    summary: "Experimental transport-neutral state replication spike.",
    provides: ["replication", "loopback-transport"],
    contentKinds: [],
    actions: ["connect", "input"],
    observePaths: ["genre.peers", "genre.connected"],
    constraints: ["spike quality; not production MMO networking"],
    docs: "docs/design/specs/S-NET.md",
  },
};

const AUTHORING: CapabilityDescriptor = {
  id: "authoring-v2",
  version: VERSION,
  kind: "authoring",
  summary: "Deterministic intent, trait, prefab, trigger, state-machine, and IR compiler.",
  provides: ["intent-contract", "prefab-composition", "rule-dsl", "immutable-ir", "migration"],
  contentKinds: ["traits", "prefabs", "triggers", "machines"],
  actions: ["compile", "describe", "migrate", "validate"],
  observePaths: ["sourceHash", "diagnostics", "requirements"],
  constraints: ["declarative JSON/YAML only", "no arbitrary code execution"],
  docs: "docs/design/specs/S-AUTHORING.md",
};

export function capabilityCatalog(): CapabilityDescriptor[] {
  return [AUTHORING, ...Object.values(DESCRIPTORS)].map(cloneDescriptor);
}

export function capabilitiesForGame(game: GameYaml): CapabilityDescriptor[] {
  const ids = ["core", ...normalizeModules(game.genre, game.modules)];
  const selected: CapabilityDescriptor[] = [AUTHORING];
  for (const id of ids) {
    const known = DESCRIPTORS[id];
    selected.push(
      known ?? {
        id,
        version: game.version,
        kind: "custom",
        summary: "Project-defined module.",
        provides: ["custom-hooks"],
        contentKinds: [],
        actions: [],
        observePaths: [],
        constraints: ["must export a valid Anvil GenreModule"],
      },
    );
  }
  return selected.map(cloneDescriptor);
}

function cloneDescriptor(value: CapabilityDescriptor): CapabilityDescriptor {
  return {
    ...value,
    provides: [...value.provides],
    contentKinds: [...value.contentKinds],
    actions: [...value.actions],
    observePaths: [...value.observePaths],
    constraints: [...value.constraints],
  };
}
