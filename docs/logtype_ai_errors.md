# AI Errors Logs (`aiErrors_000.log`)

## Location
- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... aiErrors_000.log`
- Only one session (2025-11-16 build 1.0.0.0.41760), alongside `aiData_000.log`.

## Format & Schema
- `TIMESTAMP ±TZ|VERSION|Error|aiErrors|<source>|MESSAGE`
- `source`: typically `aiData`.
- Only `Error`.

## Event Types
- `aiData|Wrong count of all simple waves. Check slots count`
- `aiData|Door without link <name>`

## Examples
- `2025-11-16 10:30:50.725 +01:00|1.0.0.0.41760|Error|aiErrors|aiData|Wrong count of all simple waves. Check slots count`
- `2025-11-16 10:30:54.329 +01:00|1.0.0.0.41760|Error|aiErrors|aiData|Door without link DoorLink_27`

## Parsing Strategy
- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|Error\\|aiErrors\\|(?P<source>[^|]*)\\|(?P<message>.*)$`
- Extract `source` and classify message as in `aiData`.

## Uses
- Mirrors AI issues with explicit source attribution for quick filtering.

## Open questions
- Only one session observed; future builds may log additional AI sources.
