/// <reference types="node" />
import { EntityLike } from "../define";
import { EventBuilder, EventCommonSender } from "./common";
import { Api } from "../tl";
import { TelegramClient } from "..";
import { EditMessageParams, SendMessageParams } from "../client/messages";
export interface NewCallbackQueryInterface {
    chats: EntityLike[];
    func?: {
        (event: CallbackQuery): boolean;
    };
    fromUsers: EntityLike[];
    blacklistUsers: EntityLike[];
    pattern?: RegExp;
}
export declare const NewCallbackQueryDefaults: NewCallbackQueryInterface;
/**
 * Occurs whenever you sign in as a bot and a user
 * clicks one of the inline buttons on your messages.
 * Note that the `chats` parameter will **not** work with normal
 * IDs or peers if the clicked inline button comes from a "via bot"
 * message. The `chats` parameter also supports checking against the
 * `chat_instance` which should be used for inline callbacks.
 *
 * @example
 * ```ts
 * async function printQuery(event: NewCallbackQueryEvent) {
 *     // TODO
 * }
 * ```
 */
export declare class CallbackQuery extends EventBuilder {
    match?: RegExp;
    private _noCheck;
    constructor(inlineQueryParams?: Partial<NewCallbackQueryInterface>);
    build(update: Api.TypeUpdate | Api.TypeUpdates, callback: undefined, selfId?: undefined): CallbackQueryEvent | undefined;
    filter(event: CallbackQueryEvent): any;
}
export interface AnswerCallbackQueryParams {
    message: string;
    cacheTime: number;
    url: string;
    alert: boolean;
}
export declare class CallbackQueryEvent extends EventCommonSender {
    /**
     * The original {@link Api.UpdateBotCallbackQuery} or {@link Api.UpdateInlineBotCallbackQuery} object.
     */
    query: Api.UpdateBotCallbackQuery | Api.UpdateInlineBotCallbackQuery;
    /**
     * The regex match object returned from successfully matching the
     * query `data` with the provided pattern in your event handler.
     */
    patternMatch: RegExpMatchArray | undefined;
    private _message;
    private _answered;
    constructor(query: Api.UpdateBotCallbackQuery | Api.UpdateInlineBotCallbackQuery, peer: Api.TypePeer, msgId: number);
    _setClient(client: TelegramClient): void;
    get id(): import("big-integer").BigInteger;
    get messageId(): number;
    get data(): Buffer | undefined;
    get chatInstance(): import("big-integer").BigInteger;
    getMessage(): Promise<Api.Message>;
    _refetchSender(): Promise<void>;
    answer({ message, cacheTime, url, alert, }?: Partial<AnswerCallbackQueryParams>): Promise<boolean | undefined>;
    get viaInline(): boolean;
    respond(params?: SendMessageParams): Promise<void>;
    reply(params?: SendMessageParams): Promise<void>;
    edit(params: EditMessageParams): Promise<Api.Message>;
    delete({ revoke }?: {
        revoke: boolean;
    }): Promise<Api.messages.AffectedMessages[] | undefined>;
    get sender(): import("../define").Entity | undefined;
}
