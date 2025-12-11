/**
 * Browser-compatible version of TarkovLogsInsights.
 * Does not support GameDataProvider or caching (no fs access).
 */
import { extractSessionPrefix } from "../parsers/base.js";
export class TarkovLogsInsightsBrowser {
    constructor(results) {
        this.results = Array.isArray(results) ? results : [results];
    }
    async compute() {
        const timelines = this.buildTimelines();
        const matching = this.buildMatching();
        const startup = this.buildStartup();
        const errors = this.buildErrors();
        const inventory = this.buildInventory();
        const connectivity = this.buildConnectivity();
        const quests = this.buildQuests();
        return {
            timelines,
            matching,
            startup,
            errors,
            inventory,
            connectivity,
            quests: quests.list,
            items: quests.items,
            traders: quests.traders,
        };
    }
    buildTimelines() {
        const bySession = new Map();
        for (const res of this.results) {
            const sessionId = res.meta.sessionPrefix ??
                extractSessionPrefix(res.filePath) ??
                (res.filePath ? `file:${res.filePath}` : `unknown#${Math.random()}`);
            const session = bySession.get(sessionId) ?? {
                sessionId,
                buildVersion: res.meta.buildVersion,
            };
            const ts = (event) => event.timestamp;
            for (const e of res.events) {
                const currentTs = ts(e);
                if (!session.startedAt ||
                    (currentTs && session.startedAt && currentTs < session.startedAt)) {
                    session.startedAt = currentTs;
                }
                if (!session.endedAt ||
                    (currentTs && session.endedAt && currentTs > session.endedAt)) {
                    session.endedAt = currentTs;
                }
                if (e.logType === "backend" && !session.firstBackendAt)
                    session.firstBackendAt = ts(e);
                if (e.logType === "network-connection" && !session.firstConnectAt)
                    session.firstConnectAt = ts(e);
                if (e.logType === "application" &&
                    e.eventFamily === "matchmaking" &&
                    !session.firstMatchEventAt) {
                    session.firstMatchEventAt = ts(e);
                }
                if (e.logType === "inventory" && !session.firstInventoryErrorAt)
                    session.firstInventoryErrorAt = ts(e);
                if (!session.firstErrorAt && e.level === "Error")
                    session.firstErrorAt = ts(e);
            }
            bySession.set(sessionId, session);
        }
        for (const session of bySession.values()) {
            session.startupDurationMs = duration(session.startedAt, session.firstBackendAt);
            session.matchmakingDurationMs = duration(session.firstMatchEventAt, session.firstConnectAt);
        }
        return Array.from(bySession.values());
    }
    buildMatching() {
        const bySession = new Map();
        for (const res of this.results.filter((r) => r.logType === "application")) {
            const sessionId = res.meta.sessionPrefix ??
                extractSessionPrefix(res.filePath) ??
                "unknown";
            const agg = bySession.get(sessionId) ??
                {
                    sessionId,
                };
            for (const e of res.events) {
                if (e.eventFamily === "matchmaking") {
                    const g = e.fields?.groupId;
                    if (g)
                        agg.groupId = agg.groupId ?? g;
                    if (!agg.startedAt)
                        agg.startedAt = e.timestamp;
                    if (e.message.includes("GamePrepared"))
                        agg.preparedAt = agg.preparedAt ?? e.timestamp;
                    if (e.message.includes("GameRunned")) {
                        agg.runnedAt = agg.runnedAt ?? e.timestamp;
                    }
                }
            }
            bySession.set(sessionId, agg);
        }
        const sessions = [];
        for (const agg of bySession.values()) {
            if (!agg.startedAt && !agg.preparedAt && !agg.runnedAt)
                continue;
            const durationMs = duration(agg.startedAt, agg.runnedAt ?? agg.preparedAt);
            sessions.push({
                sessionId: agg.sessionId,
                groupId: agg.groupId,
                startedAt: agg.startedAt,
                preparedAt: agg.preparedAt,
                runnedAt: agg.runnedAt,
                durationMs,
            });
        }
        const averageDurationMs = sessions
            .filter((s) => s?.durationMs !== undefined)
            .reduce((acc, s, _, arr) => acc + (s.durationMs ?? 0) / arr.length, 0) || undefined;
        return { sessions, averageDurationMs };
    }
    buildStartup() {
        // Use a Map to deduplicate sessions by sessionId
        const bySession = new Map();
        for (const res of this.results) {
            const sessionId = res.meta.sessionPrefix ??
                extractSessionPrefix(res.filePath) ??
                "unknown";
            const existing = bySession.get(sessionId) ?? { sessionId };
            for (const e of res.events) {
                // Track earliest timestamp across all logs for this session
                if (!existing.startedAt || (e.timestamp && e.timestamp < existing.startedAt)) {
                    existing.startedAt = e.timestamp;
                }
                // Track earliest backend timestamp for this session
                if (res.logType === "backend") {
                    if (!existing.firstBackendAt || (e.timestamp && e.timestamp < existing.firstBackendAt)) {
                        existing.firstBackendAt = e.timestamp;
                    }
                }
            }
            bySession.set(sessionId, existing);
        }
        // Convert Map to sessions array with calculated durations
        const sessions = [];
        for (const entry of bySession.values()) {
            const durationMs = duration(entry.startedAt, entry.firstBackendAt);
            sessions.push({
                sessionId: entry.sessionId,
                startedAt: entry.startedAt,
                firstBackendAt: entry.firstBackendAt,
                durationMs,
            });
        }
        const withDurations = sessions.filter((s) => s.durationMs !== undefined);
        const averageDurationMs = withDurations.reduce((acc, s, _, arr) => acc + (s.durationMs ?? 0) / arr.length, 0) || undefined;
        return { sessions, averageDurationMs };
    }
    buildErrors() {
        const totalsByFamily = {};
        let firstAt;
        let total = 0;
        // Only count errors from the dedicated "errors" log to avoid double-counting.
        // The errors log is the canonical aggregation of all error events from all components.
        for (const res of this.results.filter((r) => r.logType === "errors")) {
            for (const e of res.events) {
                total += 1;
                const family = e.eventFamily ?? "unknown";
                totalsByFamily[family] = (totalsByFamily[family] ?? 0) + 1;
                if (!firstAt)
                    firstAt = e.timestamp;
            }
        }
        return { total, byFamily: totalsByFamily, firstAt };
    }
    buildInventory() {
        let totalRejections = 0;
        const byOperation = {};
        const byCode = {};
        for (const res of this.results.filter((r) => r.logType === "inventory")) {
            for (const e of res.events) {
                totalRejections += 1;
                const fields = e.fields;
                const op = fields?.operationType;
                const code = fields?.code;
                if (op)
                    byOperation[op] = (byOperation[op] ?? 0) + 1;
                if (code !== undefined)
                    byCode[String(code)] = (byCode[String(code)] ?? 0) + 1;
            }
        }
        return { totalRejections, byOperation, byCode };
    }
    buildConnectivity() {
        const byAddress = {};
        let totalConnections = 0;
        let totalDisconnects = 0;
        let totalTimeouts = 0;
        for (const res of this.results.filter((r) => r.logType === "network-connection")) {
            for (const e of res.events) {
                const fields = e.fields;
                const addr = fields?.address ?? "unknown";
                const entry = (byAddress[addr] = byAddress[addr] ?? {
                    connect: 0,
                    disconnect: 0,
                    timeout: 0,
                });
                if (e.eventFamily === "connect" || e.eventFamily === "state_enter") {
                    entry.connect += 1;
                    totalConnections += 1;
                }
                if (e.eventFamily === "disconnect" || e.eventFamily === "send_disconnect") {
                    entry.disconnect += 1;
                    totalDisconnects += 1;
                }
                if (e.eventFamily === "timeout") {
                    entry.timeout += 1;
                    totalTimeouts += 1;
                }
            }
        }
        return { totalConnections, totalDisconnects, totalTimeouts, byAddress };
    }
    buildQuests() {
        const quests = {};
        const items = {};
        const traders = {};
        for (const res of this.results) {
            for (const e of res.events) {
                const questId = this.findQuestId(e);
                if (!questId)
                    continue;
                if (!quests[questId]) {
                    quests[questId] = {
                        id: questId,
                        status: "unknown",
                        relatedEvents: [],
                    };
                }
                quests[questId].relatedEvents.push(e);
                if (!quests[questId].startedAt)
                    quests[questId].startedAt = e.timestamp;
                const msg = e.message.toLowerCase();
                if (msg.includes("completed")) {
                    quests[questId].status = "completed";
                    quests[questId].completedAt =
                        quests[questId].completedAt ?? e.timestamp;
                }
                else if (msg.includes("fail")) {
                    quests[questId].status = "failed";
                    quests[questId].failedAt = quests[questId].failedAt ?? e.timestamp;
                }
                else {
                    if (quests[questId].status === "unknown")
                        quests[questId].status = "started";
                }
            }
        }
        return { list: Object.values(quests), items, traders };
    }
    findQuestId(event) {
        const msg = event.message ?? "";
        const match = msg.match(/\b([0-9a-f]{24})\b/i);
        if (match)
            return match[1];
        const fields = event.fields;
        if (fields?.questId)
            return fields.questId;
        return undefined;
    }
}
function duration(start, end) {
    if (!start || !end)
        return undefined;
    const a = Date.parse(start);
    const b = Date.parse(end);
    if (Number.isNaN(a) || Number.isNaN(b))
        return undefined;
    return Math.max(0, b - a);
}
