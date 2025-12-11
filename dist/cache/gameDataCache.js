import { promises as fs } from "fs";
import path from "path";
export class GameDataCache {
    constructor(options) {
        this.loaded = false;
        this.store = {};
        this.storagePath =
            options?.storagePath ??
                path.join(process.cwd(), ".cache", "tarkov-game-data.json");
        this.ttlMs = options?.ttlMs;
    }
    async get(key) {
        await this.ensureLoaded();
        const record = this.store[key];
        if (!record)
            return null;
        if (record.expiresAt && Date.now() > record.expiresAt) {
            delete this.store[key];
            await this.persist();
            return null;
        }
        return record.value;
    }
    async set(key, value) {
        await this.ensureLoaded();
        const expiresAt = this.ttlMs ? Date.now() + this.ttlMs : undefined;
        this.store[key] = { value, expiresAt };
        await this.persist();
    }
    async invalidate(key) {
        await this.ensureLoaded();
        if (key) {
            delete this.store[key];
        }
        else {
            this.store = {};
        }
        await this.persist();
    }
    async ensureLoaded() {
        if (this.loaded)
            return;
        try {
            const content = await fs.readFile(this.storagePath, "utf8");
            this.store = JSON.parse(content);
        }
        catch {
            this.store = {};
        }
        this.loaded = true;
    }
    async persist() {
        await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
        await fs.writeFile(this.storagePath, JSON.stringify(this.store, null, 2), "utf8");
    }
}
