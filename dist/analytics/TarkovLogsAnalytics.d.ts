import { ParsedLogResult } from "../types/index.js";
import { AnalyticsOptions, Statistics } from "../types/analytics.js";
import { GameDataCache } from "../cache/gameDataCache.js";
export declare class TarkovLogsAnalytics {
    private readonly results;
    private readonly provider?;
    private readonly cache?;
    constructor(results: ParsedLogResult | ParsedLogResult[], options?: AnalyticsOptions & {
        cache?: GameDataCache;
    });
    computeStatistics(): Promise<Statistics>;
    private buildSessions;
    private countLevels;
    private accumulateBackend;
    private accumulateCache;
    private accumulateInventory;
    private accumulateNetwork;
    private accumulatePush;
    private accumulateAudio;
    private accumulateErrors;
    private accumulateMatchmaking;
    private accumulateAnticheat;
    private accumulateQuest;
    private findQuestId;
    private upsertResolved;
    private resolveQuest;
    private resolveTraderName;
}
