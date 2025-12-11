import { ErrorsLogEvent, LogParser, ParsedLogResult } from "../types/index.js";
import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";

const HEADER_REGEX =
  /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|Error\|errors\|(?<message>.*)$/;

export class ErrorsLogsParser implements LogParser {
  canParse(fileName: string, sampleContent?: string): boolean {
    const lowered = fileName.toLowerCase();
    return (
      lowered.includes("errors_") ||
      (sampleContent ?? "").toLowerCase().includes("|errors|")
    );
  }

  parse(content: string, filePath?: string): ParsedLogResult<ErrorsLogEvent> {
    const groups = groupByHeader(content, HEADER_REGEX);
    const events: ErrorsLogEvent[] = groups.map(({ match, continuation }) => {
      const { timestamp = "", version = "", message = "" } =
        (match.groups ?? {}) as Record<string, string>;
      const classification = classify(message);
      return {
        logType: "errors",
        timestamp: normalizeTimestamp(timestamp),
        timestampRaw: timestamp,
        version: version.trim() || undefined,
        level: "Error",
        component: "errors",
        message: message.trim(),
        eventFamily: classification.eventFamily,
        continuation: continuation.length ? continuation : undefined,
        fields: classification.fields,
      };
    });

    return {
      filePath,
      logType: "errors",
      events,
      meta: deriveMetaFromEvents(events, filePath),
    };
  }
}

function classify(message: string): Pick<ErrorsLogEvent, "eventFamily" | "fields"> {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  if (trimmed.startsWith("Mip 0 waiting timeout")) return { eventFamily: "mip_timeout", fields: {} };
  if (trimmed.startsWith("NullReferenceException")) return { eventFamily: "null_reference", fields: {} };
  if (trimmed.startsWith("KeyNotFoundException")) return { eventFamily: "key_not_found", fields: {} };
  if (trimmed.startsWith("Can't find lamp with netId")) return { eventFamily: "missing_lamp", fields: {} };
  if (trimmed.includes("Cant find counter for Quest")) return { eventFamily: "missing_quest_counter", fields: {} };
  if (lower.startsWith("seasons|")) return { eventFamily: "seasons", fields: {} };
  if (lower.includes("trying to add duplicate")) return { eventFamily: "locale_duplicate", fields: {} };
  if (lower.includes("incorrect enum value")) return { eventFamily: "enum_fallback", fields: {} };
  if (lower.includes("serialization layout")) return { eventFamily: "serialization_layout", fields: {} };
  if (lower.includes("supplydata is null")) return { eventFamily: "supply_data_null", fields: {} };
  if (lower.startsWith("spatial-audio|")) return { eventFamily: "spatial_audio", fields: {} };
  if (lower.includes("try to load null resource")) return { eventFamily: "resource_null", fields: {} };
  if (lower.includes("already registered object")) return { eventFamily: "duplicate_object", fields: {} };
  if (lower.startsWith("insurance|")) return { eventFamily: "insurance", fields: {} };
  if (lower.startsWith("aidata|")) return { eventFamily: "ai", fields: {} };
  if (lower.startsWith("player|")) return { eventFamily: "player", fields: {} };
  return { eventFamily: "other", fields: {} };
}
