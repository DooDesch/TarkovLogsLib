# Network Connection Logs (`network-connection_000.log`)

## Location
- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... network-connection_000.log`
- Present in most sessions starting mid-Nov.

## Format & Schema
- `TIMESTAMP|VERSION|LEVEL|network-connection|MESSAGE`
- `LEVEL`: `Info`, `Error`.
- `MESSAGE` fields include `address` (`IP:port`), state names, flags `syn`, `asc`.

## Event Types
- `Connect (address: <addr>)`
- `Exit to the '<state>' state (address: <addr>)`
- `Enter to the '<state>' state (address: <addr>, syn: <bool>, asc: <bool>)`
- `Send connect (address: <addr>, syn: <bool>, asc: <bool>)`
- `Timeout: Messages timed out after not receiving any message for 3000ms (address: <addr>)`

## Examples
- `2025-12-08 15:17:56.230|1.0.0.2.42157|Info|network-connection|Connect (address: 79.127.215.167:17002)`
- `2025-12-08 15:17:56.230|1.0.0.2.42157|Info|network-connection|Enter to the 'Connected' state (address: 79.127.215.167:17002, syn: False, asc: True)`
- `2025-12-06 21:05:10.100|1.0.0.2.42157|Error|network-connection|Timeout: Messages timed out after not receiving any message for 3006ms (address: 92.204.161.42:17013)`

## Parsing Strategy
- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|(?P<level>[^|]*)\\|network-connection\\|(?P<message>.*)$`
- Extract `address`, `state`, `syn`, `asc`, `timeout_ms` from message patterns.
- Classify `event_family` as `connect`, `state_enter`, `state_exit`, `send_connect`, `timeout`.

## Uses
- Track connection lifecycle to a game server instance.
- Correlate timeouts with `network-messages` metrics and push notification continuity.

## Open questions
- `syn` vs `asc` flags likely represent handshake roles; confirm with networking docs.
