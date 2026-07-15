import type { GameHandle } from "../createGame.js";
import { agentStep } from "./agentStep.js";
import type { AgentAction } from "./types.js";

export interface ReplayFrame {
  /** Absolute tick after this frame's steps (informational) */
  tick?: number;
  actions: AgentAction[];
  frames?: number;
}

export interface ReplayTape {
  v: 1;
  seed: number;
  /** Fixed dt assumed 1/60 */
  frames: ReplayFrame[];
  meta?: Record<string, unknown>;
}

export class ReplayRecorder {
  readonly seed: number;
  private frames: ReplayFrame[] = [];

  constructor(seed: number) {
    this.seed = seed;
  }

  record(actions: AgentAction | AgentAction[], frames = 1): void {
    const list = Array.isArray(actions) ? actions : [actions];
    this.frames.push({ actions: list, frames });
  }

  toJSON(): ReplayTape {
    return { v: 1, seed: this.seed, frames: [...this.frames] };
  }

  static fromJSON(data: ReplayTape): ReplayRecorder {
    const r = new ReplayRecorder(data.seed);
    r.frames = data.frames.map((f) => ({ ...f, actions: [...f.actions] }));
    return r;
  }
}

/**
 * Replay a tape on a live handle (seed must match createGame seed).
 * Agents use this to verify "same actions → same outcome".
 */
export function playReplay(handle: GameHandle, tape: ReplayTape): void {
  if (handle.getSeed() !== tape.seed) {
    throw new Error(
      `Replay seed mismatch: handle=${handle.getSeed()} tape=${tape.seed}`,
    );
  }
  for (const frame of tape.frames) {
    agentStep(handle, frame.actions, frame.frames ?? 1);
  }
}
