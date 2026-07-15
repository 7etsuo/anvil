/** Wire messages JSON v1 (S-NET §3). */

export type NetMessage =
  | { type: "hello"; peerId: string }
  | {
      type: "state";
      tick: number;
      entities: NetEntitySnapshot[];
    }
  | { type: "input"; tick: number; actions: string[]; peerId: string };

export interface NetEntitySnapshot {
  id: string;
  x: number;
  y: number;
  hp: number;
}

const te = new TextEncoder();
const td = new TextDecoder();

export function encodeMessage(msg: NetMessage): Uint8Array {
  return te.encode(JSON.stringify(msg));
}

export function decodeMessage(bytes: Uint8Array): NetMessage {
  const raw = JSON.parse(td.decode(bytes)) as NetMessage;
  if (!raw || typeof raw !== "object" || !("type" in raw)) {
    throw new Error("Invalid net message");
  }
  return raw;
}
