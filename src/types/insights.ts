import { ResolvedEntity } from "./analytics.js";
import { ParsedLogResult, AnyLogEvent, GameDataProvider } from "./index.js";

/**
 * Cache interface for insights options.
 * Browser builds can omit this; Node builds use GameDataCache.
 */
export interface InsightsCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

export interface SessionTimeline {
  sessionId: string;
  buildVersion?: string;
  startedAt?: string;
  endedAt?: string;
  firstBackendAt?: string;
  firstConnectAt?: string;
  firstMatchEventAt?: string;
  firstInventoryErrorAt?: string;
  firstErrorAt?: string;
  startupDurationMs?: number;
  matchmakingDurationMs?: number;
}

export interface QuestInsight {
  id: string;
  name?: string;
  traderId?: string;
  traderName?: string;
  status: "started" | "completed" | "failed" | "unknown";
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  relatedEvents: AnyLogEvent[];
}

export interface MatchingInsight {
  sessions: Array<{
    sessionId: string;
    groupId?: string;
    startedAt?: string;
    preparedAt?: string;
    runnedAt?: string;
    durationMs?: number;
  }>;
  averageDurationMs?: number;
}

export interface StartupInsight {
  sessions: Array<{
    sessionId: string;
    startedAt?: string;
    firstBackendAt?: string;
    durationMs?: number;
  }>;
  averageDurationMs?: number;
}

export interface ErrorInsight {
  total: number;
  byFamily: Record<string, number>;
  firstAt?: string;
}

export interface InventoryInsight {
  totalRejections: number;
  byOperation: Record<string, number>;
  byCode: Record<string, number>;
}

export interface ConnectivityInsight {
  totalConnections: number;
  totalDisconnects: number;
  totalTimeouts: number;
  byAddress: Record<string, { connect: number; disconnect: number; timeout: number }>;
}

export interface Insights {
  timelines: SessionTimeline[];
  quests: QuestInsight[];
  matching: MatchingInsight;
  startup: StartupInsight;
  errors: ErrorInsight;
  inventory: InventoryInsight;
  connectivity: ConnectivityInsight;
  items: Record<string, ResolvedEntity>;
  traders: Record<string, ResolvedEntity>;
}

export interface InsightsOptions {
  provider?: GameDataProvider;
  cache?: InsightsCache;
}

export type ParsedInput = ParsedLogResult | ParsedLogResult[];
