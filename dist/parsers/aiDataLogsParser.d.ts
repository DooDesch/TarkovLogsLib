import { AiDataLogEvent, LogParser, ParsedLogResult } from "../types/index.js";
export declare class AiDataLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<AiDataLogEvent>;
}
