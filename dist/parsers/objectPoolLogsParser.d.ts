import { LogParser, ObjectPoolLogEvent, ParsedLogResult } from "../types/index.js";
export declare class ObjectPoolLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<ObjectPoolLogEvent>;
}
