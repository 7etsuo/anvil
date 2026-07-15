/**
 * Built-in multiplayer server — real WebSocket relay (Node).
 * const server = await NetServer.listen({ port: 8742 })
 */
import { WebSocketServer, WebSocket } from "ws";
import type { Transport } from "./transport.js";

export interface NetServerOpts {
  port?: number;
  host?: string;
}

export class NetServer {
  private wss: WebSocketServer;
  private clients = new Map<string, WebSocket>();
  private nextId = 1;
  readonly port: number;

  private constructor(wss: WebSocketServer, port: number) {
    this.wss = wss;
    this.port = port;
    this.wss.on("connection", (ws) => {
      const id = `p${this.nextId++}`;
      this.clients.set(id, ws);
      ws.send(JSON.stringify({ type: "hello", peerId: "server", you: id }));
      ws.on("message", (data) => {
        const buf = Buffer.isBuffer(data)
          ? data
          : Buffer.from(data as ArrayBuffer);
        for (const [cid, client] of this.clients) {
          if (cid === id) continue;
          if (client.readyState === WebSocket.OPEN) client.send(buf);
        }
      });
      ws.on("close", () => this.clients.delete(id));
    });
  }

  static async listen(opts: NetServerOpts = {}): Promise<NetServer> {
    const port = opts.port ?? 8742;
    const host = opts.host ?? "127.0.0.1";
    const wss = new WebSocketServer({ port, host });
    await new Promise<void>((resolve, reject) => {
      wss.once("listening", () => resolve());
      wss.once("error", reject);
    });
    const addr = wss.address();
    const actual =
      typeof addr === "object" && addr && "port" in addr ? addr.port : port;
    return new NetServer(wss, actual);
  }

  clientCount(): number {
    return this.clients.size;
  }

  async close(): Promise<void> {
    for (const c of this.clients.values()) c.close();
    this.clients.clear();
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
  }
}

/** Client transport for NetServer (Node `ws` or browser WebSocket). */
export class WsClientTransport implements Transport {
  private ws: {
    send: (data: Uint8Array | string) => void;
    close: () => void;
    readyState: number;
    addEventListener?: (type: string, fn: (ev: MessageEvent) => void) => void;
    on?: (event: string, fn: (...args: unknown[]) => void) => void;
  } | null = null;
  private handlers: Array<(bytes: Uint8Array) => void> = [];
  private queue: Uint8Array[] = [];
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    const g = globalThis as unknown as { window?: unknown; WebSocket?: unknown };
    const isNode = typeof g.window === "undefined";
    let WSCtor: new (url: string) => unknown;
    if (isNode) {
      const mod = await import("ws");
      WSCtor = mod.default as unknown as new (url: string) => unknown;
    } else {
      WSCtor = g.WebSocket as new (url: string) => unknown;
    }

    await new Promise<void>((resolve, reject) => {
      const raw = new WSCtor(this.url) as {
        send: (data: Uint8Array | string) => void;
        close: () => void;
        readyState: number;
        addEventListener?: (
          type: string,
          fn: (ev: MessageEvent) => void,
        ) => void;
        on?: (event: string, fn: (...args: unknown[]) => void) => void;
        binaryType?: string;
      };
      this.ws = raw;

      const onOpen = () => {
        for (const m of this.queue) raw.send(m);
        this.queue = [];
        resolve();
      };
      const onError = (e: unknown) => reject(e);
      const onMessage = (data: unknown) => {
        let bytes: Uint8Array;
        if (typeof data === "string") {
          bytes = new TextEncoder().encode(data);
        } else if (data instanceof ArrayBuffer) {
          bytes = new Uint8Array(data);
        } else if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) {
          bytes = new Uint8Array(data);
        } else if (data && typeof data === "object" && "data" in (data as object)) {
          // browser MessageEvent
          return onMessage((data as MessageEvent).data);
        } else {
          return;
        }
        for (const h of this.handlers) h(bytes);
      };

      if (typeof raw.addEventListener === "function") {
        raw.addEventListener("open", onOpen as unknown as (ev: MessageEvent) => void);
        raw.addEventListener("error", onError as unknown as (ev: MessageEvent) => void);
        raw.addEventListener("message", (ev: MessageEvent) => onMessage(ev));
      } else if (raw.on) {
        raw.on("open", onOpen);
        raw.on("error", onError);
        raw.on("message", (data: unknown) => onMessage(data));
      }
    });
  }

  send(bytes: Uint8Array): void {
    if (!this.ws || this.ws.readyState !== 1) {
      this.queue.push(bytes);
      return;
    }
    this.ws.send(bytes);
  }

  onMessage(cb: (bytes: Uint8Array) => void): void {
    this.handlers.push(cb);
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
    this.handlers = [];
  }
}
