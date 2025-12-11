/**
 * Browser-friendly exports for TarkovLogsLib.
 * Does not include any Node.js specific modules (fs, path, glob).
 */
// Browser-safe parsing functions
export { parseText, parseTexts } from "./browserParser.js";
// Parsers (no fs usage)
export { defaultParsers } from "./parsers/index.js";
// Analytics (browser-safe version without fs/cache)
export { TarkovLogsInsightsBrowser as TarkovLogsInsights } from "./analytics/TarkovLogsInsightsBrowser.js";
