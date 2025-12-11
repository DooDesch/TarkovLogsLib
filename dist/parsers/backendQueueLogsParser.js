import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";
const HEADER_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|Error\|backend_queue\|(?<message>.*)$/;
export class BackendQueueLogsParser {
    canParse(fileName, sampleContent) {
        const lowered = fileName.toLowerCase();
        return (lowered.includes("backend_queue_") ||
            (sampleContent ?? "").toLowerCase().includes("|backend_queue|"));
    }
    parse(content, filePath) {
        const groups = groupByHeader(content, HEADER_REGEX);
        const events = groups.map(({ match, continuation }) => {
            const { timestamp = "", version = "", message = "" } = (match.groups ?? {});
            const parsedContinuation = parseContinuationJson(continuation);
            return {
                logType: "backend_queue",
                timestamp: normalizeTimestamp(timestamp),
                timestampRaw: timestamp,
                version: version.trim() || undefined,
                level: "Error",
                component: "backend_queue",
                message: message.trim(),
                eventFamily: "queue_failure",
                continuation: continuation.length ? continuation : undefined,
                fields: { commands: parsedContinuation },
            };
        });
        return {
            filePath,
            logType: "backend_queue",
            events,
            meta: deriveMetaFromEvents(events, filePath),
        };
    }
}
function parseContinuationJson(lines) {
    const text = lines.join("\n");
    if (!text.trim())
        return [];
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    }
    catch {
        // fall through to empty
    }
    return [];
}
