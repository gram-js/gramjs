"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dialog = void 0;
const api_1 = require("../api");
const Utils_1 = require("../../Utils");
const draft_1 = require("./draft");
const Helpers_1 = require("../../Helpers");
const inspect_1 = require("../../inspect");
class Dialog {
    constructor(client, dialog, entities, message) {
        this._client = client;
        this.dialog = dialog;
        this.pinned = !!dialog.pinned;
        this.folderId = dialog.folderId;
        this.archived = dialog.folderId != undefined;
        this.message = message;
        this.date = this.message.date;
        this.entity = entities.get((0, Utils_1.getPeerId)(dialog.peer));
        this.inputEntity = (0, Utils_1.getInputPeer)(this.entity);
        if (this.entity) {
            this.id = (0, Helpers_1.returnBigInt)((0, Utils_1.getPeerId)(this.entity)); // ^ May be InputPeerSelf();
            this.name = this.title = (0, Utils_1.getDisplayName)(this.entity);
        }
        this.unreadCount = dialog.unreadCount;
        this.unreadMentionsCount = dialog.unreadMentionsCount;
        if (!this.entity) {
            throw new Error("Entity not found for dialog");
        }
        this.draft = new draft_1.Draft(client, this.entity, this.dialog.draft);
        this.isUser = this.entity instanceof api_1.Api.User;
        this.isGroup = !!(this.entity instanceof api_1.Api.Chat ||
            this.entity instanceof api_1.Api.ChatForbidden ||
            (this.entity instanceof api_1.Api.Channel && this.entity.megagroup));
        this.isChannel = this.entity instanceof api_1.Api.Channel;
    }
    [inspect_1.inspect.custom]() {
        return (0, Helpers_1.betterConsoleLog)(this);
    }
}
exports.Dialog = Dialog;
