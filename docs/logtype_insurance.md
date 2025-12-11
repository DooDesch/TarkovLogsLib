# Insurance Logs (`insurance_000.log`)

## Location

- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... insurance_000.log`
- Only present in a handful of sessions (6 files).

## Format & Schema

- `TIMESTAMP|VERSION|LEVEL|insurance|MESSAGE`
- `LEVEL`: `Warn`, `Error`.
- `MESSAGE` contains item display name.

## Event Types

- Warning: `Items to insure does not contain: <item>` — missing item in insurance request.
- Error: `Error insuring item: (<item>)` — insurance attempt failed.

## Examples

- `2025-11-30 18:10:14.328|1.0.0.1.41967|Warn|insurance|Items to insure does not contain: Roubles`
- `2025-11-30 18:10:14.328|1.0.0.1.41967|Error|insurance|Error insuring item: (MP-155 Ultima thermal camera)`

## Parsing Strategy

- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|(?P<level>Warn|Error)\\|insurance\\|(?P<message>.*)$`
- Extract `item_name` after colon/within parentheses.

## Uses

- Identify items with insurance mapping/eligibility problems.
- Pair with stacks in `errors_000.log`/`output_000.log` for deeper diagnostics.

## Open questions

- Success paths are silent here; check backend responses for confirmation.
