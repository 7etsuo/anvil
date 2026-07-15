import { Room, type Client } from "@colyseus/core";
import { AnvilRoomState, PlayerState } from "../schema/AnvilRoomState.js";
import {
  type AuthValidator,
  defaultAuthValidator,
  rateLimitAllow,
  type RateLimitState,
  validateInputMessage,
} from "../security.js";

export interface AnvilGameRoomOptions {
  tickRate?: number;
  moveSpeed?: number;
  maxClients?: number;
  maxInputsPerSec?: number;
  auth?: AuthValidator;
  spawn?: { x: number; y: number };
  /** Allow reconnection for N seconds after disconnect (0 = off) */
  reconnectionSeconds?: number;
}

type ClientMeta = {
  inputs: Set<string>;
  rate: RateLimitState;
  lastSeq: number;
};

/**
 * Server-authoritative Anvil multiplayer room (Colyseus).
 * Clients send `input` only. Server owns positions and HP.
 */
export class AnvilGameRoom extends Room<AnvilRoomState> {
  private moveSpeed = 160;
  private maxInputsPerSec = 30;
  private auth: AuthValidator = defaultAuthValidator;
  private spawn = { x: 100, y: 100 };
  private meta = new Map<string, ClientMeta>();
  private reconnectionSeconds = 60;

  onCreate(options: AnvilGameRoomOptions = {}): void {
    const defaults =
      (AnvilGameRoom as unknown as { defaultOptions?: AnvilGameRoomOptions })
        .defaultOptions ?? {};
    const opt = { ...defaults, ...options };

    this.setState(new AnvilRoomState());
    this.state.roomName = this.roomName || "anvil";
    this.maxClients = opt.maxClients ?? 16;
    this.moveSpeed = opt.moveSpeed ?? 160;
    this.maxInputsPerSec = opt.maxInputsPerSec ?? 30;
    this.auth = opt.auth ?? defaultAuthValidator;
    this.spawn = opt.spawn ?? { x: 100, y: 100 };
    this.reconnectionSeconds = opt.reconnectionSeconds ?? 60;

    // Seat reservation / patch rate for internet play
    this.setSeatReservationTime(15);

    const hz = opt.tickRate ?? 20;
    this.setSimulationInterval((dtMs) => this.simulate(dtMs / 1000), 1000 / hz);
    this.setPatchRate(1000 / hz);

    this.onMessage("input", (client, message) => {
      this.handleInput(client, message);
    });
  }

  async onAuth(
    _client: Client,
    options: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const result = await this.auth(options ?? {});
    if (!result.ok) {
      throw new Error(result.reason);
    }
    return {
      name: result.name ?? "Player",
      userId: result.userId,
    };
  }

  onJoin(
    client: Client,
    _options: unknown,
    auth: { name?: string } | undefined,
  ): void {
    // Reconnect reuses session — player may already exist
    if (this.state.players.has(client.sessionId)) {
      this.meta.set(client.sessionId, {
        inputs: new Set(),
        rate: { windowStartMs: Date.now(), count: 0 },
        lastSeq: -1,
      });
      return;
    }

    const p = new PlayerState();
    p.sessionId = client.sessionId;
    p.name = (auth?.name ?? "Player").slice(0, 24);
    const n = this.state.players.size;
    p.x = this.spawn.x + (n % 4) * 24;
    p.y = this.spawn.y + Math.floor(n / 4) * 24;
    p.hp = 100;
    p.maxHp = 100;
    this.state.players.set(client.sessionId, p);

    this.meta.set(client.sessionId, {
      inputs: new Set(),
      rate: { windowStartMs: Date.now(), count: 0 },
      lastSeq: -1,
    });
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    // Consented leave or reconnection disabled → drop player
    if (consented || this.reconnectionSeconds <= 0) {
      this.state.players.delete(client.sessionId);
      this.meta.delete(client.sessionId);
      return;
    }

    try {
      // Keep seat + state until client reconnects or timeout
      await this.allowReconnection(client, this.reconnectionSeconds);
      // Reconnected: meta re-bound in onJoin
    } catch {
      this.state.players.delete(client.sessionId);
      this.meta.delete(client.sessionId);
    }
  }

  private handleInput(client: Client, message: unknown): void {
    const meta = this.meta.get(client.sessionId);
    if (!meta) return;

    const now = Date.now();
    if (!rateLimitAllow(meta.rate, now, this.maxInputsPerSec, 1000)) {
      return;
    }

    const validated = validateInputMessage(message);
    if (!validated.ok) return;

    if (validated.value.seq > 0 && validated.value.seq <= meta.lastSeq) {
      return;
    }
    if (validated.value.seq > 0) meta.lastSeq = validated.value.seq;

    meta.inputs = new Set(validated.value.actions);
  }

  private simulate(dt: number): void {
    this.state.tick += 1;
    const speed = this.moveSpeed;

    this.state.players.forEach((player, sessionId) => {
      const meta = this.meta.get(sessionId);
      if (!meta) return;
      let ix = 0;
      let iy = 0;
      const a = meta.inputs;
      if (a.has("move_left")) ix -= 1;
      if (a.has("move_right")) ix += 1;
      if (a.has("move_up") || a.has("move_forward")) iy -= 1;
      if (a.has("move_down") || a.has("move_back")) iy += 1;
      if (ix !== 0 || iy !== 0) {
        const len = Math.hypot(ix, iy) || 1;
        player.x += (ix / len) * speed * dt;
        player.y += (iy / len) * speed * dt;
        player.facing = Math.atan2(iy, ix);
      }
      player.x = Math.max(0, Math.min(2000, player.x));
      player.y = Math.max(0, Math.min(2000, player.y));
    });
  }

  /** Server-only damage API (never driven by raw client messages). */
  damagePlayer(sessionId: string, amount: number): void {
    const p = this.state.players.get(sessionId);
    if (!p) return;
    p.hp = Math.max(0, p.hp - Math.max(0, amount));
  }
}
