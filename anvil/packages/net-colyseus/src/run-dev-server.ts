import { createAnvilNetServer } from "./server.js";

const port = Number(process.env.PORT ?? 2567);
const server = await createAnvilNetServer({ port, host: "0.0.0.0" });
console.log(`[anvil-net] Colyseus listening on ws://0.0.0.0:${server.port}`);
console.log(`[anvil-net] health http://127.0.0.1:${server.port}/health`);
