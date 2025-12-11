import { describe, expect, it } from "vitest";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import { glob } from "glob";
import { TarkovLogsParser } from "../../../src/TarkovLogsParser.ts";
import { extractSessionPrefix } from "../../../src/parsers/base.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_ROOT = path.resolve(__dirname, "..", "..", "fixtures", "logs");

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function countHeaders(content: string, logType: string): number {
  const escaped = logType.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const headerRegex = new RegExp(
    `^\\d{4}-\\d{2}-\\d{2}[^|]*\\|[^|]*\\|[^|]*\\|${escaped}\\|`
  );
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => headerRegex.test(line)).length;
}

describe("Full log coverage from disk fixtures", () => {
  const logsRoot = FIXTURE_ROOT;
  const parser = new TarkovLogsParser({ enrichGameData: false });

  it(
    "parses every .log file and covers every header event",
    { timeout: 120_000 },
    async () => {
      if (!(await exists(logsRoot))) {
        throw new Error(
          `Logs fixtures not found at ${logsRoot}. Add logs under tests/fixtures/logs.`
        );
      }

      const logFiles = await glob("**/*.log", {
        cwd: logsRoot,
        absolute: true,
      });
      expect(logFiles.length).toBeGreaterThan(0);

      const mismatches: Array<{
        file: string;
        logType: string;
        headers: number;
        events: number;
      }> = [];

      for (const file of logFiles) {
        const result = await parser.parseFile({ path: file });
        const content = await fs.readFile(file, "utf8");
        const headerCount = countHeaders(content, result.logType);

        if (result.events.length !== headerCount) {
          mismatches.push({
            file: path.basename(file),
            logType: result.logType,
            headers: headerCount,
            events: result.events.length,
          });
        }

        for (const event of result.events) {
          expect(event.timestamp).toBeTruthy();
          expect(event.eventFamily).toBeTruthy();
        }
      }

      expect(mismatches).toEqual([]);
    }
  );
});
