import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

async function expectFile(relativePath: string) {
  const stat = await fs.stat(path.join(ROOT, relativePath));
  expect(stat.isFile()).toBe(true);
}

describe("Distribution artifacts for git consumers", () => {
  it("includes compiled JS and type outputs for node and browser entry points", async () => {
    const compiledArtifacts = [
      "dist/index.js",
      "dist/index.d.ts",
      "dist/TarkovLogsParser.js",
      "dist/TarkovLogsParser.d.ts",
      "dist/browser.js",
      "dist/browser.d.ts",
      "dist/browserParser.js",
      "dist/browserParser.d.ts",
      "dist/analytics/TarkovLogsAnalytics.js",
      "dist/analytics/TarkovLogsAnalytics.d.ts",
      "dist/analytics/TarkovLogsInsights.js",
      "dist/analytics/TarkovLogsInsights.d.ts",
      "dist/analytics/TarkovLogsInsightsBrowser.js",
      "dist/analytics/TarkovLogsInsightsBrowser.d.ts",
      "dist/types/index.d.ts",
    ];

    for (const artifact of compiledArtifacts) {
      await expectFile(artifact);
    }
  });

  it("declares distributable files for git/npm installs", async () => {
    const pkgRaw = await fs.readFile(path.join(ROOT, "package.json"), "utf8");
    const pkg = JSON.parse(pkgRaw);
    const files = pkg.files as string[];

    expect(files).toEqual(expect.arrayContaining(["dist"]));
    for (const devOnly of ["dist-process", "dist-stats", "dist-insights"]) {
      expect(files).not.toContain(devOnly);
    }
  });
});
