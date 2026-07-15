import { createAnvilNetServer } from "./server.js";

const port = Number(process.env.PORT ?? 2567);
const server = await createAnvilNetServer({
  port,
  host: process.env.HOST ?? "0.0.0.0",
  redisUrl: process.env.REDIS_URL,
  publicAddress: process.env.ANVIL_PUBLIC_ADDRESS,
  trustProxy: process.env.ANVIL_TRUST_PROXY === "1",
  reconnectionSeconds: Number(process.env.ANVIL_RECONNECT_SEC ?? 60),
});

console.log(`[anvil-net] Colyseus ws://0.0.0.0:${server.port}`);
console.log(`[anvil-net] health  http://127.0.0.1:${server.port}/health`);
console.log(`[anvil-net] metrics http://127.0.0.1:${server.port}/metrics`);
if (process.env.REDIS_URL) {
  console.log(`[anvil-net] redis   ${process.env.REDIS_URL}`);
}
if (process.env.ANVIL_PUBLIC_ADDRESS) {
  console.log(`[anvil-net] public  ${process.env.ANVIL_PUBLIC_ADDRESS}`);
}
