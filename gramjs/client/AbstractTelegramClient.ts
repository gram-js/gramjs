import * as types from "./types";
import { Dialog } from "../tl/custom/dialog";
import { AbsInlineResults } from "../tl/custom/absInlineResults";
import { Api } from "../tl/api.js";
import { MTProtoSender } from "../network/MTProtoSender";
import { Session } from "../sessions";
import { LogLevel } from "../extensions/Logger";
import { TotalList } from "../Helpers";
import { TelegramBaseClient, TelegramClientParams } from "./telegramBaseClient";

export abstract class AbstractTelegramClient extends TelegramBaseClient {
    constructor(
        session: string | Session,
        apiId: number,
        apiHash: string,
        clientParams: TelegramClientParams
    ) {
        super(session, apiId, apiHash, clientParams);
    }

    abstract start(
        authParams?: types.UserAuthParams | types.BotAuthParams
    ): Promise<void>;

    abstract checkAuthorization(): Promise<boolean>;

    abstract signInUser(
        apiCredentials: types.ApiCredentials,
        authParams: types.UserAuthParams
    ): Promise<Api.TypeUser>;

    abstract signInUserWithQrCode(
        apiCredentials: types.ApiCredentials,
        authParams: types.QrCodeAuthParams
    ): Promise<Api.TypeUser>;

    abstract sendCode(
        apiCredentials: types.ApiCredentials,
        phoneNumber: string,
        forceSMS?: boolean
    ): Promise<{
        phoneCodeHash: string;
        isCodeViaApp: boolean;
    }>;

    abstract signInWithPassword(
        apiCredentials: types.ApiCredentials,
        authParams: types.UserPasswordAuthParams
    ): Promise<Api.TypeUser>;

    abstract signInBot(
        apiCredentials: types.ApiCredentials,
        authParams: types.BotAuthParams
    ): Promise<Api.TypeUser>;

    abstract updateTwoFaSettings({
        isCheckPassword,
        currentPassword,
        newPassword,
        hint,
        email,
        emailCodeCallback,
        onEmailCodeError,
    }: types.TwoFaParams): Promise<void>;

    abstract inlineQuery(
        bot: Api.TypeEntityLike,
        query: string,
        entity?: Api.InputPeerSelf,
        offset?: string,
        geoPoint?: Api.TypeInputGeoPoint
    ): Promise<AbsInlineResults>;

    abstract buildReplyMarkup(
        buttons:
            | Api.TypeReplyMarkup
            | undefined
            | Api.TypeButtonLike
            | Api.TypeButtonLike[]
            | Api.TypeButtonLike[][],
        inlineOnly?: boolean
    ): Api.TypeReplyMarkup | undefined;

    abstract downloadFile(
        inputLocation: Api.TypeInputFileLocation,
        fileParams: types.DownloadFileParamsV2
    ): Promise<string | Buffer | undefined>;

    abstract downloadProfilePhoto(
        entity: Api.TypeEntityLike,
        downloadProfilePhotoParams: types.DownloadProfilePhotoParams
    ): Promise<string | Buffer | undefined>;

    abstract downloadMedia(
        messageOrMedia: Api.Message | Api.TypeMessageMedia,
        downloadParams?: types.DownloadMediaInterface
    ): Promise<Buffer | string | undefined> | Buffer;

    abstract get parseMode(): types.ParseInterface | undefined;

    abstract setParseMode(
        mode: "md" | "markdown" | "html" | types.ParseInterface | undefined
    ): void;

    abstract iterMessages(
        entity: Api.TypeEntityLike | undefined,
        iterParams: Partial<types.IterMessagesParams>
    ): AsyncIterable<Api.Message>;

    abstract getMessages(
        entity: Api.TypeEntityLike | undefined,
        getMessagesParams: Partial<types.IterMessagesParams>
    ): Promise<TotalList<Api.Message>>;

    abstract sendMessage(
        entity: Api.TypeEntityLike,
        sendMessageParams: types.SendMessageParams
    ): Promise<Api.Message>;

    abstract forwardMessages(
        entity: Api.TypeEntityLike,
        forwardMessagesParams: types.ForwardMessagesParams
    ): Promise<Api.Message[]>;

    abstract editMessage(
        entity: Api.TypeEntityLike,
        editMessageParams: types.EditMessageParams
    ): Promise<Api.Message>;

    abstract deleteMessages(
        entity: Api.TypeEntityLike | undefined,
        messageIds: Api.TypeMessageIDLike[],
        { revoke }: { revoke: boolean }
    ): Promise<Api.messages.AffectedMessages[]>;

    abstract pinMessage(
        entity: Api.TypeEntityLike,
        message?: undefined,
        pinMessageParams?: types.UpdatePinMessageParams
    ): Promise<Api.messages.AffectedHistory>;
    abstract pinMessage(
        entity: Api.TypeEntityLike,
        message: Api.TypeMessageIDLike,
        pinMessageParams?: types.UpdatePinMessageParams
    ): Promise<Api.Message>;
    abstract pinMessage(
        entity: Api.TypeEntityLike,
        message?: any,
        pinMessageParams?: types.UpdatePinMessageParams
    ): Promise<Api.Message | Api.messages.AffectedHistory | undefined>;

    abstract unpinMessage(
        entity: Api.TypeEntityLike,
        message?: undefined,
        pinMessageParams?: types.UpdatePinMessageParams
    ): Promise<Api.messages.AffectedHistory>;
    abstract unpinMessage(
        entity: Api.TypeEntityLike,
        message: Api.TypeMessageIDLike,
        pinMessageParams?: types.UpdatePinMessageParams
    ): Promise<undefined>;
    abstract unpinMessage(
        entity: Api.TypeEntityLike,
        message?: any,
        unpinMessageParams?: types.UpdatePinMessageParams
    ): Promise<Api.Message | Api.messages.AffectedHistory | undefined>;

    abstract markAsRead(
        entity: Api.TypeEntityLike,
        message?: Api.TypeMessageIDLike | Api.TypeMessageIDLike[],
        markAsReadParams?: types.MarkAsReadParams
    ): Promise<boolean>;

    abstract iterDialogs(
        iterDialogsParams: types.IterDialogsParams
    ): AsyncIterable<Dialog>;

    abstract getDialogs(
        params: types.IterDialogsParams
    ): Promise<TotalList<Dialog>>;

    abstract iterParticipants(
        entity: Api.TypeEntityLike,
        params: types.IterParticipantsParams
    ): AsyncIterable<Api.User>;

    abstract getParticipants(
        entity: Api.TypeEntityLike,
        params: types.IterParticipantsParams
    ): Promise<TotalList<Api.User>>;

    abstract on(event: any): void;

    abstract addEventHandler(
        callback: { (event: any): void },
        event?: any // This should be EventBuilder when implemented
    ): void;

    abstract removeEventHandler(
        callback: CallableFunction,
        event: any // This should be EventBuilder when implemented
    ): void;

    abstract listEventHandlers(): [any, CallableFunction][];
    // This above any should be EventBuilder when implemented

    abstract uploadFile(
        fileParams: types.UploadFileParams
    ): Promise<Api.InputFile | Api.InputFileBig>;

    abstract sendFile(
        entity: Api.TypeEntityLike,
        sendFileParams: types.SendFileInterface
    ): Promise<Api.Message>;

    abstract invoke<R extends Api.AnyRequest>(
        request: R,
        sender?: MTProtoSender
    ): Promise<R["__response"]>;

    abstract getMe(inputPeer?: boolean): Promise<Api.User | Api.InputPeerUser>;

    abstract isBot(): Promise<boolean | undefined>;

    abstract isUserAuthorized(): Promise<boolean>;

    abstract getEntity(entity: Api.TypeEntityLike): Promise<Api.TypeEntity>;
    abstract getEntity(entity: Api.TypeEntityLike[]): Promise<Api.TypeEntity[]>;
    abstract getEntity(entity: any): Promise<Api.TypeEntity>;

    abstract getInputEntity(
        entity: Api.TypeEntityLike
    ): Promise<Api.TypeInputPeer>;

    abstract getPeerId(
        peer: Api.TypeEntityLike,
        addMark?: boolean
    ): Promise<string>;

    /** @hidden */
    abstract _getInputDialog(peer: any): Promise<any>;

    /** @hidden */
    abstract _getInputNotify(notify: any): Promise<any>;

    async _handleReconnect() {
        try {
            await this.getMe();
        } catch (e) {
            this._log.error(`Error while trying to reconnect`);
            if (this._log.canSend(LogLevel.ERROR)) {
                console.error(e);
            }
        }
    }

    abstract connect(): Promise<void>;

    /** @hidden */
    async _switchDC(newDc: number) {
        this._log.info(`Reconnecting to new data center ${newDc}`);
        const DC = await this.getDC(newDc);
        this.session.setDC(newDc, DC.ipAddress, DC.port);
        // authKey's are associated with a server, which has now changed
        // so it's not valid anymore. Set to undefined to force recreating it.
        this._sender!.authKey.setKey(undefined);
        this.session.setAuthKey(undefined);
        this._reconnecting = true;
        await this.disconnect();
        return this.connect();
    }

    async getDC(
        dcId: number,
        downloadDC = false,
        web = false
    ): Promise<{ id: number; ipAddress: string; port: number }> {
        this._log.debug(`Getting DC ${dcId}`);
        if (web) {
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
    abstract _getResponseMessage(
        req: any,
        result: any,
        inputChat: any
    ):
        | Api.TypeMessage
        | Map<number, Api.Message>
        | (Api.Message | undefined)[]
        | undefined;

    static get events() {
        return import("../events/index.js");
    }
}
