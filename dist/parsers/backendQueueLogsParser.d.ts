import { BackendQueueLogEvent, LogParser, ParsedLogResult } from "../types/index.js";
export declare class BackendQueueLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<BackendQueueLogEvent>;
}
