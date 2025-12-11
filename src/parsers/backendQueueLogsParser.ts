import {
  BackendQueueCommand,
  BackendQueueLogEvent,
  LogParser,
  ParsedLogResult,
} from "../types/index.js";
import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";

const HEADER_REGEX =
  /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|Error\|backend_queue\|(?<message>.*)$/;

export class BackendQueueLogsParser implements LogParser {
  canParse(fileName: string, sampleContent?: string): boolean {
    const lowered = fileName.toLowerCase();
    return (
      lowered.includes("backend_queue_") ||
      (sampleContent ?? "").toLowerCase().includes("|backend_queue|")
    );
  }

  parse(
    content: string,
    filePath?: string,
  ): ParsedLogResult<BackendQueueLogEvent> {
    const groups = groupByHeader(content, HEADER_REGEX);
    const events: BackendQueueLogEvent[] = groups.map(({ match, continuation }) => {
      const { timestamp = "", version = "", message = "" } =
        (match.groups ?? {}) as Record<string, string>;
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

function parseContinuationJson(lines: string[]): BackendQueueCommand[] {
  const text = lines.join("\n");
  if (!text.trim()) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed as BackendQueueCommand[];
    }
  } catch {
    // fall through to empty
  }
  return [];
}
