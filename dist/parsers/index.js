import { AiDataLogsParser } from "./aiDataLogsParser.js";
import { AiErrorsLogsParser } from "./aiErrorsLogsParser.js";
import { ApplicationLogsParser } from "./applicationLogsParser.js";
import { BackendCacheLogsParser } from "./backendCacheLogsParser.js";
import { BackendLogsParser } from "./backendLogsParser.js";
import { BackendQueueLogsParser } from "./backendQueueLogsParser.js";
import { ErrorsLogsParser } from "./errorsLogsParser.js";
import { FilesCheckerLogsParser } from "./filesCheckerLogsParser.js";
import { InsuranceLogsParser } from "./insuranceLogsParser.js";
import { InventoryLogsParser } from "./inventoryLogsParser.js";
import { NetworkConnectionLogsParser } from "./networkConnectionLogsParser.js";
import { NetworkMessagesLogsParser } from "./networkMessagesLogsParser.js";
import { ObjectPoolLogsParser } from "./objectPoolLogsParser.js";
import { OutputLogsParser } from "./outputLogsParser.js";
import { PlayerLogsParser } from "./playerLogsParser.js";
import { PushNotificationsLogsParser } from "./pushNotificationsLogsParser.js";
import { SeasonsLogsParser } from "./seasonsLogsParser.js";
import { SpatialAudioLogsParser } from "./spatialAudioLogsParser.js";
export function defaultParsers() {
    return [
        new ApplicationLogsParser(),
        new BackendLogsParser(),
        new BackendCacheLogsParser(),
        new BackendQueueLogsParser(),
        new ErrorsLogsParser(),
        new FilesCheckerLogsParser(),
        new InsuranceLogsParser(),
        new InventoryLogsParser(),
        new NetworkConnectionLogsParser(),
        new NetworkMessagesLogsParser(),
        new ObjectPoolLogsParser(),
        new OutputLogsParser(),
        new PlayerLogsParser(),
        new PushNotificationsLogsParser(),
        new SeasonsLogsParser(),
        new SpatialAudioLogsParser(),
        new AiDataLogsParser(),
        new AiErrorsLogsParser(),
    ];
}
export { AiDataLogsParser, AiErrorsLogsParser, ApplicationLogsParser, BackendCacheLogsParser, BackendLogsParser, BackendQueueLogsParser, ErrorsLogsParser, FilesCheckerLogsParser, InsuranceLogsParser, InventoryLogsParser, NetworkConnectionLogsParser, NetworkMessagesLogsParser, ObjectPoolLogsParser, OutputLogsParser, PlayerLogsParser, PushNotificationsLogsParser, SeasonsLogsParser, SpatialAudioLogsParser, };
