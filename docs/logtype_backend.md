# Backend Logs (`backend_000.log`)

## Location
- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... backend_000.log`

## Line Format & Field Schema
- `TIMESTAMP|VERSION|LEVEL|backend|MESSAGE`
  - `TIMESTAMP`: `YYYY-MM-DD HH:MM:SS.mmm` (optional ` ±TZ`).
  - `LEVEL`: `Info`, `Warn`, `Error`.
  - `MESSAGE`: structured strings; see event families.
- Continuations: rare; some error responses may have stacks on subsequent lines without pipes.

## Event Families (prefix → meaning)
- `---> Request HTTPS, id [N]: URL: <url>, crc: <crc>.` — outbound request. Fields: `id` (int), `url`, `crc` (often blank). Implied method: HTTPS POST.
- `<--- Response HTTPS, id [N]: URL: <url>, crc: <crc>, responseText:` — inbound response. May be followed by empty payload or continuation in `output_000.log`.
- `<--- Error! HTTPS: <url>, result:<reason>, isNetworkError:<bool>, isHttpError:<bool>, responseCode:<code>` — transport-layer failure.
- `Request <url> will be retried after <seconds> sec, retry:<k> from retries:<n> ... error:<reason>` — retry scheduler.
- `JSON parsing into ...` — deserialization error.
- `BackendServerSideException: <code> - <context>` within response lines — server-side business error (e.g., 228 ItemsMoving).

## Field Interpretation
- `id` correlates request/response pairs; also echoed in `output_000.log`.
- `url` shows environment (prod/gw) and endpoint (e.g., `/client/game/profile/items/moving`).
- `crc` currently blank; reserved for payload hash.
- `responseCode` carries HTTP status (e.g., 504).
- Retry counters (`retry`, `retries`) expose backoff behavior.

## Examples
- Request: `2025-12-08 15:01:56.925|1.0.0.2.42157|Info|backend|---> Request HTTPS, id [1]: URL: https://prod-04.escapefromtarkov.com/client/menu/locale/en, crc: .`
- Response: `2025-12-08 15:01:57.292|1.0.0.2.42157|Info|backend|<--- Response HTTPS, id [2]: URL: https://prod-04.escapefromtarkov.com/client/game/mode, crc: , responseText:`
- Server error: `2025-12-01 16:03:10.100|1.0.0.2.42157|Error|backend|<--- Response HTTPS, id [294]: Exception occured: 228, BackendServerSideException: 228 - ItemsMoving[Move]: can't move item <id> in item <container>[slot: hideout], URL: .../client/game/profile/items/moving`
- Retry: `2025-12-03 20:05:33.000|1.0.0.2.42157|Warn|backend|Request https://gw-pve-01.escapefromtarkov.com/client/game/keepalive will be retried after 46.5 sec, retry:1 from retries:5 ... error:Backend error: Cannot resolve destination host`

## Parsing Strategy
- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|(?P<level>[^|]*)\\|backend\\|(?P<message>.*)$`
- Classify `event_family` by prefix (`---> Request`, `<--- Response`, `<--- Error!`, `Request ... retried`, `JSON parsing into`).
- Extract `id`, `url`, `crc`, `responseCode`, `retry`, `retries`, `error_reason` via targeted regex per family.
- Attach continuation lines (if any) as `continuation`.

## Uses
- Trace full HTTP flow and latency (pair request/response by `id`).
- Detect server vs transport failures and retry behavior.
- Correlate inventory/quest/backend errors (e.g., code 228) with `inventory_000.log`.

## Open Questions
- `crc` field usage appears dormant.
- Full mapping of backend error codes (e.g., 228) requires external reference to EFT backend.
