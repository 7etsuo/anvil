import path from "node:path";
import { defineConfig } from "vite";

const root = path.resolve(__dirname);

export default defineConfig({
  root,
  build: {
    target: "esnext",
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  resolve: {
    alias: {
      "@anvil/core": path.resolve(root, "../../packages/core/src/index.ts"),
      "@anvil/schema": path.resolve(root, "../../packages/schema/src/index.ts"),
      "node:fs": path.resolve(root, "vite-stubs/fs.ts"),
      "node:path": path.resolve(root, "vite-stubs/path.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["@anvil/core", "@anvil/schema"],
  },
});
