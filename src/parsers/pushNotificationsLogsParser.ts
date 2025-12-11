import {
  LogParser,
  ParsedLogResult,
  PushNotificationsLogEvent,
  NotificationPayload,
} from "../types/index.js";
import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";

const HEADER_REGEX =
  /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|(?<level>[^|]*)\|push-notifications\|(?<message>.*)$/;

export class PushNotificationsLogsParser implements LogParser {
  canParse(fileName: string, sampleContent?: string): boolean {
    const lowered = fileName.toLowerCase();
    return (
      lowered.includes("push-notifications_") ||
      (sampleContent ?? "").toLowerCase().includes("|push-notifications|")
    );
  }

  parse(
    content: string,
    filePath?: string,
  ): ParsedLogResult<PushNotificationsLogEvent> {
    const groups = groupByHeader(content, HEADER_REGEX);
    const events: PushNotificationsLogEvent[] = groups.map(({ match, continuation }) => {
      const { timestamp = "", version = "", level = "Info", message = "" } =
        (match.groups ?? {}) as Record<string, string>;
      const classification = classify(message, continuation);
      return {
        logType: "push-notifications",
        timestamp: normalizeTimestamp(timestamp),
        timestampRaw: timestamp,
        version: version.trim() || undefined,
        level: level.trim() as PushNotificationsLogEvent["level"],
        component: "push-notifications",
        message: message.trim(),
        eventFamily: classification.eventFamily,
        continuation: continuation.length ? continuation : undefined,
        fields: classification.fields,
      };
    });

    return {
      filePath,
      logType: "push-notifications",
      events,
      meta: deriveMetaFromEvents(events, filePath),
    };
  }
}

function classify(
  message: string,
  continuation: string[] = [],
): Pick<PushNotificationsLogEvent, "eventFamily" | "fields"> {
  const trimmed = message.trim();

  // "NotificationManager: new params received url: ws:wss://..."
  if (trimmed.startsWith("NotificationManager: new params received url")) {
    const urlMatch = trimmed.match(/url:\s*(.*)/i);
    const token = urlMatch?.[1]?.split("/").pop();
    return { eventFamily: "connection_params", fields: { url: urlMatch?.[1]?.trim(), token } };
  }

  // "LongPollingWebSocketRequest result Count:N MessageType:Text"
  if (trimmed.startsWith("LongPollingWebSocketRequest result")) {
    const countMatch = trimmed.match(/Count:(\d+)/);
    const typeMatch = trimmed.match(/MessageType:([^\s]+)/);
    return {
      eventFamily: "batch_result",
      fields: { count: countMatch?.[1] ? Number(countMatch[1]) : undefined, messageType: typeMatch?.[1] },
    };
  }

  // "LongPollingWebSocketRequest received:N"
  if (trimmed.startsWith("LongPollingWebSocketRequest received")) {
    const bytesMatch = trimmed.match(/received:(\d+)/);
    return {
      eventFamily: "received",
      fields: { bytesReceived: bytesMatch?.[1] ? Number(bytesMatch[1]) : undefined },
    };
  }

  // "NotificationManager.ProcessMessage | Received notification: Type: X, Time: N, Duration: X, ShowNotification: X"
  if (trimmed.startsWith("NotificationManager.ProcessMessage | Received notification")) {
    const typeMatch = trimmed.match(/Type:\s*([^,]+)/);
    const timeMatch = trimmed.match(/Time:\s*([^,]+)/);
    const durationMatch = trimmed.match(/Duration:\s*([^,]+)/);
    const showMatch = trimmed.match(/ShowNotification:\s*(\w+)/);
    return {
      eventFamily: "notification",
      fields: {
        notificationType: typeMatch?.[1]?.trim(),
        notificationTime: timeMatch?.[1] ? Number(timeMatch[1]) : undefined,
        notificationDuration: durationMatch?.[1] ? Number(durationMatch[1]) : undefined,
        showNotification: showMatch?.[1]?.toLowerCase() === "true",
      },
    };
  }

  // "Got notification | <Type>" followed by JSON continuation
  if (trimmed.startsWith("Got notification")) {
    const typeMatch = trimmed.match(/\|\s*(.*)$/);
    const notificationType = typeMatch?.[1]?.trim();

    // Try to parse JSON from continuation lines
    let payload: NotificationPayload | undefined;
    let questInfo:
      | {
          questId?: string;
          questStatus?: string;
          questRewardRubles?: number;
          questRewardItems?: string[];
        }
      | undefined;
    if (continuation.length > 0) {
      const jsonStr = continuation.join("\n");
      try {
        const parsed = JSON.parse(jsonStr);
        payload = parseNotificationPayload(notificationType, parsed);
        questInfo = extractQuestInfo(notificationType, parsed);
      } catch {
        // JSON parsing failed, payload remains undefined
      }
    }

    return {
      eventFamily: "simple_notification",
      fields: {
        notificationType,
        payload,
        questId: questInfo?.questId,
        questStatus: questInfo?.questStatus,
        questRewardRubles: questInfo?.questRewardRubles,
        questRewardItems: questInfo?.questRewardItems,
      },
    };
  }

  // "Service Notifications Ping"
  if (trimmed.includes("Service Notifications Ping")) {
    return { eventFamily: "ping", fields: {} };
  }

  // "Notification channel has been [dropped] by server error with code: N"
  if (trimmed.includes("Notification channel has been")) {
    const codeMatch = trimmed.match(/code:\s*(\d+)/);
    return { eventFamily: "dropped", fields: { errorCode: codeMatch?.[1] ? Number(codeMatch[1]) : undefined } };
  }

  return { eventFamily: "other", fields: {} };
}

function extractQuestInfo(
  notificationType: string | undefined,
  data: Record<string, unknown>,
): {
  questId?: string;
  questStatus?: string;
  questRewardRubles?: number;
  questRewardItems?: string[];
} | undefined {
  const typeLower = (notificationType ?? "").toLowerCase();
  const dataTypeLower = String((data as any)?.type ?? "").toLowerCase();
  const isQuestMessage =
    typeLower === "chatmessagereceived" || dataTypeLower === "new_message" || dataTypeLower === "chatmessagereceived";
  if (!isQuestMessage) return undefined;

  const message = (data as any)?.message as Record<string, unknown> | undefined;
  const templateId = message?.templateId as string | undefined;
  let questId: string | undefined;
  let questStatus: string | undefined;

  if (templateId) {
    const parts = templateId.split(/\s+/);
    if (parts[0] && /^[0-9a-f]{24}$/i.test(parts[0])) questId = parts[0];
    const lowerParts = parts.map((p) => (p ?? "").toLowerCase());
    const hasQuestToken = lowerParts.some((p) => p.includes("success") || p.includes("fail") || p.includes("description"));
    if (!hasQuestToken) {
      // Likely a non-quest (e.g., Ragfair sale: "<hex> 0"), ignore to avoid false positives
      return undefined;
    }
    if (lowerParts.some((p) => p.includes("success"))) questStatus = "completed";
    else if (lowerParts.some((p) => p.includes("fail"))) questStatus = "failed";
    else if (lowerParts.some((p) => p.includes("description") || p.includes("start"))) questStatus = "started";
  }

  const messageType = message?.type ? String(message.type).toLowerCase() : undefined;
  if (!questStatus && messageType) {
    if (messageType.includes("success")) questStatus = "completed";
    else if (messageType.includes("fail")) questStatus = "failed";
    else if (messageType.includes("description") || messageType.includes("start")) questStatus = "started";
  }
  if (!questStatus && typeof (message as any)?.text === "string") {
    const textLower = ((message as any).text as string).toLowerCase();
    if (textLower.includes("quest") || textLower.includes("start")) questStatus = "started";
  }

  let questRewardRubles: number | undefined;
  const questRewardItems: string[] = [];
  const items = (message as any)?.items?.data as Array<Record<string, unknown>> | undefined;
  if (items) {
    for (const item of items) {
      const tpl = (item as any)?._tpl as string | undefined;
      if (!tpl) continue;
      if (tpl === "5449016a4bdc2d6f028b456f") {
        const upd = (item as any)?.upd as Record<string, unknown> | undefined;
        const count = typeof upd?.StackObjectsCount === "number" ? upd.StackObjectsCount : undefined;
        if (typeof count === "number") questRewardRubles = count;
      } else {
        questRewardItems.push(tpl);
      }
    }
  }

  if (!questId && !questStatus && !questRewardItems.length && questRewardRubles === undefined) return undefined;
  return {
    questId,
    questStatus,
    questRewardRubles,
    questRewardItems: questRewardItems.length ? questRewardItems : undefined,
  };
}

function parseNotificationPayload(
  notificationType: string | undefined,
  data: Record<string, unknown>,
): NotificationPayload | undefined {
  if (!notificationType) return undefined;

  const type = data.type as string | undefined;
  const eventId = data.eventId as string | undefined;

  switch (notificationType) {
    case "GroupMatchInviteSend": {
      const members = (data.members as Array<Record<string, unknown>> | undefined)?.map(parseMemberInfo);
      return {
        type: type ?? "groupMatchInviteSend",
        eventId,
        requestId: data.requestId as string | undefined,
        from: data.from as number | undefined,
        members,
      };
    }
    case "GroupMatchRaidSettings": {
      const settings = data.raidSettings as Record<string, unknown> | undefined;
      return {
        type: type ?? "groupMatchRaidSettings",
        eventId,
        raidSettings: settings ? {
          location: settings.location as string | undefined,
          timeVariant: settings.timeVariant as string | undefined,
          raidMode: settings.raidMode as string | undefined,
          side: settings.side as string | undefined,
          metabolismDisabled: settings.metabolismDisabled as boolean | undefined,
          playersSpawnPlace: settings.playersSpawnPlace as string | undefined,
        } : undefined,
      };
    }
    case "GroupMatchUserLeave": {
      return {
        type: type ?? "groupMatchUserLeave",
        eventId,
        odidLeaved: data.odidLeaved as string | undefined,
      };
    }
    case "GroupMatchLeaderChanged": {
      return {
        type: type ?? "groupMatchLeaderChanged",
        eventId,
        odid: data.odid as string | undefined,
      };
    }
    case "GroupMatchInviteCancel":
    case "GroupMatchInviteDecline":
    case "GroupMatchInviteAccept": {
      return {
        type: type ?? notificationType.toLowerCase(),
        eventId,
      };
    }
    case "GroupMatchWasRemoved": {
      return {
        type: type ?? "groupMatchWasRemoved",
        eventId,
      };
    }
    case "ChatMessageReceived": {
      return {
        type: type ?? "chatMessageReceived",
        eventId,
        message: data.message as Record<string, unknown> | undefined,
        profiles: data.profiles as Record<string, unknown>[] | undefined,
      };
    }
    case "ping": {
      return {
        type: "ping",
        eventId,
      };
    }
    default: {
      // Generic payload for unknown types
      return {
        type: type ?? notificationType,
        eventId,
        rawData: data,
      };
    }
  }
}

function parseMemberInfo(member: Record<string, unknown>): NotificationPayload["members"] extends (infer T)[] | undefined ? T : never {
  const info = member.Info as Record<string, unknown> | undefined;
  return {
    odid: member._id as string | undefined,
    odid_deprecated: member.odid as string | undefined,
    odid_2_deprecated: member.Odid as string | undefined,
    aid: member.aid as number | undefined,
    isLeader: member.isLeader as boolean | undefined,
    isReady: member.isReady as boolean | undefined,
    info: info ? {
      nickname: info.Nickname as string | undefined,
      side: info.Side as string | undefined,
      level: info.Level as number | undefined,
      memberCategory: info.MemberCategory as number | undefined,
      gameVersion: info.GameVersion as string | undefined,
      prestigeLevel: info.PrestigeLevel as number | undefined,
      unlockedLocations: info.unlockedLocations as string[] | undefined,
    } : undefined,
  };
}
