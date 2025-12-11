import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";
const HEADER_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|Error\|player\|(?<message>.*)$/;
export class PlayerLogsParser {
    canParse(fileName, sampleContent) {
        const lowered = fileName.toLowerCase();
        return (lowered.includes("player_") ||
            (sampleContent ?? "").toLowerCase().includes("|player|"));
    }
    parse(content, filePath) {
        const groups = groupByHeader(content, HEADER_REGEX);
        const events = groups.map(({ match }) => {
            const { timestamp = "", version = "", message = "" } = (match.groups ?? {});
            const classification = classify(message);
            return {
                logType: "player",
                timestamp: normalizeTimestamp(timestamp),
                timestampRaw: timestamp,
                version: version.trim() || undefined,
                level: "Error",
                component: "player",
                message: message.trim(),
                eventFamily: classification.eventFamily,
                fields: classification.fields,
            };
        });
        return {
            filePath,
            logType: "player",
            events,
            meta: deriveMetaFromEvents(events, filePath),
        };
    }
}
function classify(message) {
    const trimmed = message.trim();
    if (trimmed.startsWith("Could not find item with id")) {
        const idMatch = trimmed.match(/id:\s*([0-9a-fA-F]+)/);
        return { eventFamily: "missing_item", fields: { itemId: idMatch?.[1] } };
    }
    if (trimmed.startsWith("Could not find item address")) {
        const parentMatch = trimmed.match(/ParentId:\s*([0-9a-fA-F]+)/);
        const containerMatch = trimmed.match(/ContainerId:\s*([^\s]+)/);
        return {
            eventFamily: "missing_address",
            fields: { parentId: parentMatch?.[1], containerId: containerMatch?.[1] },
        };
    }
    return { eventFamily: "other", fields: {} };
}
