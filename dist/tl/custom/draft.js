"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Draft = void 0;
const Utils_1 = require("../../Utils");
const api_1 = require("../api");
const Helpers_1 = require("../../Helpers");
const inspect_1 = require("../../inspect");
class Draft {
    constructor(client, entity, draft) {
        this._client = client;
        this._peer = (0, Utils_1.getPeer)(entity);
        this._entity = entity;
        this._inputEntity = entity ? (0, Utils_1.getInputPeer)(entity) : undefined;
        if (!draft || !(draft instanceof api_1.Api.DraftMessage)) {
            draft = new api_1.Api.DraftMessage({
                message: "",
                date: -1,
            });
        }
        if (!(draft instanceof api_1.Api.DraftMessageEmpty)) {
            this.linkPreview = !draft.noWebpage;
            this._text = client.parseMode
                ? client.parseMode.unparse(draft.message, draft.entities || [])
                : draft.message;
            this._rawText = draft.message;
            this.date = draft.date;
            this.replyToMsgId = draft.replyToMsgId;
        }
    }
    [inspect_1.inspect.custom]() {
        return (0, Helpers_1.betterConsoleLog)(this);
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
}
exports.Draft = Draft;
