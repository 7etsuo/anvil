import { NetRoom } from "./NetRoom.js";
import { LoopbackTransport } from "./transport.js";

export interface LoopbackSession {
  host: NetRoom;
  client: NetRoom;
  transportHost: LoopbackTransport;
  transportClient: LoopbackTransport;
  /** Step both peers (client input then host sim+broadcast). */
  stepBoth: (n?: number) => void;
  close: () => void;
}

/** Two logical peers on loopback (S-NET acceptance harness). */
export function createLoopbackSession(opts?: {
  moveSpeed?: number;
  fixedDt?: number;
}): LoopbackSession {
  const [tHost, tClient] = LoopbackTransport.pair();
  const host = new NetRoom({
    role: "host",
    peerId: "host",
    transport: tHost,
    moveSpeed: opts?.moveSpeed ?? 120,
    fixedDt: opts?.fixedDt ?? 1 / 60,
    startX: 100,
    startY: 100,
  });
  const client = new NetRoom({
    role: "client",
    peerId: "client",
    transport: tClient,
    moveSpeed: opts?.moveSpeed ?? 120,
    fixedDt: opts?.fixedDt ?? 1 / 60,
    startX: 200,
    startY: 100,
  });

  // Handshake (sync loopback)
  host.hello();
  client.hello();

  const stepBoth = (n = 1) => {
    for (let i = 0; i < n; i++) {
      // Client sends input first; host integrates + broadcasts state
      client.step();
      host.step();
    }
  };

  // Prime one exchange so both sides have entity tables
  stepBoth(1);

  return {
    host,
    client,
    transportHost: tHost,
    transportClient: tClient,
    stepBoth,
    close: () => {
      host.close();
      client.close();
    },
  };
}
