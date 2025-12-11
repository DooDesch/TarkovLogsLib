import { LogParser, ParsedLogResult, PlayerLogEvent } from "../types/index.js";
export declare class PlayerLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<PlayerLogEvent>;
}
