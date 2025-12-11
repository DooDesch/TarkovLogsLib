/**
 * Browser-friendly parsing helper.
 * Does not use fs/path/glob - accepts raw strings only.
 */

import { ParsedLogResult, LogParser } from "./types/index.js";
import { defaultParsers } from "./parsers/index.js";

export interface ParseTextOptions {
  parsers?: LogParser[];
}

/**
 * Parse a single log file from its filename and text content.
 * Suitable for browser use - no filesystem access required.
 */
export function parseText(
  fileName: string,
  content: string,
  options?: ParseTextOptions
): ParsedLogResult {
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
export function parseTexts(
  files: Array<{ fileName: string; content: string }>,
  options?: ParseTextOptions
): ParsedLogResult[] {
  return files.map((f) => parseText(f.fileName, f.content, options));
}
