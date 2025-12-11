import { describe, expect, it } from "vitest";
import { ApplicationLogsParser } from "../../src/parsers/applicationLogsParser.ts";
import { BackendLogsParser } from "../../src/parsers/backendLogsParser.ts";
import { BackendCacheLogsParser } from "../../src/parsers/backendCacheLogsParser.ts";
import { BackendQueueLogsParser } from "../../src/parsers/backendQueueLogsParser.ts";
import { ErrorsLogsParser } from "../../src/parsers/errorsLogsParser.ts";
import { FilesCheckerLogsParser } from "../../src/parsers/filesCheckerLogsParser.ts";
import { InsuranceLogsParser } from "../../src/parsers/insuranceLogsParser.ts";
import { InventoryLogsParser } from "../../src/parsers/inventoryLogsParser.ts";
import { NetworkConnectionLogsParser } from "../../src/parsers/networkConnectionLogsParser.ts";
import { NetworkMessagesLogsParser } from "../../src/parsers/networkMessagesLogsParser.ts";
import { ObjectPoolLogsParser } from "../../src/parsers/objectPoolLogsParser.ts";
import { OutputLogsParser } from "../../src/parsers/outputLogsParser.ts";
import { PlayerLogsParser } from "../../src/parsers/playerLogsParser.ts";
import { PushNotificationsLogsParser } from "../../src/parsers/pushNotificationsLogsParser.ts";
import { SeasonsLogsParser } from "../../src/parsers/seasonsLogsParser.ts";
import { SpatialAudioLogsParser } from "../../src/parsers/spatialAudioLogsParser.ts";
import { AiDataLogsParser } from "../../src/parsers/aiDataLogsParser.ts";
import { AiErrorsLogsParser } from "../../src/parsers/aiErrorsLogsParser.ts";

describe("Parser event-family coverage (synthetic)", () => {
  it("application families", () => {
    const parser = new ApplicationLogsParser();
    const content = [
      "2025-12-08 15:01:51.519|1.0.0.2.42157|Info|application|Application awaken, updateQueue:'Update'",
      "2025-12-08 15:01:52.519|1.0.0.2.42157|Info|application|GC mode switched to Disabled",
      "2025-12-08 15:01:53.519|1.0.0.2.42157|Info|application|Config entry something",
      "2025-12-08 15:01:54.519|1.0.0.2.42157|Debug|application|BEClient exit successfully",
      "2025-12-08 15:01:55.519|1.0.0.2.42157|Info|application|TRACE-NetworkGameMatching G",
      "2025-12-08 15:01:56.519|1.0.0.2.42157|Info|application|Matching with group id 42",
      "2025-12-08 15:01:57.519|1.0.0.2.42157|Error|application|BattlEye environment validation failed: x",
      "2025-12-08 15:01:58.519|1.0.0.2.42157|Info|application|Something else",
    ].join("\n");
    const events = parser.parse(content).events;
    expect(events.map((e) => e.eventFamily)).toEqual([
      "bootstrap",
      "gc",
      "config",
      "anticheat",
      "instrumentation",
      "matchmaking",
      "anticheat",
      "other",
    ]);
  });

  it("backend families", () => {
    const parser = new BackendLogsParser();
    const content = [
      "2025-12-08 15:01:56.925|1.0.0.2.42157|Info|backend|---> Request HTTPS, id [1]: URL: https://prod/client/menu/locale/en, crc: .",
      "2025-12-08 15:01:57.292|1.0.0.2.42157|Info|backend|<--- Response HTTPS, id [1]: URL: https://prod/client/menu/locale/en, crc: , responseText:",
      "2025-12-08 15:01:57.500|1.0.0.2.42157|Error|backend|<--- Error! HTTPS: https://prod, result:timeout, isNetworkError:true, isHttpError:false, responseCode:504",
      "2025-12-08 15:01:57.700|1.0.0.2.42157|Warn|backend|Request https://prod/client/game/keepalive will be retried after 3 sec, retry:1 from retries:5 ... error:Backend error",
      "2025-12-08 15:01:57.900|1.0.0.2.42157|Error|backend|JSON parsing into Foo",
      "2025-12-08 15:01:58.100|1.0.0.2.42157|Error|backend|<--- Response HTTPS, id [2]: Exception occured: 228, BackendServerSideException: 228 - ItemsMoving",
      "2025-12-08 15:01:58.300|1.0.0.2.42157|Info|backend|Unrecognized",
    ].join("\n");
    const families = parser.parse(content).events.map((e) => e.eventFamily);
    expect(families).toEqual([
      "request",
      "response",
      "transport_error",
      "retry",
      "deserialization_error",
      "response",
      "other",
    ]);
  });

  it("backend cache lookup", () => {
    const parser = new BackendCacheLogsParser();
    const content =
      "2025-12-08 15:01:56.903|1.0.0.2.42157|Info|backendCache|BackendCache.Load File name: cachefile - NOT exists";
    const events = parser.parse(content).events;
    expect(events[0].fields?.cacheHit).toBe(false);
  });

  it("backend queue", () => {
    const parser = new BackendQueueLogsParser();
    const content = [
      "2025-12-04 01:37:55.834|1.0.0.2.42157|Error|backend_queue|Error: Inventory queue failed on the following commands:",
      '[{"Action":"RestoreHealth","timestamp":1764808675}]',
      "2025-12-04 01:37:55.835|1.0.0.2.42157|Error|backend_queue|Error: Inventory queue failed on the following commands:",
      "not-json",
    ].join("\n");
    const events = parser.parse(content).events;
    expect(events[0].fields?.commands?.[0]?.Action).toBe("RestoreHealth");
    expect(events[1].fields?.commands?.length).toBe(0);
  });

  it("errors families", () => {
    const parser = new ErrorsLogsParser();
    const content = [
      "2025-12-08 15:02:05.192|1.0.0.2.42157|Error|errors|Mip 0 waiting timeout",
      "2025-12-08 15:02:05.193|1.0.0.2.42157|Error|errors|NullReferenceException: oops",
      "2025-12-08 15:02:05.194|1.0.0.2.42157|Error|errors|KeyNotFoundException",
      "2025-12-08 15:02:05.195|1.0.0.2.42157|Error|errors|Can't find lamp with netId 1",
      "2025-12-08 15:02:05.196|1.0.0.2.42157|Error|errors|Cant find counter for Quest 123",
      "2025-12-08 15:02:05.197|1.0.0.2.42157|Error|errors|seasons|x",
      "2025-12-08 15:02:05.198|1.0.0.2.42157|Error|errors|<b>Locale</b>. Trying to add duplicate: x",
      "2025-12-08 15:02:05.199|1.0.0.2.42157|Error|errors|Incorrect Enum value",
      "2025-12-08 15:02:05.200|1.0.0.2.42157|Error|errors|A scripted object ... serialization layout",
      "2025-12-08 15:02:05.201|1.0.0.2.42157|Error|errors|supplyData is null",
      "2025-12-08 15:02:05.202|1.0.0.2.42157|Error|errors|spatial-audio|error",
      "2025-12-08 15:02:05.203|1.0.0.2.42157|Error|errors|ALARM! Try to load null resource!",
      "2025-12-08 15:02:05.204|1.0.0.2.42157|Error|errors|Already registered object - Turnable.NetId",
      "2025-12-08 15:02:05.205|1.0.0.2.42157|Error|errors|insurance|Error insuring item",
      "2025-12-08 15:02:05.206|1.0.0.2.42157|Error|errors|aidata|Door",
      "2025-12-08 15:02:05.207|1.0.0.2.42157|Error|errors|player|Could not find item",
      "2025-12-08 15:02:05.208|1.0.0.2.42157|Error|errors|other",
    ].join("\n");
    const families = parser.parse(content).events.map((e) => e.eventFamily);
    expect(families).toContain("mip_timeout");
    expect(families).toContain("player");
    expect(families).toContain("other");
  });

  it("files-checker families", () => {
    const parser = new FilesCheckerLogsParser();
    const content = [
      "2025-12-08 15:01:51.980|1.0.0.2.42157|Info|files-checker|Consistency ensurance is launched",
      "2025-12-08 15:01:52.000|1.0.0.2.42157|Info|files-checker|ExecutablePath: C:/EFT.exe",
      "2025-12-08 15:01:52.304|1.0.0.2.42157|Info|files-checker|Consistency ensurance is succeed. ElapsedMilliseconds:325",
    ].join("\n");
    const families = parser.parse(content).events.map((e) => e.eventFamily);
    expect(families).toEqual(["start", "executable_path", "complete"]);
  });

  it("insurance families", () => {
    const parser = new InsuranceLogsParser();
    const content = [
      "2025-11-30 18:10:14.328|1.0.0.1.41967|Warn|insurance|Items to insure does not contain: Roubles",
      "2025-11-30 18:10:14.328|1.0.0.1.41967|Error|insurance|Error insuring item: (MP-155)",
      "2025-11-30 18:10:14.328|1.0.0.1.41967|Warn|insurance|Something else",
    ].join("\n");
    const families = parser.parse(content).events.map((e) => e.eventFamily);
    expect(families).toEqual(["warn_missing_item", "error_insuring", "other"]);
  });

  it("inventory parsing with continuation", () => {
    const parser = new InventoryLogsParser();
    const content = [
      "2025-12-04 18:13:43.724|1.0.0.2.42157|Error|inventory|[profile|user|Profile]profile - Client operation rejected by server: 0 - OperationType: MoveOperation, Owner: owner,",
      "Item: bandage_army 5751a25924597722c463c472, Address: EFT.InventoryLogic.ItemController+ProtectedOwnerItself, ID: 6931b9dceb30a961ec0c01bb,",
      "From: EFT.InventoryLogic.ItemController+ProtectedOwnerItself,",
      "To: grid 6 in item item_equipment_rig_bearing (id: 6931bbb15affe089e10c605d) at (x: 0, y: 0, r: Horizontal)",
      "Reason: operation can't be created: item bandage_army (id: 6931b9dceb30a961ec0c01bb) at (-42.61, 1.06, 37.70)",
    ].join("\n");
    const event = parser.parse(content).events[0];
    expect(event.fields?.itemId).toBe("6931b9dceb30a961ec0c01bb");
    expect(event.fields?.worldPosition?.x).toBeCloseTo(-42.61);
  });

  it("network-connection families", () => {
    const parser = new NetworkConnectionLogsParser();
    const content = [
      "2025-12-08 15:17:56.230|1.0.0.2.42157|Info|network-connection|Connect (address: 79.127.215.167:17002)",
      "2025-12-08 15:17:56.230|1.0.0.2.42157|Info|network-connection|Enter to the 'Connected' state (address: 79.127.215.167:17002, syn: False, asc: True)",
      "2025-12-08 15:17:56.230|1.0.0.2.42157|Info|network-connection|Exit to the 'Connected' state (address: 79.127.215.167:17002)",
      "2025-12-08 15:17:56.230|1.0.0.2.42157|Info|network-connection|Send connect (address: 79.127.215.167:17002, syn: False, asc: True)",
      "2025-12-08 15:17:56.230|1.0.0.2.42157|Error|network-connection|Timeout: Messages timed out after not receiving any message for 3006ms (address: 79.127.215.167:17002)",
      "2025-12-08 15:17:56.230|1.0.0.2.42157|Info|network-connection|Send disconnect (address: 79.127.215.167:17002, reason: 5)",
      "2025-12-08 15:17:56.230|1.0.0.2.42157|Info|network-connection|Disconnect (address: 79.127.215.167:17002)",
      "2025-12-08 15:17:56.230|1.0.0.2.42157|Info|network-connection|Statistics (address: 79.127.215.167:17002, rtt: 42, lose: 3, sent: 100, received: 97)",
      "2025-12-08 15:17:56.230|1.0.0.2.42157|Error|network-connection|Thread was being aborted.",
      "2025-12-08 15:17:56.230|1.0.0.2.42157|Info|network-connection|Other",
    ].join("\n");
    const families = parser.parse(content).events.map((e) => e.eventFamily);
    expect(families).toEqual([
      "connect",
      "state_enter",
      "state_exit",
      "send_connect",
      "timeout",
      "send_disconnect",
      "disconnect",
      "statistics",
      "thread_aborted",
      "other",
    ]);
  });

  it("network-messages metrics", () => {
    const parser = new NetworkMessagesLogsParser();
    const content = [
      "2025-12-08 15:18:29.010|1.0.0.2.42157|Info|network-messages|rpi:0.00|rwi:0.00|rsi:0.00|rci:0.00|ui:9.94|lui:11.18|lud:0",
      "2025-12-08 15:18:30.010|1.0.0.2.42157|Info|network-messages|badpart|rpi:NaN|ui:1.0",
    ].join("\n");
    const events = parser.parse(content).events;
    const event = events[0];
    expect(event.fields?.rpi).toBe(0);
    expect(event.eventFamily).toBe("metrics");
    expect(events[1].fields?.rpi).toBeUndefined();
  });

  it("objectPool events", () => {
    const parser = new ObjectPoolLogsParser();
    const content = [
      "2025-12-07 21:12:18.406|1.0.0.2.42157|Error|objectPool|14265|Returning asset to pool when the pool is already destroyed. Please find out what causes this.",
      "2025-12-07 21:12:18.406|1.0.0.2.42157|Error|objectPool|14266|Some other message",
    ].join("\n");
    const events = parser.parse(content).events;
    expect(events[0].eventFamily).toBe("return_to_destroyed_pool");
    expect(events[1].eventFamily).toBe("other");
  });

  it("output hints", () => {
    const parser = new OutputLogsParser();
    const content = [
      "2025-12-08 15:02:05.193|1.0.0.2.42157|Error|output|backend|<--- Response HTTPS, id [13]: URL: https://...|crc: , responseText:",
      "2025-12-08 15:02:05.194|1.0.0.2.42157|Info|output|Just a message",
    ].join("\n");
    const events = parser.parse(content).events;
    expect(events[0].fields?.componentHint).toBe("backend");
  });

  it("player events", () => {
    const parser = new PlayerLogsParser();
    const content = [
      "2025-12-05 20:35:10.000|1.0.0.2.42157|Error|player|Could not find item with id: 692c8a936013b9204c0c8cc3",
      "2025-12-05 20:42:37.027|1.0.0.2.42157|Error|player|Could not find item address with id. ParentId: 672ab2ca36161f2c2c110dd6, ContainerId: hideout",
      "2025-12-05 20:42:38.027|1.0.0.2.42157|Error|player|Other message",
    ].join("\n");
    const events = parser.parse(content).events;
    expect(events[0].fields?.itemId).toBe("692c8a936013b9204c0c8cc3");
    expect(events[1].fields?.containerId).toBe("hideout");
    expect(events[2].eventFamily).toBe("other");
  });

  it("push-notifications families", () => {
    const parser = new PushNotificationsLogsParser();
    const content = [
      "2025-12-08 15:02:13.954|1.0.0.2.42157|Info|push-notifications|NotificationManager: new params received url:  ws:wss://wsn/push/notifier/getwebsocket/token",
      "2025-12-08 15:02:14.954|1.0.0.2.42157|Info|push-notifications|LongPollingWebSocketRequest result Count:5 MessageType:Ping",
      "2025-12-08 15:02:14.955|1.0.0.2.42157|Info|push-notifications|LongPollingWebSocketRequest received:512",
      "2025-12-08 15:02:15.954|1.0.0.2.42157|Info|push-notifications|NotificationManager.ProcessMessage | Received notification: Type: ChatMessageReceived, Time: 1, Duration: 2, ShowNotification: True",
      "2025-12-08 15:02:16.954|1.0.0.2.42157|Info|push-notifications|Got notification | ChatMessageReceived",
      "2025-12-08 15:02:16.955|1.0.0.2.42157|Info|push-notifications|Got notification | UnknownType",
      '{ "type": "unknownType", "eventId": "z1" }',
      "2025-12-08 15:02:16.956|1.0.0.2.42157|Info|push-notifications|Got notification | GroupMatchUserLeave",
      '{ "type": "GroupMatchUserLeave", "eventId": "z2", "odidLeaved": "od1" }',
      "2025-12-08 15:02:16.957|1.0.0.2.42157|Info|push-notifications|Got notification | GroupMatchLeaderChanged",
      '{ "type": "GroupMatchLeaderChanged", "eventId": "z3", "odid": "od2" }',
      "2025-12-08 15:02:16.958|1.0.0.2.42157|Info|push-notifications|Got notification | GroupMatchInviteCancel",
      '{ "type": "GroupMatchInviteCancel", "eventId": "z4" }',
      "2025-12-08 15:02:16.959|1.0.0.2.42157|Info|push-notifications|Got notification | ping",
      '{ "type": "ping", "eventId": "z5" }',
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
      "simple_notification",
      "simple_notification",
      "simple_notification",
      "simple_notification",
      "simple_notification",
      "ping",
      "dropped",
      "other",
    ]);
    const unknownPayload = events[5].fields?.payload;
    expect(unknownPayload?.type).toBe("unknownType");
    expect(unknownPayload?.rawData).toBeTruthy();
    expect(events[6].fields?.payload?.odidLeaved).toBe("od1");
    expect(events[7].fields?.payload?.odid).toBe("od2");
    expect(events[8].fields?.payload?.type).toBe("GroupMatchInviteCancel");
    expect(events[9].fields?.payload?.type).toBe("ping");
  });

  it("seasons event", () => {
    const parser = new SeasonsLogsParser();
    const content =
      "2025-12-08 18:29:51.757|1.0.0.2.42157|Error|seasons|Can't find SeasonsMaterialsFixer.Instance";
    const event = parser.parse(content).events[0];
    expect(event.eventFamily).toBe("seasons_materials_fixer_missing");
  });

  it("spatial-audio families", () => {
    const parser = new SpatialAudioLogsParser();
    const content = [
      "2025-12-08 15:02:34.478|1.0.0.2.42157|Info|spatial-audio|Success initialize BetterAudio",
      "2025-12-08 15:02:34.479|1.0.0.2.42157|Info|spatial-audio|SpatialAudioSystem Initialized",
      "2025-12-08 15:02:34.479|1.0.0.2.42157|Info|spatial-audio|Target audio quality = High",
      "2025-12-08 15:02:34.480|1.0.0.2.42157|Info|spatial-audio|Current DSP buffer length: 1024, buffers num: 4",
      "2025-12-08 15:02:34.480|1.0.0.2.42157|Info|spatial-audio|ReverbPluginChecker enabled: True, check cooldown: 0.25",
      "2025-12-08 15:02:34.481|1.0.0.2.42157|Warn|spatial-audio|Reverb reset attempt 2/10",
      "2025-12-08 15:02:34.482|1.0.0.2.42157|Error|spatial-audio|[SpatialAudioSystem] can't init occlusion transform for player : System.NullReferenceException",
      "2025-12-08 15:02:34.483|1.0.0.2.42157|Info|spatial-audio|Other message",
    ].join("\n");
    const families = parser.parse(content).events.map((e) => e.eventFamily);
    expect(families).toEqual([
      "init_success",
      "system_initialized",
      "target_quality",
      "dsp_stats",
      "reverb_checker",
      "reverb_reset",
      "occlusion_error",
      "other",
    ]);
  });

  it("aiData events", () => {
    const parser = new AiDataLogsParser();
    const content = [
      "2025-11-16 10:30:50.725 +01:00|1.0.0.0.41760|Error|aiData|Wrong count of all simple waves. Check slots count",
      "2025-11-16 10:30:54.329 +01:00|1.0.0.0.41760|Error|aiData|Door without link DoorLink_27",
      "2025-11-16 10:30:54.330 +01:00|1.0.0.0.41760|Error|aiData|Other",
    ].join("\n");
    const families = parser.parse(content).events.map((e) => e.eventFamily);
    expect(families).toEqual([
      "wrong_wave_count",
      "door_without_link",
      "other",
    ]);
  });

  it("aiErrors events", () => {
    const parser = new AiErrorsLogsParser();
    const content = [
      "2025-11-16 10:30:50.725 +01:00|1.0.0.0.41760|Error|aiErrors|aiData|Wrong count of all simple waves. Check slots count",
      "2025-11-16 10:30:54.329 +01:00|1.0.0.0.41760|Error|aiErrors|aiData|Door without link DoorLink_27",
      "2025-11-16 10:30:54.330 +01:00|1.0.0.0.41760|Error|aiErrors|aiData|Other",
    ].join("\n");
    const families = parser.parse(content).events.map((e) => e.eventFamily);
    expect(families).toEqual([
      "wrong_wave_count",
      "door_without_link",
      "other",
    ]);
  });
});
