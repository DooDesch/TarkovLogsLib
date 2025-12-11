import { Insights, InsightsOptions, ParsedInput } from "../types/insights.js";
export declare class TarkovLogsInsights {
    private readonly results;
    private readonly provider?;
    private readonly cache?;
    constructor(results: ParsedInput, options?: InsightsOptions);
    compute(): Promise<Insights>;
    private buildTimelines;
    private buildMatching;
    private buildStartup;
    private buildErrors;
    private buildInventory;
    private buildConnectivity;
    private buildQuests;
    private findQuestId;
    private resolveQuest;
    private resolveTraderName;
    private upsertResolved;
}
