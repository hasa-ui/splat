import { defineConfig } from "vitest/config";

const GITHUB_PAGES_BASE = "/splat/";

export default defineConfig(({ mode }) => ({
  base: mode === "development" ? "/" : GITHUB_PAGES_BASE,
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
