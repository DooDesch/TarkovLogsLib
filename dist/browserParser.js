/**
 * Browser-friendly parsing helper.
 * Does not use fs/path/glob - accepts raw strings only.
 */
import { defaultParsers } from "./parsers/index.js";
/**
 * Parse a single log file from its filename and text content.
 * Suitable for browser use - no filesystem access required.
 */
export function parseText(fileName, content, options) {
    const parsers = options?.parsers ?? defaultParsers();
    // Extract just the filename from any path-like string (handles both / and \)
    const baseName = fileName.split(/[\\/]/).pop() ?? fileName;
    const parser = parsers.find((p) => p.canParse(baseName, content));
    if (!parser) {
        throw new Error(`No parser found for ${baseName}`);
    }
    return parser.parse(content, fileName);
}
/**
 * Parse multiple log files from their filenames and contents.
 * Suitable for browser use - no filesystem access required.
 */
export function parseTexts(files, options) {
    return files.map((f) => parseText(f.fileName, f.content, options));
}
