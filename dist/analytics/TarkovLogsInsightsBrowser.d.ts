/**
 * Browser-compatible version of TarkovLogsInsights.
 * Does not support GameDataProvider or caching (no fs access).
 */
import { Insights, ParsedInput } from "../types/insights.js";
export declare class TarkovLogsInsightsBrowser {
    private readonly results;
    constructor(results: ParsedInput);
    compute(): Promise<Insights>;
    private buildTimelines;
    private buildMatching;
    private buildStartup;
    private buildErrors;
    private buildInventory;
    private buildConnectivity;
    private buildQuests;
    private findQuestId;
}
