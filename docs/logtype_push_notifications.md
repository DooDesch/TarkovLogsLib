# Push Notifications Logs (`push-notifications_000.log`)

## Location
- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... push-notifications_000.log`
- Present in most sessions (46 files).

## Format & Schema
- `TIMESTAMP|VERSION|LEVEL|push-notifications|MESSAGE`
- `LEVEL`: `Info`, rare `Warn`.
- Messages often contain subfields separated by `|` and key:value pairs.

## Event Types
- Connection setup: `NotificationManager: new params received url: ws:wss://<host>/push/notifier/getwebsocket/<token>`
- Batch receipt: `LongPollingWebSocketRequest result Count:<n> MessageType:<type>` and `LongPollingWebSocketRequest received:<n>`
- Notification received: `NotificationManager.ProcessMessage | Received notification: Type: <Type>, Time: <t>, Duration: <d>, ShowNotification: <bool>`
- Simple receive: `Got notification | <Type>`
- Service ping: `NotificationManager.ProcessMessage | Received Service Notifications Ping`
- Warning: `Notification channel has been [dropped] by server error with code: <code>`

## Examples
- `2025-12-08 15:02:13.954|1.0.0.2.42157|Info|push-notifications|NotificationManager: new params received url:  ws:wss://wsn-pve-01.escapefromtarkov.com/push/notifier/getwebsocket/<token>`
- `2025-11-16 10:18:31.574 +01:00|1.0.0.0.41760|Info|push-notifications|Got notification | ChatMessageReceived`
- `2025-12-08 15:04:57.195|1.0.0.2.42157|Info|push-notifications|NotificationManager.ProcessMessage | Received Service Notifications Ping`
- `2025-12-07 15:10:00.000|1.0.0.2.42157|Warn|push-notifications|Notification channel has been [dropped] by server error with code: 0`

## Parsing Strategy
- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|(?P<level>[^|]*)\\|push-notifications\\|(?P<message>.*)$`
- For connection events, extract `url`, host, token.
- For batch events, parse `Count`, `MessageType`.
- For notification events, parse `Type`, `Time`, `Duration`, `ShowNotification`.
- For warnings, extract `error_code`.

## Uses
- Track websocket notifier connectivity and throughput.
- Correlate notification types (e.g., chat, pings) with backend and gameplay events.

## Open questions
- Notification payloads are not logged; only metadata available. Full semantics require backend knowledge.
