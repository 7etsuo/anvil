import { createServer } from "node:http";
import express from "express";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { AnvilGameRoom, type AnvilGameRoomOptions } from "./rooms/AnvilGameRoom.js";

export interface AnvilNetServerOpts {
  port?: number;
  host?: string;
  /** Room name clients join */
  roomName?: string;
  room?: AnvilGameRoomOptions;
}

export interface AnvilNetServer {
  port: number;
  gameServer: Server;
  httpServer: ReturnType<typeof createServer>;
  close: () => Promise<void>;
}

/**
 * Start a production-oriented Anvil multiplayer server (Colyseus + WS).
 */
export async function createAnvilNetServer(
  opts: AnvilNetServerOpts = {},
): Promise<AnvilNetServer> {
  const port = opts.port ?? 2567;
  const host = opts.host ?? "0.0.0.0";
  const roomName = opts.roomName ?? "anvil";

  const app = express();
  app.get("/health", (_req, res) => {
    res.json({ ok: true, room: roomName });
  });

  const httpServer = createServer(app);
  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: httpServer,
    }),
  });

  gameServer.define(roomName, AnvilGameRoom).enableRealtimeListing();
  // pass default room options via filter / onCreate — Colyseus uses class onCreate(options from client)
  // Room options from server: use .filterBy or set in onCreate from room options
  // Store server defaults on class:
  (AnvilGameRoom as unknown as { defaultOptions: AnvilGameRoomOptions }).defaultOptions =
    opts.room ?? {};

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(port, host, () => resolve());
    httpServer.once("error", reject);
  });

  const addr = httpServer.address();
  const actualPort =
    typeof addr === "object" && addr ? addr.port : port;

  return {
    port: actualPort,
    gameServer,
    httpServer,
    close: async () => {
      await gameServer.gracefullyShutdown(false);
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}
