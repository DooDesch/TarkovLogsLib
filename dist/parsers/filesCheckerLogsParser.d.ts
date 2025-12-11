import { FilesCheckerLogEvent, LogParser, ParsedLogResult } from "../types/index.js";
export declare class FilesCheckerLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<FilesCheckerLogEvent>;
}
