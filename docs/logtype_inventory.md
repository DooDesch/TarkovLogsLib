# Inventory Logs (`inventory_000.log`)

## Location

- `.../Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/... inventory_000.log`
- Appears in 9 sessions (both 1.0.0.1 and 1.0.0.2 builds).

## Format & Schema

- Header line: `TIMESTAMP|VERSION|Error|inventory|[<profileId>|<username>|Profile]<profileId> - Client operation rejected by server: <code> - OperationType: <op>, Owner: <profileId>,`
- Continuations (3–4 lines without pipes):
  - `Item: <tpl> <itemId>, Address: <addr>, ID: <itemId>,`
  - `From: <fromContainer>`
  - `To: <toContainer> at (x: <x>, y: <y>, r: <Rotation>)`
  - `Reason: <text>` (may include world coordinates).

Fields:

- `profileId`, `username`, `code` (server rejection code), `OperationType` (MoveOperation, ReadQuestNoteOperation, etc.), `Owner`.
- `itemId`, `tpl`, `Address`, `From`, `To` container, grid coords, rotation.
- Position coords within Reason when provided.

## Examples

```
2025-12-04 18:13:43.724|1.0.0.2.42157|Error|inventory|[672ab3cc...|DooDesch|Profile]672ab3cc... - Client operation rejected by server: 0 - OperationType: MoveOperation, Owner: 672ab3cc...,
Item: bandage_army 5751a25924597722c463c472, Address: EFT.InventoryLogic.ItemController+ProtectedOwnerItself, ID: 6931b9dceb30a961ec0c01bb,
From: EFT.InventoryLogic.ItemController+ProtectedOwnerItself,
To: grid 6 in item item_equipment_rig_bearing (id: 6931bbb15affe089e10c605d) at (x: 0, y: 0, r: Horizontal)
Reason: operation can't be created:  item bandage_army (id: 6931b9dceb30a961ec0c01bb)  at (-42.61, 1.06, 37.70) cant find by EFT.ServerPlayer+ServerPlayerInventoryController at (-43.42, 1.07, 37.73)
```

## Parsing Strategy

- Header regex: `^(?P<timestamp>\\d{4}-\\d{2}-\\d{2} [^|]+)\\|(?P<version>[^|]*)\\|Error\\|inventory\\|\\[(?P<profile>[^|]+)\\|(?P<user>[^|]+)\\|Profile\\](?P=profile) - Client operation rejected by server: (?P<code>\\d+) - OperationType: (?P<op>[^,]+), Owner: (?P<owner>[^,]+),$`
- Continuation parsing:
  - `Item` line: capture `tpl`, `itemId`, `address`, `id`.
  - `From` line: capture source container text.
  - `To` line: capture target container, grid index, coords, rotation.
  - `Reason` line: free text; optionally extract positions `(x,y,z)`.
- Combine into single event with fields; attach all continuation lines.

## Uses

- Diagnose client/server desync in inventory moves and quest note operations.
- Identify problematic containers/items by template and coordinates.

## Open questions

- Rejection codes (0, 157, 186, 233, 329, etc.) need mapping to EFT server semantics.
