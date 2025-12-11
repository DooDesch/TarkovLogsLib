import { deriveMetaFromEvents, groupByHeader, normalizeTimestamp } from "./base.js";
const HEADER_REGEX = /^(?<timestamp>\d{4}-\d{2}-\d{2} [^|]+)\|(?<version>[^|]*)\|Error\|inventory\|(?<message>.*)$/;
export class InventoryLogsParser {
    canParse(fileName, sampleContent) {
        const lowered = fileName.toLowerCase();
        return (lowered.includes("inventory_") ||
            (sampleContent ?? "").toLowerCase().includes("|inventory|"));
    }
    parse(content, filePath) {
        const groups = groupByHeader(content, HEADER_REGEX);
        const events = groups.map(({ match, continuation }) => {
            const { timestamp = "", version = "", message = "" } = (match.groups ?? {});
            const headerFields = parseHeaderMessage(message);
            const continuationFields = parseContinuation(continuation);
            return {
                logType: "inventory",
                timestamp: normalizeTimestamp(timestamp),
                timestampRaw: timestamp,
                version: version.trim() || undefined,
                level: "Error",
                component: "inventory",
                message: message.trim(),
                eventFamily: "rejection",
                continuation: continuation.length ? continuation : undefined,
                fields: {
                    profileId: headerFields.profileId,
                    username: headerFields.username,
                    code: headerFields.code,
                    operationType: headerFields.operationType,
                    owner: headerFields.owner,
                    ...continuationFields,
                },
            };
        });
        return {
            filePath,
            logType: "inventory",
            events,
            meta: deriveMetaFromEvents(events, filePath),
        };
    }
}
function parseHeaderMessage(message) {
    const profileMatch = message.match(/\[(?<profile>[^\]|]+)\|(?<user>[^\]|]+)\|Profile\](?<profileAgain>[^\s]+)/);
    const codeMatch = message.match(/rejected by server:\s*(\d+)/i);
    const opMatch = message.match(/OperationType:\s*([^,]+)/i);
    const ownerMatch = message.match(/Owner:\s*([^\s,]+)/i);
    return {
        profileId: profileMatch?.groups?.profile,
        username: profileMatch?.groups?.user,
        code: codeMatch?.[1] ? Number(codeMatch[1]) : undefined,
        operationType: opMatch?.[1]?.trim(),
        owner: ownerMatch?.[1]?.trim(),
    };
}
function parseContinuation(lines) {
    const result = {};
    for (const line of lines) {
        if (line.trim().startsWith("Item:")) {
            const tplMatch = line.match(/Item:\s*([^\s]+)\s+([0-9a-fA-F]+)/);
            const idMatch = line.match(/ID:\s*([0-9a-fA-F]+)/);
            const addrMatch = line.match(/Address:\s*([^,]+),/);
            result.tpl = tplMatch?.[1];
            result.itemId = idMatch?.[1];
            result.address = addrMatch?.[1];
        }
        else if (line.trim().startsWith("From:")) {
            result.from = line.replace("From:", "").trim();
        }
        else if (line.trim().startsWith("To:")) {
            const gridMatch = line.match(/grid\s+(\d+)/i);
            const slotMatch = line.match(/slot:\s*([^)]+)/i);
            const coordsMatch = line.match(/at\s*\(x:\s*([-\d.]+),\s*y:\s*([-\d.]+),\s*r:\s*([^)]+)\)/i);
            result.to = line.replace(/To:\s*/, "").split(" at ")[0].trim();
            result.grid = {
                x: coordsMatch?.[1] ? Number(coordsMatch[1]) : undefined,
                y: coordsMatch?.[2] ? Number(coordsMatch[2]) : undefined,
                r: coordsMatch?.[3]?.trim(),
                slot: gridMatch?.[1] ? `grid ${gridMatch[1]}` : slotMatch?.[1],
            };
        }
        else if (line.trim().startsWith("Reason:")) {
            const reason = line.replace("Reason:", "").trim();
            const worldMatch = reason.match(/\(\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
            result.reason = reason;
            if (worldMatch) {
                result.worldPosition = {
                    x: Number(worldMatch[1]),
                    y: Number(worldMatch[2]),
                    z: Number(worldMatch[3]),
                };
            }
        }
    }
    return result;
}
