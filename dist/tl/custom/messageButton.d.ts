/// <reference types="node" />
import type { TelegramClient } from "../../client/TelegramClient";
import type { ButtonLike, EntityLike, MessageIDLike } from "../../define";
import { Api } from "../api";
import { inspect } from "../../inspect";
export declare class MessageButton {
    private readonly _client;
    private readonly _chat;
    readonly button: ButtonLike;
    private readonly _bot?;
    private readonly _msgId;
    [inspect.custom](): {
        [key: string]: any;
    };
    constructor(client: TelegramClient, original: ButtonLike, chat: EntityLike, bot: EntityLike | undefined, msgId: MessageIDLike);
    get client(): TelegramClient;
    get text(): string;
    get data(): Buffer | undefined;
    get inlineQuery(): string | undefined;
    get url(): string | undefined;
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
    click({ sharePhone, shareGeo, password, }: {
        sharePhone?: boolean | string | Api.InputMediaContact;
        shareGeo?: [number, number] | Api.InputMediaGeoPoint;
        password?: string;
    }): Promise<string | Api.Message | Api.messages.BotCallbackAnswer | Api.TypeUpdates | null | undefined>;
}
