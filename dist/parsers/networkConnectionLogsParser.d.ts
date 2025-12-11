import { LogParser, NetworkConnectionLogEvent, ParsedLogResult } from "../types/index.js";
export declare class NetworkConnectionLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<NetworkConnectionLogEvent>;
}
