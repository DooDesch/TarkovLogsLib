# Log Statistical Relations

## Alignment Keys
- **Timestamp**: primary join across all files; normalize TZ.
- **Session prefix**: `YYYY.MM.DD_HH-MM-SS_VERSION` ties files within a run.
- **Request id**: shared between `backend_000.log` and echoed in `output_000.log`.
- **Profile/Owner ids**: in `inventory_000.log`, `player_000.log`; relate to backend errors (code 228) and output/errors stacks.
- **Item ids/names**: appear in `inventory_000.log`, `player_000.log`, `insurance_000.log`; match backend `ItemsMoving` contexts.
- **NetId/resource names**: in `errors_000.log`/`output_000.log`; align with spatial/seasons/objectPool faults.
- **Addresses (IP:port)**: in `network-connection_000.log`; co-occur with `network-messages_000.log` metrics.
- **Push URLs/tokens**: in `push-notifications_000.log`; useful for tracking notification uptime relative to backend keepalives.

## Combined Metrics & KPIs
- **Startup model**: from `files-checker` → `application` → first `backend` request → first `push` URL → first `network-connection` success. KPIs: time-to-first-backend, time-to-first-connect, anti-cheat init success rate. Visual: Gantt timeline per session.
- **Match lifecycle**: `application` matchmaking events + `backend` start/end calls + `output` mirrored events. KPIs: time to match ready, spawn latency. Visual: Gantt or Sankey.
- **Inventory reliability**: `backend_queue` failures + `inventory` rejections + backend code 228 + mirrored errors in `output`/`errors`. KPIs: rejection rate per op type, failure rate per item/container. Visual: stacked bars and heatmaps.
- **Network health**: `network-connection` timeouts + `network-messages` spikes/zeros. KPIs: timeout rate per host, median/95th `lud`, connect success ratio. Visual: time series, boxplots.
- **Push continuity vs transport**: compare `push-notifications` activity against `network-connection` timeouts. KPI: push uptime during game link outages. Visual: dual-timeline.
- **Cache effectiveness**: `backendCache` miss rate aligned with `backend` call volume. KPI: hit ratio per endpoint. Visual: stacked bars.
- **Audio/visual stability**: `spatial-audio` errors + `seasons` errors + corresponding `errors/output` stacks. KPI: error rate per session/build. Visual: bars over builds.
- **Error burden**: aggregate `errors_000.log` by family (NullReference, serialization, locale). KPI: errors per hour/session/build. Visual: Pareto charts, trend lines.
- **Backend resilience**: retries and protocol errors in `backend`; correlated with network timeouts. KPI: retry rate per endpoint, HTTP error rate. Visual: stacked bars, timeline markers.

## Session Timeline Reconstruction
1) Use `output_000.log` as backbone (chronological).  
2) Enrich with structured fields from component logs:  
   - `backend` (id, url, retries)  
   - `backendCache` (hit/miss)  
   - `inventory`/`backend_queue` (op codes, items, reasons)  
   - `network-connection`/`network-messages` (addresses, metrics)  
   - `push-notifications` (connection params, batch counts)  
   - `application` (matchmaking milestones, GC, BattlEye)  
3) Deduplicate mirrored events (component vs output/errors).  
4) Compute durations: startup, matchmaking, time-to-connect, time-to-first-error.  

## Data Normalization & Quality
- Normalize timestamps; handle missing TZ in later builds.
- Stitch multi-line events (inventory, backend_queue, errors, output) to avoid overcounting.
- Handle sparsity for rare logs (ai*, backend_queue, player, insurance) by rate-normalizing per session.
- Cache hits are implicit; infer hit when no `- NOT exists` follows the load line.

## Future API Outline (conceptual)
- Session entity: prefix, build, start/end timestamps, outcome.
- Event streams per component with normalized schemas from per-log docs.
- Correlation indices: request_id, profile_id, item_id, address, notification_token.
- Metrics endpoints: startup KPIs, backend latency, inventory rejection rates, network health, audio/visual error rates, push uptime.
