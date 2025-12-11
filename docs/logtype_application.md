# Application Logs (`application_000.log`)

## Location

- `D:/Launcher/Battlestate Games/Escape from Tarkov/Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... application_000.log`

## Line Format & Field Schema

- Primary line: `TIMESTAMP|VERSION|LEVEL|application|MESSAGE`
  - `TIMESTAMP`: `YYYY-MM-DD HH:MM:SS.mmm` (early builds include ` ±TZ`).
  - `VERSION`: game build string.
  - `LEVEL`: `Info`, `Debug`, rare `Error`.
  - `MESSAGE`: free text; starts with an event keyword (families below).
- Continuations: any following lines **without** pipes belong to the previous event (stack traces, dumps).

## Event Families (observed prefixes → meaning)

- **Bootstrap**: `Application awaken, updateQueue:'<mode>'`, `Assert.raiseExceptions:'<bool>'`, `driveType:SSD swapDriveType:SSD`, `Game settings:` (followed by multi-line settings dump).
- **GC tuning**: `GC`, `GC mode switched to Enabled|Disabled`, `Heap pre-allocation - disabled`.
- **Config**: `Config entry <key>` — key/value pairs.
- **Anti-cheat (BattlEye)**: `Start loading dll '...BEClient_x64.dll'`, `SUCCESS: loading dll ...`, `Getting Proc Address for 'Init'|'GetVer'`, `Init`, `Initialized (vX)`, `Disposing BEClient`, `BEClient exit`, `BEClient exit successfully`.
- **Instrumentation/metrics**: `ClientMetricsEvents()`, `scene preset path ...`, `TRACE-NetworkGameMatching G|H|I`.
- **Profile/match lifecycle**: `SelectProfile ProfileId <id>`, `Matching with group id ...`, `GameCreated`, `GamePrepared`, `PlayerSpawnEvent`, `GamePooled`, `GameRunned`, `LocationLoaded`, `MatchingCompleted`.
- **Error**: `BattlEye environment validation failed: ...` (startup failure).

## Field Interpretation & Latent Identifiers

- Timestamps align with other logs for cross-correlation.
- `ProfileId`, `group id`, and scene preset paths allow linking to backend sessions and match states.
- BattlEye proc address lines expose function names; useful to confirm anti-cheat integrity.
- GC/config entries reveal runtime tuning choices; could drive perf analytics.

## Exhaustive Example Set

- Bootstrap: `2025-12-08 15:01:51.519|1.0.0.2.42157|Info|application|Application awaken, updateQueue:'Update'`
- Hardware/feature probe: `2025-12-08 15:01:52.034|1.0.0.2.42157|Info|application|NVIDIA Reflex not available on this machine, Status: NvReflex_LIBRARY_NOT_FOUND.`
- GC toggle: `2025-12-08 15:03:10.000|1.0.0.2.42157|Info|application|GC mode switched to Disabled`
- BattlEye load: `2025-12-05 17:27:21.000|1.0.0.2.42157|Debug|application|Start loading dll 'D:/.../BattlEye/BEClient_x64.dll'`
- Matching: `2025-12-05 18:12:10.000|1.0.0.2.42157|Info|application|Matching with group id 123456`
- Error: `2025-12-01 15:00:00.000|1.0.0.2.42157|Error|application|BattlEye environment validation failed: Anticheat loading failed...`

## Parsing Strategy (JSON-ready)

- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|(?P<level>[^|]*)\\|application\\|(?P<message>.*)$`
- Attach non-piped lines as `continuation` array to the last parsed event.
- Derive `event_family` by prefix (e.g., split `message` at first `:` or first 40 chars).
- Extract latent ids with targeted regexes: `ProfileId (?P<profile>\\S+)`, `group id (?P<group>\\S+)`.

## Analytical Uses

- Reconstruct startup and matchmaking timelines.
- Verify anti-cheat lifecycle success vs failure.
- Track runtime tuning (GC/config) over time for performance studies.

## Open Questions / Hypotheses

- Settings dump structure is multi-line and needs further key-value extraction.
- `TRACE-NetworkGameMatching` letter codes require external mapping to in-engine states.
