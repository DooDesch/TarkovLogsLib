import { promises as fs } from "fs";
import path from "path";
import { glob } from "glob";
import {
  AnyLogEvent,
  GameDataProvider,
  ParsedLogResult,
  LogParser,
} from "./types/index.js";
import { GameDataCache } from "./cache/gameDataCache.js";
import { defaultParsers } from "./parsers/index.js";

export interface TarkovLogsParserOptions {
  parsers?: LogParser[];
  gameDataProvider?: GameDataProvider;
  cache?: GameDataCache;
  enrichGameData?: boolean;
}

export class TarkovLogsParser {
  private readonly parsers: LogParser[];
  private readonly provider?: GameDataProvider;
  private readonly cache?: GameDataCache;
  private readonly enrichGameData: boolean;

  constructor(options?: TarkovLogsParserOptions) {
    this.parsers = options?.parsers ?? defaultParsers();
    this.provider = options?.gameDataProvider;
    this.cache = options?.cache;
    this.enrichGameData = options?.enrichGameData ?? false;
  }

  async parseFile(
    pathOrContent: string | Buffer | { path: string }
  ): Promise<ParsedLogResult> {
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

  async parseFiles(paths: string[]): Promise<ParsedLogResult[]> {
    return Promise.all(paths.map((p) => this.parseFile(p)));
  }

  async parseDirectory(dirPath: string): Promise<ParsedLogResult[]> {
    const files = await glob("**/*.log", { cwd: dirPath, absolute: true });
    return this.parseFiles(files);
  }

  private detectParser(
    fileName: string,
    sampleContent: string
  ): LogParser | undefined {
    return this.parsers.find((p) =>
      p.canParse(path.basename(fileName), sampleContent)
    );
  }

  private async resolveInput(
    input: string | Buffer | { path: string }
  ): Promise<{ filePath?: string; content: string }> {
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

  private async fileExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  private async enrich(result: ParsedLogResult): Promise<void> {
    if (!this.provider) return;
    const tasks = result.events.map((event) => this.enrichEvent(event));
    await Promise.all(tasks);
  }

  private async enrichEvent(event: AnyLogEvent): Promise<void> {
    if (!this.provider) return;
    const fields = event.fields ?? {};

    const itemId = (fields as any).itemId ?? (fields as any).tpl;
    if (itemId) {
      const key = `item:${itemId}`;
      const cached = await this.cache?.get(key);
      if (cached) {
        (fields as any).resolvedItem = cached;
      } else {
        const item = await this.provider.getItemById(itemId);
        if (item) {
          (fields as any).resolvedItem = item;
          await this.cache?.set(key, item);
        }
      }
    }

    const traderId = (fields as any).traderId || (fields as any).trader;
    if (traderId && this.provider.getTraderById) {
      const key = `trader:${traderId}`;
      const cached = await this.cache?.get(key);
      if (cached) {
        (fields as any).resolvedTrader = cached;
      } else {
        const trader = await this.provider.getTraderById(traderId);
        if (trader) {
          (fields as any).resolvedTrader = trader;
          await this.cache?.set(key, trader);
        }
      }
    }

    const questId = (fields as any).questId;
    if (questId && this.provider.getQuestById) {
      const key = `quest:${questId}`;
      const cached = await this.cache?.get(key);
      if (cached) {
        (fields as any).resolvedQuest = cached;
      } else {
        const quest = await this.provider.getQuestById(questId);
        if (quest) {
          (fields as any).resolvedQuest = quest;
          await this.cache?.set(key, quest);
        }
      }
    }

    const locationId = (fields as any).locationId;
    if (locationId && this.provider.getLocationById) {
      const key = `location:${locationId}`;
      const cached = await this.cache?.get(key);
      if (cached) {
        (fields as any).resolvedLocation = cached;
      } else {
        const location = await this.provider.getLocationById(locationId);
        if (location) {
          (fields as any).resolvedLocation = location;
          await this.cache?.set(key, location);
        }
      }
    }

    event.fields = fields;
  }
}
