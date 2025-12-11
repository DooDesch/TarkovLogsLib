import {
  AnyLogEvent,
  GameDataProvider,
  ParsedLogResult,
} from "../types/index.js";
import {
  AnalyticsOptions,
  AntiCheatStats,
  AudioStats,
  BackendStats,
  CacheStats,
  ErrorStats,
  InventoryStats,
  MatchmakingStats,
  NetworkStats,
  PushStats,
  QuestStat,
  ResolvedEntity,
  SessionSummary,
  Statistics,
} from "../types/analytics.js";
import { extractSessionPrefix } from "../parsers/base.js";
import { GameDataCache } from "../cache/gameDataCache.js";

export class TarkovLogsAnalytics {
  private readonly results: ParsedLogResult[];
  private readonly provider?: GameDataProvider;
  private readonly cache?: GameDataCache;

  constructor(results: ParsedLogResult | ParsedLogResult[], options?: AnalyticsOptions & { cache?: GameDataCache }) {
    this.results = Array.isArray(results) ? results : [results];
    this.provider = options?.provider;
    this.cache = options?.cache;
  }

  async computeStatistics(): Promise<Statistics> {
    const sessions = this.buildSessions();
    const backend: BackendStats = {
      totalRequests: 0,
      totalResponses: 0,
      totalErrors: 0,
      retries: 0,
      byStatusCode: {},
      byEndpoint: {},
    };
    const cache: CacheStats = { hits: 0, misses: 0 };
    const inventory: InventoryStats = { totalRejections: 0, byOperation: {}, byCode: {}, items: {} };
    const network: NetworkStats = { connections: 0, disconnects: 0, timeouts: 0, byAddress: {}, metrics: { samples: 0 } };
    const push: PushStats = { connections: 0, drops: 0, notifications: 0 };
    const audio: AudioStats = { initSuccess: 0, occlusionErrors: 0 };
    const errors: ErrorStats = { totals: 0, byFamily: {} };
    const matchmaking: MatchmakingStats = { groupIds: [], events: [] };
    const anticheat: AntiCheatStats = { initLines: 0, errors: 0 };
    const quests: Record<string, QuestStat> = {};
    const traders: Record<string, ResolvedEntity> = {};
    const items: Record<string, ResolvedEntity> = {};

    for (const result of this.results) {
      for (const event of result.events) {
        this.accumulateBackend(event, backend);
        this.accumulateCache(event, cache);
        this.accumulateInventory(event, inventory, items);
        this.accumulateNetwork(event, network);
        this.accumulatePush(event, push);
        this.accumulateAudio(event, audio);
        this.accumulateErrors(event, errors);
        this.accumulateMatchmaking(event, matchmaking);
        this.accumulateAnticheat(event, anticheat);
        await this.accumulateQuest(event, quests, traders);
      }
    }

    return {
      sessions,
      backend,
      cache,
      inventory,
      network,
      push,
      audio,
      errors,
      matchmaking,
      anticheat,
      quests: Object.values(quests),
      traders,
      items,
    };
  }

  private buildSessions(): SessionSummary[] {
    const sessionsMap = new Map<string, SessionSummary>();
    for (const res of this.results) {
      const sessionId = res.meta.sessionPrefix ?? extractSessionPrefix(res.filePath) ?? "unknown";
      const existing = sessionsMap.get(sessionId);
      const counts = this.countLevels(res.events);
      if (!existing) {
        sessionsMap.set(sessionId, {
          id: sessionId,
          buildVersion: res.meta.buildVersion,
          earliestTimestamp: res.meta.earliestTimestamp,
          latestTimestamp: res.meta.latestTimestamp,
          logTypes: [res.logType],
          totals: counts,
        });
      } else {
        existing.totals.events += counts.events;
        existing.totals.errors += counts.errors;
        existing.totals.warnings += counts.warnings;
        if (!existing.logTypes.includes(res.logType)) {
          existing.logTypes.push(res.logType);
        }
        if (res.meta.earliestTimestamp && (!existing.earliestTimestamp || res.meta.earliestTimestamp < existing.earliestTimestamp)) {
          existing.earliestTimestamp = res.meta.earliestTimestamp;
        }
        if (res.meta.latestTimestamp && (!existing.latestTimestamp || res.meta.latestTimestamp > existing.latestTimestamp)) {
          existing.latestTimestamp = res.meta.latestTimestamp;
        }
        if (!existing.buildVersion && res.meta.buildVersion) existing.buildVersion = res.meta.buildVersion;
      }
    }
    return Array.from(sessionsMap.values());
  }

  private countLevels(events: AnyLogEvent[]) {
    let errors = 0;
    let warnings = 0;
    for (const e of events) {
      if (e.level === "Error") errors += 1;
      if (e.level === "Warn" || e.level === "Warning") warnings += 1;
    }
    return { events: events.length, errors, warnings };
  }

  private accumulateBackend(event: AnyLogEvent, backend: BackendStats) {
    if (event.logType !== "backend") return;
    const url = (event.fields as any)?.url;
    const code = (event.fields as any)?.responseCode;
    switch (event.eventFamily) {
      case "request":
        backend.totalRequests += 1;
        if (url) backend.byEndpoint[url] = (backend.byEndpoint[url] ?? 0) + 1;
        break;
      case "response":
        backend.totalResponses += 1;
        if (code) backend.byStatusCode[String(code)] = (backend.byStatusCode[String(code)] ?? 0) + 1;
        if (url) backend.byEndpoint[url] = (backend.byEndpoint[url] ?? 0) + 1;
        break;
      case "transport_error":
      case "server_exception":
        backend.totalErrors += 1;
        if (code) backend.byStatusCode[String(code)] = (backend.byStatusCode[String(code)] ?? 0) + 1;
        break;
      case "retry":
        backend.retries += 1;
        break;
      default:
        break;
    }
  }

  private accumulateCache(event: AnyLogEvent, cache: CacheStats) {
    if (event.logType !== "backendCache") return;
    const hit = (event.fields as any)?.cacheHit;
    if (hit === false) cache.misses += 1;
    else cache.hits += 1;
  }

  private accumulateInventory(event: AnyLogEvent, inventory: InventoryStats, items: Record<string, ResolvedEntity>) {
    if (event.logType !== "inventory") return;
    inventory.totalRejections += 1;
    const op = (event.fields as any)?.operationType;
    const code = (event.fields as any)?.code;
    const itemId = (event.fields as any)?.itemId;
    if (op) inventory.byOperation[op] = (inventory.byOperation[op] ?? 0) + 1;
    if (code !== undefined) inventory.byCode[String(code)] = (inventory.byCode[String(code)] ?? 0) + 1;
    if (itemId) {
      inventory.items[itemId] = (inventory.items[itemId] ?? 0) + 1;
      this.upsertResolved(items, itemId, "item");
    }
  }

  private accumulateNetwork(event: AnyLogEvent, network: NetworkStats) {
    if (event.logType === "network-connection") {
      const fields = event.fields as any;
      const addr = fields?.address;
      const entry = (network.byAddress[addr ?? "unknown"] = network.byAddress[addr ?? "unknown"] ?? {
        connect: 0,
        disconnect: 0,
        timeout: 0,
      });
      switch (event.eventFamily) {
        case "connect":
        case "state_enter":
          network.connections += 1;
          entry.connect += 1;
          break;
        case "disconnect":
        case "send_disconnect":
          network.disconnects = (network.disconnects ?? 0) + 1;
          entry.disconnect += 1;
          break;
        case "timeout":
          network.timeouts += 1;
          entry.timeout += 1;
          break;
        case "statistics":
          // Accumulate connection quality statistics (rtt, packet loss)
          if (typeof fields?.rtt === "number") {
            network.metrics.rttSamples = (network.metrics.rttSamples ?? 0) + 1;
            const curRtt = network.metrics.rttAvg ?? 0;
            network.metrics.rttAvg = curRtt + (fields.rtt - curRtt) / network.metrics.rttSamples;
          }
          if (typeof fields?.packetsLost === "number") {
            network.metrics.totalPacketsLost = (network.metrics.totalPacketsLost ?? 0) + fields.packetsLost;
          }
          if (typeof fields?.packetsSent === "number") {
            network.metrics.totalPacketsSent = (network.metrics.totalPacketsSent ?? 0) + fields.packetsSent;
          }
          if (typeof fields?.packetsReceived === "number") {
            network.metrics.totalPacketsReceived = (network.metrics.totalPacketsReceived ?? 0) + fields.packetsReceived;
          }
          break;
        default:
          break;
      }
    }
    if (event.logType === "network-messages") {
      const m = (event.fields as any) ?? {};
      network.metrics.samples += 1;
      const avg = (key: "rpi" | "lud") => {
        const cur = (network.metrics as any)[`${key}Avg`] ?? 0;
        const val = typeof m[key] === "number" ? m[key] : 0;
        (network.metrics as any)[`${key}Avg`] = cur + (val - cur) / network.metrics.samples;
      };
      avg("rpi");
      avg("lud");
    }
  }

  private accumulatePush(event: AnyLogEvent, push: PushStats) {
    if (event.logType !== "push-notifications") return;
    switch (event.eventFamily) {
      case "connection_params":
        push.connections += 1;
        break;
      case "dropped":
        push.drops += 1;
        break;
      case "notification":
      case "simple_notification":
        push.notifications += 1;
        break;
      default:
        break;
    }
  }

  private accumulateAudio(event: AnyLogEvent, audio: AudioStats) {
    if (event.logType !== "spatial-audio") return;
    if (event.eventFamily === "init_success") audio.initSuccess += 1;
    if (event.eventFamily === "occlusion_error") audio.occlusionErrors += 1;
  }

  private accumulateErrors(event: AnyLogEvent, errors: ErrorStats) {
    // Only count errors from the dedicated "errors" log to avoid double-counting.
    // The errors log is the canonical aggregation of all error events from all components.
    // Counting errors with level="Error" from other logs would cause double-counting
    // since the same error appears in both the source component log and the errors log.
    if (event.logType !== "errors") return;
    errors.totals += 1;
    const family = event.eventFamily ?? "unknown";
    errors.byFamily[family] = (errors.byFamily[family] ?? 0) + 1;
  }

  private accumulateMatchmaking(event: AnyLogEvent, matchmaking: MatchmakingStats) {
    if (event.logType !== "application") return;
    if (event.eventFamily === "matchmaking") {
      matchmaking.events.push(event);
      const groupId = (event.fields as any)?.groupId;
      if (groupId && !matchmaking.groupIds.includes(groupId)) matchmaking.groupIds.push(groupId);
    }
  }

  private accumulateAnticheat(event: AnyLogEvent, anticheat: AntiCheatStats) {
    if (event.logType !== "application") return;
    if (event.eventFamily === "anticheat") {
      anticheat.initLines += 1;
      anticheat.lastStatus = event.message;
    }
    if (event.eventFamily === "error" && event.message.toLowerCase().includes("battleye")) {
      anticheat.errors += 1;
    }
  }

  private async accumulateQuest(
    event: AnyLogEvent,
    quests: Record<string, QuestStat>,
    traders: Record<string, ResolvedEntity>,
  ) {
    const questId = this.findQuestId(event);
    if (!questId) return;
    if (!quests[questId]) {
      quests[questId] = {
        id: questId,
        status: "unknown",
        relatedEvents: [],
        traderId: undefined,
        traderName: undefined,
      };
      const resolved = await this.resolveQuest(questId);
      if (resolved) {
        quests[questId].name = resolved.name;
        quests[questId].traderId = resolved.traderId;
        if (resolved.traderId) {
          quests[questId].traderName = await this.resolveTraderName(resolved.traderId, traders);
        }
      }
    }
    quests[questId].relatedEvents.push(event);
    if (event.message.toLowerCase().includes("completed")) quests[questId].status = "completed";
    if (event.message.toLowerCase().includes("fail")) quests[questId].status = "failed";
    if (event.message.toLowerCase().includes("start")) quests[questId].status = quests[questId].status === "unknown" ? "started" : quests[questId].status;
  }

  private findQuestId(event: AnyLogEvent): string | undefined {
    const msg = event.message ?? "";
    const match = msg.match(/\b([0-9a-f]{24})\b/i);
    if (match) return match[1];
    const fields = event.fields as any;
    if (fields?.questId) return fields.questId;
    return undefined;
  }

  private upsertResolved(target: Record<string, ResolvedEntity>, id: string, kind: ResolvedEntity["kind"]) {
    if (!target[id]) {
      target[id] = { id, kind };
    }
  }

  private async resolveQuest(id: string): Promise<{ name?: string; traderId?: string } | undefined> {
    if (!this.provider) return undefined;
    try {
      const quest = await this.provider.getQuestById(id);
      if (!quest) return undefined;
      return { name: quest.name, traderId: quest.traderId };
    } catch {
      return undefined;
    }
  }

  private async resolveTraderName(traderId: string, traders: Record<string, ResolvedEntity>): Promise<string | undefined> {
    this.upsertResolved(traders, traderId, "trader");
    if (!this.provider) return undefined;
    const cacheKey = `trader:${traderId}`;
    const cached = await this.cache?.get<ResolvedEntity>(cacheKey);
    if (cached?.name) {
      traders[traderId].name = cached.name;
      return cached.name;
    }
    try {
      const trader = await this.provider.getTraderById(traderId);
      if (trader?.name) {
        traders[traderId].name = trader.name;
        await this.cache?.set(cacheKey, { id: traderId, name: trader.name, kind: "trader" });
        return trader.name;
      }
    } catch {
      // ignore
    }
    return undefined;
  }
}
