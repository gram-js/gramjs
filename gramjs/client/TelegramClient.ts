import {TelegramBaseClient} from "./telegramBaseClient";

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
import type {ButtonLike, EntityLike, MarkupLike} from "../define";
import {Api} from "../tl";
import {sanitizeParseMode} from "../Utils";
import {MarkdownParser} from "../extensions/markdown";
import type  {EventBuilder} from "../events/common";
import {MTProtoSender, UpdateConnectionState} from "../network";

import {LAYER} from "../tl/AllTLObjects";
import {IS_NODE} from "../Helpers";
import {DownloadMediaInterface} from "./downloads";

export class TelegramClient extends TelegramBaseClient {

    // region auth

    start(authParams: authMethods.UserAuthParams | authMethods.BotAuthParams) {
        return authMethods.start(this, authParams);
    }

    checkAuthorization() {
        return authMethods.checkAuthorization(this);
    }

    signInUser(
        apiCredentials: authMethods.ApiCredentials,
        authParams: authMethods.UserAuthParams,
    ) {
        return authMethods.signInUser(this, apiCredentials, authParams);
    }

    signInUserWithQrCode(
        apiCredentials: authMethods.ApiCredentials,
        authParams: authMethods.UserAuthParams,
    ) {
        return authMethods.signInUserWithQrCode(this, apiCredentials, authParams);
    }

    sendCode(apiCredentials: authMethods.ApiCredentials, phoneNumber: string, forceSMS = false) {
        return authMethods.sendCode(this, apiCredentials, phoneNumber, forceSMS);
    }

    signInWithPassword(apiCredentials: authMethods.ApiCredentials, authParams: authMethods.UserAuthParams) {
        return authMethods.signInWithPassword(this, apiCredentials, authParams);
    }

    signInBot(apiCredentials: authMethods.ApiCredentials, authParams: authMethods.BotAuthParams) {
        return authMethods.signInBot(this, apiCredentials, authParams);
    }

    authFlow(
        apiCredentials: authMethods.ApiCredentials,
        authParams: authMethods.UserAuthParams | authMethods.BotAuthParams,
    ) {
        return authMethods.authFlow(this, apiCredentials, authParams);
    }

    //endregion auth

    //region bot
    inlineQuery(bot: EntityLike, query: string,
                entity?: Api.InputPeerSelf | null,
                offset?: string, geoPoint?: Api.GeoPoint) {
        return botMethods.inlineQuery(this, bot, query, entity, offset, geoPoint);
    }

    //endregion

    //region buttons
    buildReplyMarkup(buttons: Api.TypeReplyMarkup | undefined | ButtonLike | ButtonLike[] | ButtonLike[][], inlineOnly: boolean = false) {
        return buttonsMethods.buildReplyMarkup(buttons, inlineOnly);
    }

    //endregion

    //region download
    downloadFile(
        inputLocation: Api.TypeInputFileLocation,
        fileParams: downloadMethods.DownloadFileParams,
    ) {
        return downloadMethods.downloadFile(this,
            inputLocation,
            fileParams,
        )
    }

    _downloadPhoto(photo: Api.MessageMediaPhoto | Api.Photo, args: DownloadMediaInterface) {
        return downloadMethods._downloadPhoto(this, photo, args);
    }

    _downloadCachedPhotoSize(size: Api.PhotoCachedSize | Api.PhotoStrippedSize) {
        return downloadMethods._downloadCachedPhotoSize(this, size);
    }

    _downloadDocument(media: Api.MessageMediaDocument | Api.Document, args: DownloadMediaInterface) {
        return downloadMethods._downloadDocument(this, media, args);
    }

    _downloadContact(contact: Api.MessageMediaContact, args: DownloadMediaInterface) {
        return downloadMethods._downloadContact(this, contact, args);
    }

    _downloadWebDocument(webDocument: Api.WebDocument | Api.WebDocumentNoProxy, args: DownloadMediaInterface) {
        return downloadMethods._downloadWebDocument(this, webDocument, args);
    }

    downloadMedia(messageOrMedia: Api.Message | Api.TypeMessageMedia, args: DownloadMediaInterface) {
        return downloadMethods.downloadMedia(this, messageOrMedia, args);
    }

    //endregion

    //region message parse
    get parseMode() {
        return this._parseMode || MarkdownParser;
    }

    setParseMode(mode: string | parseMethods.ParseInterface) {
        this._parseMode = sanitizeParseMode(mode);
    }

    // private methods
    _replaceWithMention(entities: Api.TypeMessageEntity[], i: number, user: EntityLike) {
        return parseMethods._replaceWithMention(this, entities, i, user);
    }

    _parseMessageText(message: string, parseMode: any) {
        return parseMethods._parseMessageText(this, message, parseMode);
    }

    //endregion
    // region messages
    iterMessages(entity: EntityLike, params: messageMethods.IterMessagesParams) {
        return messageMethods.iterMessages(this, entity, params)
    }

    getMessages(entity: EntityLike, params: messageMethods.IterMessagesParams) {
        return messageMethods.getMessages(this, entity, params);
    }

    sendMessage(entity: EntityLike, params: messageMethods.SendMessageParams) {
        return messageMethods.sendMessage(this, entity, params)
    }

    //endregion

    //region chats
    iterParticipants(entity: EntityLike, params: chatMethods.IterParticipantsParams) {
        return chatMethods.iterParticipants(this, entity, params);
    }

    getParticipants(entity: EntityLike, params: chatMethods.IterParticipantsParams) {
        return chatMethods.getParticipants(this, entity, params);
    }

    //endregion


    //region updates
    on(event: any) {
        return updateMethods.on(this, event);
    }

    addEventHandler(callback: CallableFunction, event?: EventBuilder) {
        return updateMethods.addEventHandler(this, callback, event);

    }

    removeEventHandler(callback: CallableFunction, event: EventBuilder) {
        return updateMethods.removeEventHandler(this, callback, event);

    }

    listEventHandlers() {
        return updateMethods.listEventHandlers(this);

    }

    // private methods
    _handleUpdate(update: Api.TypeUpdate | number) {
        return updateMethods._handleUpdate(this, update);

    }

    _processUpdate(update: any, others: any, entities?: any) {
        return updateMethods._processUpdate(this, update, others, entities);

    }

    _dispatchUpdate(args: { update: UpdateConnectionState | any }) {
        return updateMethods._dispatchUpdate(this, args);

    }

    _updateLoop() {
        return updateMethods._updateLoop(this);

    }

    //endregion

    // region uploads
    uploadFile(fileParams: uploadMethods.UploadFileParams) {
        return uploadMethods.uploadFile(this, fileParams);
    }

    sendFile(entity: EntityLike, params: uploadMethods.SendFileInterface) {
        return uploadMethods.sendFile(this, entity, params);
    }

    // endregion

    //region user methods
    invoke<R extends Api.AnyRequest>(request: R): Promise<R['__response']> {
        return userMethods.invoke(this, request);
    }

    getMe(inputPeer = false) {
        return userMethods.getMe(this, inputPeer);
    }

    isBot() {
        return userMethods.isBot(this);
    }

    isUserAuthorized() {
        return userMethods.isUserAuthorized(this);
    }

    getEntity(entity: any) {
        return userMethods.getEntity(this, entity);
    }

    getInputEntity(peer: EntityLike) {
        return userMethods.getInputEntity(this, peer);
    }

    getPeerId(peer: EntityLike, addMark = false) {
        return userMethods.getPeerId(this, peer, addMark);
    }

    // private methods
    _getEntityFromString(string: string) {
        return userMethods._getEntityFromString(this, string);
    }


    _getPeer(peer: EntityLike) {
        return userMethods._getPeer(this, peer);
    }

    _getInputDialog(dialog: any) {
        return userMethods._getInputDialog(this, dialog);
    }

    _getInputNotify(notify: any) {
        return userMethods._getInputNotify(this, notify);
    }

    //endregion

    //region base methods

    async connect() {
        await this._initSession();

        this._sender = new MTProtoSender(this.session.getAuthKey(), {
            logger: this._log,
            dcId: this.session.dcId || 4,
            retries: this._connectionRetries,
            delay: this._retryDelay,
            autoReconnect: this._autoReconnect,
            connectTimeout: this._timeout,
            authKeyCallback: this._authKeyCallback.bind(this),
            updateCallback: this._handleUpdate.bind(this),
            isMainSender: true,
        });

        const connection = new this._connection(this.session.serverAddress
            , this.session.port, this.session.dcId, this._log);
        if (!await this._sender.connect(connection, this._dispatchUpdate.bind(this))) {
            return
        }
        this.session.setAuthKey(this._sender.authKey);
        await this.session.save();
        this._initRequest.query = new Api.help.GetConfig();
        await this._sender.send(new Api.InvokeWithLayer(
            {
                layer: LAYER,
                query: this._initRequest
            }
        ));

        this._dispatchUpdate({update: new UpdateConnectionState(1)});
        this._updateLoop()
    }

    //endregion
    // region Working with different connections/Data Centers

    async _switchDC(newDc: number) {
        this._log.info(`Reconnecting to new data center ${newDc}`);
        const DC = await this.getDC(newDc);
        this.session.setDC(newDc, DC.ipAddress, DC.port);
        // authKey's are associated with a server, which has now changed
        // so it's not valid anymore. Set to None to force recreating it.
        await this._sender.authKey.setKey();
        this.session.setAuthKey();
        await this.disconnect();
        return this.connect()
    }

    async _createExportedSender(dcId: number, retries: number) {
        const dc = await this.getDC(dcId);
        const sender = new MTProtoSender(this.session.getAuthKey(dcId),
            {
                logger: this._log,
                dcId: dcId,
                retries: this._connectionRetries,
                delay: this._retryDelay,
                autoReconnect: this._autoReconnect,
                connectTimeout: this._timeout,
                authKeyCallback: this._authKeyCallback.bind(this),
                isMainSender: dcId === this.session.dcId,
                senderCallback: this.removeSender.bind(this),
            });
        for (let i = 0; i < retries; i++) {
            try {
                await sender.connect(new this._connection(
                    dc.ipAddress,
                    dc.port,
                    dcId,
                    this._log,
                ));
                if (this.session.dcId !== dcId) {
                    this._log.info(`Exporting authorization for data center ${dc.ipAddress}`);
                    const auth = await this.invoke(new Api.auth.ExportAuthorization({dcId: dcId}));
                    this._initRequest.query = new Api.auth.ImportAuthorization({
                            id: auth.id,
                            bytes: auth.bytes,
                        },
                    )
                    const req = new Api.InvokeWithLayer({
                        layer: LAYER,
                        query: this._initRequest
                    });
                    await sender.send(req)
                }
                sender.dcId = dcId;
                return sender
            } catch (e) {
                console.log(e);
                await sender.disconnect()
            }
        }
        return null
    }

    async getDC(dcId: number): Promise<{ id: number, ipAddress: string, port: number }> {
        if (!IS_NODE) {
            switch (dcId) {
                case 1:
                    return {
                        id: 1,
                        ipAddress: 'pluto.web.telegram.org',
                        port: 443,
                    };
                case 2:
                    return {
                        id: 2,
                        ipAddress: 'venus.web.telegram.org',
                        port: 443,
                    };
                case 3:
                    return {
                        id: 3,
                        ipAddress: 'aurora.web.telegram.org',
                        port: 443,
                    };
                case 4:
                    return {
                        id: 4,
                        ipAddress: 'vesta.web.telegram.org',
                        port: 443,
                    };
                case 5:
                    return {
                        id: 5,
                        ipAddress: 'flora.web.telegram.org',
                        port: 443,
                    };
                default:
                    throw new Error(`Cannot find the DC with the ID of ${dcId}`)
            }
        }
        if (!this._config) {
            this._config = await this.invoke(new Api.help.GetConfig())
        }
        for (const DC of this._config.dcOptions) {
            if (DC.id === dcId && !!DC.ipv6 === this._useIPV6) {
                return {
                    id: DC.id,
                    ipAddress: DC.ipAddress,
                    port: 443,
                }
            }
        }
        throw new Error(`Cannot find the DC with the ID of ${dcId}`)
    }

    removeSender(dcId: number) {
        delete this._borrowedSenderPromises[dcId]
    }

    async _borrowExportedSender(dcId: number, retries = 5) {
        let senderPromise = this._borrowedSenderPromises[dcId];
        if (!senderPromise) {
            senderPromise = this._createExportedSender(dcId, retries);
            this._borrowedSenderPromises[dcId] = senderPromise;

            senderPromise.then((sender: any) => {
                if (!sender) {
                    delete this._borrowedSenderPromises[dcId]
                }
            })
        }
        return senderPromise
    }

    // endregion


}
