import { ApplicationLogEvent, LogParser, ParsedLogResult } from "../types/index.js";
export declare class ApplicationLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<ApplicationLogEvent>;
}
