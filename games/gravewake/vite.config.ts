import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const anvil = path.resolve(root, "../../anvil/packages");

export default defineConfig({
  root,
  publicDir: "public",
  build: {
    target: "esnext",
    outDir: "dist-web",
    emptyOutDir: true,
  },
  server: {
    port: 5180,
    strictPort: false,
  },
  resolve: {
    alias: {
      "@anvil/core": path.join(anvil, "core/src/index.ts"),
      "@anvil/schema": path.join(anvil, "schema/src/index.ts"),
      "@anvil/genre-topdown2d": path.join(anvil, "genre-topdown2d/src/index.ts"),
      "node:fs": path.resolve(root, "vite-stubs/fs.ts"),
      "node:path": path.resolve(root, "vite-stubs/path.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["@anvil/core", "@anvil/schema", "@anvil/genre-topdown2d"],
  },
});
