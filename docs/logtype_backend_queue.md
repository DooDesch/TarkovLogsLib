# Backend Queue Logs (`backend_queue_000.log`)

## Location
- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... backend_queue_000.log`
- Only present in a few sessions (4 files total).

## Line Format & Field Schema
- Header line: `TIMESTAMP|VERSION|Error|backend_queue|Error: Inventory queue failed on the following commands:`
- Continuation: a JSON array (no pipes) with one or more command objects.

Command object fields seen:
- `Action` (e.g., `RestoreHealth`, `MoveOperation`).
- `trader` (trader id).
- `items` (array of `id`, `count`).
- `difference` (nested: `BodyParts` with per-limb `Health`/`Effects`, `Energy`, `Hydration`).
- `timestamp` (epoch-like integer).

## Event Types
- **QueueFailure**: header + JSON payload describing failed inventory commands.

## Example
```
2025-12-04 01:37:55.834|1.0.0.2.42157|Error|backend_queue|Error: Inventory queue failed on the following commands:
[
  {
    "Action": "RestoreHealth",
    "trader": "54cb57776803fa99248b456e",
    "items": [{ "id": "6930cd0fea777c334d09081e", "count": 2906 }],
    "difference": { "BodyParts": { "RightArm": { "Health": 27.89, "Effects": null } }, "Energy": 0.0, "Hydration": 0.0 },
    "timestamp": 1764808675
  }
]
```

## Parsing Strategy
- Parse header via regex, then treat following lines until next piped line as JSON; decode into structured objects.
- Attach parsed JSON to the header event (`commands` array).

## Uses
- Exact replay of failed inventory queue commands for debugging/regression tests.
- Correlate with `inventory_000.log` and `backend_000.log` errors around the same timestamp.

## Open Questions
- No indication of automatic retries; need other logs to see recovery.
