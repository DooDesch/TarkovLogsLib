import { promises as fs } from "fs";
import path from "path";
import { glob } from "glob";
import { TarkovLogsAnalytics } from "../dist/analytics/TarkovLogsAnalytics.js";

const inputDir = process.argv[2] ?? "dist-process";
const resolvedInput = path.resolve(process.cwd(), inputDir);
const outputRoot = path.resolve(process.cwd(), "dist-stats");
const outputFile = path.join(outputRoot, "stats.json");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function loadParsedResults(root) {
  const files = await glob("**/*.json", { cwd: root, absolute: true });
  if (!files.length) {
    throw new Error(`No parsed results found under ${root}. Run "pnpm process <logsDir>" first.`);
  }
  const results = [];
  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    results.push(JSON.parse(raw));
  }
  return results;
}

async function run() {
  try {
    await fs.access(resolvedInput);
  } catch {
    console.error(`Input directory not found: ${resolvedInput}`);
    process.exit(1);
  }

  const parsedResults = await loadParsedResults(resolvedInput);
  const analytics = new TarkovLogsAnalytics(parsedResults);
  const stats = await analytics.computeStatistics();

  await ensureDir(outputRoot);
  await fs.writeFile(outputFile, JSON.stringify(stats, null, 2), "utf8");
  console.log(`Statistics written to ${outputFile}`);
}

run().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
