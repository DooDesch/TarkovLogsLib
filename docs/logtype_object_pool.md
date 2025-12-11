# Object Pool Logs (`objectPool_000.log`)

## Location
- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... objectPool_000.log`
- Seen in 4 sessions on build 1.0.0.2.

## Format & Schema
- `TIMESTAMP|VERSION|Error|objectPool|<assetId>|MESSAGE`
- Continuations: duplicates of the same line may appear without timestamp (counted as unparsed).
- Only `Error`.

Fields:
- `assetId` (numeric), `message`.

## Event Types
- `Returning asset to pool when the pool is already destroyed. Please find out what causes this.` — attempted return to destroyed pool.

## Example
- `2025-12-07 21:12:18.406|1.0.0.2.42157|Error|objectPool|14265|Returning asset to pool when the pool is already destroyed. Please find out what causes this.`

## Parsing Strategy
- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|Error\\|objectPool\\|(?P<assetId>[^|]+)\\|(?P<message>.*)$`
- Treat subsequent identical lines without timestamp as duplicates; optionally count occurrences.

## Uses
- Spot lifecycle bugs in pooled assets; correlate `assetId` with resource catalogs if available.

## Open questions
- `assetId` namespace meaning (resource vs runtime instance) needs external mapping.
