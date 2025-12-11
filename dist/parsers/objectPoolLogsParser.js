import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";
const HEADER_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|Error\|objectPool\|(?<assetId>[^|]+)\|(?<message>.*)$/;
export class ObjectPoolLogsParser {
    canParse(fileName, sampleContent) {
        const lowered = fileName.toLowerCase();
        return (lowered.includes("objectpool_") ||
            (sampleContent ?? "").toLowerCase().includes("|objectpool|"));
    }
    parse(content, filePath) {
        const groups = groupByHeader(content, HEADER_REGEX);
        const events = groups.map(({ match, continuation }) => {
            const { timestamp = "", version = "", assetId = "", message = "" } = (match.groups ?? {});
            const eventFamily = message.includes("destroyed") ? "return_to_destroyed_pool" : "other";
            return {
                logType: "objectPool",
                timestamp: normalizeTimestamp(timestamp),
                timestampRaw: timestamp,
                version: version.trim() || undefined,
                level: "Error",
                component: "objectPool",
                message: message.trim(),
                eventFamily,
                continuation: continuation.length ? continuation : undefined,
                fields: { assetId },
            };
        });
        return {
            filePath,
            logType: "objectPool",
            events,
            meta: deriveMetaFromEvents(events, filePath),
        };
    }
}
