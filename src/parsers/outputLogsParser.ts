import { LogParser, OutputLogEvent, ParsedLogResult } from "../types/index.js";
import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";

const HEADER_REGEX =
  /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|(?<level>[^|]*)\|output\|(?<message>.*)$/;

export class OutputLogsParser implements LogParser {
  canParse(fileName: string, sampleContent?: string): boolean {
    const lowered = fileName.toLowerCase();
    return (
      lowered.includes("output_") ||
      (sampleContent ?? "").toLowerCase().includes("|output|")
    );
  }

  parse(content: string, filePath?: string): ParsedLogResult<OutputLogEvent> {
    const groups = groupByHeader(content, HEADER_REGEX);
    const events: OutputLogEvent[] = groups.map(({ match, continuation }) => {
      const { timestamp = "", version = "", level = "Info", message = "" } =
        (match.groups ?? {}) as Record<string, string>;
      const { family, hint } = classify(message);
      return {
        logType: "output",
        timestamp: normalizeTimestamp(timestamp),
        timestampRaw: timestamp,
        version: version.trim() || undefined,
        level: level.trim() as OutputLogEvent["level"],
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

function classify(message: string): { family: string; hint?: string } {
  const trimmed = message.trim();
  const parts = trimmed.split("|");
  const hint = parts.length > 1 ? parts[0] : undefined;
  const prefix = hint ?? trimmed.slice(0, 40);
  return { family: prefix, hint };
}
