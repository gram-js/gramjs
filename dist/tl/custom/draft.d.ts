/// <reference types="node" />
import type { Entity } from "../../define";
import type { TelegramClient } from "../..";
import { Api } from "../api";
import { inspect } from "../../inspect";
export declare class Draft {
    private _client;
    private readonly _entity?;
    private readonly _peer;
    private _inputEntity;
    private _text?;
    private _rawText?;
    private date?;
    private linkPreview?;
    private replyToMsgId?;
    [inspect.custom](): {
        [key: string]: any;
    };
    constructor(client: TelegramClient, entity: Entity, draft: Api.TypeDraftMessage | undefined);
    get entity(): Entity | undefined;
    get inputEntity(): Api.TypeInputPeer | undefined;
}
