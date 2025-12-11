import {
  InsuranceLogEvent,
  LogParser,
  ParsedLogResult,
} from "../types/index.js";
import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";

const HEADER_REGEX =
  /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|(?<level>Warn|Error)\|insurance\|(?<message>.*)$/;

export class InsuranceLogsParser implements LogParser {
  canParse(fileName: string, sampleContent?: string): boolean {
    const lowered = fileName.toLowerCase();
    return (
      lowered.includes("insurance_") ||
      (sampleContent ?? "").toLowerCase().includes("|insurance|")
    );
  }

  parse(
    content: string,
    filePath?: string,
  ): ParsedLogResult<InsuranceLogEvent> {
    const groups = groupByHeader(content, HEADER_REGEX);
    const events: InsuranceLogEvent[] = groups.map(({ match }) => {
      const { timestamp = "", version = "", level = "Warn", message = "" } =
        (match.groups ?? {}) as Record<string, string>;
      const classification = classify(message);
      return {
        logType: "insurance",
        timestamp: normalizeTimestamp(timestamp),
        timestampRaw: timestamp,
        version: version.trim() || undefined,
        level: level.trim() as InsuranceLogEvent["level"],
        component: "insurance",
        message: message.trim(),
        eventFamily: classification.eventFamily,
        fields: classification.fields,
      };
    });

    return {
      filePath,
      logType: "insurance",
      events,
      meta: deriveMetaFromEvents(events, filePath),
    };
  }
}

function classify(
  message: string,
): Pick<InsuranceLogEvent, "eventFamily" | "fields"> {
  const trimmed = message.trim();
  if (trimmed.startsWith("Items to insure does not contain")) {
    const itemMatch = trimmed.match(/contain:\s*(.*)$/);
    return { eventFamily: "warn_missing_item", fields: { itemName: itemMatch?.[1]?.trim() } };
  }
  if (trimmed.startsWith("Error insuring item")) {
    const itemMatch = trimmed.match(/\((.*)\)/);
    return { eventFamily: "error_insuring", fields: { itemName: itemMatch?.[1]?.trim() } };
  }
  return { eventFamily: "other", fields: {} };
}
