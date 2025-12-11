# Cross-Log Correlations

## Shared Identifiers & Anchors
- **Timestamp**: primary join key across all logs.
- **Request id**: `backend_000.log` and `output_000.log` share `id [N]` for HTTPS calls.
- **Profile/Owner**: `inventory_000.log`, `player_000.log` include profile ids; match with backend `ItemsMoving` errors (code 228) and output/error stacks.
- **Item ids / template names**: `inventory_000.log`, `player_000.log`, `insurance_000.log` surface item ids/names; same items appear in backend payload errors (items moving), output/error mirrors.
- **NetId / resource names**: `errors_000.log` carries `Turnable.NetId` and resource names; echoed in `output_000.log`.
- **Server address**: `network-connection_000.log` IP:port can align with network metric intervals in `network-messages_000.log`.
- **Notification URL/token**: `push-notifications_000.log` shows websocket host/token; timelines align with backend keepalive/retry behavior.
- **Session/version prefix**: folder and filename prefix `YYYY.MM.DD_HH-MM-SS_VERSION` ties all files within a session.

## Timeline Reconstruction Patterns
- **Cache miss → backend request → response**  
  1) `backendCache_000.log`: `BackendCache.Load ... - NOT exists`  
  2) `backend_000.log`: `---> Request HTTPS, id [N] ... <endpoint>`  
  3) `backend_000.log`: `<--- Response HTTPS, id [N] ...` (or error)  
  4) `output_000.log`: echoes steps 2–3 with same `id`.

- **Inventory rejection chain**  
  - `inventory_000.log`: `Client operation rejected ... OperationType: MoveOperation ... Reason: ...`  
  - `backend_000.log`: `BackendServerSideException: 228 - ItemsMoving...` (same timeframe, same operation)  
  - `output_000.log` and `errors_000.log`: same error plus stack trace.

- **Backend queue failure**  
  - `backend_queue_000.log`: JSON payload of failed commands (e.g., `RestoreHealth`).  
  - Nearby `inventory_000.log` / `backend_000.log` reflect move/restore rejections.  
  - `errors_000.log` / `output_000.log` may show serialization or null resource errors around the same timestamp.

- **Network connectivity + metrics**  
  - `network-connection_000.log`: `Connect`, `Enter 'Connected'`, possible `Timeout`.  
  - `network-messages_000.log`: periodic metrics; zeros or spikes bracket timeouts.  
  - `push-notifications_000.log`: may continue receiving pings even when game connection times out, indicating channel independence.

- **Audio/visual system faults**  
  - `spatial-audio_000.log`: occlusion NullReference;  
  - `seasons_000.log`: missing `SeasonsMaterialsFixer` errors;  
  - Both reappear in `errors_000.log` and `output_000.log` with stacks, enabling alignment with gameplay or backend events.

- **Anti-cheat lifecycle**  
  - `application_000.log`: BattlEye DLL load/Init/exit sequence.  
  - Failures (rare) would propagate into `output_000.log`/`errors_000.log` near startup, before backend requests begin.

## Discrepancies / Consistency Checks
- **Unparsed continuations**: Multi-line events in `output_000.log`, `errors_000.log`, `inventory_000.log`, `backend_queue_000.log` require stitching; otherwise counts misrepresent event volume.
- **Timezone offset**: Early sessions include `+01:00`; later do not—normalize before joining.
- **Component duplication**: Many errors appear both in component logs and aggregated `output_000.log`/`errors_000.log`; deduplicate by timestamp+message hash.
- **Cache hits invisible**: `backendCache_000.log` omits explicit “hit” lines; lack of `- NOT exists` implies hit—important when correlating with missing backend requests.

## Suggested Correlation Workflow
1) Normalize timestamps (strip TZ, convert to UTC if needed).  
2) Parse multi-line events (header + continuations) into single records.  
3) Join by session prefix, then by timestamp ± small delta, plus secondary keys (request `id`, profile/item ids, address).  
4) Build per-session timeline primarily from `output_000.log`; enrich with structured fields from component logs.  
5) Deduplicate mirrored events (component vs output/errors).  
6) Flag mismatches: backend errors without corresponding inventory rejection, or network timeouts without metric spikes.

## Causal Examples
- **MoveOperation rejection**:  
  - `backend_000.log`: `<--- Response HTTPS, id [294]: BackendServerSideException: 228 - ItemsMoving[Move]: can't move item 69246a...`  
  - `inventory_000.log`: `Client operation rejected ... OperationType: MoveOperation ... Reason: operation can't be created ...`  
  - `errors_000.log`: same message with stack trace.  
  - `output_000.log`: aggregates the above.  
  → Use to test inventory move flow and server validation.

- **Network timeout with continued notifications**:  
  - `network-connection_000.log`: `Timeout: Messages timed out after not receiving any message for 3006ms (address: X:17042)`  
  - `network-messages_000.log`: metrics near-zero or spiking around same minute.  
  - `push-notifications_000.log`: still receives `Service Notifications Ping`, implying push channel unaffected.  
  → Helps distinguish transport vs push channel health.

- **Cache miss leading to call**:  
  - `backendCache_000.log`: miss for `/client/menu/locale/en`  
  - `backend_000.log`: request id [1] to the same endpoint  
  - `output_000.log`: request/response echoed  
  → Confirms cache behavior and request lifecycle.
