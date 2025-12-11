import { ParsedLogResult } from "../types/index.js";
export interface HeaderGroup {
    line: string;
    match: RegExpMatchArray;
    continuation: string[];
}
export declare function normalizeTimestamp(raw: string): string;
export declare function groupByHeader(content: string, headerRegex: RegExp): HeaderGroup[];
export declare function deriveMetaFromEvents<T extends {
    timestamp?: string;
    version?: string;
}>(events: T[], filePath?: string): ParsedLogResult["meta"];
export declare function extractSessionPrefix(filePath?: string): string | undefined;
