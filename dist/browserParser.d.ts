/**
 * Browser-friendly parsing helper.
 * Does not use fs/path/glob - accepts raw strings only.
 */
import { ParsedLogResult, LogParser } from "./types/index.js";
export interface ParseTextOptions {
    parsers?: LogParser[];
}
/**
 * Parse a single log file from its filename and text content.
 * Suitable for browser use - no filesystem access required.
 */
export declare function parseText(fileName: string, content: string, options?: ParseTextOptions): ParsedLogResult;
/**
 * Parse multiple log files from their filenames and contents.
 * Suitable for browser use - no filesystem access required.
 */
export declare function parseTexts(files: Array<{
    fileName: string;
    content: string;
}>, options?: ParseTextOptions): ParsedLogResult[];
