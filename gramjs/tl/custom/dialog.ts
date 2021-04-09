import type {TelegramClient} from "../../client/TelegramClient";
import {Api} from "../api";
import type {Entity} from "../../define";
import {getDisplayName, getInputPeer, getPeerId} from "../../Utils";
import {Draft} from "./draft";

export class Dialog {
    private _client: TelegramClient;
    private dialog: Api.Dialog;
    private pinned: boolean;
    private folderId: Api.int | undefined;
    private archived: boolean;
    private message: Api.Message;
    private date: Api.int;
    private entity: Entity | undefined;
    private inputEntity: Api.TypeInputPeer;
    private id?: number;
    private name?: string;
    private title?: string;
    private unreadCount: Api.int;
    private unreadMentionsCount: Api.int;
    private draft: Draft;
    private isUser: boolean;
    private isGroup: boolean;
    private isChannel: boolean;

    constructor(client: TelegramClient, dialog: Api.Dialog, entities: Map<number, Entity>, message: Api.Message) {
        this._client = client;
        this.dialog = dialog;
        this.pinned = !!(dialog.pinned);
        this.folderId = dialog.folderId;
        this.archived = dialog.folderId != undefined;
        this.message = message;
        this.date = this.message.date;

        this.entity = entities.get(getPeerId(dialog.peer));
        this.inputEntity = getInputPeer(this.entity);
        if (this.entity) {
            this.id = getPeerId(this.entity);  // ^ May be InputPeerSelf();
            this.name = this.title = getDisplayName(this.entity);

        }

        this.unreadCount = dialog.unreadCount;
        this.unreadMentionsCount = dialog.unreadMentionsCount;
        if (!this.entity){
            throw new Error("Entity not found for dialog");
        }
        this.draft = new Draft(client, this.entity, this.dialog.draft);

        this.isUser = this.entity instanceof Api.User;
        this.isGroup = !!((this.entity instanceof Api.Chat && this.entity instanceof Api.ChatForbidden) || (this.entity instanceof Api.Channel && this.entity.megagroup));
        this.isChannel = this.entity instanceof Api.Channel;
    }
    // TODO implement rest
}
