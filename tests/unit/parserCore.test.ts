import { describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { TarkovLogsParser } from "../../src/TarkovLogsParser.ts";
import { GameDataCache } from "../../src/cache/gameDataCache.ts";
import { GameDataProvider, LogParser, ParsedLogResult, AnyLogEvent } from "../../src/types/index.ts";

class DummyParser implements LogParser {
  constructor(private readonly event: AnyLogEvent, private readonly logType: ParsedLogResult["logType"] = "application") {}
  canParse(): boolean {
    return true;
  }
  parse(content: string, filePath?: string): ParsedLogResult {
    return {
      logType: this.logType,
      filePath,
      events: [
        {
          ...this.event,
          message: content,
        },
      ],
      meta: {},
    };
  }
}

class CountingProvider implements GameDataProvider {
  itemCalls = 0;
  traderCalls = 0;
  questCalls = 0;
  locationCalls = 0;
  async getItemById(id: string) {
    this.itemCalls += 1;
    return { id, name: "Item" };
  }
  async getTraderById(id: string) {
    this.traderCalls += 1;
    return { id, name: "Trader" };
  }
  async getQuestById(id: string) {
    this.questCalls += 1;
    return { id, name: "Quest" };
  }
  async getLocationById(id: string) {
    this.locationCalls += 1;
    return { id, name: "Location" };
  }
}

describe("TarkovLogsParser core", () => {
  it("parses string content and throws on unknown parser", async () => {
    const parser = new TarkovLogsParser({ parsers: [] });
    await expect(parser.parseFile("2025-12-08 15:01:51.519|1|Info|application|Application awaken")).rejects.toThrow();
  });

  it("throws on unsupported input type", async () => {
    // @ts-expect-error invalid input type to exercise error branch
    const parser = new TarkovLogsParser();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(parser.parseFile({ invalid: true } as any)).rejects.toThrow();
  });

  it("parses buffer input via dummy parser", async () => {
    const dummy = new DummyParser({
      logType: "application",
      timestamp: "",
      timestampRaw: "",
      component: "application",
      message: "",
      eventFamily: "other",
    });
    const parser = new TarkovLogsParser({ parsers: [dummy] });
    const result = await parser.parseFile(Buffer.from("content"));
    expect(result.events[0].message).toBe("content");
  });

  it("parses file path input and enriches with cache hits", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tarkov-parser-"));
    const filePath = path.join(tmpDir, "log.log");
    await fs.writeFile(filePath, "dummy");

    const provider = new CountingProvider();
    const cachePath = path.join(tmpDir, "cache.json");
    const cache = new GameDataCache({ storagePath: cachePath, ttlMs: 10_000 });

    const dummyEvent: AnyLogEvent = {
      logType: "inventory",
      timestamp: "",
      timestampRaw: "",
      component: "inventory",
      message: "",
      eventFamily: "rejection",
      fields: {
        itemId: "item1",
        traderId: "trader1",
        questId: "quest1",
        locationId: "loc1",
      },
    };
    const parser = new TarkovLogsParser({
      parsers: [new DummyParser(dummyEvent, "inventory")],
      gameDataProvider: provider,
      cache,
      enrichGameData: true,
    });

    const result1 = await parser.parseFile(filePath);
    const f1 = result1.events[0].fields as any;
    expect(f1.resolvedItem?.name).toBe("Item");
    expect(f1.resolvedTrader?.name).toBe("Trader");
    expect(f1.resolvedQuest?.name).toBe("Quest");
    expect(f1.resolvedLocation?.name).toBe("Location");
    expect(provider.itemCalls).toBe(1);

    // Second call should hit cache, not provider
    const result2 = await parser.parseFile(filePath);
    const f2 = result2.events[0].fields as any;
    expect(f2.resolvedItem?.name).toBe("Item");
    expect(provider.itemCalls).toBe(1);
    expect(provider.traderCalls).toBe(1);
    expect(provider.questCalls).toBe(1);
    expect(provider.locationCalls).toBe(1);
  });

  it("parseFiles and parseDirectory delegate correctly", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tarkov-dir-"));
    const f1 = path.join(tmpDir, "a application_000.log");
    const f2 = path.join(tmpDir, "b application_000.log");
    await fs.writeFile(f1, "2025-12-08 15:01:51.519|1|Info|application|Application awaken");
    await fs.writeFile(f2, "2025-12-08 15:01:52.519|1|Info|application|Application awaken");
    const parser = new TarkovLogsParser();
    const res = await parser.parseDirectory(tmpDir);
    expect(res).toHaveLength(2);
  });
});

describe("GameDataCache", () => {
  it("loads existing data, expires entries, and persists", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tarkov-cache-"));
    const storagePath = path.join(tmpDir, "cache.json");

    // Pre-seed expired entry
    await fs.writeFile(
      storagePath,
      JSON.stringify({ expired: { value: { v: 1 }, expiresAt: Date.now() - 1 } }),
      "utf8",
    );

    const cache = new GameDataCache({ storagePath, ttlMs: 5 });
    const expired = await cache.get("expired");
    expect(expired).toBeNull();

    await cache.set("alive", { v: 2 });
    const alive = await cache.get<{ v: number }>("alive");
    expect(alive?.v).toBe(2);

    await cache.invalidate("alive");
    const afterInvalidate = await cache.get("alive");
    expect(afterInvalidate).toBeNull();

    await cache.set("x", { v: 3 });
    await cache.invalidate();
    const afterFullInvalidate = await cache.get("x");
    expect(afterFullInvalidate).toBeNull();
  });

  it("uses default storage path and no ttl branch", async () => {
    const cache = new GameDataCache();
    await cache.set("k", { v: 1 });
    const val = await cache.get<{ v: number }>("k");
    expect(val?.v).toBe(1);
  });
});
