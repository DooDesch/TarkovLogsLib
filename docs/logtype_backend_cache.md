# Backend Cache Logs (`backendCache_000.log`)

## Location
- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... backendCache_000.log`

## Line Format & Field Schema
- `TIMESTAMP|VERSION|Info|backendCache|BackendCache.Load File name: <path>, URL: <endpoint>`
- Optional follow-up line (same timestamp or immediate next): `BackendCache.Load File name: <path> - NOT exists`.

Fields:
- `path`: absolute cache file location.
- `endpoint`: backend-relative URL.
- Presence/absence of `- NOT exists` signals miss vs hit.

## Event Types
- **LoadAttempt**: cache lookup for `<endpoint>` with computed `<path>`.
- **Miss**: identical path immediately followed by `- NOT exists`.

## Examples
- `2025-12-08 15:01:56.903|1.0.0.2.42157|Info|backendCache|BackendCache.Load File name: D:/.../cache/722796f4cd71759a6bded8277ac174dc, URL: /client/menu/locale/en`
- `2025-12-08 15:01:56.903|1.0.0.2.42157|Info|backendCache|BackendCache.Load File name: D:/.../cache/722796f4cd71759a6bded8277ac174dc - NOT exists`

## Parsing Strategy
- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|Info\\|backendCache\\|BackendCache.Load File name: (?P<path>.*?), URL: (?P<endpoint>.*)$`
- If line ends with `- NOT exists`, set `cache_hit=false`; otherwise `true`.
- Group consecutive lines with the same `path` as a single event with `hit/miss`.

## Uses
- Detect cache effectiveness; correlate misses with `backend_000` requests.
- Validate stability of cache key hashing across builds.

## Open Questions
- Eviction/TTL not logged; only lookup results visible.
