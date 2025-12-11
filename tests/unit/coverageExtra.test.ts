import { describe, expect, it } from "vitest";
import { TarkovLogsAnalytics } from "../../src/analytics/TarkovLogsAnalytics.ts";
import { TarkovLogsInsights } from "../../src/analytics/TarkovLogsInsights.ts";
import { TarkovLogsInsightsBrowser } from "../../src/analytics/TarkovLogsInsightsBrowser.ts";
import { parseText, parseTexts } from "../../src/browserParser.ts";
import { ParsedLogResult, AnyLogEvent } from "../../src/types/index.ts";

function event(overrides: Partial<AnyLogEvent>): AnyLogEvent {
  return {
    logType: "application",
    timestamp: "2025-12-10 10:00:00.000",
    timestampRaw: "2025-12-10 10:00:00.000",
    component: "application",
    message: "",
    eventFamily: "other",
    ...overrides,
  };
}

function result(
  logType: ParsedLogResult["logType"],
  events: AnyLogEvent[],
  sessionPrefix = "sess",
): ParsedLogResult {
  return { logType, events, meta: { sessionPrefix } };
}

describe("Additional coverage for analytics and insights", () => {
  it("covers all analytics branches", async () => {
    const backend = result("backend", [
      event({ logType: "backend", eventFamily: "request", fields: { url: "u1" } }),
      event({ logType: "backend", eventFamily: "response", fields: { url: "u1", responseCode: 200 } }),
      event({ logType: "backend", eventFamily: "transport_error", fields: { responseCode: 500 } }),
      event({ logType: "backend", eventFamily: "retry" }),
    ]);
    const cache = result("backendCache", [
      event({ logType: "backendCache", eventFamily: "lookup", fields: { cacheHit: true } }),
      event({ logType: "backendCache", eventFamily: "lookup", fields: { cacheHit: false } }),
    ]);
    const inventory = result("inventory", [
      event({
        logType: "inventory",
        eventFamily: "rejection",
        fields: { operationType: "MoveOperation", code: 0, itemId: "item1" },
      }),
    ]);
    const netConn = result("network-connection", [
      event({ logType: "network-connection", eventFamily: "connect", fields: { address: "a" } }),
      event({ logType: "network-connection", eventFamily: "disconnect", fields: { address: "a" } }),
      event({ logType: "network-connection", eventFamily: "timeout", fields: { address: "a" } }),
      event({
        logType: "network-connection",
        eventFamily: "statistics",
        fields: { address: "a", rtt: 10, packetsLost: 1, packetsSent: 5, packetsReceived: 4 },
      }),
    ]);
    const netMsg = result("network-messages", [
      event({ logType: "network-messages", eventFamily: "metrics", fields: { rpi: 1, lud: 2 } }),
    ]);
    const push = result("push-notifications", [
      event({ logType: "push-notifications", eventFamily: "connection_params" }),
      event({ logType: "push-notifications", eventFamily: "notification" }),
      event({ logType: "push-notifications", eventFamily: "simple_notification" }),
      event({ logType: "push-notifications", eventFamily: "dropped" }),
    ]);
    const audio = result("spatial-audio", [
      event({ logType: "spatial-audio", eventFamily: "init_success" }),
      event({ logType: "spatial-audio", eventFamily: "occlusion_error" }),
    ]);
    const errors = result("errors", [
      event({ logType: "errors", eventFamily: "other", level: "Error" }),
    ]);
    const app = result("application", [
      event({ logType: "application", eventFamily: "matchmaking", fields: { groupId: "g1" } }),
      event({ logType: "application", eventFamily: "anticheat", message: "BEClient ok" }),
      event({ logType: "application", eventFamily: "error", message: "battleye failure" }),
      event({ logType: "application", eventFamily: "other", message: "1234567890abcdef12345678" }),
    ]);

    const analytics = new TarkovLogsAnalytics([
      backend,
      cache,
      inventory,
      netConn,
      netMsg,
      push,
      audio,
      errors,
      app,
    ]);
    const stats = await analytics.computeStatistics();

    expect(stats.backend.totalRequests).toBe(1);
    expect(stats.backend.totalResponses).toBe(1);
    expect(stats.backend.totalErrors).toBe(1);
    expect(stats.backend.retries).toBe(1);
    expect(stats.cache.misses).toBe(1);
    expect(stats.network.disconnects).toBe(1);
    expect(stats.network.metrics.rttAvg).toBe(10);
    expect(stats.push.notifications).toBe(2); // notification + simple_notification
    expect(stats.audio.occlusionErrors).toBe(1);
    expect(stats.errors.totals).toBe(1);
    expect(stats.matchmaking.events.length).toBe(1);
    expect(stats.anticheat.errors).toBe(1);
    expect(stats.quests.length).toBe(1); // quest id from message hex
  });

  it("covers insights end-to-end (node version)", async () => {
    const res = new TarkovLogsInsights([
      result("application", [event({ timestamp: "2025-01-01T00:00:00.000Z", eventFamily: "matchmaking", fields: { groupId: "g1" } })], "s1"),
      result("backend", [event({ logType: "backend", timestamp: "2025-01-01T00:00:01.000Z" })], "s1"),
      result("network-connection", [event({ logType: "network-connection", timestamp: "2025-01-01T00:00:02.000Z", eventFamily: "connect", fields: { address: "a" } })], "s1"),
      result("errors", [event({ logType: "errors", timestamp: "2025-01-01T00:00:03.000Z", level: "Error", eventFamily: "other" })], "s1"),
      result("inventory", [event({ logType: "inventory", timestamp: "2025-01-01T00:00:04.000Z", eventFamily: "rejection", fields: { operationType: "MoveOperation", code: 0 } })], "s1"),
    ]);
    const insights = await res.compute();
    expect(insights.startup.sessions[0].sessionId).toBe("s1");
    expect(insights.connectivity.totalConnections).toBe(1);
    expect(insights.errors.total).toBe(1);
    expect(insights.inventory.totalRejections).toBe(1);
    expect(insights.matching.sessions[0].groupId).toBe("g1");
  });

  it("covers browser parser and insights", async () => {
    const fileName = "2025.12.10_18-02-47_1.0.0.2.42157 application_000.log";
    const content = "2025-12-10 18:02:49.327|1.0.0.2.42157|Info|application|Application awaken";
    const parsed = parseText(fileName, content);
    expect(parsed.logType).toBe("application");
    expect(parsed.events[0].eventFamily).toBe("bootstrap");

    const parsedMany = parseTexts([
      { fileName, content },
      { fileName: "foo network-connection_000.log", content: "2025-12-10 18:02:49.327|1.0.0.2.42157|Info|network-connection|Connect (address: a:1)" },
    ]);
    expect(parsedMany.length).toBe(2);

    const browserInsights = new TarkovLogsInsightsBrowser(parsedMany);
    const insights = await browserInsights.compute();
    expect(insights.timelines.length).toBeGreaterThan(0);
  });
});
