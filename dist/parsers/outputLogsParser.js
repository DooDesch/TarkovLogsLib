import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";
const HEADER_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|(?<level>[^|]*)\|output\|(?<message>.*)$/;
export class OutputLogsParser {
    canParse(fileName, sampleContent) {
        const lowered = fileName.toLowerCase();
        return (lowered.includes("output_") ||
            (sampleContent ?? "").toLowerCase().includes("|output|"));
    }
    parse(content, filePath) {
        const groups = groupByHeader(content, HEADER_REGEX);
        const events = groups.map(({ match, continuation }) => {
            const { timestamp = "", version = "", level = "Info", message = "" } = (match.groups ?? {});
            const { family, hint } = classify(message);
            return {
                logType: "output",
                timestamp: normalizeTimestamp(timestamp),
                timestampRaw: timestamp,
                version: version.trim() || undefined,
                level: level.trim(),
                component: "output",
                message: message.trim(),
                eventFamily: family,
                continuation: continuation.length ? continuation : undefined,
                fields: { componentHint: hint },
            };
        });
        return {
            filePath,
            logType: "output",
            events,
            meta: deriveMetaFromEvents(events, filePath),
        };
    }
}
function classify(message) {
    const trimmed = message.trim();
    const parts = trimmed.split("|");
    const hint = parts.length > 1 ? parts[0] : undefined;
    const prefix = hint ?? trimmed.slice(0, 40);
    return { family: prefix, hint };
}
