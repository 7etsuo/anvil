import { createServer, type Server as HttpServer } from "node:http";
import express from "express";
import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import {
  AnvilGameRoom,
  type AnvilGameRoomOptions,
} from "./rooms/AnvilGameRoom.js";

export interface AnvilNetServerOpts {
  port?: number;
  host?: string;
  /** Room name clients join */
  roomName?: string;
  room?: AnvilGameRoomOptions;
  /**
   * Redis URL for multi-process presence + driver (optional).
   * e.g. redis://127.0.0.1:6379
   * Requires optional deps @colyseus/redis-presence + @colyseus/redis-driver.
   */
  redisUrl?: string;
  /**
   * Public URL clients use (for reverse-proxy / WSS).
   * Example: https://game.example.com or wss://game.example.com
   */
  publicAddress?: string;
  /** Trust X-Forwarded-* (set true behind nginx/caddy TLS terminator) */
  trustProxy?: boolean;
  /** Seconds a disconnected client may reconnect (0 = off) */
  reconnectionSeconds?: number;
}

export interface AnvilNetServer {
  port: number;
  gameServer: Server;
  httpServer: HttpServer;
  roomName: string;
  /** Live counters for /metrics and agents */
  getStats: () => Promise<NetServerStats>;
  close: () => Promise<void>;
}

export interface NetServerStats {
  ok: true;
  roomName: string;
  port: number;
  uptimeSec: number;
  redis: boolean;
  publicAddress: string | null;
  rooms: number;
  clients: number;
}

/**
 * Production Anvil multiplayer server (Colyseus + WS).
 * TLS: terminate at reverse proxy and set trustProxy + publicAddress.
 */
export async function createAnvilNetServer(
  opts: AnvilNetServerOpts = {},
): Promise<AnvilNetServer> {
  const port = opts.port ?? 2567;
  const host = opts.host ?? "0.0.0.0";
  const roomName = opts.roomName ?? "anvil";
  const redisUrl = opts.redisUrl ?? process.env.REDIS_URL ?? undefined;
  const publicAddress =
    opts.publicAddress ?? process.env.ANVIL_PUBLIC_ADDRESS ?? null;
  const trustProxy =
    opts.trustProxy ?? process.env.ANVIL_TRUST_PROXY === "1";
  const reconnectionSeconds =
    opts.reconnectionSeconds ??
    Number(process.env.ANVIL_RECONNECT_SEC ?? 60);

  const startedAt = Date.now();
  const app = express();
  if (trustProxy) app.set("trust proxy", 1);

  app.get("/health", async (_req, res) => {
    try {
      const stats = await collectStats();
      res.json(stats);
    } catch (e) {
      res.status(500).json({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.get("/metrics", async (_req, res) => {
    try {
      const s = await collectStats();
      res.type("text/plain").send(
        [
          `# HELP anvil_net_up 1 if server process is up`,
          `# TYPE anvil_net_up gauge`,
          `anvil_net_up 1`,
          `# HELP anvil_net_rooms Active Colyseus rooms`,
          `# TYPE anvil_net_rooms gauge`,
          `anvil_net_rooms ${s.rooms}`,
          `# HELP anvil_net_clients Connected clients`,
          `# TYPE anvil_net_clients gauge`,
          `anvil_net_clients ${s.clients}`,
          `# HELP anvil_net_uptime_seconds Process uptime`,
          `# TYPE anvil_net_uptime_seconds counter`,
          `anvil_net_uptime_seconds ${s.uptimeSec}`,
          `# HELP anvil_net_redis 1 if redis backend enabled`,
          `# TYPE anvil_net_redis gauge`,
          `anvil_net_redis ${s.redis ? 1 : 0}`,
        ].join("\n") + "\n",
      );
    } catch (e) {
      res.status(500).send(`# error ${e}\n`);
    }
  });

  const httpServer = createServer(app);

  // Optional Redis presence/driver for multi-node
  let presence: unknown;
  let driver: unknown;
  let redisEnabled = false;
  if (redisUrl) {
    try {
      const { RedisPresence } = await import("@colyseus/redis-presence");
      const { RedisDriver } = await import("@colyseus/redis-driver");
      presence = new RedisPresence(redisUrl);
      driver = new RedisDriver(redisUrl);
      redisEnabled = true;
    } catch (e) {
      console.warn(
        "[anvil-net] REDIS_URL set but redis packages failed to load:",
        e instanceof Error ? e.message : e,
      );
      console.warn(
        "[anvil-net] Install optionalDeps: @colyseus/redis-presence @colyseus/redis-driver",
      );
    }
  }

  const serverOpts: ConstructorParameters<typeof Server>[0] = {
    transport: new WebSocketTransport({
      server: httpServer,
    }),
  };
  if (presence) (serverOpts as { presence: unknown }).presence = presence;
  if (driver) (serverOpts as { driver: unknown }).driver = driver;

  const gameServer = new Server(serverOpts);

  (AnvilGameRoom as unknown as { defaultOptions: AnvilGameRoomOptions }).defaultOptions =
    {
      ...(opts.room ?? {}),
      reconnectionSeconds,
    };

  gameServer.define(roomName, AnvilGameRoom).enableRealtimeListing();

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(port, host, () => resolve());
    httpServer.once("error", reject);
  });

  const addr = httpServer.address();
  const actualPort =
    typeof addr === "object" && addr ? addr.port : port;

  async function collectStats(): Promise<NetServerStats> {
    let rooms = 0;
    let clients = 0;
    try {
      const list = await matchMaker.query({});
      rooms = list.length;
      clients = list.reduce(
        (n, r) => n + (r.clients ?? 0),
        0,
      );
    } catch {
      /* matchMaker may be empty at boot */
    }
    return {
      ok: true,
      roomName,
      port: actualPort,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      redis: redisEnabled,
      publicAddress,
      rooms,
      clients,
    };
  }

  const onSignal = () => {
    void (async () => {
      console.log("[anvil-net] shutting down…");
      try {
        await gameServer.gracefullyShutdown(false);
      } catch {
        /* ignore */
      }
      httpServer.close(() => process.exit(0));
    })();
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  return {
    port: actualPort,
    gameServer,
    httpServer,
    roomName,
    getStats: collectStats,
    close: async () => {
      process.removeListener("SIGINT", onSignal);
      process.removeListener("SIGTERM", onSignal);
      await gameServer.gracefullyShutdown(false);
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}
