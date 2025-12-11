import { ParsedLogResult } from "../types/index.js";

export interface HeaderGroup {
  line: string;
  match: RegExpMatchArray;
  continuation: string[];
}

export function normalizeTimestamp(raw: string): string {
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

export function groupByHeader(
  content: string,
  headerRegex: RegExp
): HeaderGroup[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const groups: HeaderGroup[] = [];
  let current: HeaderGroup | null = null;
  for (const line of lines) {
    const match = line.match(headerRegex);
    if (match) {
      if (current) groups.push(current);
      current = { line, match, continuation: [] };
    } else if (current) {
      if (line.trim().length === 0) continue;
      current.continuation.push(line);
    }
  }
  if (current) groups.push(current);
  return groups;
}

export function deriveMetaFromEvents<
  T extends { timestamp?: string; version?: string }
>(events: T[], filePath?: string): ParsedLogResult["meta"] {
  const timestamps = events
    .map((e) => e.timestamp)
    .filter((v): v is string => Boolean(v))
    .sort();
  const versions = events
    .map((e) => e.version)
    .filter((v): v is string => Boolean(v));
  return {
    earliestTimestamp: timestamps[0],
    latestTimestamp: timestamps[timestamps.length - 1],
    buildVersion: versions[0],
    sessionPrefix: extractSessionPrefix(filePath),
  };
}

export function extractSessionPrefix(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  const match = filePath.match(
    /log_(\d{4}\.\d{2}\.\d{2}_\d{2}-\d{2}-\d{2}_[^/\\\s]+)/
  );
  return match?.[1];
}
