import { AiErrorsLogEvent, LogParser, ParsedLogResult } from "../types/index.js";
export declare class AiErrorsLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<AiErrorsLogEvent>;
}
