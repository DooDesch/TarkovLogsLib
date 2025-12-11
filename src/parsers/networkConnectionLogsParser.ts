import {
  LogParser,
  NetworkConnectionLogEvent,
  ParsedLogResult,
} from "../types/index.js";
import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";

const HEADER_REGEX =
  /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|(?<level>[^|]*)\|network-connection\|(?<message>.*)$/;

export class NetworkConnectionLogsParser implements LogParser {
  canParse(fileName: string, sampleContent?: string): boolean {
    const lowered = fileName.toLowerCase();
    return (
      lowered.includes("network-connection_") ||
      (sampleContent ?? "").toLowerCase().includes("|network-connection|")
    );
  }

  parse(
    content: string,
    filePath?: string,
  ): ParsedLogResult<NetworkConnectionLogEvent> {
    const groups = groupByHeader(content, HEADER_REGEX);
    const events: NetworkConnectionLogEvent[] = groups.map(({ match }) => {
      const { timestamp = "", version = "", level = "Info", message = "" } =
        (match.groups ?? {}) as Record<string, string>;
      const classification = classify(message);
      return {
        logType: "network-connection",
        timestamp: normalizeTimestamp(timestamp),
        timestampRaw: timestamp,
        version: version.trim() || undefined,
        level: level.trim() as NetworkConnectionLogEvent["level"],
        component: "network-connection",
        message: message.trim(),
        eventFamily: classification.eventFamily,
        fields: classification.fields,
      };
    });

    return {
      filePath,
      logType: "network-connection",
      events,
      meta: deriveMetaFromEvents(events, filePath),
    };
  }
}

function classify(
  message: string,
): Pick<NetworkConnectionLogEvent, "eventFamily" | "fields"> {
  const trimmed = message.trim();
  const addressMatch = trimmed.match(/address:\s*([^\),]+)/i);

  // "Connect (address: ...)" - initial connection attempt
  if (trimmed.startsWith("Connect (") || trimmed.startsWith("Connect(")) {
    return { eventFamily: "connect", fields: { address: addressMatch?.[1] } };
  }

  // "Disconnect (address: ...)" - connection closed
  if (trimmed.startsWith("Disconnect (") || trimmed.startsWith("Disconnect(")) {
    return { eventFamily: "disconnect", fields: { address: addressMatch?.[1] } };
  }

  // "Send disconnect (address: ..., reason: N)" - sending disconnect request
  if (trimmed.startsWith("Send disconnect")) {
    const reasonMatch = trimmed.match(/reason:\s*(\d+)/i);
    return {
      eventFamily: "send_disconnect",
      fields: {
        address: addressMatch?.[1],
        disconnectReason: reasonMatch?.[1] ? Number(reasonMatch[1]) : undefined,
      },
    };
  }

  // "Statistics (address: ..., rtt: N, lose: N, sent: N, received: N)"
  if (trimmed.startsWith("Statistics")) {
    const rttMatch = trimmed.match(/rtt:\s*(\d+)/i);
    const loseMatch = trimmed.match(/lose:\s*(\d+)/i);
    const sentMatch = trimmed.match(/sent:\s*(\d+)/i);
    const receivedMatch = trimmed.match(/received:\s*(\d+)/i);
    return {
      eventFamily: "statistics",
      fields: {
        address: addressMatch?.[1],
        rtt: rttMatch?.[1] ? Number(rttMatch[1]) : undefined,
        packetsLost: loseMatch?.[1] ? Number(loseMatch[1]) : undefined,
        packetsSent: sentMatch?.[1] ? Number(sentMatch[1]) : undefined,
        packetsReceived: receivedMatch?.[1] ? Number(receivedMatch[1]) : undefined,
      },
    };
  }

  // "Enter to the '<state>' state (address: ..., syn: ..., asc: ...)"
  if (trimmed.startsWith("Enter to the")) {
    const stateMatch = trimmed.match(/'([^']+)'/);
    const flagsMatch = trimmed.match(/syn:\s*(\w+), asc:\s*(\w+)/i);
    return {
      eventFamily: "state_enter",
      fields: {
        address: addressMatch?.[1],
        state: stateMatch?.[1],
        syn: flagsMatch?.[1]?.toLowerCase() === "true",
        asc: flagsMatch?.[2]?.toLowerCase() === "true",
      },
    };
  }

  // "Exit to the '<state>' state (address: ...)"
  if (trimmed.startsWith("Exit to the")) {
    const stateMatch = trimmed.match(/'([^']+)'/);
    return { eventFamily: "state_exit", fields: { address: addressMatch?.[1], state: stateMatch?.[1] } };
  }

  // "Send connect (address: ..., syn: ..., asc: ...)"
  if (trimmed.startsWith("Send connect")) {
    const flagsMatch = trimmed.match(/syn:\s*(\w+), asc:\s*(\w+)/i);
    return {
      eventFamily: "send_connect",
      fields: {
        address: addressMatch?.[1],
        syn: flagsMatch?.[1]?.toLowerCase() === "true",
        asc: flagsMatch?.[2]?.toLowerCase() === "true",
      },
    };
  }

  // "Timeout: Messages timed out after not receiving any message for Nms (address: ...)"
  if (trimmed.startsWith("Timeout")) {
    const timeoutMatch = trimmed.match(/for\s+(\d+)ms/);
    return {
      eventFamily: "timeout",
      fields: {
        address: addressMatch?.[1],
        timeoutMs: timeoutMatch?.[1] ? Number(timeoutMatch[1]) : undefined,
      },
    };
  }

  // "Thread was being aborted." - connection thread aborted
  if (trimmed.includes("Thread was being aborted")) {
    return { eventFamily: "thread_aborted", fields: {} };
  }

  return { eventFamily: "other", fields: { address: addressMatch?.[1] } };
}
