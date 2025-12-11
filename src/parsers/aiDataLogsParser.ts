import { AiDataLogEvent, LogParser, ParsedLogResult } from "../types/index.js";
import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";

const HEADER_REGEX =
  /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|Error\|aiData\|(?<message>.*)$/;

export class AiDataLogsParser implements LogParser {
  canParse(fileName: string, sampleContent?: string): boolean {
    const lowered = fileName.toLowerCase();
    return lowered.includes("aidata_") || (sampleContent ?? "").toLowerCase().includes("|aidata|");
  }

  parse(content: string, filePath?: string): ParsedLogResult<AiDataLogEvent> {
    const groups = groupByHeader(content, HEADER_REGEX);
    const events: AiDataLogEvent[] = groups.map(({ match }) => {
      const { timestamp = "", version = "", message = "" } =
        (match.groups ?? {}) as Record<string, string>;
      const classification = classify(message);
      return {
        logType: "aiData",
        timestamp: normalizeTimestamp(timestamp),
        timestampRaw: timestamp,
        version: version.trim() || undefined,
        level: "Error",
        component: "aiData",
        message: message.trim(),
        eventFamily: classification.eventFamily,
        fields: classification.fields,
      };
    });

    return {
      filePath,
      logType: "aiData",
      events,
      meta: deriveMetaFromEvents(events, filePath),
    };
  }
}

function classify(message: string): Pick<AiDataLogEvent, "eventFamily" | "fields"> {
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
