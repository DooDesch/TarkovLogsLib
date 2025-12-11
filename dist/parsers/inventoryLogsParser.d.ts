import { InventoryLogEvent, LogParser, ParsedLogResult } from "../types/index.js";
export declare class InventoryLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<InventoryLogEvent>;
}
