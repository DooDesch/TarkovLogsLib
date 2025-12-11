import { describe, expect, it } from "vitest";
import { TarkovLogsAnalytics } from "../../src/analytics/TarkovLogsAnalytics.ts";
import { TarkovLogsInsights } from "../../src/analytics/TarkovLogsInsights.ts";
import { TarkovLogsInsightsBrowser } from "../../src/analytics/TarkovLogsInsightsBrowser.ts";
import { AnyLogEvent, ParsedLogResult } from "../../src/types/index.ts";

function makeResult(
  logType: ParsedLogResult["logType"],
  events: AnyLogEvent[],
  sessionPrefix = "sess",
): ParsedLogResult {
  return {
    logType,
    events,
    meta: { sessionPrefix },
  };
}

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

describe("Analytics & Insights correctness", () => {
  it("counts errors only from errors log (no double-counting)", async () => {
    const errorsLog = makeResult(
      "errors",
      [event({ logType: "errors", level: "Error", eventFamily: "other" })],
    );
    const backendLog = makeResult(
      "backend",
      [event({ logType: "backend", level: "Error", eventFamily: "transport_error" })],
    );

    const analytics = new TarkovLogsAnalytics([errorsLog, backendLog]);
    const stats = await analytics.computeStatistics();
    expect(stats.errors.totals).toBe(1);
    expect(stats.errors.byFamily.other).toBe(1);
  });

  it("accumulates network disconnects and statistics metrics", async () => {
    const networkLog = makeResult("network-connection", [
      event({
        logType: "network-connection",
        eventFamily: "connect",
        fields: { address: "1.2.3.4:1234" },
      }),
      event({
        logType: "network-connection",
        eventFamily: "send_disconnect",
        fields: { address: "1.2.3.4:1234", disconnectReason: 7 },
      }),
      event({
        logType: "network-connection",
        eventFamily: "statistics",
        fields: { address: "1.2.3.4:1234", rtt: 42, packetsLost: 3, packetsSent: 100, packetsReceived: 97 },
      }),
    ]);

    const analytics = new TarkovLogsAnalytics(networkLog);
    const stats = await analytics.computeStatistics();
    expect(stats.network.disconnects).toBe(1);
    expect(stats.network.byAddress["1.2.3.4:1234"].disconnect).toBe(1);
    expect(stats.network.metrics.rttAvg).toBe(42);
    expect(stats.network.metrics.totalPacketsLost).toBe(3);
    expect(stats.network.metrics.totalPacketsSent).toBe(100);
    expect(stats.network.metrics.totalPacketsReceived).toBe(97);
    expect(stats.network.metrics.disconnectReasons?.["7"]).toBe(1);
  });

  it("deduplicates startup sessions across logs", async () => {
    const appLog = makeResult("application", [
      event({ logType: "application", timestamp: "2025-12-10 10:00:00.000" }),
    ], "sessionA");
    const backendLog = makeResult("backend", [
      event({ logType: "backend", timestamp: "2025-12-10 10:00:05.000" }),
    ], "sessionA");

    const insights = new TarkovLogsInsights([appLog, backendLog]);
    const res = await insights.compute();
    expect(res.startup.sessions).toHaveLength(1);
    expect(res.startup.sessions[0].startedAt).toBe("2025-12-10 10:00:00.000");
    expect(res.startup.sessions[0].firstBackendAt).toBe("2025-12-10 10:00:05.000");
  });

  it("browser insights connectivity counts disconnects/timeouts", async () => {
    const netLog = makeResult("network-connection", [
      event({ logType: "network-connection", eventFamily: "connect", fields: { address: "addr" } }),
      event({ logType: "network-connection", eventFamily: "disconnect", fields: { address: "addr" } }),
      event({ logType: "network-connection", eventFamily: "timeout", fields: { address: "addr" } }),
    ]);

    const browser = new TarkovLogsInsightsBrowser(netLog);
    const insights = await browser.compute();
    expect(insights.connectivity.totalConnections).toBe(1);
    expect(insights.connectivity.totalDisconnects).toBe(1);
    expect(insights.connectivity.totalTimeouts).toBe(1);
    expect(insights.connectivity.byAddress.addr.disconnect).toBe(1);
  });

  it("uses questStatus from fields when message lacks keywords", async () => {
    const pushLog = makeResult("push-notifications", [
      event({
        logType: "push-notifications",
        message: "Got notification | ChatMessageReceived",
        eventFamily: "simple_notification",
        fields: {
          questId: "6574e0dedc0d635f633a5805",
          questStatus: "completed",
          questRewardRubles: 12345,
          questRewardItems: ["item_tpl_1", "item_tpl_1"],
          questTraderId: "prapor",
        },
      }),
    ]);

    const analytics = new TarkovLogsAnalytics(pushLog);
    const stats = await analytics.computeStatistics();
    expect(stats.quests).toHaveLength(1);
    expect(stats.quests[0].id).toBe("6574e0dedc0d635f633a5805");
    expect(stats.quests[0].status).toBe("completed");
    expect(stats.quests[0].rewardRubles).toBe(12345);
    expect(stats.quests[0].rewardItems?.item_tpl_1).toBe(2);
    expect(stats.quests[0].traderId).toBe("prapor");
  });
});
