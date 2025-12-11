import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { TarkovLogsParser } from "../../../src/TarkovLogsParser.ts";

describe("Enhanced parsing e2e (synthetic files)", () => {
  it("parses push payloads, network stats, and backend cache paths", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tarkov-logs-lib-"));
    const pushPath = path.join(tmpDir, "log_2025.12.08_18-00-00_1.0.0.2.42157 push-notifications_000.log");
    const netPath = path.join(tmpDir, "log_2025.12.08_18-00-00_1.0.0.2.42157 network-connection_000.log");
    const cachePath = path.join(tmpDir, "log_2025.12.08_18-00-00_1.0.0.2.42157 backendCache_000.log");

    await fs.writeFile(
      pushPath,
      [
        "2025-12-08 18:00:01.000|1.0.0.2.42157|Info|push-notifications|Got notification | GroupMatchInviteSend",
        '{ "type": "groupMatchInviteSend", "eventId": "e1", "from": 1, "members": [{ "_id": "m1", "aid": 2 }] }',
      ].join("\n"),
    );

    await fs.writeFile(
      netPath,
      [
        "2025-12-08 18:00:02.000|1.0.0.2.42157|Info|network-connection|Connect (address: 1.2.3.4:1234)",
        "2025-12-08 18:00:03.000|1.0.0.2.42157|Info|network-connection|Statistics (address: 1.2.3.4:1234, rtt: 50, lose: 2, sent: 10, received: 9)",
      ].join("\n"),
    );

    await fs.writeFile(
      cachePath,
      "2025-12-08 18:00:04.000|1.0.0.2.42157|Info|backendCache|BackendCache.Load File name: C:/cache/items.json, URL: https://prod/cache/items",
    );

    const parser = new TarkovLogsParser({ enrichGameData: false });
    const results = await parser.parseDirectory(tmpDir);

    const push = results.find((r) => r.logType === "push-notifications");
    expect(push?.events[0].fields?.payload?.members?.[0]?.aid).toBe(2);

    const net = results.find((r) => r.logType === "network-connection");
    expect(net?.events.find((e) => e.eventFamily === "statistics")?.fields?.rtt).toBe(50);

    const cache = results.find((r) => r.logType === "backendCache");
    expect(cache?.events[0].fields?.path).toBe("C:/cache/items.json");
    expect(cache?.events[0].fields?.endpoint).toBe("https://prod/cache/items");
  });
});
