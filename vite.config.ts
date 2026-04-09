import { defineConfig } from "vitest/config";

const GITHUB_PAGES_BASE = "/splat/";

export default defineConfig(({ mode }) => ({
  base: mode === "development" ? "/" : GITHUB_PAGES_BASE,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("/node_modules/three/") ||
            id.endsWith("/node_modules/three/build/three.module.js")
          ) {
            return "three-vendor";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  test: {
    environment: "node",
    coverage: {
      reporter: ["text", "html"],
    },
  },
}));
