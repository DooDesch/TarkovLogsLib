import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";
const HEADER_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|Info\|backendCache\|BackendCache\.Load File name: (?<rest>.*)$/;
export class BackendCacheLogsParser {
    canParse(fileName, sampleContent) {
        const lowered = fileName.toLowerCase();
        return (lowered.includes("backendcache_") ||
            (sampleContent ?? "").toLowerCase().includes("|backendcache|"));
    }
    parse(content, filePath) {
        const groups = groupByHeader(content, HEADER_REGEX);
        const events = groups.map(({ match }) => {
            const { timestamp = "", version = "", rest = "" } = (match.groups ?? {});
            const parsed = classify(rest);
            return {
                logType: "backendCache",
                timestamp: normalizeTimestamp(timestamp),
                timestampRaw: timestamp,
                version: version.trim() || undefined,
                level: "Info",
                component: "backendCache",
                message: rest.trim(),
                eventFamily: "lookup",
                fields: parsed,
            };
        });
        return {
            filePath,
            logType: "backendCache",
            events,
            meta: deriveMetaFromEvents(events, filePath),
        };
    }
}
function classify(rest) {
    const miss = rest.includes("- NOT exists");
    // rest format after header: "<path>, URL: <endpoint>" or "<path> - NOT exists"
    // Extract path: everything before ", URL:" or " - NOT exists"
    let path = rest.trim();
    let endpoint = "";
    const urlIndex = rest.indexOf(", URL:");
    if (urlIndex !== -1) {
        path = rest.slice(0, urlIndex).trim();
        endpoint = rest.slice(urlIndex + 6).trim(); // skip ", URL:"
    }
    else if (miss) {
        // Remove " - NOT exists" suffix from path
        path = rest.replace(/ - NOT exists$/, "").trim();
    }
    return {
        path,
        endpoint,
        cacheHit: !miss,
    };
}
