import { TelegramBaseClient, TelegramClientParams } from "./telegramBaseClient";

import * as authMethods from "./auth";
import * as botMethods from "./bots";
import * as buttonsMethods from "./buttons";
import * as downloadMethods from "./downloads";
import * as parseMethods from "./messageParse";
import * as messageMethods from "./messages";
import * as updateMethods from "./updates";
import * as uploadMethods from "./uploads";
import * as userMethods from "./users";
import * as chatMethods from "./chats";
import * as dialogMethods from "./dialogs";
import * as twoFA from "./2fa";
import type { ButtonLike, Entity, EntityLike, MessageIDLike } from "../define";
import { Api } from "../tl";
import { sanitizeParseMode } from "../Utils";
import type { EventBuilder } from "../events/common";
import { MTProtoSender } from "../network";

import { LAYER } from "../tl/AllTLObjects";
import { betterConsoleLog } from "../Helpers";
import { DownloadMediaInterface, IterDownloadFunction } from "./downloads";
import { NewMessage, NewMessageEvent } from "../events";
import { _handleUpdate, _updateLoop } from "./updates";
import { Session } from "../sessions";
import { Album, AlbumEvent } from "../events/Album";
import { CallbackQuery, CallbackQueryEvent } from "../events/CallbackQuery";
import { EditedMessage, EditedMessageEvent } from "../events/EditedMessage";
import { DeletedMessage, DeletedMessageEvent } from "../events/DeletedMessage";
import { LogLevel } from "../extensions/Logger";
import { inspect } from "../inspect";
import { isNode } from "../platform";

/**
 * The TelegramClient uses several methods in different files to provide all the common functionality in a nice interface.</br>
 * **In short, to create a client you must do:**
 *
 * ```ts
 * import {TelegramClient} from "telegram";
 *
 * const client = new TelegramClient(new StringSession(''),apiId,apiHash,{});
 * ```
 *
 * You don't need to import any methods that are inside the TelegramClient class as they binding in it.
 */
export class TelegramClient extends TelegramBaseClient {
    /**
     * @param session - a session to be used to save the connection and auth key to. This can be a custom session that inherits MemorySession.
     * @param apiId - The API ID you obtained from https://my.telegram.org.
     * @param apiHash - The API hash you obtained from https://my.telegram.org.
     * @param clientParams - see {@link TelegramClientParams}
     */
    constructor(
        session: string | Session,
        apiId: number,
        apiHash: string,
        clientParams: TelegramClientParams
    ) {
        super(session, apiId, apiHash, clientParams);
    }

    // region auth
    /**
     * Used to handle all aspects of connecting to telegram.<br/>
     * This method will connect to the telegram servers and check if the user is already logged in.<br/>
     * in the case of a new connection this will sign in if the phone already exists or sign up otherwise<br/>
     * By using this method you are **agreeing to Telegram's Terms of Service** https://core.telegram.org/api/terms.<br/>
     * this method also calls {@link getMe} to tell telegram that we want to receive updates.<br/>
     * @param authParams - see UserAuthParams and BotAuthParams
     * @return nothing
     * @example
     * ```ts
     * // this example assumes you've installed and imported the input package. npm i input.
     * // This package uses CLI to receive input from the user. you can use your own callback function.
     * import { TelegramClient } from "telegram";
     * import { StringSession } from "telegram/sessions";
     *
     * const client = new TelegramClient(new StringSession(''), apiId, apiHash, {});
     * // logging in as a bot account
     * await client.start(botToken="123456:abcdfgh123456789);
     * // logging in as a user account
     * await client.start({
     *   phoneNumber: async () => await input.text("number ?"),
     *   password: async () => await input.text("password?"),
     *   phoneCode: async () => await input.text("Code ?"),
     *   onError: (err) => console.log(err),
     * });
     * >Number ? +1234567897
     * >Code ? 12345
     * >password ? 111111
     * Logged in as user...
     *
     * You can now use the client instance to call other api requests.
     */
    start(authParams: authMethods.UserAuthParams | authMethods.BotAuthParams) {
        return authMethods.start(this, authParams);
    }

    /**
     * Checks whether the current client is authorized or not. (logged in as a user)
     * @example
     * ```ts
     * await client.connect();
     * if (await client.checkAuthorization()){
     *     console.log("I am logged in!");
     * }else{
     *     console.log("I am connected to telegram servers but not logged in with any account/bot");
     * }
     * ```
     * @return boolean (true of authorized else false)
     */
    checkAuthorization() {
        return authMethods.checkAuthorization(this);
    }

    /**
     * Logs in as a user. Should only be used when not already logged in.<br/>
     * This method will send a code when needed.<br/>
     * This will also sign up if needed.
     * @example
     * ```ts
     * await client.connect();
     * // we should only use this when we are not already authorized.
     * // This function is very similar to `client.start`
     * // The minor difference that start checks if already authorized and supports bots as well.
     * if (!await client.checkAuthorization()){
     *     const phoneNumber = "+123456789";
     *     await client.signIn({
     *         apiId:132456,
     *         apiHash:"132456",
     *     },{
     *     phoneNumber: async () => await input.text("number ?"),
     *     password: async () => await input.text("password?"),
     *     phoneCode: async () => await input.text("Code ?"),
     *     onError: (err) => console.log(err),
     *     })
     *  }
     * ```
     * @param apiCredentials - credentials to be used.
     * @param authParams - user auth params.
     */
    signInUser(
        apiCredentials: authMethods.ApiCredentials,
        authParams: authMethods.UserAuthParams
    ) {
        return authMethods.signInUser(this, apiCredentials, authParams);
    }

    /**
     * logs the user using a QR code to be scanned.<br/>
     * this function generates the QR code that needs to be scanned by mobile.
     * @example
     * '''ts
     * await client.connect();
     * const user = await client.signInUserWithQrCode({ apiId, apiHash },
     * {
     *       onError: async function(p1: Error) {
     *           console.log("error", p1);
     *           // true = stop the authentication processes
     *           return true;
     *       },
     *       qrCode: async (code) => {
     *           console.log("Convert the next string to a QR code and scan it");
     *           console.log(
     *               `tg://login?token=${code.token.toString("base64url")}`
     *           );
     *       },
     *       password: async (hint) => {
     *           // password if needed
     *           return "1111";
     *       }
     *   }
     * );
     * console.log("user is", user);
     *
     * '''
     * @param apiCredentials - credentials to be used.
     * @param authParams - user auth params.
     */
    signInUserWithQrCode(
        apiCredentials: authMethods.ApiCredentials,
        authParams: authMethods.QrCodeAuthParams
    ) {
        return authMethods.signInUserWithQrCode(
            this,
            apiCredentials,
            authParams
        );
    }

    /**
     * Sends a telegram authentication code to the phone number.
     * @example
     * ```ts
     * await client.connect();
     * const {phoneCodeHash,isCodeViaApp} = await client.sendCode({
     *     apiId:1234,
     *     apiHash:"123456789abcfghj",
     * },"+123456798"});
     * ```
     * @param apiCredentials - credentials to be used.
     * @param phoneNumber - the phone number to send the code to
     * @param forceSMS - whether to send it as an SMS or a normal in app message
     * @return the phone code hash and whether it was sent via app
     */
    sendCode(
        apiCredentials: authMethods.ApiCredentials,
        phoneNumber: string,
        forceSMS = false
    ) {
        return authMethods.sendCode(
            this,
            apiCredentials,
            phoneNumber,
            forceSMS
        );
    }

    /**
     * Uses the 2FA password to sign in the account.<br/>
     * This function should be used after the user has signed in with the code they received.
     * @param apiCredentials - credentials to be used.
     * @param authParams - user auth params.
     * @returns the logged in user.
     */
    signInWithPassword(
        apiCredentials: authMethods.ApiCredentials,
        authParams: authMethods.UserPasswordAuthParams
    ) {
        return authMethods.signInWithPassword(this, apiCredentials, authParams);
    }

    /**
     * Used to sign in as a bot.
     * @example
     * ```ts
     * await client.connect();
     * const bot = await client.signInBot({
     *     apiId:1234,
     *     apiHash:"12345",
     * },{
     *     botToken:"123456:abcdfghae4fg654",
     * });
     * // we are now logged in as a bot
     * console.log("Logged in",bot);
     * ```
     * @param apiCredentials - credentials to be used.
     * @param authParams - user auth params.
     * @return instance User of the logged in bot.
     */
    signInBot(
        apiCredentials: authMethods.ApiCredentials,
        authParams: authMethods.BotAuthParams
    ) {
        return authMethods.signInBot(this, apiCredentials, authParams);
    }

    /**
     * Changes the 2FA settings of the logged in user.
     Note that this method may be *incredibly* slow depending on the
     prime numbers that must be used during the process to make sure
     that everything is safe.

     Has no effect if both current and new password are omitted.

     * @param client: The telegram client instance
     * @param isCheckPassword: Must be ``true`` if you want to check the current password
     * @param currentPassword: The current password, to authorize changing to ``new_password``.
     Must be set if changing existing 2FA settings.
     Must **not** be set if 2FA is currently disabled.
     Passing this by itself will remove 2FA (if correct).
     * @param newPassword: The password to set as 2FA.
     If 2FA was already enabled, ``currentPassword`` **must** be set.
     Leaving this blank or `undefined` will remove the password.
     * @param hint: Hint to be displayed by Telegram when it asks for 2FA.
     Must be set when changing or creating a new password.
     Has no effect if ``newPassword`` is not set.
     * @param email: Recovery and verification email. If present, you must also
     set `emailCodeCallback`, else it raises an Error.
     * @param emailCodeCallback: If an email is provided, a callback that returns the code sent
     to it must also be set. This callback may be asynchronous.
     It should return a string with the code. The length of the
     code will be passed to the callback as an input parameter.
     * @param onEmailCodeError: Called when an error happens while sending an email.

     If the callback returns an invalid code, it will raise an rpc error with the message
     ``CODE_INVALID``

     * @returns Promise<void>
     * @throws this method can throw:
     "PASSWORD_HASH_INVALID" if you entered a wrong password (or set it to undefined).
     "EMAIL_INVALID" if the entered email is wrong
     "EMAIL_HASH_EXPIRED" if the user took too long to verify their email
     */
    async updateTwoFaSettings({
        isCheckPassword,
        currentPassword,
        newPassword,
        hint = "",
        email,
        emailCodeCallback,
        onEmailCodeError,
    }: twoFA.TwoFaParams) {
        return twoFA.updateTwoFaSettings(this, {
            isCheckPassword,
            currentPassword,
            newPassword,
            hint,
            email,
            emailCodeCallback,
            onEmailCodeError,
        });
    }

    //endregion auth

    //region bot
    /**
     * Makes an inline query to the specified  bot and gets the result list.<br/>
     * This is equivalent to writing `@pic something` in clients
     * @param bot - the bot entity to which the inline query should be made
     * @param query - the query string that should be made for that bot (up to 512 characters). can be empty
     * @param entity - The entity where the inline query is being made from.<br/>
     * Certain bots use this to display different results depending on where it's used, such as private chats, groups or channels.<br/>
     * If specified, it will also be the default entity where the message will be sent after clicked.<br/>
     * Otherwise, the “empty peer” will be used, which some bots may not handle correctly.
     * @param offset - String offset of the results to be returned. can be empty
     * @param geoPoint - The geo point location information to send to the bot for localised results. Available under some bots.
     * @return a list of InlineResults
     * @example
     * ```ts
     * // Makes the query to @pic
     * const results = await client.inlineQuery("pic", "something");
     * // clicks on the first result
     * await results[0].click();
     * ```
     */
    inlineQuery(
        bot: EntityLike,
        query: string,
        entity?: Api.InputPeerSelf,
        offset?: string,
        geoPoint?: Api.TypeInputGeoPoint
    ) {
        return botMethods.inlineQuery(
            this,
            bot,
            query,
            entity,
            offset,
            geoPoint
        );
    }

    //endregion

    //region buttons
    /**
     * Builds a ReplyInlineMarkup or ReplyKeyboardMarkup for the given buttons.<br/><br/>
     * Does nothing if either no buttons are provided or the provided argument is already a reply markup.<br/><br/>
     * this function is called internally when passing an array of buttons.

     * @param buttons - The button, array of buttons, array of array of buttons or markup to convert into a markup.
     * @param inlineOnly - Whether the buttons **must** be inline buttons only or not.
     * @example
     * ```ts
     * import {Button} from "telegram/tl/custom/button";
     *  // PS this function is not async
     * const markup = client.buildReplyMarkup(Button.inline("Hello!"));
     *
     * await client.sendMessage(chat, {
     *     message: "click me!",
     *     buttons: markup,
     * }
     *
     * // The following example can also be used in a simpler way like so
     *
     * await client.sendMessage(chat, {
     *     message: "click me!",
     *     buttons: [Button.inline("Hello!")],
     * }
     * ```
     */
    buildReplyMarkup(
        buttons:
            | Api.TypeReplyMarkup
            | undefined
            | ButtonLike
            | ButtonLike[]
            | ButtonLike[][],
        inlineOnly: boolean = false
    ) {
        return buttonsMethods.buildReplyMarkup(buttons, inlineOnly);
    }

    //endregion

    //region download

    /**
     * Low-level method to download files from their input location.
     * downloadMedia should generally be used over this.
     * @param inputLocation - The file location from which the file will be downloaded. See getInputLocation source for a complete list of supported types.
     * @param fileParams - {@link DownloadFileParams}
     * @return a Buffer downloaded from the inputFile.
     * @example
     * ```ts
     * const photo = message.photo;
     * const buffer = await client.downloadFile(
     *       new Api.InputPhotoFileLocation({
     *          id: photo.id,
     *          accessHash: photo.accessHash,
     *          fileReference: photo.fileReference,
     *          thumbSize: size.type
     *      }),
     *      {
     *          dcId: photo.dcId,
     *          fileSize: "m",
     *      }
     * );
     * ```
     */
    downloadFile(
        inputLocation: Api.TypeInputFileLocation,
        fileParams: downloadMethods.DownloadFileParamsV2 = {}
    ) {
        return downloadMethods.downloadFileV2(this, inputLocation, fileParams);
    }

    /**
     * Iterates over a file download, yielding chunks of the file.
     * This method can be used to stream files in a more convenient way, since it offers more control (pausing, resuming, etc.)
     * @param iterFileParams - {@link IterDownloadFunction}
     * @return a Buffer downloaded from the inputFile.
     * @example
     * ```ts
     * const photo = message.photo;
     * for await (const chunk of client.iterDownload({
     *       file: new Api.InputPhotoFileLocation({
     *          id: photo.id,
     *          accessHash: photo.accessHash,
     *          fileReference: photo.fileReference,
     *          thumbSize: size.type
     *      }),
     *      offset: start,
     *      limit: end,
     *      requestSize:2048*1024
     * )){
     *     console.log("Downloaded chunk of size",chunk.length);
     * };
     * ```
     */
    iterDownload(iterFileParams: downloadMethods.IterDownloadFunction) {
        return downloadMethods.iterDownload(this, iterFileParams);
    }

    //region download

    /**
     * Downloads the profile photo from the given user,chat or channel.<br/>
     * This method will return an empty buffer in case of no profile photo.
     * @param entity - where to download the photo from.
     * @param downloadProfilePhotoParams - {@link DownloadProfilePhotoParams}
     * @return buffer containing the profile photo. can be empty in case of no profile photo.
     * @example
     * ```ts
     * // Download your own profile photo
     * const buffer = await client.downloadProfilePhoto('me')
     * console.log("Downloaded image is",buffer);
     * // if you want to save it as a file you can use the fs module on node for that.
     * import { promises as fs } from 'fs';
     * await fs.writeFile("picture.jpg",buffer);
     * ```
     */
    downloadProfilePhoto(
        entity: EntityLike,
        downloadProfilePhotoParams: downloadMethods.DownloadProfilePhotoParams = {
            isBig: false,
        }
    ) {
        return downloadMethods.downloadProfilePhoto(
            this,
            entity,
            downloadProfilePhotoParams
        );
    }

    /**
     * Downloads the given media from a message or a media object.<br/>
     * this will return an empty Buffer in case of wrong or empty media.
     * @param messageOrMedia - instance of a message or a media.
     * @param downloadParams {@link DownloadMediaInterface}
     * @return a buffer containing the downloaded data if outputFile is undefined else nothing.
     * @example ```ts
     * const buffer = await client.downloadMedia(message, {})
     * // to save it to a file later on using fs.
     * import { promises as fs } from 'fs';
     * await fs.writeFile("file",buffer);
     * // to use a progress callback you can pass it like so.
     * const buffer = await client.downloadMedia(message, {
     *     progressCallback : console.log
     * })
     * ```
     */
    downloadMedia(
        messageOrMedia: Api.Message | Api.TypeMessageMedia,
        downloadParams?: DownloadMediaInterface
    ) {
        return downloadMethods.downloadMedia(
            this,
            messageOrMedia,
            downloadParams?.outputFile,
            downloadParams?.thumb,
            downloadParams?.progressCallback
        );
    }

    //endregion

    //region message parse
    /**
     * This property is the default parse mode used when sending messages. Defaults to {@link MarkdownParser}.<br/>
     * It will always be either undefined or an object with parse and unparse methods.<br/>
     * When setting a different value it should be one of:<br/>
     *<br/>
     *  - Object with parse and unparse methods.<br/>
     *  - A str indicating the parse_mode. For Markdown 'md' or 'markdown' may be used. For HTML, 'html' may be used.<br/>
     * The parse method should be a function accepting a single parameter, the text to parse, and returning a tuple consisting of (parsed message str, [MessageEntity instances]).<br/>
     * <br/>
     * The unparse method should be the inverse of parse such that text == unparse(parse(text)).<br/>
     * <br/>
     * See {@link Api.TypeMessageEntity} for allowed message entities.
     * @example
     * ```ts
     * // gets the current parse mode.
     * console.log("parse mode is :",  client.parseMode)
     * ```
     */
    get parseMode() {
        return this._parseMode;
    }

    /** Setter for parseMode.
     * {@link parseMode}
     * @param mode can be md,markdown for Markdown or html for html. can also pass a custom mode.
     * pass undefined for no parsing.
     * @example
     * // sets the mode to HTML
     * client.setParseMode("html");
     * await client.sendMessage("me",{message:"<u>This is an underline text</u>"});
     * // disable formatting
     * client.setParseMode(undefined);
     * await client.sendMessage("me",{message:"<u> this will be sent as it is</u> ** with no formatting **});
     */
    setParseMode(
        mode:
            | "md"
            | "md2"
            | "markdown"
            | "markdownv2"
            | "html"
            | parseMethods.ParseInterface
            | undefined
    ) {
        if (mode) {
            this._parseMode = sanitizeParseMode(mode);
        } else {
            this._parseMode = undefined;
        }
    }

    //endregion
    // region messages

    /**
     * Iterates over the messages for a given chat.
     * <br/>
     * The default order is from newest to oldest but can be changed with the reverse param.<br/>
     * If either `search`, `filter` or `fromUser` are provided this will use {@link Api.messages.Search} instead of {@link Api.messages.GetHistory}.
     * @remarks
     * Telegram limits GetHistory requests every 10 requests (1 000 messages) therefore a sleep of 1 seconds will be the default for this limit.
     * @param entity - The entity from whom to retrieve the message history.<br/>
     * It may be undefined to perform a global search, or to get messages by their ID from no particular chat<br/>
     * **Note** that some of the offsets will not work if this is the case.<br/>
     * **Note** that if you want to perform a global search, you must set a non-empty search string, a filter. or fromUser.
     * @param iterParams - {@link IterMessagesParams}
     * @yield Instances of custom {@link Message}
     * @example
     * ```ts
     * // From most-recent to oldest
     * for await (const message of client.iterMessages(chat,{}){
     *    console.log(message.id, message.text)
     * }
     *
     * // From oldest to most-recent
     * for await (const message of client.iterMessages(chat,{reverse:true}){
     *    console.log(message.id, message.text)
     * }
     *
     * // Filter by sender
     * for await (const message of client.iterMessages(chat,{fromUser:"me"}){
     *    console.log(message.id, message.text)
     * }
     *
     * // Server-side search with fuzzy text
     * for await (const message of client.iterMessages(chat,{search:"hello"}){
     *    console.log(message.id, message.text)
     * }
     *
     * // Filter by message type:
     * import { Api } from "telegram";
     * for await (const message of client.iterMessages(chat,{filter: Api.InputMessagesFilterPhotos}){
     *    console.log(message.id, message.photo)
     * }
     *
     * // Getting comments from a post in a channel:
     *  * for await (const message of client.iterMessages(chat,{replyTo: 123}){
     *    console.log(message.chat.title,, message.text)
     * }
     * ```
     */
    iterMessages(
        entity: EntityLike | undefined,
        iterParams: Partial<messageMethods.IterMessagesParams> = {}
    ) {
        return messageMethods.iterMessages(this, entity, iterParams);
    }

    /**
     * Same as iterMessages() but returns a TotalList instead.<br/>
     * if the `limit` is not set, it will be 1 by default unless both `minId` **and** `maxId` are set. in which case the entire  range will be returned.<br/>
     * @param entity - The entity from whom to retrieve the message history. see {@link iterMessages}.<br/>
     * @param getMessagesParams - see {@link IterMessagesParams}.
     * @return {@link TotalList} of messages.
     * @example
     * ```ts
     * // The totalList has a .total attribute which will show the complete number of messages even if none are fetched.
     * // Get 0 photos and print the total to show how many photos there are
     * import { Api } from "telegram";
     * const photos = await client.getMessages(chat, {limit: 0, filter:Api.InputMessagesFilterPhotos})
     * console.log(photos.total)
     *
     * // Get all the photos
     * const photos = await client.getMessages(chat, {limit: undefined, filter:Api.InputMessagesFilterPhotos})
     *
     // Get messages by ID:
     * const messages = await client.getMessages(chat, {ids:1337})
     * const message_1337 = messages[0];
     * ```
     */
    getMessages(
        entity: EntityLike | undefined,
        getMessagesParams: Partial<messageMethods.IterMessagesParams> = {}
    ) {
        return messageMethods.getMessages(this, entity, getMessagesParams);
    }

    /**
     * Sends a message to the specified user, chat or channel.<br/>
     * The default parse mode is the same as the official applications (a custom flavour of markdown). **bold**, `code` or __italic__ are available.<br/>
     * In addition you can send [links](https://example.com) and [mentions](@username) (or using IDs like in the Bot API: [mention](tg://user?id=123456789)) and pre blocks with three backticks.<br/>
     * <br/>
     * Sending a /start command with a parameter (like ?start=data) is also done through this method. Simply send '/start data' to the bot.<br/>
     * <br/>
     * See also Message.respond() and Message.reply().
     *
     * @param entity - Who to sent the message to.
     * @param sendMessageParams - see {@link SendMessageParams}
     * @return
     * The sent custom Message.
     * @example
     * ```ts
     * // Markdown is the default.
     * await client.sendMessage("me",{message:"Hello **world!**});
     *
     * // Defaults to another parse mode.
     * client.setParseMode("HTML");
     *
     * await client.sendMessage('me', {message:'Some <b>bold</b> and <i>italic</i> text'})
     * await client.sendMessage('me', {message:'An <a href="https://example.com">URL</a>'})
     * await client.sendMessage('me', {message:'<a href="tg://user?id=me">Mentions</a>'})
     *
     * // Explicit parse mode.
     * //  No parse mode by default
     * client.setParseMode(undefined);
     * //...but here I want markdown
     * await client.sendMessage('me', {message:'Hello, **world**!', {parseMode:"md"}})
     *
     * // ...and here I need HTML
     * await client.sendMessage('me', {message:'Hello, <i>world</i>!', {parseMode='html'}})
     *
     *
     * // Scheduling a message to be sent after 5 minutes
     *
     * await client.sendMessage(chat, {message:'Hi, future!', schedule:(60 * 5) + (Date.now() / 1000)})
     *
     * ```
     */
    sendMessage(
        entity: EntityLike,
        sendMessageParams: messageMethods.SendMessageParams = {}
    ) {
        return messageMethods.sendMessage(this, entity, sendMessageParams);
    }

    /**
     * Forwards the given messages to the specified entity.<br/>
     *<br/>
     * If you want to "forward" a message without the forward header
     * (the "forwarded from" text), you should use `sendMessage` with
     * the original message instead. This will send a copy of it.
     *<br/>
     * See also {@link Message.forwardTo}`.
     * @param entity - To which entity the message(s) will be forwarded.
     * @param forwardMessagesParams - see {@link ForwardMessagesParams}
     * @return The list of forwarded Message, Note.<br/>
     * if some messages failed to be forwarded the returned list will have them as undefined.
     * @example ```ts
     * // a single one
     * await client.forwardMessages(chat, {messages: message});
     * // or
     * await client.forwardMessages(chat, {messages:messageId,fromPeer:fromChat});
     * // or
     * await message.forwardTo(chat)
     *
     * // multiple
     * await client.forwardMessages(chat, {messages:messages});
     * // or
     * await client.forwardMessages(chat,  {messages:messageIds,fromPeer:fromChat});
     *
     * // Forwarding as a copy
     * await client.sendMessage(chat, {message:message});
     * ```
     */
    forwardMessages(
        entity: EntityLike,
        forwardMessagesParams: messageMethods.ForwardMessagesParams
    ) {
        return messageMethods.forwardMessages(
            this,
            entity,
            forwardMessagesParams
        );
    }

    /**
     *  Used to edit a message by changing it's text or media
     *  message refers to the message to be edited not what to edit
     *  text refers to the new text
     *  See also Message.edit()<br/>
     *  Notes: It is not possible to edit the media of a message that doesn't contain media.
     *  @param entity - From which chat to edit the message.<br/>
     *  This can also be the message to be edited, and the entity will be inferred from it, so the next parameter will be assumed to be the message text.<br/>
     *  You may also pass a InputBotInlineMessageID, which is the only way to edit messages that were sent after the user selects an inline query result. Not supported yet!
     *  @param editMessageParams - see {@link EditMessageParams}.
     *  @return The edited Message.
     *  @throws
     *  `MESSAGE_AUTHOR_REQUIRED` if you're not the author of the message but tried editing it anyway.
     *  `MESSAGE_NOT_MODIFIED` if the contents of the message were not modified at all.
     *  `MESSAGE_ID_INVALID` if the ID of the message is invalid (the ID itself may be correct, but the message with that ID cannot be edited).<br/>
     *  For example, when trying to edit messages with a reply markup (or clear markup) this error will be raised.
     *  @example
     *  ```ts
     *  const message = await client.sendMessage(chat,{message:"Hi!"});
     *
     *  await client.editMessage(chat,{message:message,text:"Hello!"}
     *  // or
     *  await client.editMessage(chat,{message:message.id,text:"Hello!"}
     *  ```
     */
    editMessage(
        entity: EntityLike,
        editMessageParams: messageMethods.EditMessageParams
    ) {
        return messageMethods.editMessage(this, entity, editMessageParams);
    }

    /**
     * Deletes the given messages, optionally "for everyone".
     *
     * See also {@link Message.delete}`.
     *
     * @remarks This method does **not** validate that the message IDs belong to the chat that you passed! It's possible for the method to delete messages from different private chats and small group chats at once, so make sure to pass the right IDs.
     * @param entity - From who the message will be deleted. This can actually be `undefined` for normal chats, but **must** be present for channels and megagroups.
     * @param messageIds - The IDs (or ID) or messages to be deleted.
     * @param revoke - Whether the message should be deleted for everyone or not.
     * By default it has the opposite behaviour of official clients,
     * and it will delete the message for everyone.
     * Disabling this has no effect on channels or megagroups,
     * since it will unconditionally delete the message for everyone.
     * @return
     * A list of {@link AffectedMessages}, each item being the result for the delete calls of the messages in chunks of 100 each.
     * @example
     *  ```ts
     *  await client.deleteMessages(chat, messages);
     *
     *  await client.deleteMessages(chat, messages, {revoke:false});
     *  ```
     */
    deleteMessages(
        entity: EntityLike | undefined,
        messageIds: MessageIDLike[],
        { revoke = true }
    ) {
        return messageMethods.deleteMessages(this, entity, messageIds, {
            revoke: revoke,
        });
    }

    /**
     * Pins a message in a chat.
     *
     * See also {@link Message.pin}`.
     *
     * @remarks The default behavior is to **not** notify members, unlike the official applications.
     * @param entity - The chat where the message should be pinned.
     * @param message - The message or the message ID to pin. If it's `undefined`, all messages will be unpinned instead.
     * @param pinMessageParams - see {@link UpdatePinMessageParams}.
     * @return
     * The pinned message. if message is undefined the return will be {@link AffectedHistory}
     * @example
     *  ```ts
     *  const message = await client.sendMessage(chat, 'GramJS is awesome!');
     *
     *  await client.pinMessage(chat, message);
     *  ```
     */
    pinMessage(
        entity: EntityLike,
        message?: undefined,
        pinMessageParams?: messageMethods.UpdatePinMessageParams
    ): Promise<Api.messages.AffectedHistory>;
    pinMessage(
        entity: EntityLike,
        message: MessageIDLike,
        pinMessageParams?: messageMethods.UpdatePinMessageParams
    ): Promise<Api.Message>;
    pinMessage(
        entity: EntityLike,
        message?: any,
        pinMessageParams?: messageMethods.UpdatePinMessageParams
    ) {
        return messageMethods.pinMessage(
            this,
            entity,
            message,
            pinMessageParams
        );
    }

    /**
     * Unpins a message in a chat.
     *
     * See also {@link Message.unpin}`.
     *
     * @remarks The default behavior is to **not** notify members, unlike the official applications.
     * @param entity - The chat where the message should be unpinned.
     * @param message - The message or the message ID to unpin. If it's `undefined`, all messages will be unpinned instead.
     * @param pinMessageParams - see {@link UpdatePinMessageParams}.
     * @return
     * The pinned message. if message is undefined the return will be {@link AffectedHistory}
     * @example
     *  ```ts
     *  const message = await client.sendMessage(chat, 'GramJS is awesome!');
     *
     *  // unpin one message
     *  await client.unpinMessage(chat, message);
     *
     *  // unpin all messages
     *  await client.unpinMessage(chat);
     *  ```
     */
    unpinMessage(
        entity: EntityLike,
        message?: undefined,
        pinMessageParams?: messageMethods.UpdatePinMessageParams
    ): Promise<Api.messages.AffectedHistory>;
    unpinMessage(
        entity: EntityLike,
        message: MessageIDLike,
        pinMessageParams?: messageMethods.UpdatePinMessageParams
    ): Promise<undefined>;
    unpinMessage(
        entity: EntityLike,
        message?: any,
        unpinMessageParams?: messageMethods.UpdatePinMessageParams
    ) {
        return messageMethods.unpinMessage(
            this,
            entity,
            message,
            unpinMessageParams
        ) as Promise<Api.messages.AffectedHistory | undefined>;
    }

    /**
     * Marks messages as read and optionally clears mentions. <br/>
     * This effectively marks a message as read (or more than one) in the given conversation. <br />
     * If a message or maximum ID is provided, all the messages up to and
     * including such ID will be marked as read (for all messages whose ID ≤ max_id).
     *
     * See also {@link Message.markRead}`.
     *
     * @remarks If neither message nor maximum ID are provided, all messages will be marked as read by assuming that `max_id = 0`.
     * @param entity - The chat where the message should be pinned.
     * @param message - The message or the message ID to pin. If it's `undefined`, all messages will be unpinned instead.
     * @param markAsReadParams - see {@link MarkAsReadParams}.
     * @return boolean
     * @example
     *  ```ts
     *  // using a Message object
     *  const message = await client.sendMessage(chat, 'GramJS is awesome!');
     *  await client.markAsRead(chat, message)
     *  // ...or using the int ID of a Message
     *  await client.markAsRead(chat, message.id);
     *
     *  // ...or passing a list of messages to mark as read
     *  await client.markAsRead(chat, messages)
     *  ```
     */
    markAsRead(
        entity: EntityLike,
        message?: MessageIDLike | MessageIDLike[],
        markAsReadParams?: messageMethods.MarkAsReadParams
    ) {
        return messageMethods.markAsRead(
            this,
            entity,
            message,
            markAsReadParams
        );
    }

    //endregion
    //region dialogs

    /**
     * Iterator over the dialogs (open conversations/subscribed channels) sequentially.<br/>
     * The order is the same as the one seen in official applications. (dialogs that had recent messages come first)
     * @param iterDialogsParams - see {@link IterDialogsParams}
     * @yield instances of custom {@link Dialog}.
     * @example
     * ```ts
     * // logs all dialog IDs and their title.
     * for await (const dialog of client.iterDialogs({})){
     *     console.log(`${dialog.id}: ${dialog.title}`);
     * }
     * ```
     */
    iterDialogs(iterDialogsParams: dialogMethods.IterDialogsParams = {}) {
        return dialogMethods.iterDialogs(this, iterDialogsParams);
    }

    /**
     * Same as iterDialogs but returns a TotalList instead of an iterator.
     * @param params - {@link IterDialogsParams}
     * @example
     * ```ts
     * // Get all open conversation, print the title of the first
     * const dialogs = await client.getDialogs({});
     * const first = dialogs[0];
     * console.log(first.title);
     * <br/>
     * // Use the dialog somewhere else
     * await client.sendMessage(first, {message: "hi"});
     * <br/>
     * // Getting only non-archived dialogs (both equivalent)
     * non_archived = await client.get_dialogs({folder:0})
     * non_archived = await client.get_dialogs({archived:false})
     * <br/>
     * // Getting only archived dialogs (both equivalent)
     * archived = await client.get_dialogs({folder:1})
     * archived = await client.get_dialogs({archived:true})
     * ```
     */
    getDialogs(params: dialogMethods.IterDialogsParams = {}) {
        return dialogMethods.getDialogs(this, params);
    }

    //endregion
    //region chats
    /**
     * Iterates over the participants belonging to a specified chat , channel or supergroup.<br/>
     * <br/>
     * Channels can return a maximum of 200 users while supergroups can return up to 10 000.<br/>
     * You must be an admin to retrieve users from a channel.<br/>
     * @param entity - The entity from which to retrieve the participants list.
     * @param params - {@link IterParticipantsParams}
     * @remarks
     * The filter ChannelParticipantsBanned will return restricted users. If you want banned users you should use ChannelParticipantsKicked instead.
     * @yield The User objects returned by GetParticipants with an additional .participant attribute<br/>
     *     which is the matched ChannelParticipant type for channels/supergroup or ChatParticipants for normal chats.
     * @example
     * ```ts
     * // logs all user IDs in a chat.
     * for await (const user of client.iterParticipants(chat)){
     *     console.log("User id",user.id);
     * }
     *
     * // Searches by name.
     * for await (const user of client.iterParticipants(chat, {search: "name"})){
     *     console.log("Username is ",user.username); // Some users don't have a username so this can be undefined.
     * }
     *
     * // Filter by admins.
     * import { Api } from "telegram";
     *
     * for await (const user of client.iterParticipants(chat, {filter:  Api.ChannelParticipantsAdmins})){
     *     console.log("admin first name is ",user.firstName);
     * }
     * ```
     */
    iterParticipants(
        entity: EntityLike,
        params: chatMethods.IterParticipantsParams = {}
    ) {
        return chatMethods.iterParticipants(this, entity, params);
    }

    /**
     * Exact same as iterParticipants but returns a TotalList instead.<br/>
     * This can be used if you want to retrieve a list instead of iterating over the users.
     * @param entity - entity to get users from.
     * @param params - {@link IterParticipantsParams}.
     * @return
     */
    getParticipants(
        entity: EntityLike,
        params: chatMethods.IterParticipantsParams = {}
    ) {
        return chatMethods.getParticipants(this, entity, params);
    }
    /**
     * Kicks a user from a chat.
     *
     * Kicking yourself (`'me'`) will result in leaving the chat.
     *
     * @note
     * Attempting to kick someone who was banned will remove their
     * restrictions (and thus unbanning them), since kicking is just
     * ban + unban.
     *
     * @example
     * // Kick some user from some chat, and deleting the service message
     * const msg = await client.kickParticipant(chat, user);
     * await msg.delete();
     *
     * // Leaving chat
     * await client.kickParticipant(chat, 'me');
     */
    kickParticipant(entity: EntityLike, participant: EntityLike) {
        return chatMethods.kickParticipant(this, entity, participant);
    }

    //endregion

    //region updates
    /** TODO */
    on(event: any) {
        return updateMethods.on(this, event);
    }

    /**
     * Registers a new event handler callback.<br/>
     * <br/>
     * The callback will be called when the specified event occurs.
     * @param callback - The callable function accepting one parameter to be used.<br/>
     * **Note** the event type passed in the callback will change depending on the eventBuilder.
     * @param event -The event builder class or instance to be used,
     * for example ``new events.NewMessage({});``.
     * If left unspecified, {@link Raw} (the {@link Api.TypeUpdate} objects with no further processing) will be passed instead.<br>
     *
     * @example
     *```ts
     * import {TelegramClient} from "telegram";
     * import { NewMessage } from "telegram/events";
     * import { NewMessageEvent } from "telegram/events";
     * const client = new TelegramClient(new StringSession(''), apiId, apiHash, {});
     *
     * async function handler(event: NewMessageEvent) {
     * ...
     * }
     * client.addEventHandler(handler, new NewMessage({}));
     ```
     */
    addEventHandler(
        callback: { (event: NewMessageEvent): void },
        event: NewMessage
    ): void;
    addEventHandler(
        callback: { (event: CallbackQueryEvent): void },
        event: CallbackQuery
    ): void;
    addEventHandler(
        callback: { (event: AlbumEvent): void },
        event: Album
    ): void;
    addEventHandler(
        callback: { (event: EditedMessageEvent): void },
        event: EditedMessage
    ): void;
    addEventHandler(
        callback: { (event: DeletedMessageEvent): void },
        event: DeletedMessage
    ): void;
    addEventHandler(
        callback: { (event: any): void },
        event?: EventBuilder
    ): void;
    addEventHandler(callback: { (event: any): void }, event?: EventBuilder) {
        return updateMethods.addEventHandler(this, callback, event);
    }

    /**
     * Inverse operation of addEventHandler().<br>
     *
     * @param callback - the callback function to be removed.
     * @param event - the type of the event.
     */
    removeEventHandler(callback: CallableFunction, event: EventBuilder) {
        return updateMethods.removeEventHandler(this, callback, event);
    }

    /**
     * Lists all registered event handlers.
     * @return pair of [eventBuilder,CallableFunction]
     */
    listEventHandlers() {
        return updateMethods.listEventHandlers(this);
    }

    // region uploads
    /**
     * Uploads a file to Telegram's servers, without sending it.
     * @remarks generally it's better to use {@link sendFile} instead.
     * This method returns a handle (an instance of InputFile or InputFileBig, as required) which can be later used before it expires (they are usable during less than a day).<br/>
     * Uploading a file will simply return a "handle" to the file stored remotely in the Telegram servers,
     * which can be later used on. This will not upload the file to your own chat or any chat at all.
     * This also can be used to update profile pictures
     * @param fileParams see {@link UploadFileParams}
     * @return {@link Api.InputFileBig} if the file size is larger than 10mb otherwise {@link Api.InputFile}
     * @example
     * ```ts
     * import { CustomFile } from "telegram/client/uploads";
     * const toUpload = new CustomFile("photo.jpg", fs.statSync("../photo.jpg").size, "../photo.jpg");
     * const file = await client.uploadFile({
     *  file: toUpload,
     *  workers: 1,
     *  });
     *  await client.invoke(new Api.photos.UploadProfilePhoto({
     *      file: file,
     *  }));
     * ```
     */
    uploadFile(fileParams: uploadMethods.UploadFileParams) {
        return uploadMethods.uploadFile(this, fileParams);
    }

    /**
     * Sends message with the given file to the specified entity.
     * This uses {@link uploadFile} internally so if you want more control over uploads you can use that.
     * @param entity - who will receive the file.
     * @param sendFileParams - see {@link SendFileInterface}
     * @example
     * ```
     * // Normal files like photos
     * await client.sendFile(chat, {file:'/my/photos/me.jpg', caption:"It's me!"})
     * // or
     * await client.sendMessage(chat, {message:"It's me!", file:'/my/photos/me.jpg'})
     *
     * Voice notes or round videos
     * await client.sendFile(chat, {file: '/my/songs/song.mp3', voiceNote:True})
     * await client.sendFile(chat, {file: '/my/videos/video.mp4', videoNote:True})
     *
     * // Custom thumbnails
     * await client.sendFile(chat, {file:'/my/documents/doc.txt', thumb:'photo.jpg'})
     *
     * // Only documents
     * await client.sendFile(chat, {file:'/my/photos/photo.png', forceDocument:True})
     *
     * //logging progress
     * await client.sendFile(chat, {file: file, progressCallback=console.log})
     *
     * // Dices, including dart and other future emoji
     * await client.sendFile(chat, {file:new Api.InputMediaDice("")})
     * await client.sendFile(chat, {file:new Api.InputMediaDice("🎯")})
     *
     * // Contacts
     * await client.sendFile(chat, {file: new Api.InputMediaContact({
     *  phoneNumber:'+1 123 456 789',
     *  firstName:'Example',
     *  lastName:'',
     *  vcard:''
     *  }))
     * ```
     */
    sendFile(
        entity: EntityLike,
        sendFileParams: uploadMethods.SendFileInterface
    ) {
        return uploadMethods.sendFile(this, entity, sendFileParams);
    }

    // endregion

    //region user methods
    /**
     * invokes raw Telegram requests.<br/>
     * This is a low level method that can be used to call manually any Telegram API method.<br/>
     * Generally this should only be used when there isn't a friendly method that does what you need.<br/>
     * All available requests and types are found under the `Api.` namespace.
     * @param request - The request to send. this should be of type request.
     * @param dcId - Optional dc id to use when sending.
     * @return The response from Telegram.
     * @example
     * ```ts
     * //
     * const result = await client.invoke(new Api.account.CheckUsername({
     *      username: 'some string here'
     *   }));
     * console.log("does this username exist?",result);
     *
     * ```
     */
    invoke<R extends Api.AnyRequest>(
        request: R,
        dcId?: number
    ): Promise<R["__response"]> {
        return userMethods.invoke(this, request, dcId);
    }
    invokeWithSender<R extends Api.AnyRequest>(
        request: R,
        sender?: MTProtoSender
    ): Promise<R["__response"]> {
        return userMethods.invoke(this, request, undefined, sender);
    }

    /**
     * Gets the current logged in {@link Api.User}.
     * If the user has not logged in this will throw an error.
     * @param inputPeer - Whether to return the input peer version {@link Api.InputPeerUser} or the whole user {@link Api.User}.
     * @return Your own {@link Api.User}
     * @example
     * ```ts
     * const me = await client.getMe();
     * console.log("My username is",me.username);
     * ```
     */
    getMe(inputPeer: true): Promise<Api.InputPeerUser>;
    getMe(inputPeer?: false): Promise<Api.User>;
    getMe(inputPeer = false) {
        return userMethods.getMe(this, inputPeer);
    }

    /**
     * Return true if the signed-in user is a bot, false otherwise.
     * @example
     * ```ts
     * if (await client.isBot()){
     *     console.log("I am a bot. PI is 3.14159265359);
     * } else {
     *     console.log("I am a human. Pies are delicious);
     * }
     * ```
     */
    isBot() {
        return userMethods.isBot(this);
    }

    /**
     * Returns true if the user is authorized (logged in).
     * @example
     * if (await client.isUserAuthorized()){
     *     console.log("I am authorized. I can call functions and use requests");
     * }else{
     *     console.log("I am not logged in. I need to sign in first before being able to call methods");
     * }
     */
    isUserAuthorized() {
        return userMethods.isUserAuthorized(this);
    }

    /**
     * Turns the given entity into a valid Telegram {@link Api.User}, {@link Api.Chat} or {@link Api.Channel}.<br/>
     * You can also pass a list or iterable of entities, and they will be efficiently fetched from the network.
     * @remarks Telegram does not allow to get user profile by integer id if current client had never "saw" it.
     * @param entity - If a username is given, the username will be resolved making an API call every time.<br/>
     * Resolving usernames is an expensive operation and will start hitting flood waits around 50 usernames in a short period of time.<br/>
     * <br/>
     * Similar limits apply to invite links, and you should use their ID instead.<br/>
     * Using phone numbers (from people in your contact list), exact names, integer IDs or Peer rely on a getInputEntity first,<br/>
     * which in turn needs the entity to be in cache, unless a InputPeer was passed.<br/>
     * <br/>
     * If the entity can't be found, ValueError will be raised.
     * @return
     * {@link Api.Chat},{@link Api.Chat} or {@link Api.Channel} corresponding to the input entity. A list will be returned if more than one was given.
     * @example
     * ```ts
     * const me = await client.getEntity("me");
     * console.log("My name is", utils.getDisplayName(me));
     *
     * const chat = await client.getInputEntity("username");
     * for await (const message of client.iterMessages(chat)) {
     *     console.log("Message text is", message.text);
     * }
     *
     * // Note that you could have used the username directly, but it's
     * // good to use getInputEntity if you will reuse it a lot.
     * ```
     */

    getEntity(entity: EntityLike): Promise<Entity>;
    getEntity(entity: EntityLike[]): Promise<Entity[]>;
    getEntity(entity: any) {
        return userMethods.getEntity(this, entity);
    }

    /**
     * Turns the given entity into its input entity version.<br/>
     * Almost all requests use this kind of InputPeer, so this is the most suitable call to make for those cases.<br/>
     * **Generally you should let the library do its job** and don't worry about getting the input entity first, but if you're going to use an entity often, consider making the call.
     * @param entity - If a username or invite link is given, the library will use the cache.<br/>
     * This means that it's possible to be using a username that changed or an old invite link (this only happens if an invite link for a small group chat is used after it was upgraded to a mega-group).
     *<br/>
     *  - If the username or ID from the invite link is not found in the cache, it will be fetched. The same rules apply to phone numbers ('+34 123456789') from people in your contact list.
     *<br/>
     *  - If an exact name is given, it must be in the cache too. This is not reliable as different people can share the same name and which entity is returned is arbitrary,<br/>
     *  and should be used only for quick tests.
     *<br/>
     *  - If a positive integer ID is given, the entity will be searched in cached users, chats or channels, without making any call.
     *<br/>
     *  - If a negative integer ID is given, the entity will be searched exactly as either a chat (prefixed with -) or as a channel (prefixed with -100).
     *<br/>
     *  - If a Peer is given, it will be searched exactly in the cache as either a user, chat or channel.
     *<br/>
     *  - If the given object can be turned into an input entity directly, said operation will be done.
     *<br/>
     *  -If the entity can't be found, this will throw an error.
     * @return
     * {@link Api.InputPeerUser} , {@link Api.InputPeerChat} , {@link Api.InputPeerChannel} or {@link Api.InputPeerSelf} if the parameter  is "me" or "self"
     * @example
     * ```ts
     * // If you're going to use "username" often in your code
     * // (make a lot of calls), consider getting its input entity
     * // once, and then using the "user" everywhere instead.
     * user = await client.getInputEntity('username')
     *
     * // The same applies to IDs, chats or channels.
     * chat = await client.getInputEntity(-123456789)
     * ```
     */
    getInputEntity(entity: EntityLike) {
        return userMethods.getInputEntity(this, entity);
    }

    /**
     * Gets the ID for the given entity.<br/>
     * This method needs to be async because peer supports usernames, invite-links, phone numbers (from people in your contact list), etc.<br/>
     * <br/>
     * If addMark is false, then a positive ID will be returned instead. By default, bot-API style IDs (signed) are returned.
     * @param peer
     * @param addMark - whether to return a bot api style id.
     * @return the ID of the entity.
     * @example
     * ```ts
     * console.log(await client.getPeerId("me"));
     * ```
     */
    getPeerId(peer: EntityLike, addMark = true) {
        return userMethods.getPeerId(this, peer, addMark);
    }

    /** @hidden */
    _getInputDialog(peer: any) {
        return userMethods._getInputDialog(this, peer);
    }

    /** @hidden */
    _getInputNotify(notify: any) {
        return userMethods._getInputNotify(this, notify);
    }

    //endregion
    /** @hidden */
    async _handleReconnect() {
        this._log.info("Handling reconnect!");
        try {
            const res = await this.getMe();
        } catch (e) {
            this._log.error(`Error while trying to reconnect`);
            if (this._errorHandler) {
                await this._errorHandler(e as Error);
            }
            if (this._log.canSend(LogLevel.ERROR)) {
                console.error(e);
            }
        }
    }

    //region base methods

    async connect() {
        await this._initSession();
        if (this._sender === undefined) {
            this._sender = new MTProtoSender(this.session.getAuthKey(), {
                logger: this._log,
                dcId: this.session.dcId || 4,
                retries: this._connectionRetries,
                delay: this._retryDelay,
                autoReconnect: this._autoReconnect,
                connectTimeout: this._timeout,
                authKeyCallback: this._authKeyCallback.bind(this),
                updateCallback: _handleUpdate.bind(this),
                isMainSender: true,
                client: this,
                securityChecks: this._securityChecks,
                autoReconnectCallback: this._handleReconnect.bind(this),
                _exportedSenderPromises: this._exportedSenderPromises,
            });
        }

        const connection = new this._connection({
            ip: this.session.serverAddress,
            port: this.useWSS ? 443 : 80,
            dcId: this.session.dcId,
            loggers: this._log,
            proxy: this._proxy,
            socket: this.networkSocket,
            testServers: this.testServers,
        });
        if (!(await this._sender.connect(connection, false))) {
            if (!this._loopStarted) {
                _updateLoop(this);
                this._loopStarted = true;
            }
            return false;
        }
        this.session.setAuthKey(this._sender.authKey);
        this.session.save();

        this._initRequest.query = new Api.help.GetConfig();
        this._log.info(`Using LAYER ${LAYER} for initial connect`);
        await this._sender.send(
            new Api.InvokeWithLayer({
                layer: LAYER,
                query: this._initRequest,
            })
        );
        if (!this._loopStarted) {
            _updateLoop(this);
            this._loopStarted = true;
        }
        this._connectedDeferred.resolve();
        this._isSwitchingDc = false;
        return true;
    }
    //endregion
    // region Working with different connections/Data Centers
    /** @hidden */
    async _switchDC(newDc: number) {
        this._log.info(`Reconnecting to new data center ${newDc}`);
        const DC = await this.getDC(newDc);
        this.session.setDC(newDc, DC.ipAddress, DC.port);
        // authKey's are associated with a server, which has now changed
        // so it's not valid anymore. Set to undefined to force recreating it.
        await this._sender!.authKey.setKey(undefined);
        this.session.setAuthKey(undefined);
        this.session.save();
        this._isSwitchingDc = true;
        await this._disconnect();
        this._sender = undefined;
        return await this.connect();
    }

    /**
     * Returns the DC ip in case of node or the DC web address in case of browser.<br/>
     * This will do an API request to fill the cache if it's the first time it's called.
     * @param dcId The DC ID.
     * @param downloadDC whether to use -1 DCs or not
     * @param web if true this will get the web DCs.
     * TODO, hardcode IPs.
     * (These only support downloading/uploading and not creating a new AUTH key)
     */
    async getDC(
        dcId: number,
        downloadDC = false,
        web = false
    ): Promise<{ id: number; ipAddress: string; port: number }> {
        this._log.debug(`Getting DC ${dcId}`);
        if (!isNode || web) {
            switch (dcId) {
                case 1:
                    return {
                        id: 1,
                        ipAddress: `pluto${
                            downloadDC ? "-1" : ""
                        }.web.telegram.org`,
                        port: 443,
                    };
                case 2:
                    return {
                        id: 2,
                        ipAddress: `venus${
                            downloadDC ? "-1" : ""
                        }.web.telegram.org`,
                        port: 443,
                    };
                case 3:
                    return {
                        id: 3,
                        ipAddress: `aurora${
                            downloadDC ? "-1" : ""
                        }.web.telegram.org`,
                        port: 443,
                    };
                case 4:
                    return {
                        id: 4,
                        ipAddress: `vesta${
                            downloadDC ? "-1" : ""
                        }.web.telegram.org`,
                        port: 443,
                    };
                case 5:
                    return {
                        id: 5,
                        ipAddress: `flora${
                            downloadDC ? "-1" : ""
                        }.web.telegram.org`,
                        port: 443,
                    };
                default:
                    throw new Error(
                        `Cannot find the DC with the ID of ${dcId}`
                    );
            }
        }
        if (!this._config) {
            this._config = await this.invoke(new Api.help.GetConfig());
        }
        for (const DC of this._config.dcOptions) {
            if (DC.id === dcId && !!DC.ipv6 === this._useIPV6) {
                return {
                    id: DC.id,
                    ipAddress: DC.ipAddress,
                    port: 443,
                };
            }
        }
        throw new Error(`Cannot find the DC with the ID of ${dcId}`);
    }

    /** @hidden */
    _removeSender(dcId: number) {
        delete this._borrowedSenderPromises[dcId];
    }

    /** @hidden */
    _getResponseMessage(req: any, result: any, inputChat: any) {
        return parseMethods._getResponseMessage(this, req, result, inputChat);
    }

    /** @hidden */
    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    /**
     * Small hack for using it in browsers
     */
    static get events() {
        return require("../events");
    }

    // endregion
}
