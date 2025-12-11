import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { TarkovLogsParser } from "../../../src/TarkovLogsParser.ts";
import {
  GameDataProvider,
  ItemData,
  QuestData,
  TraderData,
} from "../../../src/types/index.ts";
import { GameDataCache } from "../../../src/cache/gameDataCache.ts";

class FakeProvider implements GameDataProvider {
  async getItemById(id: string): Promise<ItemData | null> {
    return { id, name: "Test Item" };
  }
  async getQuestById(id: string): Promise<QuestData | null> {
    return { id, name: "Test Quest" };
  }
  async getTraderById(id: string): Promise<TraderData | null> {
    return { id, name: "Prapor" };
  }
}

describe("TarkovLogsParser end-to-end", () => {
  it("parses a directory of logs, detects log types, and enriches items", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tarkov-logs-lib-"));
    const applicationPath = path.join(
      tmpDir,
      "log_2025.12.08_15-01-50_1.0.0.2.42157 application_000.log"
    );
    const inventoryPath = path.join(
      tmpDir,
      "log_2025.12.08_15-01-50_1.0.0.2.42157 inventory_000.log"
    );

    await fs.writeFile(
      applicationPath,
      "2025-12-08 15:01:51.519|1.0.0.2.42157|Info|application|Application awaken, updateQueue:'Update'"
    );
    await fs.writeFile(
      inventoryPath,
      [
        "2025-12-04 18:13:43.724|1.0.0.2.42157|Error|inventory|[672ab3cc|DooDesch|Profile]672ab3cc - Client operation rejected by server: 0 - OperationType: MoveOperation, Owner: 672ab3cc,",
        "Item: bandage_army 5751a25924597722c463c472, Address: EFT.InventoryLogic.ItemController+ProtectedOwnerItself, ID: 6931b9dceb30a961ec0c01bb,",
        "From: EFT.InventoryLogic.ItemController+ProtectedOwnerItself,",
        "To: grid 6 in item item_equipment_rig_bearing (id: 6931bbb15affe089e10c605d) at (x: 0, y: 0, r: Horizontal)",
        "Reason: operation can't be created: item bandage_army (id: 6931b9dceb30a961ec0c01bb) at (-42.61, 1.06, 37.70)",
      ].join("\n")
    );

    const cachePath = path.join(tmpDir, "cache.json");
    const parser = new TarkovLogsParser({
      gameDataProvider: new FakeProvider(),
      enrichGameData: true,
      cache: new GameDataCache({ storagePath: cachePath, ttlMs: 1000 }),
    });

    const results = await parser.parseDirectory(tmpDir);
    expect(results).toHaveLength(2);

    const inventoryResult = results.find((r) => r.logType === "inventory");
    expect(inventoryResult).toBeDefined();
    const event = inventoryResult!.events[0];
    expect((event.fields as any)?.resolvedItem?.name).toBe("Test Item");
    expect(inventoryResult?.meta.sessionPrefix).toContain(
      "2025.12.08_15-01-50"
    );
  });
});
