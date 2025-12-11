import {
  ApplicationLogEvent,
  LogParser,
  ParsedLogResult,
} from "../types/index.js";
import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";

const HEADER_REGEX =
  /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|(?<level>[^|]*)\|application\|(?<message>.*)$/;

export class ApplicationLogsParser implements LogParser {
  canParse(fileName: string, sampleContent?: string): boolean {
    const lowered = fileName.toLowerCase();
    return (
      lowered.includes("application_") ||
      (sampleContent ?? "").toLowerCase().includes("|application|")
    );
  }

  parse(content: string, filePath?: string): ParsedLogResult<ApplicationLogEvent> {
    const groups = groupByHeader(content, HEADER_REGEX);
    const events: ApplicationLogEvent[] = groups.map(({ match, continuation }) => {
      const { timestamp = "", version = "", level = "Info", message = "" } =
        (match.groups ?? {}) as Record<string, string>;
      const parsed = classifyApplicationMessage(message);
      return {
        logType: "application",
        timestamp: normalizeTimestamp(timestamp),
        timestampRaw: timestamp,
        version: version.trim() || undefined,
        level: level.trim() as ApplicationLogEvent["level"],
        component: "application",
        message: message.trim(),
        eventFamily: parsed.eventFamily,
        continuation: continuation.length ? continuation : undefined,
        fields: parsed.fields,
      };
    });

    return {
      filePath,
      logType: "application",
      events,
      meta: deriveMetaFromEvents(events, filePath),
    };
  }
}

function classifyApplicationMessage(
  message: string,
): Pick<ApplicationLogEvent, "eventFamily" | "fields"> {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (trimmed.startsWith("Application awaken") || trimmed.startsWith("Assert.raiseExceptions")) {
    return { eventFamily: "bootstrap", fields: extractMatchFields(trimmed) };
  }
  if (trimmed.startsWith("GC")) {
    return { eventFamily: "gc", fields: extractMatchFields(trimmed) };
  }
  if (trimmed.startsWith("Config entry")) {
    return { eventFamily: "config", fields: extractMatchFields(trimmed) };
  }
  if (lower.includes("battleye") || trimmed.includes("BEClient")) {
    return { eventFamily: "anticheat", fields: extractMatchFields(trimmed) };
  }
  if (trimmed.startsWith("ClientMetricsEvents") || trimmed.startsWith("TRACE-NetworkGameMatching")) {
    return { eventFamily: "instrumentation", fields: extractMatchFields(trimmed) };
  }
  if (
    trimmed.startsWith("SelectProfile") ||
    trimmed.startsWith("Matching with group id") ||
    trimmed.startsWith("GameCreated") ||
    trimmed.startsWith("GamePrepared") ||
    trimmed.startsWith("PlayerSpawnEvent") ||
    trimmed.startsWith("GamePooled") ||
    trimmed.startsWith("GameRunned") ||
    trimmed.startsWith("LocationLoaded") ||
    trimmed.startsWith("MatchingCompleted")
  ) {
    return { eventFamily: "matchmaking", fields: extractMatchFields(trimmed) };
  }
  if (trimmed.startsWith("BattlEye environment validation failed")) {
    return { eventFamily: "error", fields: extractMatchFields(trimmed) };
  }
  return { eventFamily: "other", fields: extractMatchFields(trimmed) };
}

function extractMatchFields(message: string): ApplicationLogEvent["fields"] {
  const profileMatch = message.match(/ProfileId[:\s]+(\S+)/);
  const accountMatch = message.match(/AccountId[:\s]+(\S+)/);
  const groupMatch = message.match(/group id[:\s]+(\S+)/i);
  const sceneMatch = message.match(/scene preset(?: path)?[:\s]+([^\s]+)/i);
  const battlEyeAction = message.includes("BEClient") ? message.split("BEClient")[1]?.trim() : undefined;
  const metricMatch = message.match(/TRACE-NetworkGameMatching\s+([A-Z])/);

  // Extract matchmaking timing data from messages like:
  // "LocationLoaded:8.63 real:10.98 diff:2.34"
  // "GameRunned:176.14(2.13) real:183.59(5.33) diff:7.44"
  const timingMatch = message.match(
    /^(\w+):(\d+(?:\.\d+)?)(?:\((\d+(?:\.\d+)?)\))?\s+real:(\d+(?:\.\d+)?)(?:\((\d+(?:\.\d+)?)\))?\s+diff:(\d+(?:\.\d+)?)/
  );

  let gameTime: number | undefined;
  let gameStepTime: number | undefined;
  let realTime: number | undefined;
  let realStepTime: number | undefined;
  let timeDiff: number | undefined;
  let matchmakingEvent: string | undefined;

  if (timingMatch) {
    matchmakingEvent = timingMatch[1];
    gameTime = timingMatch[2] ? Number(timingMatch[2]) : undefined;
    gameStepTime = timingMatch[3] ? Number(timingMatch[3]) : undefined;
    realTime = timingMatch[4] ? Number(timingMatch[4]) : undefined;
    realStepTime = timingMatch[5] ? Number(timingMatch[5]) : undefined;
    timeDiff = timingMatch[6] ? Number(timingMatch[6]) : undefined;
  }

  return {
    profileId: profileMatch?.[1],
    accountId: accountMatch?.[1],
    groupId: groupMatch?.[1],
    scenePreset: sceneMatch?.[1],
    battlEyeAction,
    metricCode: metricMatch?.[1],
    matchmakingEvent,
    gameTime,
    gameStepTime,
    realTime,
    realStepTime,
    timeDiff,
  };
}
