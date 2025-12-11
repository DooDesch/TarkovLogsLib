import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";
const HEADER_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|Error\|aiErrors\|(?<source>[^|]*)\|(?<message>.*)$/;
export class AiErrorsLogsParser {
    canParse(fileName, sampleContent) {
        const lowered = fileName.toLowerCase();
        return (lowered.includes("aierrors_") ||
            (sampleContent ?? "").toLowerCase().includes("|aierrors|"));
    }
    parse(content, filePath) {
        const groups = groupByHeader(content, HEADER_REGEX);
        const events = groups.map(({ match }) => {
            const { timestamp = "", version = "", source = "", message = "" } = (match.groups ?? {});
            const classification = classify(message);
            return {
                logType: "aiErrors",
                timestamp: normalizeTimestamp(timestamp),
                timestampRaw: timestamp,
                version: version.trim() || undefined,
                level: "Error",
                component: "aiErrors",
                message: message.trim(),
                eventFamily: classification.eventFamily,
                fields: { ...classification.fields, source },
            };
        });
        return {
            filePath,
            logType: "aiErrors",
            events,
            meta: deriveMetaFromEvents(events, filePath),
        };
    }
}
function classify(message) {
    const trimmed = message.trim();
    if (trimmed.startsWith("Wrong count of all simple waves")) {
        return { eventFamily: "wrong_wave_count", fields: {} };
    }
    if (trimmed.startsWith("Door without link")) {
        const doorMatch = trimmed.match(/Door without link\s+(.*)/);
        return { eventFamily: "door_without_link", fields: { doorName: doorMatch?.[1]?.trim() } };
    }
    return { eventFamily: "other", fields: {} };
}
