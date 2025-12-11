# TarkovLogsLib

Typed parsing toolkit for Escape from Tarkov client logs. Converts raw log text into structured JSON according to the schemas in `docs`, and can optionally enrich events with EFT domain data (items, quests, traders, locations).

## Install

```bash
pnpm add tarkov-logs-lib
# or
npm install tarkov-logs-lib
```

## Usage

```ts
import {
  TarkovLogsParser,
  TarkovDevGameDataProvider,
  GameDataCache,
  TarkovLogsAnalytics,
} from "tarkov-logs-lib";

const parser = new TarkovLogsParser({
  gameDataProvider: new TarkovDevGameDataProvider(), // optional
  cache: new GameDataCache({ ttlMs: 60_000 }),
  enrichGameData: true, // set false for pure parsing
});

const result = await parser.parseFile(
  "path/to/log_YYYY.MM.DD_HH-MM-SS_VERSION application_000.log"
);
console.log(result.events[0]);
```

### Parse multiple files or a directory

```ts
const many = await parser.parseFiles([
  "/logs/application_000.log",
  "/logs/backend_000.log",
]);
const fromDir = await parser.parseDirectory("/logs/session-folder");

const analytics = new TarkovLogsAnalytics(fromDir, {
  provider: new TarkovDevGameDataProvider(),
  cache: new GameDataCache({ ttlMs: 60_000 }),
});
const stats = await analytics.computeStatistics();
console.log(stats);
```

### Event structure

Each parsed event is strongly typed per log family (e.g., `ApplicationLogEvent`, `BackendLogEvent`). Shared fields:

- `timestamp` (ISO), `timestampRaw`, `version`, `level`, `component`
- `message`, `eventFamily`, `continuation?`, `fields` (type-specific structured data)
- `logType` discriminant

`ParsedLogResult` also provides `meta` (earliest/latest timestamp, build version, session prefix).

### Game data enrichment

Set `enrichGameData: true` and provide a `GameDataProvider`:

- `TarkovDevGameDataProvider` (GraphQL: `https://api.tarkov.dev/graphql`) resolves items, quests, traders, and maps.
- `TarkovTrackerDataProvider` (static JSON: `https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master`) provides offline-friendly items/quests/traders/maps.

Responses are optionally cached with `GameDataCache` (file-backed, configurable TTL).

## Browser Usage

For browser environments (no Node.js), use the `/browser` entry point:

```ts
import {
  parseText,
  parseTexts,
  TarkovLogsInsights,
  ParsedLogResult,
  Insights,
} from "tarkov-logs-lib/browser";

// Parse a single file
const result = parseText("application_000.log", logContent);

// Parse multiple files
const results = parseTexts([
  { fileName: "application_000.log", content: appLogContent },
  { fileName: "backend_000.log", content: backendLogContent },
]);

// Compute insights (browser-safe, no external API calls)
const insights = new TarkovLogsInsights(results);
const data = await insights.compute();
```

The browser entry point:
- Does not use `fs`, `path`, `glob` or any Node.js-only modules
- Includes `parseText` and `parseTexts` helpers for parsing raw text
- Includes a browser-safe `TarkovLogsInsights` class (without external API resolution)
- Exports all type definitions

## Log coverage

Parsers follow the schemas in `../docs` for:

- application, backend, backendCache, backend_queue, errors, files-checker, insurance, inventory
- network-connection, network-messages, objectPool, output, player, push-notifications, seasons, spatial-audio, aiData, aiErrors

Multi-line events are stitched using header lines with `|` separators; continuations are attached to the originating event.

## Development

```bash
pnpm install
pnpm build
pnpm test           # unit tests
pnpm test:e2e       # e2e/integration tests
pnpm process ./tests/fixtures/logs   # parse logs to dist-process
pnpm stats           # compute analytics into dist-stats/stats.json (uses dist-process)
pnpm insights        # compute high-level insights into dist-insights/insights.json (uses dist-process)
```

Assumptions and mappings come directly from `../docs/*.md`. If new log families appear, add a parser module in `src/parsers` and extend the typed unions in `src/types`.
