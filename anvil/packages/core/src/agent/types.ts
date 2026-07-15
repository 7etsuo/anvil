/**
 * Structured agent actions — no raw key codes required.
 * Research: SWE-agent small ACI; ReAct act/observe; GameCraft verify loop.
 */

export type AgentAction =
  | { type: "noop" }
  | { type: "move"; dir: "up" | "down" | "left" | "right"; holdFrames?: number }
  | { type: "move_stop" }
  | { type: "press"; action: string }
  | { type: "release"; action: string }
  | { type: "tap"; action: string }
  | { type: "wait"; frames: number }
  | { type: "set_down"; actions: Record<string, boolean> };

export interface AgentStepResult {
  frames: number;
  tick: number;
  time: number;
  actionsApplied: AgentAction[];
}

export interface ObserveDiff {
  tickFrom: number;
  tickTo: number;
  entityHp: Array<{ id: string; from?: number; to?: number }>;
  entityPos: Array<{ id: string; from?: { x: number; y: number }; to?: { x: number; y: number } }>;
  addedEntities: string[];
  removedEntities: string[];
  sceneChanged?: { from: string | null; to: string | null };
  genreChanged: boolean;
  summary: string;
}

export interface AgentToolDef {
  name: string;
  description: string;
  /** CLI form if any */
  cli?: string;
  /** JSON-schema-ish params for agents */
  params?: Record<string, { type: string; description?: string; required?: boolean }>;
}

/** Canonical tool catalog — keep small (SWE-agent: interface size matters). */
export const AGENT_TOOL_CATALOG: AgentToolDef[] = [
  {
    name: "validate",
    description: "Validate game.yaml + modules. Fix schema errors before testing.",
    cli: "anvil validate [path] [--json]",
    params: { path: { type: "string", description: "Game root" } },
  },
  {
    name: "test",
    description: "Run headless JSON scenarios under tests/. Primary success signal.",
    cli: "anvil test [path] [--json] [--seed N]",
    params: {
      path: { type: "string" },
      seed: { type: "number", required: false },
    },
  },
  {
    name: "observe",
    description: "Structured world state JSON (+ optional screenshot). Use after failures.",
    cli: "anvil observe --root [path] [--json] [--shot]",
    params: {
      path: { type: "string" },
      shot: { type: "boolean", required: false },
    },
  },
  {
    name: "step",
    description: "Apply structured actions and advance N frames (programmatic).",
    params: {
      actions: { type: "AgentAction[]", required: true },
      frames: { type: "number", required: false },
    },
  },
  {
    name: "recipe_list",
    description: "List content recipes (templates) the agent can apply.",
    cli: "anvil recipe list",
  },
  {
    name: "recipe_show",
    description: "Show files a recipe would write.",
    cli: "anvil recipe show <id>",
    params: { id: { type: "string", required: true } },
  },
  {
    name: "assets_missing",
    description: "List missing asset paths (strict content).",
    cli: "anvil assets missing [path]",
  },
  {
    name: "doctor",
    description: "One-shot health: validate + test summary + engine version.",
    cli: "anvil doctor [path] [--json]",
  },
  {
    name: "tools",
    description: "Emit this catalog as JSON (self-describing ACI).",
    cli: "anvil tools [--json]",
  },
  {
    name: "net_health",
    description: "Probe Colyseus multiplayer /health (ops).",
    cli: "anvil net health [--url http://127.0.0.1:2567]",
    params: { url: { type: "string", required: false } },
  },
];
