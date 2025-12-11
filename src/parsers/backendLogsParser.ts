import { BackendLogEvent, LogParser, ParsedLogResult } from "../types/index.js";
import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";

const HEADER_REGEX =
  /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|(?<level>[^|]*)\|backend\|(?<message>.*)$/;

export class BackendLogsParser implements LogParser {
  canParse(fileName: string, sampleContent?: string): boolean {
    const lowered = fileName.toLowerCase();
    return (
      lowered.includes("backend_") ||
      (sampleContent ?? "").toLowerCase().includes("|backend|")
    );
  }

  parse(content: string, filePath?: string): ParsedLogResult<BackendLogEvent> {
    const groups = groupByHeader(content, HEADER_REGEX);
    const events: BackendLogEvent[] = groups.map(({ match, continuation }) => {
      const { timestamp = "", version = "", level = "Info", message = "" } =
        (match.groups ?? {}) as Record<string, string>;
      const parsed = classifyBackendMessage(message);
      return {
        logType: "backend",
        timestamp: normalizeTimestamp(timestamp),
        timestampRaw: timestamp,
        version: version.trim() || undefined,
        level: level.trim() as BackendLogEvent["level"],
        component: "backend",
        message: message.trim(),
        eventFamily: parsed.eventFamily,
        continuation: continuation.length ? continuation : undefined,
        fields: parsed.fields,
      };
    });

    return {
      filePath,
      logType: "backend",
      events,
      meta: deriveMetaFromEvents(events, filePath),
    };
  }
}

function classifyBackendMessage(message: string): Pick<BackendLogEvent, "eventFamily" | "fields"> {
  const trimmed = message.trim();
  if (trimmed.startsWith("---> Request")) {
    const requestMatch = trimmed.match(/id \[(\d+)\].*URL:\s*([^,]+), crc:\s*(.*)\.?/);
    return {
      eventFamily: "request",
      fields: {
        id: requestMatch?.[1] ? Number(requestMatch[1]) : undefined,
        url: requestMatch?.[2],
        crc: requestMatch?.[3],
      },
    };
  }
  if (trimmed.startsWith("<--- Response")) {
    const responseMatch = trimmed.match(/id \[(\d+)\]: URL:\s*([^,]+), crc:\s*(.*?)(?:, responseText:|$)/);
    return {
      eventFamily: "response",
      fields: {
        id: responseMatch?.[1] ? Number(responseMatch[1]) : undefined,
        url: responseMatch?.[2],
        crc: responseMatch?.[3],
      },
    };
  }
  if (trimmed.startsWith("<--- Error!")) {
    const errorMatch = trimmed.match(/HTTPS:\s*([^,]+),.*responseCode:(\d+)/);
    const reasonMatch = trimmed.match(/result:([^,]+)/);
    return {
      eventFamily: "transport_error",
      fields: {
        url: errorMatch?.[1],
        responseCode: errorMatch?.[2] ? Number(errorMatch[2]) : undefined,
        errorReason: reasonMatch?.[1]?.trim(),
      },
    };
  }
  if (trimmed.startsWith("Request") && trimmed.includes("will be retried")) {
    const retryMatch = trimmed.match(/retry:(\d+)\s+from\s+retries:(\d+)/i);
    const urlMatch = trimmed.match(/Request\s+([^\s]+)\s+will be retried/);
    return {
      eventFamily: "retry",
      fields: {
        url: urlMatch?.[1],
        retry: retryMatch?.[1] ? Number(retryMatch[1]) : undefined,
        retries: retryMatch?.[2] ? Number(retryMatch[2]) : undefined,
        errorReason: trimmed.split("error:")[1]?.trim(),
      },
    };
  }
  if (trimmed.startsWith("JSON parsing into")) {
    return {
      eventFamily: "deserialization_error",
      fields: { errorReason: trimmed },
    };
  }
  if (trimmed.includes("BackendServerSideException")) {
    const codeMatch = trimmed.match(/(\d{3})/);
    return {
      eventFamily: "server_exception",
      fields: {
        responseCode: codeMatch?.[1] ? Number(codeMatch[1]) : undefined,
        errorReason: trimmed,
      },
    };
  }
  return { eventFamily: "other", fields: {} };
}
