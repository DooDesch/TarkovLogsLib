import { InsuranceLogEvent, LogParser, ParsedLogResult } from "../types/index.js";
export declare class InsuranceLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<InsuranceLogEvent>;
}
