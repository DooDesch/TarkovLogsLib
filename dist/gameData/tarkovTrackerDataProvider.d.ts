import { GameDataProvider, ItemData, QuestData, TraderData, LocationData } from "../types/index.js";
export interface TarkovTrackerDataProviderOptions {
    baseUrl?: string;
}
export declare class TarkovTrackerDataProvider implements GameDataProvider {
    private readonly baseUrl;
    private cache;
    constructor(options?: TarkovTrackerDataProviderOptions);
    getItemById(id: string): Promise<ItemData | null>;
    getQuestById(id: string): Promise<QuestData | null>;
    getTraderById(id: string): Promise<TraderData | null>;
    getLocationById(id: string): Promise<LocationData | null>;
    private loadItems;
    private loadQuests;
    private loadTraders;
    private loadLocations;
    private fetchJson;
}
