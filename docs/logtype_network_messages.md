# Network Messages Logs (`network-messages_000.log`)

## Location
- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... network-messages_000.log`
- Written alongside `network-connection_000.log` when connected to a host.

## Format & Schema
- `TIMESTAMP|VERSION|Info|network-messages|rpi:<float>|rwi:<float>|rsi:<float>|rci:<float>|ui:<float>|lui:<float>|lud:<float>`
- Only `Info`.

Fields (hypothesis):
- `rpi`, `rwi`, `rsi`, `rci` — receive/write stats (packet or byte rates).
- `ui`, `lui` — upstream latency/intervals.
- `lud` — lag/latency delta.

## Examples
- `2025-12-08 15:18:29.010|1.0.0.2.42157|Info|network-messages|rpi:0.00|rwi:0.00|rsi:0.00|rci:0.00|ui:9.94|lui:11.18|lud:0`
- `2025-12-08 15:19:59.016|1.0.0.2.42157|Info|network-messages|rpi:121.71|rwi:3582.60|rsi:88.48|rci:4098.34|ui:37.63|lui:37.64|lud:1.8033`

## Parsing Strategy
- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|Info\\|network-messages\\|(?P<metrics>.*)$`
- Split `metrics` on `|` into key:value pairs and parse floats.
- Add derived fields (e.g., spikes/zero detection).

## Uses
- Trend network quality per session; align spikes with `network-connection` timeouts.
- Feed into telemetry dashboards for latency/throughput health.

## Open questions
- Precise metric definitions need external confirmation from EFT netcode documentation.
