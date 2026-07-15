/**
 * Integration smoke for Colyseus (run outside Vitest worker pool).
 * Usage: tsx src/run-integration.ts
 */
import { connectAnvilNet } from "./client.js";
import { createAnvilNetServer } from "./server.js";

async function main(): Promise<void> {
  const server = await createAnvilNetServer({
    port: 25681,
    host: "127.0.0.1",
    room: { moveSpeed: 400, tickRate: 20 },
  });
  const endpoint = `ws://127.0.0.1:${server.port}`;
  try {
    const a = await connectAnvilNet({ endpoint, name: "Alpha" });
    const b = await connectAnvilNet({ endpoint, name: "Bravo" });
    await new Promise((r) => setTimeout(r, 200));

    const me = a.getState().players.get(a.sessionId);
    if (!me) throw new Error("missing self in state");
    const x0 = me.x;

    for (let i = 0; i < 20; i++) {
      a.sendInput(["move_right"], i + 1);
      await new Promise((r) => setTimeout(r, 40));
    }
    await new Promise((r) => setTimeout(r, 250));

    const x1 = a.getState().players.get(a.sessionId)!.x;
    if (!(x1 > x0 + 5)) {
      throw new Error(`expected movement, x0=${x0} x1=${x1}`);
    }
    const aOnB = b.getState().players.get(a.sessionId);
    if (!aOnB || aOnB.x <= x0) {
      throw new Error("peer did not observe movement");
    }
    console.log("OK colyseus integration", { x0, x1, peerX: aOnB.x });
    await a.leave();
    await b.leave();
  } finally {
    await server.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
