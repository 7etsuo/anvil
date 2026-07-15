import { decodeMessage, encodeMessage, type NetEntitySnapshot } from "./messages.js";
import type { Transport } from "./transport.js";

export type NetRole = "host" | "client";

export interface NetRoomOpts {
  role: NetRole;
  peerId: string;
  transport: Transport;
  /** World units per second */
  moveSpeed?: number;
  /** Fixed sim dt when advancing (default 1/60) */
  fixedDt?: number;
  startX?: number;
  startY?: number;
  startHp?: number;
}

/**
 * Host-authoritative room (S-NET §4).
 * - Host owns entity positions/hp; clients send input, receive state.
 * - Player entity id is the peerId.
 */
export class NetRoom {
  readonly role: NetRole;
  readonly peerId: string;
  private transport: Transport;
  private moveSpeed: number;
  private fixedDt: number;
  private tick = 0;
  /** Authoritative on host; mirrored on client from snapshots */
  private entities = new Map<string, NetEntitySnapshot>();
  /** Host: last input actions per peer */
  private inputs = new Map<string, string[]>();
  /** Client: actions held this frame */
  private localActions = new Set<string>();
  private peers = new Set<string>();
  private closed = false;
  private lastRemoteTick = -1;

  constructor(opts: NetRoomOpts) {
    this.role = opts.role;
    this.peerId = opts.peerId;
    this.transport = opts.transport;
    this.moveSpeed = opts.moveSpeed ?? 120;
    this.fixedDt = opts.fixedDt ?? 1 / 60;

    // Local player always exists
    this.entities.set(this.peerId, {
      id: this.peerId,
      x: opts.startX ?? (opts.role === "host" ? 100 : 200),
      y: opts.startY ?? 100,
      hp: opts.startHp ?? 10,
    });
    this.peers.add(this.peerId);

    this.transport.onMessage((bytes) => this.onBytes(bytes));
  }

  /** Connect handshake */
  hello(): void {
    this.send({ type: "hello", peerId: this.peerId });
  }

  setAction(action: string, down: boolean): void {
    if (down) this.localActions.add(action);
    else this.localActions.delete(action);
  }

  /** One sim step. Host integrates + broadcasts; client sends input. */
  step(): void {
    if (this.closed) return;
    this.tick++;

    if (this.role === "host") {
      // Host applies its own local input as well
      this.inputs.set(this.peerId, [...this.localActions]);
      this.simulateAll();
      this.broadcastState();
    } else {
      this.send({
        type: "input",
        tick: this.tick,
        actions: [...this.localActions],
        peerId: this.peerId,
      });
    }
  }

  getEntity(id: string): NetEntitySnapshot | undefined {
    return this.entities.get(id);
  }

  allEntities(): NetEntitySnapshot[] {
    return [...this.entities.values()];
  }

  getTick(): number {
    return this.tick;
  }

  getLastRemoteTick(): number {
    return this.lastRemoteTick;
  }

  /** Host-only: damage an entity (authoritative hp). */
  damage(id: string, amount: number): void {
    if (this.role !== "host") return;
    const e = this.entities.get(id);
    if (!e) return;
    e.hp = Math.max(0, e.hp - amount);
  }

  observeBlob(): Record<string, unknown> {
    return {
      role: this.role,
      peerId: this.peerId,
      tick: this.tick,
      lastRemoteTick: this.lastRemoteTick,
      entities: this.allEntities(),
      peers: [...this.peers],
    };
  }

  close(): void {
    this.closed = true;
    this.transport.close();
  }

  private onBytes(bytes: Uint8Array): void {
    if (this.closed) return;
    let msg;
    try {
      msg = decodeMessage(bytes);
    } catch {
      return;
    }

    if (msg.type === "hello") {
      this.peers.add(msg.peerId);
      if (this.role === "host" && !this.entities.has(msg.peerId)) {
        // Spawn remote player offset from host
        this.entities.set(msg.peerId, {
          id: msg.peerId,
          x: 200,
          y: 100,
          hp: 10,
        });
      }
      // Reply hello once so host knows client (client already sent)
      if (this.role === "host") {
        this.send({ type: "hello", peerId: this.peerId });
        this.broadcastState();
      }
      return;
    }

    if (msg.type === "input" && this.role === "host") {
      this.peers.add(msg.peerId);
      if (!this.entities.has(msg.peerId)) {
        this.entities.set(msg.peerId, {
          id: msg.peerId,
          x: 200,
          y: 100,
          hp: 10,
        });
      }
      this.inputs.set(msg.peerId, msg.actions);
      return;
    }

    if (msg.type === "state" && this.role === "client") {
      this.lastRemoteTick = msg.tick;
      this.entities.clear();
      for (const e of msg.entities) {
        this.entities.set(e.id, { ...e });
      }
    }
  }

  private simulateAll(): void {
    const speed = this.moveSpeed * this.fixedDt;
    for (const [id, e] of this.entities) {
      const actions = this.inputs.get(id) ?? [];
      let dx = 0;
      let dy = 0;
      if (actions.includes("move_left") || actions.includes("left")) dx -= 1;
      if (actions.includes("move_right") || actions.includes("right")) dx += 1;
      if (
        actions.includes("move_up") ||
        actions.includes("move_forward") ||
        actions.includes("up")
      )
        dy -= 1;
      if (
        actions.includes("move_down") ||
        actions.includes("move_back") ||
        actions.includes("down")
      )
        dy += 1;
      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy) || 1;
        e.x += (dx / len) * speed;
        e.y += (dy / len) * speed;
      }
    }
  }

  private broadcastState(): void {
    this.send({
      type: "state",
      tick: this.tick,
      entities: this.allEntities().map((e) => ({ ...e })),
    });
  }

  private send(msg: Parameters<typeof encodeMessage>[0]): void {
    this.transport.send(encodeMessage(msg));
  }
}
