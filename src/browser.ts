/**
 * Browser-friendly exports for TarkovLogsLib.
 * Does not include any Node.js specific modules (fs, path, glob).
 */

// Types only
export type {
  ParsedLogResult,
  AnyLogEvent,
  LogType,
  LogParser,
  GameDataProvider,
  ApplicationLogEvent,
  BackendLogEvent,
  BackendCacheLogEvent,
  BackendQueueLogEvent,
  ErrorsLogEvent,
  FilesCheckerLogEvent,
  InsuranceLogEvent,
  InventoryLogEvent,
  NetworkConnectionLogEvent,
  NetworkMessagesLogEvent,
  ObjectPoolLogEvent,
  OutputLogEvent,
  PlayerLogEvent,
  PushNotificationsLogEvent,
  SeasonsLogEvent,
  SpatialAudioLogEvent,
  AiDataLogEvent,
  AiErrorsLogEvent,
} from "./types/index.js";

export type {
  Statistics,
  QuestStat,
  MatchmakingStats,
  SessionSummary,
  ResolvedEntity,
  BackendStats,
  CacheStats,
  InventoryStats,
  NetworkStats,
  PushStats,
  AudioStats,
  ErrorStats,
  AntiCheatStats,
} from "./types/analytics.js";

export type {
  Insights,
  SessionTimeline,
  QuestInsight,
  MatchingInsight,
  StartupInsight,
  ErrorInsight,
  InventoryInsight,
  ConnectivityInsight,
  InsightsOptions,
  ParsedInput,
} from "./types/insights.js";

// Browser-safe parsing functions
export { parseText, parseTexts, ParseTextOptions } from "./browserParser.js";

// Parsers (no fs usage)
export { defaultParsers } from "./parsers/index.js";

// Analytics (browser-safe version without fs/cache)
export { TarkovLogsInsightsBrowser as TarkovLogsInsights } from "./analytics/TarkovLogsInsightsBrowser.js";
