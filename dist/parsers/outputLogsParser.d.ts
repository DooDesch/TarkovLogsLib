import { LogParser, OutputLogEvent, ParsedLogResult } from "../types/index.js";
export declare class OutputLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<OutputLogEvent>;
}
