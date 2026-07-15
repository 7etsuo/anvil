/** Ops smoke: /health + /metrics (outside vitest). */
import { createAnvilNetServer } from "./server.js";

const server = await createAnvilNetServer({ port: 25691, host: "127.0.0.1" });
const base = `http://127.0.0.1:${server.port}`;
try {
  const health = await fetch(`${base}/health`);
  if (!health.ok) throw new Error(`health ${health.status}`);
  const hj = (await health.json()) as { ok: boolean };
  if (!hj.ok) throw new Error("health body not ok");

  const metrics = await fetch(`${base}/metrics`);
  if (!metrics.ok) throw new Error(`metrics ${metrics.status}`);
  const body = await metrics.text();
  if (!body.includes("anvil_net_up 1")) throw new Error("metrics missing gauge");

  const stats = await server.getStats();
  if (stats.port !== server.port) throw new Error("stats port mismatch");

  console.log("OK ops", { port: server.port, rooms: stats.rooms });
} finally {
  await server.close();
}
