import { GameDataCacheOptions } from "../types/index.js";
export declare class GameDataCache {
    private readonly storagePath;
    private readonly ttlMs?;
    private loaded;
    private store;
    constructor(options?: GameDataCacheOptions);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    invalidate(key?: string): Promise<void>;
    private ensureLoaded;
    private persist;
}
