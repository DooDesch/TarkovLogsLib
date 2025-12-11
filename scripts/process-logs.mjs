import { promises as fs } from "fs";
import path from "path";
import { glob } from "glob";
import { TarkovLogsParser } from "../dist/TarkovLogsParser.js";

const inputDir = process.argv[2];
if (!inputDir) {
  console.error("Usage: pnpm process <logsDir>");
  process.exit(1);
}

const resolvedInput = path.resolve(process.cwd(), inputDir);
const outputRoot = path.resolve(process.cwd(), "dist-process");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
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

  await ensureDir(outputRoot);
  const parser = new TarkovLogsParser();
  const files = await glob("**/*.log", { cwd: resolvedInput, absolute: true });
  if (files.length === 0) {
    console.warn(`No .log files found under ${resolvedInput}`);
    return;
  }

  for (const file of files) {
    const rel = path.relative(resolvedInput, file);
    const outPath = path.join(outputRoot, `${rel}.json`);
    await ensureDir(path.dirname(outPath));
    try {
      const result = await parser.parseFile({ path: file });
      await fs.writeFile(outPath, JSON.stringify(result, null, 2), "utf8");
      console.log(`Processed ${rel}`);
    } catch (err) {
      console.error(`Failed to process ${file}:`, err?.message ?? err);
    }
  }

  console.log(`Output written to ${outputRoot}`);
}

run();
