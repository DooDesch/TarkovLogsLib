# Cross-Log Relationships

## Session Layout
- Each session lives under `D:/Launcher/Battlestate Games/Escape from Tarkov/Logs/log_YYYY.MM.DD_HH-MM-SS_VERSION/`.
- Files inside a session share the same timestamp/version prefix and differ only by log type (e.g., `... application_000.log`, `... backend_000.log`).
- `output_000.log` aggregates many messages from other logs; use it for chronological stitching, but component logs provide cleaner, type-specific views.

## Key Correlations
- **Startup chain**: `files-checker_000.log` runs first → `application_000.log` records wake/settings → `backendCache_000.log` shows cache misses → `backend_000.log` issues the corresponding HTTP requests. The same request/response lines also surface in `output_000.log`.
- **Backend cache + transport**: Each `backendCache ... - NOT exists` line typically precedes a matching `---> Request HTTPS ...` in `backend_000.log`; cache hits may suppress a request.
- **Backend queue + inventory**: When the inventory queue fails (`backend_queue_000.log`), a multi-line JSON payload describes the failed commands. Around the same timestamp, `inventory_000.log` and `backend_000.log` often log rejected Move/Restore operations, and `output_000.log` mirrors the same errors.
- **Inventory/insurance/player/objectPool errors**: These component-specific logs emit concise errors; the same messages (with stack traces) reappear in `errors_000.log` and `output_000.log`. Use component logs for clarity and `output`/`errors` for full stacks.
- **Network linkage**: `network-connection_000.log` shows state transitions to a host, while `network-messages_000.log` records periodic throughput/latency stats during that connection window. Timeouts in `network-connection` often align with spikes or zeros in `network-messages`.
- **Push notifications vs backend**: `push-notifications_000.log` captures websocket endpoints and received batches. Connection URLs use `wsn-*` hosts, while `backend_000.log` uses `gw-*`/`prod-*` hosts; these operate concurrently. Push pings arrive even when backend keepalive retries are happening (see timestamps around 15:04–15:05 on 2025-12-08).
- **Seasons/spatial-audio/objectPool**: Their errors are echoed in `errors_000.log` and `output_000.log`, enabling correlation with gameplay phases. For example, spatial-audio occlusion errors coincide with `Current DSP buffer length` info lines in the same log and can be time-matched to network spikes or backend calls in `output`.

## Example Sequences
- **Cache miss → backend call**  
  - `backendCache_000.log`: `BackendCache.Load ... URL: /client/menu/locale/en ... - NOT exists`  
  - `backend_000.log`: `---> Request HTTPS ... /client/menu/locale/en` followed by `<--- Response HTTPS ...`  
  - `output_000.log`: repeats the request/response for the same id.

- **Inventory rejection with queue failure**  
  - `backend_queue_000.log`: JSON block for failed `RestoreHealth` or `MoveOperation`.  
  - `inventory_000.log`: `Client operation rejected by server ... OperationType: MoveOperation ... Reason: operation can't be created ...` with item/grid details.  
  - `backend_000.log`: may show `BackendServerSideException 228` for `/client/game/profile/items/moving`.  
  - `errors_000.log`/`output_000.log`: same error plus stack traces.

- **Network timeout**  
  - `network-connection_000.log`: `Timeout: Messages timed out after not receiving any message for 3000ms (address: <ip>:<port>)`.  
  - Adjacent `network-messages_000.log` entries may show zeroed or spiking metrics.  
  - Subsequent `push-notifications_000.log` entries can still arrive, indicating push channel independence from the timed-out game session link.

- **Audio/visual system faults**  
  - `spatial-audio_000.log`: `can't init occlusion transform for player ... NullReferenceException`  
  - `seasons_000.log`: `Can't find SeasonsMaterialsFixer.Instance`  
  - Both appear (with stacks) in `errors_000.log`/`output_000.log`, allowing alignment with the active raid via backend or network timestamps.

## How to Leverage
- Use `output_000.log` for a master timeline, then pivot into the component log for structured context and reduced noise.
- Cross-reference backend request ids across `backend_000.log` and `output_000.log` to trace latency or retries.
- Pair `backend_queue_000.log` with `inventory_000.log` to reproduce inventory bugs in tests.
- Monitor `network-connection` and `network-messages` together to differentiate transport drops from backend HTTP issues.
- Track push notification continuity during backend outages to understand client resilience.
