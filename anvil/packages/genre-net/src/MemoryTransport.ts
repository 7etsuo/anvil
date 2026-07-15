import type { Transport } from "./transport.js";

/**
 * In-process multi-peer hub (beyond simple pair loopback).
 * Useful for 3+ peer sims without sockets.
 */
export class MemoryHub {
  private peers = new Map<string, MemoryTransport>();

  createPeer(id: string): MemoryTransport {
    if (this.peers.has(id)) throw new Error(`peer exists: ${id}`);
    const t = new MemoryTransport(id, this);
    this.peers.set(id, t);
    return t;
  }

  _broadcast(from: string, bytes: Uint8Array): void {
    for (const [id, peer] of this.peers) {
      if (id === from) continue;
      peer._deliver(bytes);
    }
  }

  _sendTo(from: string, to: string, bytes: Uint8Array): void {
    const peer = this.peers.get(to);
    if (!peer) return;
    void from;
    peer._deliver(bytes);
  }

  remove(id: string): void {
    this.peers.delete(id);
  }
}

export class MemoryTransport implements Transport {
  readonly id: string;
  private hub: MemoryHub;
  private handlers: Array<(bytes: Uint8Array) => void> = [];
  private closed = false;

  constructor(id: string, hub: MemoryHub) {
    this.id = id;
    this.hub = hub;
  }

  send(bytes: Uint8Array): void {
    if (this.closed) return;
    this.hub._broadcast(this.id, new Uint8Array(bytes));
  }

  sendTo(peerId: string, bytes: Uint8Array): void {
    if (this.closed) return;
    this.hub._sendTo(this.id, peerId, new Uint8Array(bytes));
  }

  onMessage(cb: (bytes: Uint8Array) => void): void {
    this.handlers.push(cb);
  }

  _deliver(bytes: Uint8Array): void {
    if (this.closed) return;
    for (const h of this.handlers) h(bytes);
  }

  close(): void {
    this.closed = true;
    this.handlers = [];
    this.hub.remove(this.id);
  }
}

/**
 * WebSocket client transport (browser or ws-compatible).
 * Pass an already-open WebSocket-like object.
 */
export class WebSocketTransport implements Transport {
  private ws: {
    send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
    close: () => void;
    addEventListener?: (type: string, fn: (ev: MessageEvent) => void) => void;
    onmessage?: ((ev: MessageEvent) => void) | null;
  };
  private handlers: Array<(bytes: Uint8Array) => void> = [];

  constructor(ws: WebSocketTransport["ws"]) {
    this.ws = ws;
    const onMsg = (ev: MessageEvent) => {
      let bytes: Uint8Array;
      if (typeof ev.data === "string") {
        bytes = new TextEncoder().encode(ev.data);
      } else if (ev.data instanceof ArrayBuffer) {
        bytes = new Uint8Array(ev.data);
      } else {
        return;
      }
      for (const h of this.handlers) h(bytes);
    };
    if (typeof this.ws.addEventListener === "function") {
      this.ws.addEventListener("message", onMsg);
    } else {
      this.ws.onmessage = onMsg;
    }
  }

  send(bytes: Uint8Array): void {
    this.ws.send(bytes);
  }

  onMessage(cb: (bytes: Uint8Array) => void): void {
    this.handlers.push(cb);
  }

  close(): void {
    this.ws.close();
    this.handlers = [];
  }
}
