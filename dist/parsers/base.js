export function normalizeTimestamp(raw) {
    const trimmed = raw.trim();
    // Normalize "YYYY-MM-DD HH:MM:SS.mmm ±TZ" and "YYYY-MM-DD HH:MM:SS.mmm"
    const zoneFixed = trimmed.replace(/\s+([+-]\d{2}:\d{2})$/, "T$1");
    const isoCandidate = zoneFixed.includes("T")
        ? zoneFixed
        : trimmed.replace(" ", "T") + "Z";
    const parsed = Date.parse(isoCandidate);
    if (!Number.isNaN(parsed)) {
        return new Date(parsed).toISOString();
    }
    return trimmed;
}
export function groupByHeader(content, headerRegex) {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const groups = [];
    let current = null;
    for (const line of lines) {
        const match = line.match(headerRegex);
        if (match) {
            if (current)
                groups.push(current);
            current = { line, match, continuation: [] };
        }
        else if (current) {
            if (line.trim().length === 0)
                continue;
            current.continuation.push(line);
        }
    }
    if (current)
        groups.push(current);
    return groups;
}
export function deriveMetaFromEvents(events, filePath) {
    const timestamps = events
        .map((e) => e.timestamp)
        .filter((v) => Boolean(v))
        .sort();
    const versions = events
        .map((e) => e.version)
        .filter((v) => Boolean(v));
    return {
        earliestTimestamp: timestamps[0],
        latestTimestamp: timestamps[timestamps.length - 1],
        buildVersion: versions[0],
        sessionPrefix: extractSessionPrefix(filePath),
    };
}
export function extractSessionPrefix(filePath) {
    if (!filePath)
        return undefined;
    const match = filePath.match(/log_(\d{4}\.\d{2}\.\d{2}_\d{2}-\d{2}-\d{2}_[^/\\\s]+)/);
    return match?.[1];
}
