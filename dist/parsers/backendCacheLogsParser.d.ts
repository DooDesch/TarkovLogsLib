import { BackendCacheLogEvent, LogParser, ParsedLogResult } from "../types/index.js";
export declare class BackendCacheLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<BackendCacheLogEvent>;
}
