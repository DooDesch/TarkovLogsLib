# Errors Logs (`errors_000.log`)

## Location
- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... errors_000.log`

## Line Format & Field Schema
- Primary line: `TIMESTAMP|VERSION|Error|errors|MESSAGE`
- Continuations: stack traces or extra context on following lines without pipes.

## Event Families (common prefixes → meaning)
- `Mip 0 waiting timeout` — texture streaming timeouts.
- `NullReferenceException ...` — generic null deref; stack shows subsystem.
- `KeyNotFoundException` — missing dict entries.
- `Can't find lamp with netId <id>` — world object lookup failure.
- `Cant find counter for Quest <id>` — quest progression data missing.
- `seasons|...` — seasons subsystem errors (mirrors `seasons_000.log`).
- `<b>Locale</b>. Trying to add duplicate: <key>` — localization collisions.
- `Incorrect Enum value <name> ... fallback to ...` — JSON enum parsing fallback.
- `A scripted object (probably EFT.*) has a different serialization layout when loading. (Read X bytes but expected Y bytes)` — Unity serialization mismatches.
- `supplyData is null` — missing supply data payload.
- `spatial-audio|...` — forwarded audio errors.
- `ALARM! Try to load null resource!` — resource lookup failure.
- `Already registered object - Turnable.NetId:<id> <name>` — duplicate registration.
- `insurance|Error insuring item: (...)` — mirrored from insurance subsystem.
- `aiData|...` — forwarded AI errors.
- `player|...` — forwarded player inventory errors.

## Examples
- Enum fallback: `2025-12-08 15:02:05.192|1.0.0.2.42157|Error|errors|Incorrect Enum value promoCode at [18].source, fallback to ECustomizationSource.None`
- Localization duplicate: `2025-12-08 15:02:14.877|1.0.0.2.42157|Error|errors|<b>Locale</b>. Trying to add duplicate: tournament`
- Serialization layout: `2025-12-08 15:02:30.528|1.0.0.2.42157|Error|errors|A scripted object (probably EFT.SinglePlayerApplication?) has a different serialization layout when loading. (Read 32 bytes but expected 144 bytes)`
- Duplicate object: `2025-12-08 15:05:19.587|1.0.0.2.42157|Error|errors|Already registered object - Turnable.NetId:-1707768434 lamp_ceiling_rezerv (2)`
- Resource null: `2025-12-08 15:19:44.232|1.0.0.2.42157|Error|errors|ALARM! Try to load null resource!`

## Parsing Strategy
- Regex for header: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|Error\\|errors\\|(?P<message>.*)$`
- Collect subsequent non-piped lines as `stack_trace` array.
- Derive `event_family` by prefix (e.g., up to first `:` or first 60 chars).
- Extract latent ids: `NetId`, quest ids, enum names, resource names, item descriptors.

## Uses
- Central error registry with full stacks—best source for root cause analysis.
- Cross-reference with component logs (`inventory`, `insurance`, `spatial-audio`, `seasons`, `aiData`, `player`) via mirrored messages.

## Open Questions
- Mapping of some NetIds to in-game assets needs external lookup.
- Serialization layout byte counts may depend on build; track across versions.
