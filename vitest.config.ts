import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      all: false,
      include: ["src/parsers/**", "src/cache/**", "src/TarkovLogsParser.ts"],
      exclude: [
        "scripts/**",
        "src/gameData/**",
        "src/analytics/**",
        "src/types/**",
        "src/index.ts",
        "src/browser.ts",
        "src/browserParser.ts",
      ],
    },
  },
});
