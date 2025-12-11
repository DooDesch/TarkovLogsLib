import { LogParser, ParsedLogResult, SeasonsLogEvent } from "../types/index.js";
export declare class SeasonsLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<SeasonsLogEvent>;
}
