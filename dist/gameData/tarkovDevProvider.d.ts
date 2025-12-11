import { GameDataProvider, ItemData, QuestData, TraderData, LocationData } from "../types/index.js";
export interface TarkovDevGameDataProviderOptions {
    endpoint?: string;
    headers?: Record<string, string>;
}
/**
 * Bulk-loading provider that fetches all quests, traders, maps, and items
 * once per process and serves lookups from in-memory caches. This avoids
 * rate-limiting and per-ID GraphQL calls.
 */
export declare class TarkovDevGameDataProvider implements GameDataProvider {
    private readonly endpoint;
    private readonly headers;
    private readonly tracker;
    private items?;
    private quests?;
    private traders?;
    private locations?;
    private loading?;
    constructor(options?: TarkovDevGameDataProviderOptions);
    getItemById(id: string): Promise<ItemData | null>;
    getQuestById(id: string): Promise<QuestData | null>;
    getTraderById(id: string): Promise<TraderData | null>;
    getLocationById(id: string): Promise<LocationData | null>;
    private ensureLoaded;
    private loadAll;
    private loadItemsFromTarkovDev;
    private loadStaticFromTracker;
    private query;
}
