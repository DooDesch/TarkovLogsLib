import { GameDataProvider, ParsedLogResult, LogParser } from "./types/index.js";
import { GameDataCache } from "./cache/gameDataCache.js";
export interface TarkovLogsParserOptions {
    parsers?: LogParser[];
    gameDataProvider?: GameDataProvider;
    cache?: GameDataCache;
    enrichGameData?: boolean;
}
export declare class TarkovLogsParser {
    private readonly parsers;
    private readonly provider?;
    private readonly cache?;
    private readonly enrichGameData;
    constructor(options?: TarkovLogsParserOptions);
    parseFile(pathOrContent: string | Buffer | {
        path: string;
    }): Promise<ParsedLogResult>;
    parseFiles(paths: string[]): Promise<ParsedLogResult[]>;
    parseDirectory(dirPath: string): Promise<ParsedLogResult[]>;
    private detectParser;
    private resolveInput;
    private fileExists;
    private enrich;
    private enrichEvent;
}
