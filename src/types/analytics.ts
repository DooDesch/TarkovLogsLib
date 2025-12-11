import {
  AnyLogEvent,
  GameDataProvider,
  LogType,
  ParsedLogResult,
} from "./index.js";

export interface AnalyticsOptions {
  provider?: GameDataProvider;
}

export interface ResolvedEntity {
  id: string;
  name?: string;
  kind: "item" | "quest" | "trader" | "location" | "profile" | "other";
}

export interface SessionSummary {
  id: string;
  buildVersion?: string;
  earliestTimestamp?: string;
  latestTimestamp?: string;
  logTypes: LogType[];
  totals: {
    events: number;
    errors: number;
    warnings: number;
  };
}

export interface BackendStats {
  totalRequests: number;
  totalResponses: number;
  totalErrors: number;
  retries: number;
  byStatusCode: Record<string, number>;
  byEndpoint: Record<string, number>;
}

export interface CacheStats {
  hits: number;
  misses: number;
}

export interface InventoryStats {
  totalRejections: number;
  byOperation: Record<string, number>;
  byCode: Record<string, number>;
  items: Record<string, number>;
}

export interface NetworkStats {
  connections: number;
  disconnects?: number;
  timeouts: number;
  byAddress: Record<string, { connect: number; disconnect: number; timeout: number }>;
  metrics: {
    /** Samples from network-messages metrics */
    samples: number;
    rpiAvg?: number;
    ludAvg?: number;
    /** Samples from network-connection statistics events */
    rttSamples?: number;
    /** Average round-trip time in ms */
    rttAvg?: number;
    /** Total packets lost across all statistics events */
    totalPacketsLost?: number;
    /** Total packets sent across all statistics events */
    totalPacketsSent?: number;
    /** Total packets received across all statistics events */
    totalPacketsReceived?: number;
    /** Disconnect reasons counts */
    disconnectReasons?: Record<string, number>;
  };
}

export interface PushStats {
  connections: number;
  drops: number;
  notifications: number;
}

export interface AudioStats {
  initSuccess: number;
  occlusionErrors: number;
}

export interface ErrorStats {
  totals: number;
  byFamily: Record<string, number>;
}

export interface MatchmakingStats {
  groupIds: string[];
  events: AnyLogEvent[];
}

export interface AntiCheatStats {
  initLines: number;
  errors: number;
  lastStatus?: string;
}

export interface QuestStat {
  id: string;
  name?: string;
  traderId?: string;
  traderName?: string;
  status: "started" | "completed" | "failed" | "unknown";
  relatedEvents: AnyLogEvent[];
  rewardRubles?: number;
  rewardItems?: Record<string, number>;
}

export interface Statistics {
  sessions: SessionSummary[];
  backend: BackendStats;
  cache: CacheStats;
  inventory: InventoryStats;
  network: NetworkStats;
  push: PushStats;
  audio: AudioStats;
  errors: ErrorStats;
  matchmaking: MatchmakingStats;
  anticheat: AntiCheatStats;
  quests: QuestStat[];
  traders: Record<string, ResolvedEntity>;
  items: Record<string, ResolvedEntity>;
}
