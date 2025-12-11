import { promises as fs } from "fs";
import path from "path";
import { glob } from "glob";
import { defaultParsers } from "./parsers/index.js";
export class TarkovLogsParser {
    constructor(options) {
        this.parsers = options?.parsers ?? defaultParsers();
        this.provider = options?.gameDataProvider;
        this.cache = options?.cache;
        this.enrichGameData = options?.enrichGameData ?? false;
    }
    async parseFile(pathOrContent) {
        const { filePath, content } = await this.resolveInput(pathOrContent);
        const parser = this.detectParser(filePath ?? "content.log", content);
        if (!parser) {
            throw new Error(`No parser found for ${filePath ?? "provided content"}`);
        }
        const result = parser.parse(content, filePath);
        if (this.enrichGameData && this.provider) {
            await this.enrich(result);
        }
        return result;
    }
    async parseFiles(paths) {
        return Promise.all(paths.map((p) => this.parseFile(p)));
    }
    async parseDirectory(dirPath) {
        const files = await glob("**/*.log", { cwd: dirPath, absolute: true });
        return this.parseFiles(files);
    }
    detectParser(fileName, sampleContent) {
        return this.parsers.find((p) => p.canParse(path.basename(fileName), sampleContent));
    }
    async resolveInput(input) {
        if (typeof input === "string") {
            if (await this.fileExists(input)) {
                return { filePath: input, content: await fs.readFile(input, "utf8") };
            }
            return { content: input };
        }
        if (Buffer.isBuffer(input)) {
            return { content: input.toString("utf8") };
        }
        if (typeof input === "object" && "path" in input) {
            return {
                filePath: input.path,
                content: await fs.readFile(input.path, "utf8"),
            };
        }
        throw new Error("Unsupported input");
    }
    async fileExists(p) {
        try {
            await fs.access(p);
            return true;
        }
        catch {
            return false;
        }
    }
    async enrich(result) {
        if (!this.provider)
            return;
        const tasks = result.events.map((event) => this.enrichEvent(event));
        await Promise.all(tasks);
    }
    async enrichEvent(event) {
        if (!this.provider)
            return;
        const fields = event.fields ?? {};
        const itemId = fields.itemId ?? fields.tpl;
        if (itemId) {
            const key = `item:${itemId}`;
            const cached = await this.cache?.get(key);
            if (cached) {
                fields.resolvedItem = cached;
            }
            else {
                const item = await this.provider.getItemById(itemId);
                if (item) {
                    fields.resolvedItem = item;
                    await this.cache?.set(key, item);
                }
            }
        }
        const traderId = fields.traderId || fields.trader;
        if (traderId && this.provider.getTraderById) {
            const key = `trader:${traderId}`;
            const cached = await this.cache?.get(key);
            if (cached) {
                fields.resolvedTrader = cached;
            }
            else {
                const trader = await this.provider.getTraderById(traderId);
                if (trader) {
                    fields.resolvedTrader = trader;
                    await this.cache?.set(key, trader);
                }
            }
        }
        const questId = fields.questId;
        if (questId && this.provider.getQuestById) {
            const key = `quest:${questId}`;
            const cached = await this.cache?.get(key);
            if (cached) {
                fields.resolvedQuest = cached;
            }
            else {
                const quest = await this.provider.getQuestById(questId);
                if (quest) {
                    fields.resolvedQuest = quest;
                    await this.cache?.set(key, quest);
                }
            }
        }
        const locationId = fields.locationId;
        if (locationId && this.provider.getLocationById) {
            const key = `location:${locationId}`;
            const cached = await this.cache?.get(key);
            if (cached) {
                fields.resolvedLocation = cached;
            }
            else {
                const location = await this.provider.getLocationById(locationId);
                if (location) {
                    fields.resolvedLocation = location;
                    await this.cache?.set(key, location);
                }
            }
        }
        event.fields = fields;
    }
}
