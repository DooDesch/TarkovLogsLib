import { describe, expect, it } from "vitest";
import { AiDataLogsParser } from "../../src/parsers/aiDataLogsParser.ts";
import { AiErrorsLogsParser } from "../../src/parsers/aiErrorsLogsParser.ts";
import { ApplicationLogsParser } from "../../src/parsers/applicationLogsParser.ts";
import { BackendCacheLogsParser } from "../../src/parsers/backendCacheLogsParser.ts";
import { BackendLogsParser } from "../../src/parsers/backendLogsParser.ts";
import { InventoryLogsParser } from "../../src/parsers/inventoryLogsParser.ts";
import { NetworkConnectionLogsParser } from "../../src/parsers/networkConnectionLogsParser.ts";
import { NetworkMessagesLogsParser } from "../../src/parsers/networkMessagesLogsParser.ts";
import { OutputLogsParser } from "../../src/parsers/outputLogsParser.ts";
import { PlayerLogsParser } from "../../src/parsers/playerLogsParser.ts";
import { PushNotificationsLogsParser } from "../../src/parsers/pushNotificationsLogsParser.ts";
import { SpatialAudioLogsParser } from "../../src/parsers/spatialAudioLogsParser.ts";

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

  it("parses matchmaking timing and accountId fields", () => {
    const parser = new ApplicationLogsParser();
    const content = [
      "2025-12-08 15:01:50.000|1.0.0.2.42157|Info|application|SelectProfile ProfileId:abc AccountId:3584850",
      "2025-12-08 15:01:55.000|1.0.0.2.42157|Info|application|GameRunned:176.14(2.13) real:183.59(5.33) diff:7.44",
    ].join("\n");

    const result = parser.parse(content, "/tmp/application_000.log");
    expect(result.events[0].fields?.accountId).toBe("3584850");
    const timing = result.events[1].fields;
    expect(timing?.matchmakingEvent).toBe("GameRunned");
    expect(timing?.gameTime).toBeCloseTo(176.14);
    expect(timing?.gameStepTime).toBeCloseTo(2.13);
    expect(timing?.realTime).toBeCloseTo(183.59);
    expect(timing?.realStepTime).toBeCloseTo(5.33);
    expect(timing?.timeDiff).toBeCloseTo(7.44);
  });

  it("classifies BattlEye validation error", () => {
    const parser = new ApplicationLogsParser();
    const content =
      "2025-12-08 15:01:50.000|1.0.0.2.42157|Error|application|BattlEye environment validation failed";
    const result = parser.parse(content);
    expect(result.events[0].eventFamily).toBe("anticheat");
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

  it("parses server_exception with code", () => {
    const parser = new BackendLogsParser();
    const content =
      "2025-12-08 15:01:58.100|1.0.0.2.42157|Error|backend|BackendServerSideException: 228 - ItemsMoving";
    const event = parser.parse(content).events[0];
    expect(event.eventFamily).toBe("server_exception");
    expect(event.fields?.responseCode).toBe(228);
  });
});

describe("BackendCacheLogsParser", () => {
  it("parses cache hit/miss with path and endpoint", () => {
    const parser = new BackendCacheLogsParser();
    const content = [
      "2025-12-08 15:01:56.903|1.0.0.2.42157|Info|backendCache|BackendCache.Load File name: C:/cache/items.json, URL: https://prod/cache/items",
      "2025-12-08 15:01:57.903|1.0.0.2.42157|Info|backendCache|BackendCache.Load File name: C:/cache/miss.json - NOT exists",
    ].join("\n");
    const events = parser.parse(content).events;
    expect(events[0].fields?.cacheHit).toBe(true);
    expect(events[0].fields?.path).toBe("C:/cache/items.json");
    expect(events[0].fields?.endpoint).toBe("https://prod/cache/items");
    expect(events[1].fields?.cacheHit).toBe(false);
    expect(events[1].fields?.path).toBe("C:/cache/miss.json");
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

describe("NetworkConnectionLogsParser", () => {
  it("parses disconnect/statistics/send_disconnect/thread_aborted", () => {
    const parser = new NetworkConnectionLogsParser();
    const content = [
      "2025-12-08 15:17:56.230|1.0.0.2.42157|Info|network-connection|Connect (address: 79.127.215.167:17002)",
      "2025-12-08 15:17:56.231|1.0.0.2.42157|Info|network-connection|Send disconnect (address: 79.127.215.167:17002, reason: 5)",
      "2025-12-08 15:17:56.232|1.0.0.2.42157|Info|network-connection|Disconnect (address: 79.127.215.167:17002)",
      "2025-12-08 15:17:56.233|1.0.0.2.42157|Info|network-connection|Statistics (address: 79.127.215.167:17002, rtt: 42, lose: 3, sent: 100, received: 97)",
      "2025-12-08 15:17:56.234|1.0.0.2.42157|Error|network-connection|Thread was being aborted.",
    ].join("\n");
    const events = parser.parse(content).events;
    expect(events.map((e) => e.eventFamily)).toEqual([
      "connect",
      "send_disconnect",
      "disconnect",
      "statistics",
      "thread_aborted",
    ]);
    const stats = events[3].fields!;
    expect(stats.rtt).toBe(42);
    expect(stats.packetsLost).toBe(3);
    expect(stats.packetsSent).toBe(100);
    expect(stats.packetsReceived).toBe(97);
    expect(events[1].fields?.disconnectReason).toBe(5);
  });
});

describe("NetworkMessagesLogsParser", () => {
  it("parses metrics", () => {
    const parser = new NetworkMessagesLogsParser();
    const content = [
      "2025-12-08 15:18:29.010|1.0.0.2.42157|Info|network-messages|rpi:0.00|rwi:0.00|rsi:0.00|rci:0.00|ui:9.94|lui:11.18|lud:0",
      "2025-12-08 15:18:30.010|1.0.0.2.42157|Info|network-messages|badpart|rpi:NaN|ui:1.0",
      "2025-12-08 15:18:31.010|1.0.0.2.42157|Info|network-messages|ui",
    ].join("\n");
    const events = parser.parse(content).events;
    const event = events[0];
    expect(event.fields?.rpi).toBe(0);
    expect(event.eventFamily).toBe("metrics");
    expect(events[1].fields?.rpi).toBeUndefined();
    expect(events[2].fields?.ui).toBeUndefined();
  });
});

describe("PlayerLogsParser", () => {
  it("parses missing item and address errors", () => {
    const parser = new PlayerLogsParser();
    const content = [
      "2025-12-05 20:35:10.000|1.0.0.2.42157|Error|player|Could not find item with id: 692c8a936013b9204c0c8cc3",
      "2025-12-05 20:42:37.027|1.0.0.2.42157|Error|player|Could not find item address with id. ParentId: 672ab2ca36161f2c2c110dd6, ContainerId: hideout",
    ].join("\n");
    const events = parser.parse(content).events;
    expect(events[0].fields?.itemId).toBe("692c8a936013b9204c0c8cc3");
    expect(events[1].fields?.containerId).toBe("hideout");
  });
});

describe("AI parser canParse helpers", () => {
  it("aiData canParse by file name and content", () => {
    const parser = new AiDataLogsParser();
    expect(parser.canParse("aiData_000.log")).toBe(true);
    expect(parser.canParse("other.log", "x|aiData|y")).toBe(true);
    expect(parser.canParse("other.log", "no match")).toBe(false);
  });

  it("aiErrors canParse by file name and content", () => {
    const parser = new AiErrorsLogsParser();
    expect(parser.canParse("aiErrors_000.log")).toBe(true);
    expect(parser.canParse("other.log", "x|aiErrors|y")).toBe(true);
    expect(parser.canParse("other.log", "no match")).toBe(false);
  });
});

describe("PushNotificationsLogsParser", () => {
  it("parses families and handles continuation payloads", () => {
    const parser = new PushNotificationsLogsParser();
    const content = [
      "2025-12-08 15:02:13.954|1.0.0.2.42157|Info|push-notifications|NotificationManager: new params received url:  ws:wss://wsn/push/notifier/getwebsocket/token",
      "2025-12-08 15:02:14.954|1.0.0.2.42157|Info|push-notifications|LongPollingWebSocketRequest result Count:5 MessageType:Ping",
      "2025-12-08 15:02:14.954|1.0.0.2.42157|Info|push-notifications|LongPollingWebSocketRequest received:512",
      "2025-12-08 15:02:15.954|1.0.0.2.42157|Info|push-notifications|NotificationManager.ProcessMessage | Received notification: Type: ChatMessageReceived, Time: 1, Duration: 2, ShowNotification: True",
      "2025-12-08 15:02:16.954|1.0.0.2.42157|Info|push-notifications|Got notification | GroupMatchInviteSend",
      "{ \"type\": \"groupMatchInviteSend\", \"eventId\": \"e1\", \"from\": 1, \"members\": [{ \"_id\": \"m1\", \"aid\": 2, \"Info\": { \"Nickname\": \"nick\", \"Side\": \"Usec\", \"Level\": 10 } }] }",
      "2025-12-08 15:02:17.954|1.0.0.2.42157|Info|push-notifications|NotificationManager.ProcessMessage | Received Service Notifications Ping",
      "2025-12-08 15:02:18.954|1.0.0.2.42157|Warn|push-notifications|Notification channel has been [dropped] by server error with code: 0",
      "2025-12-08 15:02:19.954|1.0.0.2.42157|Info|push-notifications|other",
    ].join("\n");
    const events = parser.parse(content).events;
    const families = events.map((e) => e.eventFamily);
    expect(families).toEqual([
      "connection_params",
      "batch_result",
      "received",
      "notification",
      "simple_notification",
      "ping",
      "dropped",
      "other",
    ]);
    const payload = events[4].fields?.payload;
    expect(payload?.type).toBe("groupMatchInviteSend");
    expect(payload?.members?.[0]?.aid).toBe(2);
    expect(events[2].fields?.bytesReceived).toBe(512);
  });

  it("extracts quest info from ChatMessageReceived notifications", () => {
    const parser = new PushNotificationsLogsParser();
    const content = [
      "2025-12-08 15:02:20.000|1.0.0.2.42157|Info|push-notifications|Got notification | ChatMessageReceived",
      '{ "type": "new_message", "message": { "templateId": "6574e0dedc0d635f633a5805 successMessageText", "type": "success", "items": { "data": [ { "_tpl": "5449016a4bdc2d6f028b456f", "upd": { "StackObjectsCount": 12345 } }, { "_tpl": "item_tpl_1" } ] } }, "dialogId": "prapor" }',
    ].join("\n");
    const events = parser.parse(content).events;
    const questEvent = events.find((e) => e.fields?.questId);
    expect(questEvent?.fields?.questId).toBe("6574e0dedc0d635f633a5805");
    expect(questEvent?.fields?.questStatus).toBe("completed");
    expect(questEvent?.fields?.questRewardRubles).toBe(12345);
    expect(questEvent?.fields?.questRewardItems).toEqual(["item_tpl_1"]);
  });

  it("ignores non-quest ChatMessageReceived (e.g., Ragfair sale)", () => {
    const parser = new PushNotificationsLogsParser();
    const content = [
      "2025-12-08 15:02:21.000|1.0.0.2.42157|Info|push-notifications|Got notification | ChatMessageReceived",
      '{ "type": "new_message", "message": { "templateId": "5bdabfb886f7743e152e867e 0", "type": 4, "items": { "data": [ { "_tpl": "5449016a4bdc2d6f028b456f", "upd": { "StackObjectsCount": 999000 } } ] } } }',
    ].join("\n");
    const events = parser.parse(content).events;
    const questEvent = events.find((e) => e.fields?.questId);
    expect(questEvent).toBeUndefined();
  });
});

describe("SpatialAudioLogsParser", () => {
  it("parses families", () => {
    const parser = new SpatialAudioLogsParser();
    const content = [
      "2025-12-08 15:02:34.478|1.0.0.2.42157|Info|spatial-audio|Success initialize BetterAudio",
      "2025-12-08 15:02:34.479|1.0.0.2.42157|Info|spatial-audio|SpatialAudioSystem Initialized",
      "2025-12-08 15:02:34.480|1.0.0.2.42157|Info|spatial-audio|Target audio quality = High",
      "2025-12-08 15:02:34.481|1.0.0.2.42157|Info|spatial-audio|Current DSP buffer length: 1024, buffers num: 4",
      "2025-12-08 15:02:34.482|1.0.0.2.42157|Info|spatial-audio|ReverbPluginChecker enabled: True, check cooldown: 0.25",
      "2025-12-08 15:02:34.483|1.0.0.2.42157|Warn|spatial-audio|Reverb reset attempt 2/10",
      "2025-12-08 15:02:34.484|1.0.0.2.42157|Error|spatial-audio|[SpatialAudioSystem] can't init occlusion transform for player : System.NullReferenceException",
      "2025-12-08 15:02:34.485|1.0.0.2.42157|Info|spatial-audio|Other message",
    ].join("\n");
    const events = parser.parse(content).events;
    expect(events.map((e) => e.eventFamily)).toEqual([
      "init_success",
      "system_initialized",
      "target_quality",
      "dsp_stats",
      "reverb_checker",
      "reverb_reset",
      "occlusion_error",
      "other",
    ]);
    expect(events[4].fields?.reverbEnabled).toBe(true);
    expect(events[4].fields?.reverbCooldown).toBeCloseTo(0.25);
  });
});
