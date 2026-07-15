import { afterEach, describe, expect, it } from "vitest";
import { decodeMessage, encodeMessage } from "./messages.js";
import { NetServer, WsClientTransport } from "./NetServer.js";

describe("NetServer (real WebSocket)", () => {
  let server: NetServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it("relays binary/JSON messages between two clients", async () => {
    server = await NetServer.listen({ port: 18743, host: "127.0.0.1" });
    const url = `ws://127.0.0.1:${server.port}`;

    const a = new WsClientTransport(url);
    const b = new WsClientTransport(url);
    await a.connect();
    await b.connect();

    const got: string[] = [];
    b.onMessage((bytes) => {
      try {
        const msg = decodeMessage(bytes);
        if (msg.type === "input") got.push(msg.peerId);
      } catch {
        /* ignore server hello */
      }
    });

    // allow server hellos to settle
    await new Promise((r) => setTimeout(r, 50));

    a.send(
      encodeMessage({
        type: "input",
        tick: 1,
        actions: ["move_right"],
        peerId: "alice",
      }),
    );

    await new Promise((r) => setTimeout(r, 150));
    expect(got).toContain("alice");
    expect(server.clientCount()).toBe(2);

    a.close();
    b.close();
  }, 15000);
});
