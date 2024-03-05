/// <reference types="node" />
import type { TelegramClient } from "./TelegramClient";
import type { EntityLike } from "../define";
import { TotalList } from "../Helpers";
import { RequestIter } from "../requestIter";
import { Api } from "../tl";
import { inspect } from "../inspect";
interface ParticipantsIterInterface {
    entity: EntityLike;
    filter: any;
    offset?: number;
    search?: string;
    showTotal?: boolean;
}
export declare class _ParticipantsIter extends RequestIter {
    private filterEntity;
    private requests?;
    [inspect.custom](): {
        [key: string]: any;
    };
    _init({ entity, filter, offset, search, showTotal, }: ParticipantsIterInterface): Promise<boolean | void>;
    _loadNextChunk(): Promise<boolean | undefined>;
    [Symbol.asyncIterator](): AsyncIterator<Api.User, any, undefined>;
}
/**
 * Used in iterParticipant and getParticipant. all params are optional.
 */
export interface IterParticipantsParams {
    /** how many members to retrieve. defaults to Number.MAX_SAFE_INTEGER (everyone) */
    limit?: number;
    /** how many members to skip. defaults to 0 */
    offset?: number;
    /** a query string to filter participants based on their display names and usernames. defaults to "" (everyone) */
    search?: string;
    /** optional filter to be used. E.g only admins filter or only banned members filter. PS : some filters need more permissions. */
    filter?: Api.TypeChannelParticipantsFilter;
    /** whether to call an extra request (GetFullChannel) to show the total of users in the group/channel. if set to false total will be 0 */
    showTotal?: boolean;
}
/** @hidden */
export declare function iterParticipants(client: TelegramClient, entity: EntityLike, { limit, offset, search, filter, showTotal }: IterParticipantsParams): _ParticipantsIter;
/** @hidden */
export declare function getParticipants(client: TelegramClient, entity: EntityLike, params: IterParticipantsParams): Promise<TotalList<Api.User>>;
export {};
