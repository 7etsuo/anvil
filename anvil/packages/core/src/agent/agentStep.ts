import type { GameHandle } from "../createGame.js";
import type { AgentAction, AgentStepResult } from "./types.js";

const DIR_TO_ACTION: Record<string, string> = {
  up: "move_up",
  down: "move_down",
  left: "move_left",
  right: "move_right",
};

/**
 * Map a structured agent action onto InputMap (no raw KeyW needed).
 */
export function applyAgentAction(
  handle: GameHandle,
  action: AgentAction,
): void {
  const input = handle.input;
  switch (action.type) {
    case "noop":
      break;
    case "move_stop":
      for (const a of [
        "move_up",
        "move_down",
        "move_left",
        "move_right",
        "move_forward",
        "move_back",
      ]) {
        input.setDown(a, false);
      }
      break;
    case "move": {
      applyAgentAction(handle, { type: "move_stop" });
      const act = DIR_TO_ACTION[action.dir];
      if (act) input.setDown(act, true);
      if (action.dir === "up") input.setDown("move_forward", true);
      if (action.dir === "down") input.setDown("move_back", true);
      break;
    }
    case "press":
      input.setDown(action.action, true);
      break;
    case "release":
      input.setDown(action.action, false);
      break;
    case "tap": {
      // edge: release then press so isPressed fires next beginStep
      input.setDown(action.action, false);
      input.endFrame();
      input.setDown(action.action, true);
      break;
    }
    case "set_down":
      for (const [k, v] of Object.entries(action.actions)) {
        input.setDown(k, v);
      }
      break;
    case "wait":
      break;
    default:
      break;
  }
}

/**
 * Apply actions then advance the sim by `frames` fixed ticks (default 1).
 * Primary loop for coding agents: act → step → observe.
 */
export function agentStep(
  handle: GameHandle,
  actions: AgentAction | AgentAction[],
  frames = 1,
): AgentStepResult {
  const list = Array.isArray(actions) ? actions : [actions];
  let waitExtra = 0;
  let hasNonWait = false;
  for (const a of list) {
    if (a.type === "wait") waitExtra += Math.max(0, a.frames);
    else {
      hasNonWait = true;
      applyAgentAction(handle, a);
    }
  }
  // Pure wait: advance exactly wait frames. Mixed: base frames + waits.
  const total = Math.max(
    1,
    hasNonWait ? frames + waitExtra : waitExtra || frames,
  );
  const dt = 1 / 60;
  for (let i = 0; i < total; i++) {
    handle.tick(dt);
  }
  return {
    frames: total,
    tick: handle.getTick(),
    time: handle.getTime(),
    actionsApplied: list,
  };
}
