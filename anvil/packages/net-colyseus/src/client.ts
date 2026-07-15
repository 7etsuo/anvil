import { Client, type Room } from "colyseus.js";
import type { AnvilRoomState } from "./schema/AnvilRoomState.js";

export interface AnvilNetClientOpts {
  /** e.g. ws://127.0.0.1:2567 or wss://game.example.com */
  endpoint: string;
  roomName?: string;
  name?: string;
  token?: string;
  userId?: string;
  /**
   * If set, attempt Colyseus reconnection instead of joinOrCreate.
   * Obtain from `client.reconnectionToken` after a previous session.
   */
  reconnectionToken?: string;
  /** Max reconnect attempts when using reconnectWithBackoff */
  maxReconnectAttempts?: number;
}

export interface AnvilNetClient {
  room: Room<AnvilRoomState>;
  sessionId: string;
  /** Token for later reconnect (Colyseus) */
  reconnectionToken: string | null;
  sendInput: (actions: string[], seq?: number) => void;
  leave: () => Promise<void>;
  getState: () => AnvilRoomState;
  /**
   * Attempt reconnect with exponential backoff.
   * Returns new client wrapper or throws.
   */
  reconnect: () => Promise<AnvilNetClient>;
}

async function waitForState(room: Room<AnvilRoomState>): Promise<void> {
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
}

function wrapRoom(
  room: Room<AnvilRoomState>,
  opts: AnvilNetClientOpts,
  client: Client,
): AnvilNetClient {
  const token =
    (room as unknown as { reconnectionToken?: string }).reconnectionToken ??
    null;

  const self: AnvilNetClient = {
    room,
    sessionId: room.sessionId,
    reconnectionToken: token,
    sendInput(actions: string[], seq = 0) {
      room.send("input", { actions, seq });
    },
    async leave() {
      await room.leave(true);
    },
    getState() {
      return room.state;
    },
    async reconnect() {
      const t =
        self.reconnectionToken ??
        (room as unknown as { reconnectionToken?: string }).reconnectionToken;
      if (!t) {
        throw new Error("No reconnectionToken — join fresh instead");
      }
      const max = opts.maxReconnectAttempts ?? 5;
      let lastErr: unknown;
      for (let i = 0; i < max; i++) {
        try {
          const r = await client.reconnect<AnvilRoomState>(t);
          await waitForState(r);
          return wrapRoom(r, opts, client);
        } catch (e) {
          lastErr = e;
          await new Promise((res) => setTimeout(res, 200 * 2 ** i));
        }
      }
      throw lastErr instanceof Error
        ? lastErr
        : new Error(String(lastErr));
    },
  };
  return self;
}

/**
 * Connect to AnvilGameRoom via Colyseus client SDK.
 * Supports WSS endpoints and reconnection tokens.
 */
export async function connectAnvilNet(
  opts: AnvilNetClientOpts,
): Promise<AnvilNetClient> {
  const client = new Client(opts.endpoint);
  let room: Room<AnvilRoomState>;

  if (opts.reconnectionToken) {
    room = await client.reconnect<AnvilRoomState>(opts.reconnectionToken);
  } else {
    room = await client.joinOrCreate<AnvilRoomState>(
      opts.roomName ?? "anvil",
      {
        name: opts.name ?? "Player",
        token: opts.token,
        userId: opts.userId,
      },
    );
  }

  await waitForState(room);
  return wrapRoom(room, opts, client);
}
