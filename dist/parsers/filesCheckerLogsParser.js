import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";
const HEADER_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|Info\|files-checker\|(?<message>.*)$/;
export class FilesCheckerLogsParser {
    canParse(fileName, sampleContent) {
        const lowered = fileName.toLowerCase();
        return (lowered.includes("files-checker_") ||
            (sampleContent ?? "").toLowerCase().includes("|files-checker|"));
    }
    parse(content, filePath) {
        const groups = groupByHeader(content, HEADER_REGEX);
        const events = groups.map(({ match }) => {
            const { timestamp = "", version = "", message = "" } = (match.groups ?? {});
            const classification = classify(message);
            return {
                logType: "files-checker",
                timestamp: normalizeTimestamp(timestamp),
                timestampRaw: timestamp,
                version: version.trim() || undefined,
                level: "Info",
                component: "files-checker",
                message: message.trim(),
                eventFamily: classification.eventFamily,
                fields: classification.fields,
            };
        });
        return {
            filePath,
            logType: "files-checker",
            events,
            meta: deriveMetaFromEvents(events, filePath),
        };
    }
}
function classify(message) {
    const trimmed = message.trim();
    if (trimmed.startsWith("Consistency ensurance is launched")) {
        return { eventFamily: "start", fields: {} };
    }
    if (trimmed.startsWith("ExecutablePath")) {
        const pathMatch = trimmed.match(/ExecutablePath:\s*(.*)/);
        return { eventFamily: "executable_path", fields: { executablePath: pathMatch?.[1] } };
    }
    if (trimmed.startsWith("Consistency ensurance is succeed")) {
        const elapsedMatch = trimmed.match(/ElapsedMilliseconds:(\d+)/);
        return {
            eventFamily: "complete",
            fields: { elapsedMs: elapsedMatch?.[1] ? Number(elapsedMatch[1]) : undefined },
        };
    }
    return { eventFamily: "other", fields: {} };
}
