# Player Logs (`player_000.log`)

## Location
- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... player_000.log`
- Only two files observed (Dec 5 build).

## Format & Schema
- `TIMESTAMP|VERSION|Error|player|MESSAGE`
- Only `Error`.

## Event Types
- `Could not find item with id: <itemId>`
- `Could not find item address with id. ParentId: <parentId>, ContainerId: hideout`

## Examples
- `2025-12-05 20:42:37.027|1.0.0.2.42157|Error|player|Could not find item address with id. ParentId: 672ab2ca36161f2c2c110dd6, ContainerId: hideout`
- `2025-12-05 20:35:10.000|1.0.0.2.42157|Error|player|Could not find item with id: 692c8a936013b9204c0c8cc3`

## Parsing Strategy
- Regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|Error\\|player\\|(?P<message>.*)$`
- Extract `itemId`, `parentId`, `containerId` when present.

## Uses
- Diagnose missing item references in player/hideout contexts; correlate with `inventory_000.log` rejections.

## Open questions
- Whether these errors happen in-raid or hideout; location not logged explicitly.
