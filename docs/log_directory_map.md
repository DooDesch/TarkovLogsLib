# Tarkov Logs Directory Map

Root: `D:/Launcher/Battlestate Games/Escape from Tarkov/Logs`

## Session Folders

- Pattern: `log_YYYY.MM.DD_HH-MM-SS_VERSION/`
- 49 session folders observed (2025-11-16 … 2025-12-08).
- Each session contains per-component logs with the same prefix `YYYY.MM.DD_HH-MM-SS_VERSION <logtype>`.

## Log Types per Session (superset)

- `application_000.log` — client bootstrap/metrics.
- `backend_000.log` — HTTPS requests/responses/errors.
- `backendCache_000.log` — cache lookups for backend endpoints.
- `backend_queue_000.log` — inventory queue failures (rare, 4 sessions).
- `errors_000.log` — aggregated error stacks.
- `files-checker_000.log` — file integrity checks.
- `insurance_000.log` — insurance warnings/errors (6 sessions).
- `inventory_000.log` — server-rejected inventory operations (9 sessions).
- `network-connection_000.log` — socket state machine (35 sessions).
- `network-messages_000.log` — periodic network metrics (35 sessions).
- `objectPool_000.log` — pooled asset errors (4 sessions).
- `output_000.log` — master aggregate timeline (every session).
- `player_000.log` — missing item references (2 sessions).
- `push-notifications_000.log` — websocket notifier activity (46 sessions).
- `seasons_000.log` — seasons material fixer errors (13 sessions).
- `spatial-audio_000.log` — audio init/perf/errors (41 sessions).
- `aiData_000.log`, `aiErrors_000.log` — AI config issues (single early session).
- `inventory_000.log`, `insurance_000.log`, `objectPool_000.log` appear selectively; counts above.

## Naming Pattern

- Files are named `<session-prefix> <logtype>`, e.g., `2025.12.08_15-01-50_1.0.0.2.42157 backend_000.log`.
- Within a session, logtypes align by timestamp, enabling cross-log correlation via timestamps.

## Sizes (max per session)

- Smallest sessions: ~0.07 MB (few logs).
- Largest sessions: ~9 MB per session; `output_000.log` is dominant (~106 MB total across sessions).

## Continuations & Multiline

- Many logs include multiline entries where subsequent lines have no pipe separators (stack traces, JSON blocks). Parsing must carry context from the preceding piped line.
