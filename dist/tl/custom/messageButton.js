"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageButton = void 0;
const api_1 = require("../api");
const button_1 = require("./button");
const Helpers_1 = require("../../Helpers");
const Password_1 = require("../../Password");
const inspect_1 = require("../../inspect");
class MessageButton {
    constructor(client, original, chat, bot, msgId) {
        this.button = original;
        this._bot = bot;
        this._chat = chat;
        this._msgId = msgId;
        this._client = client;
    }
    [inspect_1.inspect.custom]() {
        return (0, Helpers_1.betterConsoleLog)(this);
    }
    get client() {
        return this._client;
    }
    get text() {
        return !(this.button instanceof button_1.Button) ? this.button.text : "";
    }
    get data() {
        if (this.button instanceof api_1.Api.KeyboardButtonCallback) {
            return this.button.data;
        }
    }
    get inlineQuery() {
        if (this.button instanceof api_1.Api.KeyboardButtonSwitchInline) {
            return this.button.query;
        }
    }
    get url() {
        if (this.button instanceof api_1.Api.KeyboardButtonUrl) {
            return this.button.url;
        }
    }
    /**
     * Emulates the behaviour of clicking this button.

     If it's a normal `KeyboardButton` with text, a message will be
     sent, and the sent `Message <Message>` returned.

     If it's an inline `KeyboardButtonCallback` with text and data,
     it will be "clicked" and the `BotCallbackAnswer` returned.

     If it's an inline `KeyboardButtonSwitchInline` button, the
     `StartBot` will be invoked and the resulting updates
     returned.

     If it's a `KeyboardButtonUrl`, the URL of the button will
     be returned.

     If it's a `KeyboardButtonRequestPhone`, you must indicate that you
     want to ``sharePhone=True`` in order to share it. Sharing it is not a
     default because it is a privacy concern and could happen accidentally.

     You may also use ``sharePhone=phone`` to share a specific number, in
     which case either `str` or `InputMediaContact` should be used.

     If it's a `KeyboardButtonRequestGeoLocation`, you must pass a
     tuple in ``shareGeo=[longitude, latitude]``. Note that Telegram seems
     to have some heuristics to determine impossible locations, so changing
     this value a lot quickly may not work as expected. You may also pass a
     `InputGeoPoint` if you find the order confusing.
     */
    async click({ sharePhone = false, shareGeo = [0, 0], password, }) {
        if (this.button instanceof api_1.Api.KeyboardButton) {
            return this._client.sendMessage(this._chat, {
                message: this.button.text,
                parseMode: undefined,
            });
        }
        else if (this.button instanceof api_1.Api.KeyboardButtonCallback) {
            let encryptedPassword;
            if (password != undefined) {
                const pwd = await this.client.invoke(new api_1.Api.account.GetPassword());
                encryptedPassword = await (0, Password_1.computeCheck)(pwd, password);
            }
            const request = new api_1.Api.messages.GetBotCallbackAnswer({
                peer: this._chat,
                msgId: this._msgId,
                data: this.button.data,
                password: encryptedPassword,
            });
            try {
                return await this._client.invoke(request);
            }
            catch (e) {
                if (e.errorMessage == "BOT_RESPONSE_TIMEOUT") {
                    return null;
                }
                throw e;
            }
        }
        else if (this.button instanceof api_1.Api.KeyboardButtonSwitchInline) {
            return this._client.invoke(new api_1.Api.messages.StartBot({
                bot: this._bot,
                peer: this._chat,
                startParam: this.button.query,
            }));
        }
        else if (this.button instanceof api_1.Api.KeyboardButtonUrl) {
            return this.button.url;
        }
        else if (this.button instanceof api_1.Api.KeyboardButtonGame) {
            const request = new api_1.Api.messages.GetBotCallbackAnswer({
                peer: this._chat,
                msgId: this._msgId,
                game: true,
            });
            try {
                return await this._client.invoke(request);
            }
            catch (e) {
                if (e.errorMessage == "BOT_RESPONSE_TIMEOUT") {
                    return null;
                }
                throw e;
            }
        }
        else if (this.button instanceof api_1.Api.KeyboardButtonRequestPhone) {
            if (!sharePhone) {
                throw new Error("cannot click on phone buttons unless sharePhone=true");
            }
            if (sharePhone == true || typeof sharePhone == "string") {
                const me = (await this._client.getMe());
                sharePhone = new api_1.Api.InputMediaContact({
                    phoneNumber: (sharePhone == true ? me.phone : sharePhone) || "",
                    firstName: me.firstName || "",
                    lastName: me.lastName || "",
                    vcard: "",
                });
            }
            throw new Error("Not supported for now");
            // TODO
            //return this._client.sendFile(this._chat, phoneMedia);
        }
        else if (this.button instanceof api_1.Api.InputWebFileGeoPointLocation) {
            if (!shareGeo) {
                throw new Error("cannot click on geo buttons unless shareGeo=[longitude, latitude]");
            }
            throw new Error("Not supported for now");
            // TODO
            //return this._client.sendFile(this._chat, geoMedia);
        }
    }
}
exports.MessageButton = MessageButton;
