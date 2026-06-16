import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      // Mirror the tsconfig `@/*` path so server imports resolve under vitest.
      "@": path.resolve(__dirname, "./"),
    },
  },
});
