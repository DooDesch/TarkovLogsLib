import { LogParser, ParsedLogResult, PushNotificationsLogEvent } from "../types/index.js";
export declare class PushNotificationsLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<PushNotificationsLogEvent>;
}
