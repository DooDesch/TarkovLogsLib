import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";
const HEADER_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|(?<level>Warn|Error)\|insurance\|(?<message>.*)$/;
export class InsuranceLogsParser {
    canParse(fileName, sampleContent) {
        const lowered = fileName.toLowerCase();
        return (lowered.includes("insurance_") ||
            (sampleContent ?? "").toLowerCase().includes("|insurance|"));
    }
    parse(content, filePath) {
        const groups = groupByHeader(content, HEADER_REGEX);
        const events = groups.map(({ match }) => {
            const { timestamp = "", version = "", level = "Warn", message = "" } = (match.groups ?? {});
            const classification = classify(message);
            return {
                logType: "insurance",
                timestamp: normalizeTimestamp(timestamp),
                timestampRaw: timestamp,
                version: version.trim() || undefined,
                level: level.trim(),
                component: "insurance",
                message: message.trim(),
                eventFamily: classification.eventFamily,
                fields: classification.fields,
            };
        });
        return {
            filePath,
            logType: "insurance",
            events,
            meta: deriveMetaFromEvents(events, filePath),
        };
    }
}
function classify(message) {
    const trimmed = message.trim();
    if (trimmed.startsWith("Items to insure does not contain")) {
        const itemMatch = trimmed.match(/contain:\s*(.*)$/);
        return { eventFamily: "warn_missing_item", fields: { itemName: itemMatch?.[1]?.trim() } };
    }
    if (trimmed.startsWith("Error insuring item")) {
        const itemMatch = trimmed.match(/\((.*)\)/);
        return { eventFamily: "error_insuring", fields: { itemName: itemMatch?.[1]?.trim() } };
    }
    return { eventFamily: "other", fields: {} };
}
