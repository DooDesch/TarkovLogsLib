import { LogParser, ParsedLogResult, SeasonsLogEvent } from "../types/index.js";
import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";

const HEADER_REGEX =
  /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|Error\|seasons\|(?<message>.*)$/;

export class SeasonsLogsParser implements LogParser {
  canParse(fileName: string, sampleContent?: string): boolean {
    const lowered = fileName.toLowerCase();
    return (
      lowered.includes("seasons_") ||
      (sampleContent ?? "").toLowerCase().includes("|seasons|")
    );
  }

  parse(content: string, filePath?: string): ParsedLogResult<SeasonsLogEvent> {
    const groups = groupByHeader(content, HEADER_REGEX);
    const events: SeasonsLogEvent[] = groups.map(({ match }) => {
      const { timestamp = "", version = "", message = "" } =
        (match.groups ?? {}) as Record<string, string>;
      return {
        logType: "seasons",
        timestamp: normalizeTimestamp(timestamp),
        timestampRaw: timestamp,
        version: version.trim() || undefined,
        level: "Error",
        component: "seasons",
        message: message.trim(),
        eventFamily: "seasons_materials_fixer_missing",
      };
    });

    return {
      filePath,
      logType: "seasons",
      events,
      meta: deriveMetaFromEvents(events, filePath),
    };
  }
}
