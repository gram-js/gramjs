/// <reference types="node" />
import type { TelegramClient } from "../..";
import type { EntityLike, MessageIDLike } from "../../define";
import { Api } from "../api";
import { inspect } from "../../inspect";
export declare class InlineResult {
    private _ARTICLE;
    private _PHOTO;
    private _GIF;
    private _VIDEO;
    private _VIDEO_GIF;
    private _AUDIO;
    private _DOCUMENT;
    private _LOCATION;
    private _VENUE;
    private _CONTACT;
    private _GAME;
    private readonly _entity;
    private readonly _queryId;
    private readonly result;
    private _client;
    [inspect.custom](): {
        [key: string]: any;
    };
    constructor(client: TelegramClient, original: Api.TypeBotInlineResult, queryId?: Api.long, entity?: EntityLike);
    get type(): string;
    get message(): Api.TypeBotInlineMessage;
    get description(): string | undefined;
    get url(): string | undefined;
    get photo(): Api.TypePhoto | Api.TypeWebDocument | undefined;
    get document(): Api.TypeDocument | Api.TypeWebDocument | undefined;
    click(entity?: EntityLike, replyTo?: MessageIDLike, silent?: boolean, clearDraft?: boolean, hideVia?: boolean): Promise<Api.TypeUpdates>;
}
