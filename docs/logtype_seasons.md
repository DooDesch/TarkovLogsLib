# Seasons Logs (`seasons_000.log`)

## Location

- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... seasons_000.log`
- Appears in 13 sessions (mostly 1.0.0.1 and 1.0.0.2 builds).

## Format & Schema

- `TIMESTAMP|VERSION|Error|seasons|MESSAGE`
- Only `Error`.

## Event Types

- `Can't find SeasonsMaterialsFixer.Instance` — repeated init failure for seasons materials fixer singleton.

## Example

- `2025-12-08 18:29:51.757|1.0.0.2.42157|Error|seasons|Can't find SeasonsMaterialsFixer.Instance`

## Parsing Strategy

- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|Error\\|seasons\\|(?P<message>.*)$`
- `event_family` fixed to `seasons_materials_fixer_missing`.

## Uses

- Quick detection of seasonal visual system init issues; correlate with `errors_000.log`.

## Open questions

- No success/recovery messages observed; impact on gameplay uncertain.
