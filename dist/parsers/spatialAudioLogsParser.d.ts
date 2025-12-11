import { LogParser, ParsedLogResult, SpatialAudioLogEvent } from "../types/index.js";
export declare class SpatialAudioLogsParser implements LogParser {
    canParse(fileName: string, sampleContent?: string): boolean;
    parse(content: string, filePath?: string): ParsedLogResult<SpatialAudioLogEvent>;
}
