import {
  LogParser,
  NetworkMessagesLogEvent,
  ParsedLogResult,
} from "../types/index.js";
import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";

const HEADER_REGEX =
  /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|Info\|network-messages\|(?<metrics>.*)$/;

export class NetworkMessagesLogsParser implements LogParser {
  canParse(fileName: string, sampleContent?: string): boolean {
    const lowered = fileName.toLowerCase();
    return (
      lowered.includes("network-messages_") ||
      (sampleContent ?? "").toLowerCase().includes("|network-messages|")
    );
  }

  parse(
    content: string,
    filePath?: string,
  ): ParsedLogResult<NetworkMessagesLogEvent> {
    const groups = groupByHeader(content, HEADER_REGEX);
    const events: NetworkMessagesLogEvent[] = groups.map(({ match }) => {
      const { timestamp = "", version = "", metrics = "" } =
        (match.groups ?? {}) as Record<string, string>;
      const parsedMetrics = parseMetrics(metrics);
      return {
        logType: "network-messages",
        timestamp: normalizeTimestamp(timestamp),
        timestampRaw: timestamp,
        version: version.trim() || undefined,
        level: "Info",
        component: "network-messages",
        message: metrics.trim(),
        eventFamily: "metrics",
        fields: parsedMetrics,
      };
    });

    return {
      filePath,
      logType: "network-messages",
      events,
      meta: deriveMetaFromEvents(events, filePath),
    };
  }
}

function parseMetrics(metrics: string): NetworkMessagesLogEvent["fields"] {
  const parts = metrics.split("|");
  const result: NetworkMessagesLogEvent["fields"] = {};
  for (const part of parts) {
    const [key, value] = part.split(":");
    if (!key || value === undefined) continue;
    const num = Number(value);
    const safeKey = key.trim() as keyof NetworkMessagesLogEvent["fields"];
    (result as Record<string, number | undefined>)[safeKey] = Number.isNaN(num) ? undefined : num;
  }
  return result;
}
