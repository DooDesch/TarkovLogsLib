# Log Schema Master Reference

## Global Conventions

- Base format: `TIMESTAMP|VERSION|LEVEL|COMPONENT|MESSAGE`
- TIMESTAMP: `YYYY-MM-DD HH:MM:SS.mmm` (early logs include ` ±TZ`).
- Continuations: lines without pipes belong to the previous event (stack traces, JSON dumps, duplicate lines).
- Session context: folder/filename prefix `YYYY.MM.DD_HH-MM-SS_VERSION` aligns all component logs.

## Components & Event Families

| Component (file)   | Core Event Families                                                                                                                                                                                                                                                                                                     | Key Fields                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------- |
| application        | bootstrap (`Application awaken`), GC (`GC mode switched`), config entries, BattlEye lifecycle (`Start loading dll`, `Initialized`, `BEClient exit`), matchmaking lifecycle (`Matching with group id`, `GameCreated/Prepared/Runned`, `PlayerSpawnEvent`), metrics (`TRACE-NetworkGameMatching`), rare anti-cheat errors | timestamp, version, level, message; latent ids: profileId, group id, scene preset           |
| backend            | request (`---> Request HTTPS id [N] URL crc`), response (`<--- Response HTTPS id [N] URL crc responseText`), transport error (`<--- Error! HTTPS ... responseCode`), retry (`will be retried after ... retry:k from retries:n`), server exception (`BackendServerSideException <code> - <context>`)                     | id, url, crc, responseCode, retry counters, error reason                                    |
| backendCache       | load attempt (`BackendCache.Load File name: <path>, URL: <endpoint>`), miss (`... - NOT exists`)                                                                                                                                                                                                                        | path, endpoint, hit/miss                                                                    |
| backend_queue      | queue failure header + JSON array of commands (`Action`, `trader`, `items`, `difference`, `timestamp`)                                                                                                                                                                                                                  | embedded JSON fields                                                                        |
| errors             | aggregated errors: enum fallback, localization duplicate, serialization layout mismatch, NullReference, KeyNotFound, quest counter missing, seasons/spatial-audio/insurance/player/objectPool echoes, duplicate object registration, null resource                                                                      | message-specific ids (NetId, quest id, enum name, resource name) + stack trace continuation |
| files-checker      | integrity run start/finish, executable path, elapsed ms                                                                                                                                                                                                                                                                 | executable path, elapsed_ms                                                                 |
| insurance          | warn missing item (`Items to insure does not contain`), error (`Error insuring item`)                                                                                                                                                                                                                                   | item_name                                                                                   |
| inventory          | rejection header (profileId/user, code, OperationType), continuations (`Item`, `From`, `To`, `Reason` with coords)                                                                                                                                                                                                      | profileId, code, op, itemId/tpl, containers, grid coords, world coords                      |
| network-connection | connect/state enter/exit, send connect, timeout                                                                                                                                                                                                                                                                         | address (IP:port), state, syn/asc flags, timeout_ms                                         |
| network-messages   | periodic metrics `rpi`,`rwi`,`rsi`,`rci`,`ui`,`lui`,`lud`                                                                                                                                                                                                                                                               | metric floats                                                                               |
| objectPool         | return-to-destroyed-pool error                                                                                                                                                                                                                                                                                          | assetId                                                                                     |
| output             | aggregate of many components; startup, backend echoes, warnings (`Can't find skill to upgrade`), same errors as `errors`                                                                                                                                                                                                | component_hint (first token), message, continuation                                         |
| player             | missing item/item address                                                                                                                                                                                                                                                                                               | itemId, parentId, containerId                                                               |
| push-notifications | websocket params, batch counts, notification types (`ChatMessageReceived`, pings), channel dropped warnings                                                                                                                                                                                                             | url/token, Count, MessageType, notification Type/Time/Duration/ShowNotification, error_code |
| seasons            | `Can't find SeasonsMaterialsFixer.Instance`                                                                                                                                                                                                                                                                             | message only                                                                                |
| spatial-audio      | init success, quality, DSP stats, reverb reset warns, occlusion NullReference errors                                                                                                                                                                                                                                    | quality, buffer lengths, attempt index                                                      |
| aiData             | AI config issues (wave count, missing door link)                                                                                                                                                                                                                                                                        | message, door link                                                                          |
| aiErrors           | AI issues with source (`aiData                                                                                                                                                                                                                                                                                          | ...`)                                                                                       | source, message |

## Classification

- **Startup & environment**: application, files-checker, output (startup entries).
- **Transport/backend**: backend, backendCache, backend_queue, network-connection, network-messages, push-notifications.
- **Gameplay/inventory**: inventory, player, insurance, objectPool.
- **Audio/visual**: spatial-audio, seasons.
- **AI**: aiData, aiErrors.
- **Aggregate/error**: output, errors.

## Parsing Best Practices

1. Detect header vs continuation: match lines with four pipes; attach following non-piped lines to the last header.
2. Normalize timestamps (strip TZ; convert to ISO 8601/UTC).
3. For each component, apply tailored regex (see per-log docs) to extract structured fields.
4. Derive `event_family` using message prefixes; maintain dictionaries per component.
5. Deduplicate mirrored events (component vs output/errors) using `(timestamp, component, message hash)`.
6. Normalize IDs (request id, profile id, item id) as strings; keep IP:port as separate fields.

## Known Pitfalls & Anomalies

- `output_000.log` and `errors_000.log` contain many continuation-only lines; failing to stitch them inflates counts.
- Timezone offset present in earliest sessions (`+01:00`); absent later.
- Backend `crc` field is blank in observed logs.
- Cache hits are implicit (absence of `- NOT exists`).
- Some components appear only in specific builds (aiData/aiErrors early; objectPool/player/insurance sporadic).

## Recommendations for Tooling

- Build a multi-line event parser: detect headers via regex; buffer continuations.
- Emit structured JSON per event with fields: `timestamp`, `component`, `level`, `event_family`, `message`, `fields{...}`, `continuation[]`, `session_prefix`.
- Create correlation indices on `request_id`, `profile_id`, `item_id`, `address`, and `timestamp`.
- Implement deduplication for messages mirrored into `output`/`errors`.
- Track metric time series (network-messages) with sampling interval alignment to connection states.

## Metrics, KPIs, and Visualization Ideas (by Component)

- **application**: startup duration, time to first DLL load, BattlEye init success rate, GC mode toggles per session, feature availability (Reflex). Visuals: timeline (Gantt) for startup, bar for success/fail per build, line for GC toggles over time.
- **backend**: request/response latency by endpoint, retry rates, error code frequencies (e.g., 228), success/fail per build, keepalive reliability. Visuals: latency histograms/boxplots, stacked bars for status, time series of retries.
- **backendCache**: hit/miss rate per endpoint, cache effectiveness over time. Visuals: stacked bars (hit vs miss), line of hit ratio per session.
- **backend_queue**: frequency of queue failures, action types in failures, item/trader distribution. Visuals: bar charts by Action, timelines for failures.
- **errors**: error class frequency (NullReference, serialization), crash-rate proxy per build, NetId-specific hotspots. Visuals: Pareto bars, heatmaps by build vs error type.
- **files-checker**: integrity check duration, run frequency. Visuals: line over sessions, histogram of elapsed ms.
- **insurance**: fail/warn rates, item names with highest failure. Visuals: bar of top failing items.
- **inventory**: rejection rate by OperationType/code, containers implicated, grid positions frequency. Visuals: stacked bars by op type/code, heatmap of grid coords.
- **network-connection**: connect success vs timeout rate, per-host stability, time-to-connect. Visuals: line for timeouts over sessions, scatter of time-to-connect vs host.
- **network-messages**: throughput/latency trends (`rpi`, `lud`), spike detection. Visuals: time series, boxplots per session.
- **objectPool**: count of return-to-destroyed events per assetId. Visuals: bar chart per assetId.
- **output**: master timeline for session; use for stitched Gantt of startup→match. Visuals: Gantt, stacked error counts per hour.
- **player**: missing item occurrences, container context. Visuals: bar per container/type.
- **push-notifications**: connection uptime, batch sizes, drop codes. Visuals: time series of batch counts, uptime gauge, bar of drop codes.
- **seasons**: frequency of missing SeasonsMaterialsFixer. Visuals: bar per build.
- **spatial-audio**: init success rate, reverb reset attempts, occlusion errors. Visuals: stacked bars per session/build.
- **aiData/aiErrors**: AI config issues occurrence. Visuals: bar over sessions.

## Data Quality Notes

- Multi-line events require stitching; otherwise counts inflate.
- Early timezones differ; normalize before time math.
- Some components are sparse (ai\*, backend_queue, player, insurance) and may skew rate calculations; use per-session normalization.
- `output`/`errors` mirror component events—deduplicate for accurate counts.
