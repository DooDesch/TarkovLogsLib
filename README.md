# TarkovLogsLib

Typed parsing, enrichment, and analytics toolkit for Escape from Tarkov client logs. Turns raw log text into strongly-typed JSON, optionally resolves EFT domain data, and provides higher-level statistics/insights for analysis.

## Features

- Typed parsers for the official EFT log families documented in `docs/` (application, backend, backendCache, backend_queue, errors, files-checker, insurance, inventory, network-connection, network-messages, objectPool, output, player, push-notifications, seasons, spatial-audio, aiData, aiErrors).
- Node and browser entry points (`tarkov-logs-lib` and `tarkov-logs-lib/browser`).
- Optional enrichment via `TarkovDevGameDataProvider` (GraphQL) or `TarkovTrackerDataProvider` (static JSON) with `GameDataCache` for caching.
- Aggregated statistics with `TarkovLogsAnalytics` and higher-level timelines/quests/network insights with `TarkovLogsInsights`.
- Helper scripts to parse fixtures and emit derived datasets (`dist-process`, `dist-stats`, `dist-insights`).

## Install

```bash
pnpm add tarkov-logs-lib
# or
npm install tarkov-logs-lib
```

## Node quick start

```ts
import {
  TarkovLogsParser,
  TarkovDevGameDataProvider,
  GameDataCache,
  TarkovLogsAnalytics,
  TarkovLogsInsights,
} from "tarkov-logs-lib";

const parser = new TarkovLogsParser({
  gameDataProvider: new TarkovDevGameDataProvider(), // optional enrichment
  cache: new GameDataCache({ ttlMs: 60_000 }),
  enrichGameData: true, // set false for pure parsing
});

const results = await parser.parseDirectory("path/to/log/session-folder");

const stats = await new TarkovLogsAnalytics(results, {
  provider: new TarkovDevGameDataProvider(),
  cache: new GameDataCache({ ttlMs: 60_000 }),
}).computeStatistics();

const insights = await new TarkovLogsInsights(results, {
  provider: new TarkovDevGameDataProvider(),
}).compute();
```

## Parsed data shape

Each parsed event is strongly typed per log family (e.g., `ApplicationLogEvent`, `BackendLogEvent`). Shared fields:

- `timestamp` (ISO), `timestampRaw`, `version`, `level`, `component`
- `message`, `eventFamily`, `continuation?`, `fields` (type-specific structured data)
- `logType` discriminant

`ParsedLogResult` also provides `meta` (earliest/latest timestamp, build version, session prefix) and the originating `filePath`.

## Game data enrichment

Set `enrichGameData: true` and provide a `GameDataProvider`:

- `TarkovDevGameDataProvider` (GraphQL: `https://api.tarkov.dev/graphql`) resolves items, quests, traders, and maps.
- `TarkovTrackerDataProvider` (static JSON: `https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master`) provides offline-friendly items/quests/traders/maps.

Responses can be cached with `GameDataCache` (file-backed, configurable TTL).

## Browser usage

For browser environments, use the `/browser` entry point:

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

- Avoids Node-only modules (`fs`, `path`, `glob`).
- Exposes `parseText` / `parseTexts`, `defaultParsers`, types, and a browser-safe `TarkovLogsInsights`.

## Schemas and coverage

Log schemas, correlations, and assumptions live in `docs/`:

- Master reference: `docs/log_schema_master_reference.md`
- Directory map and relations: `docs/log_directory_map.md`, `docs/log_relations.md`, `docs/log_correlations.md`
- Per-log-family schemas: `docs/logtype_*.md` (application, backend, backendCache, backend_queue, errors, files-checker, insurance, inventory, network-connection, network-messages, objectPool, output, player, push-notifications, seasons, spatial-audio, aiData, aiErrors)

Multi-line events are stitched via header lines with `|`; continuations are attached to the originating event.

## Generated datasets and scripts

```bash
pnpm process ./tests/fixtures/logs   # parse fixtures into dist-process/
pnpm stats                           # compute analytics into dist-stats/stats.json (uses dist-process)
pnpm insights                        # compute high-level insights into dist-insights/insights.json (uses dist-process)
```

## Development & testing

```bash
pnpm install
pnpm build
pnpm test           # unit tests
pnpm test:e2e       # e2e/integration tests
```

If new log families appear, add a parser module in `src/parsers` and extend the typed unions in `src/types`.
