import type { TelegramClient } from "../..";
import { Api } from "../api";
import type { Entity } from "../../define";
import { getDisplayName, getInputPeer, getPeerId } from "../../Utils";
import { Draft } from "./draft";
import { inspect } from "util";
import { betterConsoleLog, returnBigInt } from "../../Helpers";
import bigInt from "big-integer";

export class Dialog {
    _client: TelegramClient;
    dialog: Api.Dialog;
    pinned: boolean;
    folderId?: number;
    archived: boolean;
    message?: Api.Message;
    date: number;
    entity?: Entity;
    inputEntity: Api.TypeInputPeer;
    id?: bigInt.BigInteger;
    name?: string;
    title?: string;
    unreadCount: number;
    unreadMentionsCount: number;
    draft: Draft;
    isUser: boolean;
    isGroup: boolean;
    isChannel: boolean;
    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    constructor(
        client: TelegramClient,
        dialog: Api.Dialog,
        entities: Map<string, Entity>,
        message?: Api.Message
    ) {
        this._client = client;
        this.dialog = dialog;
        this.pinned = !!dialog.pinned;
        this.folderId = dialog.folderId;
        this.archived = dialog.folderId != undefined;
        this.message = message;
        this.date = this.message!.date!;

        this.entity = entities.get(getPeerId(dialog.peer));
        this.inputEntity = getInputPeer(this.entity);
        if (this.entity) {
            this.id = returnBigInt(getPeerId(this.entity)); // ^ May be InputPeerSelf();
            this.name = this.title = getDisplayName(this.entity);
        }

        this.unreadCount = dialog.unreadCount;
        this.unreadMentionsCount = dialog.unreadMentionsCount;
        if (!this.entity) {
            throw new Error("Entity not found for dialog");
        }
        this.draft = new Draft(client, this.entity, this.dialog.draft);

        this.isUser = this.entity instanceof Api.User;
        this.isGroup = !!(
            (this.entity instanceof Api.Chat &&
                this.entity instanceof Api.ChatForbidden) ||
            (this.entity instanceof Api.Channel && this.entity.megagroup)
        );
        this.isChannel = this.entity instanceof Api.Channel;
    }

    // TODO implement rest
}
