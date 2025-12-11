import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";
const HEADER_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|(?<level>[^|]*)\|push-notifications\|(?<message>.*)$/;
export class PushNotificationsLogsParser {
    canParse(fileName, sampleContent) {
        const lowered = fileName.toLowerCase();
        return (lowered.includes("push-notifications_") ||
            (sampleContent ?? "").toLowerCase().includes("|push-notifications|"));
    }
    parse(content, filePath) {
        const groups = groupByHeader(content, HEADER_REGEX);
        const events = groups.map(({ match, continuation }) => {
            const { timestamp = "", version = "", level = "Info", message = "" } = (match.groups ?? {});
            const classification = classify(message, continuation);
            return {
                logType: "push-notifications",
                timestamp: normalizeTimestamp(timestamp),
                timestampRaw: timestamp,
                version: version.trim() || undefined,
                level: level.trim(),
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
function classify(message, continuation = []) {
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
        let payload;
        let ragfairInfo;
        let questInfo;
        if (continuation.length > 0) {
            const jsonStr = continuation.join("\n");
            try {
                const parsed = JSON.parse(jsonStr);
                payload = parseNotificationPayload(notificationType, parsed);
                ragfairInfo = extractRagfairInfo(notificationType, parsed);
                questInfo = extractQuestInfo(notificationType, parsed);
            }
            catch {
                // JSON parsing failed, payload remains undefined
            }
        }
        if (ragfairInfo) {
            return {
                eventFamily: "ragfair_sale",
                fields: { notificationType, payload, ...ragfairInfo },
            };
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
                questTraderId: questInfo?.questTraderId,
                questMessageType: questInfo?.questMessageType,
                questMessageText: questInfo?.questMessageText,
                questRewardItemsCounts: questInfo?.questRewardItemsCounts,
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
function extractQuestInfo(notificationType, data) {
    const typeLower = (notificationType ?? "").toLowerCase();
    const dataTypeLower = String(data?.type ?? "").toLowerCase();
    const isQuestMessage = typeLower === "chatmessagereceived" || dataTypeLower === "new_message" || dataTypeLower === "chatmessagereceived";
    if (!isQuestMessage)
        return undefined;
    const message = data?.message;
    const templateId = message?.templateId;
    let questId;
    let questStatus;
    if (templateId) {
        const parts = templateId.split(/\s+/);
        if (parts[0] && /^[0-9a-f]{24}$/i.test(parts[0]))
            questId = parts[0];
        const lowerParts = parts.map((p) => (p ?? "").toLowerCase());
        const hasQuestToken = lowerParts.some((p) => p.includes("success") || p.includes("fail") || p.includes("description"));
        if (!hasQuestToken) {
            // Likely a non-quest (e.g., Ragfair sale: "<hex> 0"), ignore to avoid false positives
            return undefined;
        }
        if (lowerParts.some((p) => p.includes("success")))
            questStatus = "completed";
        else if (lowerParts.some((p) => p.includes("fail")))
            questStatus = "failed";
        else if (lowerParts.some((p) => p.includes("description") || p.includes("start")))
            questStatus = "started";
    }
    const messageType = message?.type ? String(message.type).toLowerCase() : undefined;
    if (!questStatus && messageType) {
        if (messageType.includes("success"))
            questStatus = "completed";
        else if (messageType.includes("fail"))
            questStatus = "failed";
        else if (messageType.includes("description") || messageType.includes("start"))
            questStatus = "started";
    }
    if (!questStatus && typeof message?.text === "string") {
        const textLower = message.text.toLowerCase();
        if (textLower.includes("quest") || textLower.includes("start"))
            questStatus = "started";
    }
    const questTraderId = data?.dialogId;
    const questMessageType = message?.type;
    const questMessageText = typeof message?.text === "string" ? message.text : undefined;
    let questRewardRubles;
    const questRewardItems = [];
    const questRewardItemsCounts = {};
    const items = message?.items?.data;
    if (items) {
        for (const item of items) {
            const tpl = item?._tpl;
            if (!tpl)
                continue;
            if (tpl === "5449016a4bdc2d6f028b456f") {
                const upd = item?.upd;
                const count = typeof upd?.StackObjectsCount === "number" ? upd.StackObjectsCount : undefined;
                if (typeof count === "number")
                    questRewardRubles = count;
            }
            else {
                questRewardItems.push(tpl);
                questRewardItemsCounts[tpl] = (questRewardItemsCounts[tpl] ?? 0) + 1;
            }
        }
    }
    if (!questId &&
        !questStatus &&
        !questRewardItems.length &&
        questRewardRubles === undefined &&
        !questTraderId &&
        !questMessageType &&
        !questMessageText)
        return undefined;
    return {
        questId,
        questStatus,
        questRewardRubles,
        questRewardItems: questRewardItems.length ? questRewardItems : undefined,
        questTraderId,
        questMessageType,
        questMessageText,
        questRewardItemsCounts: Object.keys(questRewardItemsCounts).length ? questRewardItemsCounts : undefined,
    };
}
function extractRagfairInfo(notificationType, data) {
    if ((notificationType ?? "").toLowerCase() !== "ragfairoffersold")
        return undefined;
    const offerId = data?.offerId;
    const handbookId = data?.handbookId;
    const count = typeof data?.count === "number" ? data.count : undefined;
    // Try to derive tpl from handbookId (if present) or from payload
    const tpl = handbookId;
    if (!offerId && !handbookId && count === undefined)
        return undefined;
    return { offerId, handbookId, count, tpl };
}
function parseNotificationPayload(notificationType, data) {
    if (!notificationType)
        return undefined;
    const type = data.type;
    const eventId = data.eventId;
    switch (notificationType) {
        case "GroupMatchInviteSend": {
            const members = data.members?.map(parseMemberInfo);
            return {
                type: type ?? "groupMatchInviteSend",
                eventId,
                requestId: data.requestId,
                from: data.from,
                members,
            };
        }
        case "GroupMatchRaidSettings": {
            const settings = data.raidSettings;
            return {
                type: type ?? "groupMatchRaidSettings",
                eventId,
                raidSettings: settings ? {
                    location: settings.location,
                    timeVariant: settings.timeVariant,
                    raidMode: settings.raidMode,
                    side: settings.side,
                    metabolismDisabled: settings.metabolismDisabled,
                    playersSpawnPlace: settings.playersSpawnPlace,
                } : undefined,
            };
        }
        case "GroupMatchUserLeave": {
            return {
                type: type ?? "groupMatchUserLeave",
                eventId,
                odidLeaved: data.odidLeaved,
            };
        }
        case "GroupMatchLeaderChanged": {
            return {
                type: type ?? "groupMatchLeaderChanged",
                eventId,
                odid: data.odid,
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
                message: data.message,
                profiles: data.profiles,
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
function parseMemberInfo(member) {
    const info = member.Info;
    return {
        odid: member._id,
        odid_deprecated: member.odid,
        odid_2_deprecated: member.Odid,
        aid: member.aid,
        isLeader: member.isLeader,
        isReady: member.isReady,
        info: info ? {
            nickname: info.Nickname,
            side: info.Side,
            level: info.Level,
            memberCategory: info.MemberCategory,
            gameVersion: info.GameVersion,
            prestigeLevel: info.PrestigeLevel,
            unlockedLocations: info.unlockedLocations,
        } : undefined,
    };
}
