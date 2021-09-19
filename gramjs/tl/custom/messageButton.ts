import type { TelegramClient } from "../../client/TelegramClient";
import type { ButtonLike, EntityLike, MessageIDLike } from "../../define";
import { Api } from "../api";
import { Button } from "./button";
import { inspect } from "util";
import { betterConsoleLog } from "../../Helpers";

export class MessageButton {
    private readonly _client: TelegramClient;
    private readonly _chat: EntityLike;
    public readonly button: ButtonLike;
    private readonly _bot: EntityLike;
    private readonly _msgId: MessageIDLike;
    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    constructor(
        client: TelegramClient,
        original: ButtonLike,
        chat: EntityLike,
        bot: EntityLike,
        msgId: MessageIDLike
    ) {
        this.button = original;
        this._bot = bot;
        this._chat = chat;
        this._msgId = msgId;
        this._client = client;
    }

    get client() {
        return this._client;
    }

    get text() {
        return !(this.button instanceof Button) ? this.button.text : "";
    }

    get data() {
        if (this.button instanceof Api.KeyboardButtonCallback) {
            return this.button.data;
        }
    }

    get inlineQuery() {
        if (this.button instanceof Api.KeyboardButtonSwitchInline) {
            return this.button.query;
        }
    }

    get url() {
        if (this.button instanceof Api.KeyboardButtonUrl) {
            return this.button.url;
        }
    }

    async click({ sharePhone = false, shareGeo = [0, 0] }) {
        if (this.button instanceof Api.KeyboardButton) {
            return this._client.sendMessage(this._chat, {
                message: this.button.text,
                parseMode: undefined,
            });
        } else if (this.button instanceof Api.KeyboardButtonCallback) {
            const request = new Api.messages.GetBotCallbackAnswer({
                peer: this._chat,
                msgId: this._msgId,
                data: this.button.data,
            });
            try {
                return await this._client.invoke(request);
            } catch (e:any) {
                if (e.errorMessage == "BOT_RESPONSE_TIMEOUT") {
                    return null;
                }
                throw e;
            }
        } else if (this.button instanceof Api.KeyboardButtonSwitchInline) {
            return this._client.invoke(
                new Api.messages.StartBot({
                    bot: this._bot,
                    peer: this._chat,
                    startParam: this.button.query,
                })
            );
        } else if (this.button instanceof Api.KeyboardButtonUrl) {
            return this.button.url;
        } else if (this.button instanceof Api.KeyboardButtonGame) {
            const request = new Api.messages.GetBotCallbackAnswer({
                peer: this._chat,
                msgId: this._msgId,
                game: true,
            });
            try {
                return await this._client.invoke(request);
            } catch (e:any) {
                if (e.errorMessage == "BOT_RESPONSE_TIMEOUT") {
                    return null;
                }
                throw e;
            }
        } else if (this.button instanceof Api.KeyboardButtonRequestPhone) {
            if (!sharePhone) {
                throw new Error(
                    "cannot click on phone buttons unless sharePhone=true"
                );
            }

            const me = (await this._client.getMe()) as Api.User;
            const phoneMedia = new Api.InputMediaContact({
                phoneNumber: me.phone || "",
                firstName: me.firstName || "",
                lastName: me.lastName || "",
                vcard: "",
            });
            throw new Error("Not supported for now");
            // TODO
            //return this._client.sendFile(this._chat, phoneMedia);
        } else if (this.button instanceof Api.InputWebFileGeoPointLocation) {
            if (!shareGeo) {
                throw new Error(
                    "cannot click on geo buttons unless shareGeo=[longitude, latitude]"
                );
            }
            let geoMedia = new Api.InputMediaGeoPoint({
                geoPoint: new Api.InputGeoPoint({
                    lat: shareGeo[0],
                    long: shareGeo[1],
                }),
            });
            throw new Error("Not supported for now");
            // TODO

            //return this._client.sendFile(this._chat, geoMedia);
        }
    }
}
