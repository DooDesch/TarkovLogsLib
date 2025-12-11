import { promises as fs } from "fs";
import path from "path";
import { glob } from "glob";
import { TarkovLogsParser } from "../dist/TarkovLogsParser.js";
import { TarkovDevGameDataProvider } from "../dist/gameData/tarkovDevProvider.js";
import { GameDataCache } from "../dist/cache/gameDataCache.js";
import { TarkovLogsAnalytics } from "../dist/analytics/TarkovLogsAnalytics.js";
import { TarkovLogsInsights } from "../dist/analytics/TarkovLogsInsights.js";

const inputDir = process.argv[2];
if (!inputDir) {
  console.error("Usage: pnpm process:insights:enrich <logsDir>");
  process.exit(1);
}

const resolvedInput = path.resolve(process.cwd(), inputDir);
const outputProcessRoot = path.resolve(process.cwd(), "dist-process-enriched");
const outputStatsRoot = path.resolve(process.cwd(), "dist-stats-enriched");
const outputInsightsRoot = path.resolve(process.cwd(), "dist-insights-enriched");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function loadParsedResults(root) {
  const files = await glob("**/*.json", { cwd: root, absolute: true });
  if (!files.length) {
    throw new Error(`No parsed results found under ${root}.`);
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
    const stats = await fs.stat(resolvedInput);
    if (!stats.isDirectory()) {
      throw new Error(`${resolvedInput} is not a directory`);
    }
  } catch (err) {
    console.error(`Input directory not found: ${resolvedInput}`);
    console.error(err?.message ?? err);
    process.exit(1);
  }

  await ensureDir(outputProcessRoot);
  const provider = new TarkovDevGameDataProvider();
  const cache = new GameDataCache();
  const parser = new TarkovLogsParser({
    gameDataProvider: provider,
    cache,
    enrichGameData: true,
  });

  const files = await glob("**/*.log", { cwd: resolvedInput, absolute: true });
  if (files.length === 0) {
    console.warn(`No .log files found under ${resolvedInput}`);
    return;
  }

  for (const file of files) {
    const rel = path.relative(resolvedInput, file);
    const outPath = path.join(outputProcessRoot, `${rel}.json`);
    await ensureDir(path.dirname(outPath));
    try {
      const result = await parser.parseFile({ path: file });
      await fs.writeFile(outPath, JSON.stringify(result, null, 2), "utf8");
      console.log(`Processed (enriched) ${rel}`);
    } catch (err) {
      console.error(`Failed to process ${file}:`, err?.message ?? err);
    }
  }

  // Compute stats and insights from enriched parse outputs
  const parsedResults = await loadParsedResults(outputProcessRoot);
  const analytics = new TarkovLogsAnalytics(parsedResults, { provider, cache });
  const stats = await analytics.computeStatistics();

  await ensureDir(outputStatsRoot);
  await fs.writeFile(path.join(outputStatsRoot, "stats.json"), JSON.stringify(stats, null, 2), "utf8");
  console.log(`Statistics written to ${path.join(outputStatsRoot, "stats.json")}`);

  const insights = new TarkovLogsInsights(parsedResults);
  const insightsData = await insights.compute();

  await ensureDir(outputInsightsRoot);
  await fs.writeFile(path.join(outputInsightsRoot, "insights.json"), JSON.stringify(insightsData, null, 2), "utf8");
  console.log(`Insights written to ${path.join(outputInsightsRoot, "insights.json")}`);
}

run().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
