import type { Entity } from "../../define";
import type { TelegramClient } from "../..";
import { getInputPeer, getPeer } from "../../Utils";
import { Api } from "../api";
import { betterConsoleLog } from "../../Helpers";
import { inspect } from "../../inspect";

export class Draft {
    private _client: TelegramClient;
    private readonly _entity?: Entity;
    private readonly _peer: ReturnType<typeof getPeer>;
    private _inputEntity: Api.TypeInputPeer | undefined;
    private _text?: string;
    private _rawText?: string;
    private date?: Api.int;
    private linkPreview?: boolean;
    private replyToMsgId?: Api.int;

    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    constructor(
        client: TelegramClient,
        entity: Entity,
        draft: Api.TypeDraftMessage | undefined
    ) {
        this._client = client;
        this._peer = getPeer(entity);
        this._entity = entity;
        this._inputEntity = entity ? getInputPeer(entity) : undefined;
        if (!draft || !(draft instanceof Api.DraftMessage)) {
            draft = new Api.DraftMessage({
                message: "",
                date: -1,
            });
        }
        if (!(draft instanceof Api.DraftMessageEmpty)) {
            this.linkPreview = !draft.noWebpage;
            this._text = client.parseMode
                ? client.parseMode.unparse(draft.message, draft.entities || [])
                : draft.message;
            this._rawText = draft.message;
            this.date = draft.date;
            const replyTo = draft.replyTo;
            if (replyTo != undefined) {
                if ("replyToMsgId" in replyTo) {
                    this.replyToMsgId = replyTo.replyToMsgId;
                }
            }
        }
    }

    get entity() {
        return this._entity;
    }

    get inputEntity() {
        if (!this._inputEntity) {
            this._inputEntity = this._client._entityCache.get(this._peer);
        }
        return this._inputEntity;
    }

    // TODO later
}
