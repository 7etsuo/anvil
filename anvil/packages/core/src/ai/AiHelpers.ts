import { astar, type Grid, type Point } from "../path/astar.js";

export type AiMode = "idle" | "chase" | "leash" | "patrol" | "flee";

export interface AiAgent {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  speed: number;
  /** World units */
  aggroRange: number;
  leashRange: number;
  mode: AiMode;
  path: Point[];
  pathIndex: number;
  repathMs: number;
}

export function createAiAgent(
  x: number,
  y: number,
  opts: Partial<AiAgent> = {},
): AiAgent {
  return {
    x,
    y,
    homeX: x,
    homeY: y,
    speed: opts.speed ?? 80,
    aggroRange: opts.aggroRange ?? 200,
    leashRange: opts.leashRange ?? 400,
    mode: "idle",
    path: [],
    pathIndex: 0,
    repathMs: 0,
  };
}

/**
 * Update AI: aggro/leash + optional grid pathfollow toward target.
 * Returns desired velocity (vx, vy).
 */
export function tickAi(
  agent: AiAgent,
  target: { x: number; y: number } | null,
  dt: number,
  opts?: {
    grid?: Grid;
    cellSize?: number;
    repathEveryMs?: number;
  },
): { vx: number; vy: number } {
  const repathEvery = opts?.repathEveryMs ?? 400;
  agent.repathMs = Math.max(0, agent.repathMs - dt * 1000);

  if (!target) {
    agent.mode = "idle";
    agent.path = [];
    return { vx: 0, vy: 0 };
  }

  const distTarget = Math.hypot(target.x - agent.x, target.y - agent.y);
  const distHome = Math.hypot(agent.homeX - agent.x, agent.homeY - agent.y);

  if (agent.mode === "chase" && distHome > agent.leashRange) {
    agent.mode = "leash";
    agent.path = [];
  } else if (agent.mode !== "leash" && distTarget <= agent.aggroRange) {
    agent.mode = "chase";
  } else if (agent.mode === "leash" && distHome < 16) {
    agent.mode = "idle";
    agent.path = [];
  } else if (agent.mode === "idle" && distTarget <= agent.aggroRange) {
    agent.mode = "chase";
  }

  let goalX = agent.x;
  let goalY = agent.y;
  if (agent.mode === "chase") {
    goalX = target.x;
    goalY = target.y;
  } else if (agent.mode === "leash") {
    goalX = agent.homeX;
    goalY = agent.homeY;
  } else {
    return { vx: 0, vy: 0 };
  }

  const cell = opts?.cellSize ?? 16;
  if (opts?.grid && agent.repathMs <= 0) {
    const sx = Math.floor(agent.x / cell);
    const sy = Math.floor(agent.y / cell);
    const gx = Math.floor(goalX / cell);
    const gy = Math.floor(goalY / cell);
    const path = astar(opts.grid, { x: sx, y: sy }, { x: gx, y: gy });
    agent.path = path ?? [];
    agent.pathIndex = 0;
    agent.repathMs = repathEvery;
  }

  let tx = goalX;
  let ty = goalY;
  if (agent.path.length > 0) {
    while (
      agent.pathIndex < agent.path.length - 1 &&
      Math.hypot(
        agent.path[agent.pathIndex]!.x * cell + cell / 2 - agent.x,
        agent.path[agent.pathIndex]!.y * cell + cell / 2 - agent.y,
      ) < cell * 0.6
    ) {
      agent.pathIndex++;
    }
    const p = agent.path[agent.pathIndex]!;
    tx = p.x * cell + cell / 2;
    ty = p.y * cell + cell / 2;
  }

  const dx = tx - agent.x;
  const dy = ty - agent.y;
  const len = Math.hypot(dx, dy) || 1;
  if (len < 4) return { vx: 0, vy: 0 };
  return {
    vx: (dx / len) * agent.speed,
    vy: (dy / len) * agent.speed,
  };
}
