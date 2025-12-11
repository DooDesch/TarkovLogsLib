import { BackendLogEvent, LogParser, ParsedLogResult } from "../types/index.js";
export declare class BackendLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<BackendLogEvent>;
}
