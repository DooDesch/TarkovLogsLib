import { GameDataProvider, ItemData, QuestData, TraderData, LocationData } from "../types/index.js";
export interface TarkovDevGameDataProviderOptions {
    endpoint?: string;
    headers?: Record<string, string>;
}
export declare class TarkovDevGameDataProvider implements GameDataProvider {
    private readonly endpoint;
    private readonly headers;
    constructor(options?: TarkovDevGameDataProviderOptions);
    getItemById(id: string): Promise<ItemData | null>;
    getQuestById(id: string): Promise<QuestData | null>;
    getTraderById(id: string): Promise<TraderData | null>;
    getLocationById(id: string): Promise<LocationData | null>;
    private query;
}
