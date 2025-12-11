export type LogType =
  | "application"
  | "backend"
  | "backendCache"
  | "backend_queue"
  | "errors"
  | "files-checker"
  | "insurance"
  | "inventory"
  | "network-connection"
  | "network-messages"
  | "objectPool"
  | "output"
  | "player"
  | "push-notifications"
  | "seasons"
  | "spatial-audio"
  | "aiData"
  | "aiErrors";

export type LogLevel = "Info" | "Warn" | "Warning" | "Error" | "Debug";

export interface BaseLogEvent<TType extends LogType = LogType> {
  logType: TType;
  timestamp: string;
  timestampRaw: string;
  version?: string;
  level?: LogLevel;
  component: string;
  message: string;
  eventFamily: string;
  continuation?: string[];
  /** Additional typed fields extracted from the message */
  fields?: Record<string, unknown>;
}

export interface ApplicationLogEvent extends BaseLogEvent<"application"> {
  level: "Info" | "Debug" | "Error";
  eventFamily:
    | "bootstrap"
    | "gc"
    | "config"
    | "anticheat"
    | "instrumentation"
    | "matchmaking"
    | "error"
    | "other";
  fields?: {
    profileId?: string;
    accountId?: string;
    groupId?: string;
    scenePreset?: string;
    battlEyeAction?: string;
    metricCode?: string;
    /** Matchmaking event name (e.g., "LocationLoaded", "GameRunned") */
    matchmakingEvent?: string;
    /** Game time in seconds for matchmaking events */
    gameTime?: number;
    /** Step time since previous event (game time) */
    gameStepTime?: number;
    /** Real (wall clock) time in seconds for matchmaking events */
    realTime?: number;
    /** Step time since previous event (real time) */
    realStepTime?: number;
    /** Difference between real and game time */
    timeDiff?: number;
  };
}

export interface BackendLogEvent extends BaseLogEvent<"backend"> {
  eventFamily:
    | "request"
    | "response"
    | "transport_error"
    | "retry"
    | "deserialization_error"
    | "server_exception"
    | "other";
  fields?: {
    id?: number;
    url?: string;
    crc?: string;
    responseCode?: number;
    retry?: number;
    retries?: number;
    errorReason?: string;
  };
}

export interface BackendCacheLogEvent extends BaseLogEvent<"backendCache"> {
  eventFamily: "lookup";
  fields?: {
    path: string;
    endpoint: string;
    cacheHit: boolean;
  };
}

export interface BackendQueueCommand {
  Action?: string;
  trader?: string;
  items?: Array<{ id?: string; count?: number }>;
  difference?: Record<string, unknown>;
  timestamp?: number;
}

export interface BackendQueueLogEvent extends BaseLogEvent<"backend_queue"> {
  eventFamily: "queue_failure";
  fields?: {
    commands: BackendQueueCommand[];
  };
}

export interface ErrorsLogEvent extends BaseLogEvent<"errors"> {
  eventFamily:
    | "mip_timeout"
    | "null_reference"
    | "key_not_found"
    | "missing_lamp"
    | "missing_quest_counter"
    | "seasons"
    | "locale_duplicate"
    | "enum_fallback"
    | "serialization_layout"
    | "supply_data_null"
    | "spatial_audio"
    | "resource_null"
    | "duplicate_object"
    | "insurance"
    | "ai"
    | "player"
    | "other";
  fields?: Record<string, unknown>;
}

export interface FilesCheckerLogEvent extends BaseLogEvent<"files-checker"> {
  eventFamily: "start" | "executable_path" | "complete" | "other";
  fields?: {
    executablePath?: string;
    elapsedMs?: number;
  };
}

export interface InsuranceLogEvent extends BaseLogEvent<"insurance"> {
  eventFamily: "warn_missing_item" | "error_insuring" | "other";
  fields?: {
    itemName?: string;
  };
}

export interface InventoryLogEvent extends BaseLogEvent<"inventory"> {
  eventFamily: "rejection";
  fields?: {
    profileId?: string;
    username?: string;
    code?: number;
    operationType?: string;
    owner?: string;
    itemId?: string;
    tpl?: string;
    address?: string;
    from?: string;
    to?: string;
    grid?: { x?: number; y?: number; r?: string; slot?: string };
    reason?: string;
    worldPosition?: { x?: number; y?: number; z?: number };
  };
}

export interface NetworkConnectionLogEvent extends BaseLogEvent<"network-connection"> {
  eventFamily:
    | "connect"
    | "disconnect"
    | "send_disconnect"
    | "statistics"
    | "state_enter"
    | "state_exit"
    | "send_connect"
    | "timeout"
    | "thread_aborted"
    | "other";
  fields?: {
    address?: string;
    state?: string;
    syn?: boolean;
    asc?: boolean;
    timeoutMs?: number;
    disconnectReason?: number;
    rtt?: number;
    packetsLost?: number;
    packetsSent?: number;
    packetsReceived?: number;
  };
}

export interface NetworkMessagesLogEvent extends BaseLogEvent<"network-messages"> {
  eventFamily: "metrics";
  fields?: {
    rpi?: number;
    rwi?: number;
    rsi?: number;
    rci?: number;
    ui?: number;
    lui?: number;
    lud?: number;
  };
}

export interface ObjectPoolLogEvent extends BaseLogEvent<"objectPool"> {
  eventFamily: "return_to_destroyed_pool" | "other";
  fields?: {
    assetId?: string;
  };
}

export interface OutputLogEvent extends BaseLogEvent<"output"> {
  eventFamily: string;
  fields?: {
    componentHint?: string;
  };
}

export interface PlayerLogEvent extends BaseLogEvent<"player"> {
  eventFamily: "missing_item" | "missing_address" | "other";
  fields?: {
    itemId?: string;
    parentId?: string;
    containerId?: string;
  };
}

/** Member info extracted from GroupMatchInviteSend notifications */
export interface NotificationMemberInfo {
  odid?: string;
  odid_deprecated?: string;
  odid_2_deprecated?: string;
  aid?: number;
  isLeader?: boolean;
  isReady?: boolean;
  info?: {
    nickname?: string;
    side?: string;
    level?: number;
    memberCategory?: number;
    gameVersion?: string;
    prestigeLevel?: number;
    unlockedLocations?: string[];
  };
}

/** Raid settings extracted from GroupMatchRaidSettings notifications */
export interface NotificationRaidSettings {
  location?: string;
  timeVariant?: string;
  raidMode?: string;
  side?: string;
  metabolismDisabled?: boolean;
  playersSpawnPlace?: string;
}

/** Parsed notification payload from WebSocket messages */
export interface NotificationPayload {
  type: string;
  eventId?: string;
  requestId?: string;
  from?: number;
  members?: NotificationMemberInfo[];
  raidSettings?: NotificationRaidSettings;
  odidLeaved?: string;
  odid?: string;
  message?: Record<string, unknown>;
  profiles?: Record<string, unknown>[];
  /** Raw data for unknown notification types */
  rawData?: Record<string, unknown>;
}

export interface PushNotificationsLogEvent extends BaseLogEvent<"push-notifications"> {
  eventFamily:
    | "connection_params"
    | "batch_result"
    | "received"
    | "notification"
    | "simple_notification"
    | "ping"
    | "dropped"
    | "other";
  fields?: {
    url?: string;
    token?: string;
    count?: number;
    bytesReceived?: number;
    messageType?: string;
    notificationType?: string;
    notificationTime?: number;
    notificationDuration?: number;
    showNotification?: boolean;
    errorCode?: number;
    /** Parsed notification payload from JSON continuation lines */
    payload?: NotificationPayload;
    /** Extracted quest information from ChatMessageReceived notifications */
    questId?: string;
    questStatus?: string;
    questRewardRubles?: number;
    questRewardItems?: string[];
  };
}

export interface SeasonsLogEvent extends BaseLogEvent<"seasons"> {
  eventFamily: "seasons_materials_fixer_missing";
}

export interface SpatialAudioLogEvent extends BaseLogEvent<"spatial-audio"> {
  eventFamily:
    | "init_success"
    | "system_initialized"
    | "target_quality"
    | "dsp_stats"
    | "reverb_checker"
    | "reverb_reset"
    | "occlusion_error"
    | "other";
  fields?: {
    quality?: string;
    dspBufferLength?: number;
    dspBuffersNum?: number;
    attempt?: number;
    reverbEnabled?: boolean;
    reverbCooldown?: number;
  };
}

export interface AiDataLogEvent extends BaseLogEvent<"aiData"> {
  eventFamily: "wrong_wave_count" | "door_without_link" | "other";
  fields?: {
    doorName?: string;
  };
}

export interface AiErrorsLogEvent extends BaseLogEvent<"aiErrors"> {
  eventFamily: "wrong_wave_count" | "door_without_link" | "other";
  fields?: {
    source?: string;
    doorName?: string;
  };
}

export type AnyLogEvent =
  | ApplicationLogEvent
  | BackendLogEvent
  | BackendCacheLogEvent
  | BackendQueueLogEvent
  | ErrorsLogEvent
  | FilesCheckerLogEvent
  | InsuranceLogEvent
  | InventoryLogEvent
  | NetworkConnectionLogEvent
  | NetworkMessagesLogEvent
  | ObjectPoolLogEvent
  | OutputLogEvent
  | PlayerLogEvent
  | PushNotificationsLogEvent
  | SeasonsLogEvent
  | SpatialAudioLogEvent
  | AiDataLogEvent
  | AiErrorsLogEvent;

export interface ParsedLogResult<TEvents extends AnyLogEvent = AnyLogEvent> {
  filePath?: string;
  logType: LogType;
  events: TEvents[];
  meta: {
    earliestTimestamp?: string;
    latestTimestamp?: string;
    buildVersion?: string;
    sessionPrefix?: string;
  };
}

export interface LogParser {
  canParse(fileName: string, sampleContent?: string): boolean;
  parse(content: string, filePath?: string): ParsedLogResult;
}

export interface GameDataCacheOptions {
  ttlMs?: number;
  storagePath?: string;
}

export interface GameDataCacheRecord<T> {
  expiresAt?: number;
  value: T;
}

export interface GameDataProvider {
  getItemById(id: string): Promise<ItemData | null>;
  getQuestById(id: string): Promise<QuestData | null>;
  getTraderById(id: string): Promise<TraderData | null>;
  getLocationById?(id: string): Promise<LocationData | null>;
}

export interface ItemData {
  id: string;
  name: string;
  shortName?: string;
  basePrice?: number;
  traderPrices?: Record<string, number>;
  categoryNames?: string[];
}

export interface QuestData {
  id: string;
  name: string;
  traderId?: string;
  experience?: number;
}

export interface TraderData {
  id: string;
  name: string;
  nickname?: string;
}

export interface LocationData {
  id: string;
  name: string;
  type?: string;
}

export interface EnrichmentContext {
  provider: GameDataProvider;
}
