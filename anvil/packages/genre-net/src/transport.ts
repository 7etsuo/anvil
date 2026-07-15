/** Transport interface (S-NET §2). */
export interface Transport {
  send(bytes: Uint8Array): void;
  onMessage(cb: (bytes: Uint8Array) => void): void;
  close(): void;
}

/**
 * In-process loopback transport for tests (S-NET §1, §6).
 * Delivers synchronously so host/client step ordering is deterministic.
 */
export class LoopbackTransport implements Transport {
  private peer: LoopbackTransport | null = null;
  private handlers: Array<(bytes: Uint8Array) => void> = [];
  private closed = false;

  static pair(): [LoopbackTransport, LoopbackTransport] {
    const a = new LoopbackTransport();
    const b = new LoopbackTransport();
    a.peer = b;
    b.peer = a;
    return [a, b];
  }

  send(bytes: Uint8Array): void {
    if (this.closed || !this.peer || this.peer.closed) return;
    const copy = new Uint8Array(bytes);
    for (const h of this.peer.handlers) h(copy);
  }

  onMessage(cb: (bytes: Uint8Array) => void): void {
    this.handlers.push(cb);
  }

  close(): void {
    this.closed = true;
    this.handlers = [];
    this.peer = null;
  }
}
