import type { TelegramClient } from "../..";
import type { EntityLike, MessageIDLike } from "../../define";
import { Api } from "../api";
import { utils } from "../../";
import { betterConsoleLog } from "../../Helpers";
import { inspect } from "../../inspect";
import { getMessageId } from "../../Utils";

export class InlineResult {
    private _ARTICLE = "article";
    private _PHOTO = "photo";
    private _GIF = "gif";
    private _VIDEO = "video";
    private _VIDEO_GIF = "mpeg4_gif";
    private _AUDIO = "audio";
    private _DOCUMENT = "document";
    private _LOCATION = "location";
    private _VENUE = "venue";
    private _CONTACT = "contact";
    private _GAME = "game";
    private readonly _entity: EntityLike | undefined;
    private readonly _queryId: Api.long | undefined;
    private readonly result: Api.TypeBotInlineResult;
    private _client: TelegramClient;

    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    constructor(
        client: TelegramClient,
        original: Api.TypeBotInlineResult,
        queryId?: Api.long,
        entity?: EntityLike
    ) {
        this._client = client;
        this.result = original;
        this._queryId = queryId;
        this._entity = entity;
    }

    get type() {
        return this.result.type;
    }

    get message() {
        return this.result.sendMessage;
    }

    get description() {
        return this.result.description;
    }

    get url() {
        if (this.result instanceof Api.BotInlineResult) {
            return this.result.url;
        }
    }

    get photo() {
        if (this.result instanceof Api.BotInlineResult) {
            return this.result.thumb;
        } else {
            return this.result.photo;
        }
    }

    get document() {
        if (this.result instanceof Api.BotInlineResult) {
            return this.result.content;
        } else {
            return this.result.document;
        }
    }

    async click(
        entity?: EntityLike,
        replyTo?: MessageIDLike,
        silent: boolean = false,
        clearDraft: boolean = false,
        hideVia: boolean = false
    ) {
        if (entity) {
            entity = await this._client.getInputEntity(entity);
        } else if (this._entity) {
            entity = this._entity;
        } else {
            throw new Error(
                "You must provide the entity where the result should be sent to"
            );
        }
        let replyObject = undefined;
        if (replyTo != undefined) {
            replyObject = new Api.InputReplyToMessage({
                replyToMsgId: getMessageId(replyTo)!,
            });
        }

        const request = new Api.messages.SendInlineBotResult({
            peer: entity,
            queryId: this._queryId,
            id: this.result.id,
            silent: silent,
            clearDraft: clearDraft,
            hideVia: hideVia,
            replyTo: replyObject,
        });
        return await this._client.invoke(request);
    }

    /*
    async downloadMedia(file: FileLike,
                        thumb?: number | Api.TypePhotoSize, processCallback?: ProgressCallback): Promise<string | Buffer> {
        if (this.document || this.photo) {
            return this._client.downloadMedia(
                // I don't like this
                this.document || this.photo,
                file,
                thumb,
                processCallback
            )
        }
        throw new Error("Inline result has no document or photo");
    }*/
}
