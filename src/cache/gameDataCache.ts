import { promises as fs } from "fs";
import path from "path";
import { GameDataCacheOptions, GameDataCacheRecord } from "../types/index.js";

export class GameDataCache {
  private readonly storagePath: string;
  private readonly ttlMs?: number;
  private loaded = false;
  private store: Record<string, GameDataCacheRecord<unknown>> = {};

  constructor(options?: GameDataCacheOptions) {
    this.storagePath =
      options?.storagePath ??
      path.join(process.cwd(), ".cache", "tarkov-game-data.json");
    this.ttlMs = options?.ttlMs;
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureLoaded();
    const record = this.store[key] as GameDataCacheRecord<T> | undefined;
    if (!record) return null;
    if (record.expiresAt && Date.now() > record.expiresAt) {
      delete this.store[key];
      await this.persist();
      return null;
    }
    return record.value;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.ensureLoaded();
    const expiresAt = this.ttlMs ? Date.now() + this.ttlMs : undefined;
    this.store[key] = { value, expiresAt };
    await this.persist();
  }

  async invalidate(key?: string): Promise<void> {
    await this.ensureLoaded();
    if (key) {
      delete this.store[key];
    } else {
      this.store = {};
    }
    await this.persist();
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const content = await fs.readFile(this.storagePath, "utf8");
      this.store = JSON.parse(content);
    } catch {
      this.store = {};
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
    await fs.writeFile(this.storagePath, JSON.stringify(this.store, null, 2), "utf8");
  }
}
