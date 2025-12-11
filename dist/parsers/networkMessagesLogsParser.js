import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";
const HEADER_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|Info\|network-messages\|(?<metrics>.*)$/;
export class NetworkMessagesLogsParser {
    canParse(fileName, sampleContent) {
        const lowered = fileName.toLowerCase();
        return (lowered.includes("network-messages_") ||
            (sampleContent ?? "").toLowerCase().includes("|network-messages|"));
    }
    parse(content, filePath) {
        const groups = groupByHeader(content, HEADER_REGEX);
        const events = groups.map(({ match }) => {
            const { timestamp = "", version = "", metrics = "" } = (match.groups ?? {});
            const parsedMetrics = parseMetrics(metrics);
            return {
                logType: "network-messages",
                timestamp: normalizeTimestamp(timestamp),
                timestampRaw: timestamp,
                version: version.trim() || undefined,
                level: "Info",
                component: "network-messages",
                message: metrics.trim(),
                eventFamily: "metrics",
                fields: parsedMetrics,
            };
        });
        return {
            filePath,
            logType: "network-messages",
            events,
            meta: deriveMetaFromEvents(events, filePath),
        };
    }
}
function parseMetrics(metrics) {
    const parts = metrics.split("|");
    const result = {};
    for (const part of parts) {
        const [key, value] = part.split(":");
        if (!key || value === undefined)
            continue;
        const num = Number(value);
        const safeKey = key.trim();
        result[safeKey] = Number.isNaN(num) ? undefined : num;
    }
    return result;
}
