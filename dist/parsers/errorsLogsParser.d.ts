import { ErrorsLogEvent, LogParser, ParsedLogResult } from "../types/index.js";
export declare class ErrorsLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<ErrorsLogEvent>;
}
