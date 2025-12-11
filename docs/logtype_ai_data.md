# AI Data Logs (`aiData_000.log`)

## Location
- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... aiData_000.log`
- Only one session (2025-11-16 build 1.0.0.0.41760).

## Format & Schema
- `TIMESTAMP ±TZ|VERSION|Error|aiData|MESSAGE`
- Only `Error`.

## Event Types
- `Wrong count of all simple waves. Check slots count`
- `Door without link <name>`

## Examples
- `2025-11-16 10:30:50.725 +01:00|1.0.0.0.41760|Error|aiData|Wrong count of all simple waves. Check slots count`
- `2025-11-16 10:30:54.329 +01:00|1.0.0.0.41760|Error|aiData|Door without link DoorLink_27`

## Parsing Strategy
- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|Error\\|aiData\\|(?P<message>.*)$`
- Classify by prefix (`Wrong count of all simple waves`, `Door without link`); extract `door` identifier.

## Uses
- Surface AI/navmesh configuration problems in early build.

## Open questions
- No subsequent AI data entries; unclear if errors resolved during runtime.
