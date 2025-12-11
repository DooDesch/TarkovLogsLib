# Files Checker Logs (`files-checker_000.log`)

## Location
- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... files-checker_000.log`
- Present in every session; very small.

## Format & Schema
- `TIMESTAMP|VERSION|Info|files-checker|MESSAGE`
- Only `Info`.

## Event Types
- `Consistency ensurance is launched` — start of integrity check.
- `ExecutablePath: <path>` — path to executable under test.
- `Consistency ensurance is succeed. ElapsedMilliseconds:<n>` — completion with duration.

## Parsing Strategy
- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|Info\\|files-checker\\|(?P<message>.*)$`
- Classify by prefix; extract `elapsed_ms` when present.

## Examples
- `2025-12-08 15:01:51.980|1.0.0.2.42157|Info|files-checker|Consistency ensurance is launched`
- `2025-12-08 15:01:52.304|1.0.0.2.42157|Info|files-checker|Consistency ensurance is succeed. ElapsedMilliseconds:325`

## Uses
- Confirm integrity checks ran; track duration over time.
- Detect missing checks when launch issues occur.

## Open questions
- No failure cases observed; failures may appear in other logs.
