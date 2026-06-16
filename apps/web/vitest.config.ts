import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    // Playwright specs also end in `.spec.ts`; they belong to `playwright test`,
    // not vitest, and importing @playwright/test under vitest would throw.
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      // Mirror the tsconfig `@/*` path so server imports resolve under vitest.
      "@": path.resolve(__dirname, "./"),
    },
  },
});
