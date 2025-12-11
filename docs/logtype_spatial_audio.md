# Spatial Audio Logs (`spatial-audio_000.log`)

## Location

- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... spatial-audio_000.log`
- Present in 41 sessions.

## Format & Schema

- `TIMESTAMP|VERSION|LEVEL|spatial-audio|MESSAGE`
- Levels: `Info`, `Warn`, `Error`.
- Continuations: stack traces (NullReference) may follow without pipes.

## Event Types

- Init success: `Success initialize BetterAudio`
- Config: `Target audio quality = <quality>`, `SpatialAudioSystem Initialized`
- DSP stats: `Current DSP buffer length: <len>, buffers num: <num>`
- Warnings: `Reverb reset attempt <k>/10`
- Errors: `[SpatialAudioSystem] can't init occlusion transform for player : System.NullReferenceException...`

## Examples

- `2025-12-08 15:02:34.478|1.0.0.2.42157|Info|spatial-audio|Success initialize BetterAudio`
- `2025-12-08 15:18:34.186|1.0.0.2.42157|Info|spatial-audio|Current DSP buffer length: 1024, buffers num: 4`
- `2025-12-07 21:12:18.000|1.0.0.2.42157|Error|spatial-audio|[SpatialAudioSystem] can't init occlusion transform for player : System.NullReferenceException: Object reference not set to an instance of an object.`

## Parsing Strategy

- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|(?P<level>[^|]*)\\|spatial-audio\\|(?P<message>.*)$`
- Classify by prefix (`Success initialize`, `Target audio quality`, `Current DSP`, `Reverb reset attempt`, `can't init occlusion transform`).
- Attach following non-piped lines as `continuation` for stack traces.

## Uses

- Monitor audio subsystem readiness and performance parameters.
- Correlate occlusion errors with gameplay/network events.

## Open questions

- Player identity not logged; external mapping needed to identify affected player.
