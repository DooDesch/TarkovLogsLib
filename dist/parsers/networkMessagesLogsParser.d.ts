import { LogParser, NetworkMessagesLogEvent, ParsedLogResult } from "../types/index.js";
export declare class NetworkMessagesLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<NetworkMessagesLogEvent>;
}
