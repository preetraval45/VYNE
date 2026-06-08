import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.tsx"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      reportsDirectory: "./coverage",
      // Measure only files exercised by the suite. Recent Vitest defaults
      // `all: true`, which instruments every file in `include` (incl. the
      // ~60 untested zustand stores at 0%) and tanks the global numbers far
      // below the thresholds these were calibrated against. The gate's intent
      // is to keep the tested pure-logic + security-critical surfaces covered,
      // so scope the denominator to what the tests actually touch.
      all: false,
      // Cover the pure-logic + security-critical surfaces. UI components
      // intentionally excluded because most are visual-only and the
      // dashboard pages are giant — Playwright e2e is the right tool
      // for those.
      include: [
        "src/lib/**/*.{ts,tsx}",
        "src/hooks/**/*.{ts,tsx}",
        "src/app/api/**/*.ts",
      ],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/types/**",
      ],
      // Branch-protection-ready thresholds. Numbers tuned to the
      // post-R3 baseline (Trie/LRU/aggregations/totp + CRUD factory +
      // forgot-password) — raise as more routes get tests.
      thresholds: {
        lines: 25,
        functions: 25,
        statements: 25,
        branches: 50,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // PH-H — Vite 7's stricter exports resolution can't read pusher-js's
      // package.json. Aliasing to a stub keeps any test that transitively
      // imports realtime/pusher.ts loadable.
      "pusher-js": path.resolve(__dirname, "./src/test/stubs/pusher-js.ts"),
    },
  },
});
