# Output Logs (`output_000.log`)

## Location
- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... output_000.log`
- Present in every session; largest volume (≈107 MB across 49 files).

## Line Format & Field Schema
- `TIMESTAMP|VERSION|LEVEL|output|MESSAGE`
- Levels: `Info`, `Warn`, `Error`.
- Continuations: many lines without pipes (stack traces, JSON, dumps) belong to the previous event.
- `MESSAGE` often embeds a secondary component prefix (`backend|...`, `insurance|...`, `application|...`).

## Event Families (common prefixes → meaning)
- Startup: `FrameTicks:<n> frameRate:<n>`, `application|Application awaken...`, `application|Assert.raiseExceptions...`, GC toggles.
- Backend echoes: `backend|---> Request HTTPS...`, `backend|<--- Response HTTPS...`, backend errors.
- Warnings: `Can't find skill to upgrade: <SkillName>`.
- Errors: identical to `errors_000.log` (enum fallbacks, localization duplicates, NullReference, serialization layout mismatches, resource null, duplicate object registration, insurance errors).
- Gameplay/system: `insurance|Error insuring item ...`, `inventory|Client operation rejected ...`, `push-notifications|...`, `spatial-audio|...`, etc.

## Examples
- Startup: `2025-12-08 15:01:50.778|1.0.0.2.42157|Info|output|FrameTicks:160000 frameRate:60`
- Backend echo: `2025-12-08 15:02:05.003|1.0.0.2.42157|Info|output|backend|<--- Response HTTPS, id [13]: URL: https://.../client/quest/getMainQuestNotesList, crc: , responseText:`
- Warning: `2025-12-05 18:10:14.328|1.0.0.2.42157|Warn|output|Can't find skill to upgrade: FieldMedicine`
- Error: `2025-12-08 15:02:05.193|1.0.0.2.42157|Error|output|Incorrect Enum value promoCode at [18].source, fallback to ECustomizationSource.None`
- Continuation stack follows immediately on subsequent lines without pipes.

## Parsing Strategy
- Header regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|(?P<level>[^|]*)\\|output\\|(?P<message>.*)$`
- Attach following non-piped lines as `continuation`.
- Derive `component_hint` by splitting `message` on `|` (first token before `|` if present).
- Use same event family classification as component logs for downstream normalization.

## Uses
- Master chronological stream to reconstruct a session without opening each component log.
- Correlate backend, inventory, insurance, audio, and error events via a single timeline.
- Useful for replaying or time-aligning events across subsystems.

## Open Questions
- High volume; automated segmentation into multi-line events is essential to reduce noise.
