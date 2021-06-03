import type {Entity} from "../../define";
import type {TelegramClient} from "../../client/TelegramClient";
import {getInputPeer, getPeer} from "../../Utils";
import {Api} from "../api";
import {MarkdownParser} from "../../extensions/markdown";


export class Draft {
    private _client: TelegramClient;
    private _entity?: Entity;
    private _peer: ReturnType<typeof getPeer>;
    private _inputEntity: Api.TypeInputPeer | undefined;
    private _text?: string;
    private _rawText?: string;
    private date?: Api.int;
    private linkPreview?: boolean;
    private replyToMsgId?: Api.int;

    constructor(client: TelegramClient, entity: Entity, draft: Api.TypeDraftMessage | undefined) {
        this._client = client;
        this._peer = getPeer(entity);
        this._entity = entity;
        this._inputEntity = entity ? getInputPeer(entity) : undefined;
        if (!draft || !(draft instanceof Api.DraftMessage)) {
            draft = new Api.DraftMessage({
                message: '',
                date: -1,
            });
        }
        if (!(draft instanceof Api.DraftMessageEmpty)) {
            this.linkPreview = !draft.noWebpage;
            this._text = client.parseMode.unparse(draft.message,draft.entities);
            this._rawText = draft.message;
            this.date = draft.date;
            this.replyToMsgId = draft.replyToMsgId;
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
