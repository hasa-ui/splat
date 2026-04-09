import { defineConfig } from "vitest/config";

const GITHUB_PAGES_BASE = "/splat/";

export default defineConfig(({ command }) => ({
  base: command === "build" ? GITHUB_PAGES_BASE : "/",
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
