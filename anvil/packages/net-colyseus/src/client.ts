import { Client, type Room } from "colyseus.js";
import type { AnvilRoomState } from "./schema/AnvilRoomState.js";

export interface AnvilNetClientOpts {
  /** e.g. ws://127.0.0.1:2567 */
  endpoint: string;
  roomName?: string;
  /** Join options — name required for default auth; token if your auth requires it */
  name?: string;
  token?: string;
  userId?: string;
}

export interface AnvilNetClient {
  room: Room<AnvilRoomState>;
  sessionId: string;
  /** Send validated-style input (server re-validates). */
  sendInput: (actions: string[], seq?: number) => void;
  leave: () => Promise<void>;
  /** Read-only view of state */
  getState: () => AnvilRoomState;
}

/**
 * Connect to AnvilGameRoom via Colyseus client SDK.
 */
export async function connectAnvilNet(
  opts: AnvilNetClientOpts,
): Promise<AnvilNetClient> {
  const client = new Client(opts.endpoint);
  const room = await client.joinOrCreate<AnvilRoomState>(opts.roomName ?? "anvil", {
    name: opts.name ?? "Player",
    token: opts.token,
    userId: opts.userId,
  });

  // Wait until first state patch is applied (Schema fields populated)
  await new Promise<void>((resolve) => {
    if (room.state && room.state.players) {
      resolve();
      return;
    }
    const t = setTimeout(() => resolve(), 3000);
    room.onStateChange(() => {
      clearTimeout(t);
      resolve();
    });
  });

  return {
    room,
    sessionId: room.sessionId,
    sendInput(actions: string[], seq = 0) {
      room.send("input", { actions, seq });
    },
    async leave() {
      await room.leave();
    },
    getState() {
      return room.state;
    },
  };
}
