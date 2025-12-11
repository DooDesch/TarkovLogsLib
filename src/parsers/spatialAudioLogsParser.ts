import {
  LogParser,
  ParsedLogResult,
  SpatialAudioLogEvent,
} from "../types/index.js";
import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";

const HEADER_REGEX =
  /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|(?<level>[^|]*)\|spatial-audio\|(?<message>.*)$/;

export class SpatialAudioLogsParser implements LogParser {
  canParse(fileName: string, sampleContent?: string): boolean {
    const lowered = fileName.toLowerCase();
    return (
      lowered.includes("spatial-audio_") ||
      (sampleContent ?? "").toLowerCase().includes("|spatial-audio|")
    );
  }

  parse(
    content: string,
    filePath?: string,
  ): ParsedLogResult<SpatialAudioLogEvent> {
    const groups = groupByHeader(content, HEADER_REGEX);
    const events: SpatialAudioLogEvent[] = groups.map(({ match, continuation }) => {
      const { timestamp = "", version = "", level = "Info", message = "" } =
        (match.groups ?? {}) as Record<string, string>;
      const classification = classify(message);
      return {
        logType: "spatial-audio",
        timestamp: normalizeTimestamp(timestamp),
        timestampRaw: timestamp,
        version: version.trim() || undefined,
        level: level.trim() as SpatialAudioLogEvent["level"],
        component: "spatial-audio",
        message: message.trim(),
        eventFamily: classification.eventFamily,
        continuation: continuation.length ? continuation : undefined,
        fields: classification.fields,
      };
    });

    return {
      filePath,
      logType: "spatial-audio",
      events,
      meta: deriveMetaFromEvents(events, filePath),
    };
  }
}

function classify(
  message: string,
): Pick<SpatialAudioLogEvent, "eventFamily" | "fields"> {
  const trimmed = message.trim();

  // "Success initialize BetterAudio"
  if (trimmed.startsWith("Success initialize BetterAudio")) {
    return { eventFamily: "init_success", fields: {} };
  }

  // "SpatialAudioSystem Initialized"
  if (trimmed.startsWith("SpatialAudioSystem Initialized")) {
    return { eventFamily: "system_initialized", fields: {} };
  }

  // "Target audio quality = high 24"
  if (trimmed.startsWith("Target audio quality")) {
    const match = trimmed.match(/=\s*(.*)$/);
    return { eventFamily: "target_quality", fields: { quality: match?.[1]?.trim() } };
  }

  // "Current DSP buffer length: 1024, buffers num: 4"
  if (trimmed.startsWith("Current DSP buffer length")) {
    const lenMatch = trimmed.match(/length:\s*(\d+)/);
    const numMatch = trimmed.match(/buffers num:\s*(\d+)/);
    return {
      eventFamily: "dsp_stats",
      fields: {
        dspBufferLength: lenMatch?.[1] ? Number(lenMatch[1]) : undefined,
        dspBuffersNum: numMatch?.[1] ? Number(numMatch[1]) : undefined,
      },
    };
  }

  // "ReverbPluginChecker enabled: True, check cooldown: 0.25"
  if (trimmed.startsWith("ReverbPluginChecker")) {
    const enabledMatch = trimmed.match(/enabled:\s*(\w+)/i);
    const cooldownMatch = trimmed.match(/cooldown:\s*([\d.]+)/i);
    return {
      eventFamily: "reverb_checker",
      fields: {
        reverbEnabled: enabledMatch?.[1]?.toLowerCase() === "true",
        reverbCooldown: cooldownMatch?.[1] ? Number(cooldownMatch[1]) : undefined,
      },
    };
  }

  // "Reverb reset attempt N"
  if (trimmed.startsWith("Reverb reset attempt")) {
    const attemptMatch = trimmed.match(/attempt\s*(\d+)/i);
    return { eventFamily: "reverb_reset", fields: { attempt: attemptMatch?.[1] ? Number(attemptMatch[1]) : undefined } };
  }

  // "[SpatialAudioSystem] can't init occlusion transform for player :"
  if (trimmed.includes("can't init occlusion transform")) {
    return { eventFamily: "occlusion_error", fields: {} };
  }

  return { eventFamily: "other", fields: {} };
}
