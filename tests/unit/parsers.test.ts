import { describe, expect, it } from "vitest";
import { ApplicationLogsParser } from "../../src/parsers/applicationLogsParser.ts";
import { BackendLogsParser } from "../../src/parsers/backendLogsParser.ts";
import { InventoryLogsParser } from "../../src/parsers/inventoryLogsParser.ts";
import { OutputLogsParser } from "../../src/parsers/outputLogsParser.ts";

describe("ApplicationLogsParser", () => {
  it("parses bootstrap and matchmaking events with extracted fields", () => {
    const parser = new ApplicationLogsParser();
    const content = [
      "2025-12-08 15:01:51.519|1.0.0.2.42157|Info|application|Application awaken, updateQueue:'Update'",
      "2025-12-05 18:12:10.000|1.0.0.2.42157|Info|application|Matching with group id 123456",
    ].join("\n");

    const result = parser.parse(content, "/tmp/application_000.log");
    expect(result.events).toHaveLength(2);
    expect(result.events[0].eventFamily).toBe("bootstrap");
    expect(result.events[1].fields?.groupId).toBe("123456");
  });
});

describe("BackendLogsParser", () => {
  it("parses request and response lines", () => {
    const parser = new BackendLogsParser();
    const content = [
      "2025-12-08 15:01:56.925|1.0.0.2.42157|Info|backend|---> Request HTTPS, id [1]: URL: https://prod/client/menu/locale/en, crc: .",
      "2025-12-08 15:01:57.292|1.0.0.2.42157|Info|backend|<--- Response HTTPS, id [1]: URL: https://prod/client/menu/locale/en, crc: , responseText:",
    ].join("\n");

    const result = parser.parse(content);
    expect(result.events[0].fields?.id).toBe(1);
    expect(result.events[1].eventFamily).toBe("response");
  });
});

describe("InventoryLogsParser", () => {
  it("stitches continuation lines and extracts item/grid fields", () => {
    const parser = new InventoryLogsParser();
    const content = [
      "2025-12-04 18:13:43.724|1.0.0.2.42157|Error|inventory|[672ab3cc|DooDesch|Profile]672ab3cc - Client operation rejected by server: 0 - OperationType: MoveOperation, Owner: 672ab3cc,",
      "Item: bandage_army 5751a25924597722c463c472, Address: EFT.InventoryLogic.ItemController+ProtectedOwnerItself, ID: 6931b9dceb30a961ec0c01bb,",
      "From: EFT.InventoryLogic.ItemController+ProtectedOwnerItself,",
      "To: grid 6 in item item_equipment_rig_bearing (id: 6931bbb15affe089e10c605d) at (x: 0, y: 0, r: Horizontal)",
      "Reason: operation can't be created: item bandage_army (id: 6931b9dceb30a961ec0c01bb) at (-42.61, 1.06, 37.70)",
    ].join("\n");

    const result = parser.parse(content);
    expect(result.events[0].fields?.itemId).toBe("6931b9dceb30a961ec0c01bb");
    expect(result.events[0].fields?.grid?.r).toBe("Horizontal");
    expect(result.events[0].fields?.worldPosition?.x).toBeCloseTo(-42.61);
  });
});

describe("OutputLogsParser", () => {
  it("derives component hints from message prefixes", () => {
    const parser = new OutputLogsParser();
    const content = [
      "2025-12-08 15:02:05.193|1.0.0.2.42157|Error|output|backend|<--- Response HTTPS, id [13]: URL: https://.../client/quest/getMainQuestNotesList, crc: , responseText:",
      "Continuation line without pipes",
    ].join("\n");
    const result = parser.parse(content);
    expect(result.events[0].fields?.componentHint).toBe("backend");
    expect(result.events[0].continuation).toHaveLength(1);
  });
});
