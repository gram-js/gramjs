import { Api } from "../tl/api.js";
import { DateLike, OutFile, ProgressCallback } from "../define-nodep";
import { CustomFile } from "../classes";

export interface ParseInterface {
    parse: (message: string) => [string, Api.TypeMessageEntity[]];
    unparse: (text: string, entities: Api.TypeMessageEntity[]) => string;
}

export interface SendMessageParams {
    message?: Api.TypeMessageLike;
    replyTo?: number | Api.Message;
    attributes?: Api.TypeDocumentAttribute[];
    // deno-lint-ignore no-explicit-any
    parseMode?: any;
    formattingEntities?: Api.TypeMessageEntity[];
    linkPreview?: boolean;
    file?: Api.TypeFileLike | Api.TypeFileLike[];
    thumb?: Api.TypeFileLike;
    forceDocument?: false;
    clearDraft?: false;
    buttons?: Api.TypeMarkupLike;
    silent?: boolean;
    supportStreaming?: boolean;
    schedule?: DateLike;
    noforwards?: boolean;
    commentTo?: number | Api.Message;
}

export interface ForwardMessagesParams {
    messages: Api.TypeMessageIDLike | Api.TypeMessageIDLike[];
    fromPeer: Api.TypeEntityLike;
    silent?: boolean;
    schedule?: DateLike;
    noforwards?: boolean;
}

export interface EditMessageParams {
    message: Api.Message | number;
    text?: string;
    // deno-lint-ignore no-explicit-any
    parseMode?: any;
    formattingEntities?: Api.TypeMessageEntity[];
    linkPreview?: boolean;
    file?: Api.TypeFileLike;
    forceDocument?: false;
    buttons?: Api.TypeMarkupLike;
    schedule?: DateLike;
}

export interface UpdatePinMessageParams {
    notify?: boolean;
    pmOneSide?: boolean;
}

export interface MarkAsReadParams {
    maxId?: number;
    clearMentions?: boolean;
}

export interface MessageIterParams {
    entity: Api.TypeEntityLike;
    offsetId: number;
    minId: number;
    maxId: number;
    fromUser?: Api.TypeEntityLike;
    offsetDate: DateLike;
    addOffset: number;
    // deno-lint-ignore no-explicit-any
    filter: any;
    search: string;
    replyTo: Api.TypeMessageIDLike;
}

export interface IterMessagesParams {
    limit?: number;
    offsetDate?: DateLike;
    offsetId: number;
    maxId: number;
    minId: number;
    addOffset: number;
    search?: string;
    filter?: Api.TypeMessagesFilter | Api.TypeMessagesFilter[];
    fromUser?: Api.TypeEntityLike;
    waitTime?: number;
    ids?: number | number[] | Api.TypeInputMessage | Api.TypeInputMessage[];
    reverse?: boolean;
    replyTo?: number;
    scheduled: boolean;
}

export interface OnProgress {
    (progress: number): void;
    isCanceled?: boolean;
}

/**
 * interface for uploading files.
 */
export interface UploadFileParams {
    /** for browsers this should be an instance of File.<br/>
     * On node you should use {@link CustomFile} class to wrap your file.
     */
    file: File | CustomFile;
    /** How many workers to use to upload the file. anything above 16 is unstable. */
    workers: number;
    /** a progress callback for the upload. */
    onProgress?: OnProgress;
}

export interface SendFileInterface {
    file: Api.TypeFileLike | Api.TypeFileLike[];
    caption?: string | string[];
    forceDocument?: boolean;
    fileSize?: number;
    clearDraft?: boolean;
    progressCallback?: OnProgress;
    replyTo?: Api.TypeMessageIDLike;
    attributes?: Api.TypeDocumentAttribute[];
    thumb?: Api.TypeFileLike;
    voiceNote?: boolean;
    videoNote?: boolean;
    supportsStreaming?: boolean;
    // deno-lint-ignore no-explicit-any
    parseMode?: any;
    formattingEntities?: Api.TypeMessageEntity[];
    silent?: boolean;
    scheduleDate?: number;
    buttons?: Api.TypeMarkupLike;
    workers?: number;
    noforwards?: boolean;
    commentTo?: number | Api.Message;
}

export interface IterParticipantsParams {
    limit?: number;
    search?: string;
    filter?: Api.TypeChannelParticipantsFilter;
    showTotal?: boolean;
}

export interface IterDialogsParams {
    limit?: number;
    offsetDate?: DateLike;
    offsetId?: number;
    offsetPeer?: Api.TypeEntityLike;
    ignorePinned?: boolean;
    ignoreMigrated?: boolean;
    folder?: number;
    archived?: boolean;
}

export interface DownloadFileParams {
    dcId: number;
    fileSize?: number;
    workers?: number;
    partSizeKb?: number;
    start?: number;
    end?: number;
    progressCallback?: progressCallback;
}

export interface DownloadFileParamsV2 {
    outputFile?: OutFile;
    dcId?: number;
    fileSize?: bigInt.BigInteger;
    partSizeKb?: number;
    progressCallback?: progressCallback;
    msgData?: [Api.TypeEntityLike, number];
}

export interface DownloadProfilePhotoParams {
    isBig?: boolean;
}

export interface DirectDownloadIterInterface {
    fileLocation: Api.TypeInputFileLocation;
    dcId: number;
    offset: bigInt.BigInteger;
    stride: number;
    chunkSize: number;
    requestSize: number;
    fileSize: number;
    msgData: number;
}

export interface progressCallback {
    (
        downloaded: bigInt.BigInteger,
        fullSize: bigInt.BigInteger,
        // deno-lint-ignore no-explicit-any
        ...args: any[]
    ): void;
    isCanceled?: boolean;
    acceptsBuffer?: boolean;
}

export interface IterDownloadFunction {
    file?: Api.TypeMessageMedia | Api.TypeInputFile | Api.TypeInputFileLocation;
    offset?: bigInt.BigInteger;
    stride?: number;
    limit?: number;
    chunkSize?: number;
    requestSize: number;
    fileSize?: bigInt.BigInteger;
    dcId?: number;
    msgData?: [Api.TypeEntityLike, number];
}

export interface ReturnString {
    (): string;
}

export interface BotAuthParams {
    botAuthToken: string | ReturnString;
}

export interface ApiCredentials {
    apiId: number;
    apiHash: string;
}

export interface UserPasswordAuthParams {
    /** optional string or callback that should return the 2FA password if present.<br/>
     *  the password hint will be sent in the hint param */
    password?: (hint?: string) => Promise<string>;
    /** when an error happens during auth this function will be called with the error.<br/>
     *  if this returns true the auth operation will stop. */
    onError: (err: Error) => Promise<boolean> | void;
}

export type MaybePromise<T> = T | Promise<T>;

/**
 * For when you want to login as a {@link Api.User}<br/>
 * this should handle all needed steps for authorization as a user.<br/>
 * to stop the operation at any point just raise and error with the message `AUTH_USER_CANCEL`.
 */
export interface UserAuthParams {
    /** Either a string or a callback that returns a string for the phone to use to login. */
    phoneNumber: string | (() => Promise<string>);
    /** callback that should return the login code that telegram sent.<br/>
     *  has optional bool `isCodeViaApp` param for whether the code was sent through the app (true) or an SMS (false). */
    phoneCode: (isCodeViaApp?: boolean) => Promise<string>;
    /** optional string or callback that should return the 2FA password if present.<br/>
     *  the password hint will be sent in the hint param */
    password?: (hint?: string) => Promise<string>;
    /** in case of a new account creation this callback should return a first name and last name `[first,last]`. */
    firstAndLastNames?: () => Promise<[string, string?]>;
    /** a qrCode token for login through qrCode.<br/>
     *  this would need a QR code that you should scan with another app to login with. */
    qrCode?: (qrCode: { token: Buffer; expires: number }) => Promise<void>;
    /** when an error happens during auth this function will be called with the error.<br/>
     *  if this returns true the auth operation will stop. */
    onError: (err: Error) => Promise<boolean> | void;
    /** whether to send the code through SMS or not. */
    forceSMS?: boolean;
}

export interface QrCodeAuthParams extends UserPasswordAuthParams {
    /** a qrCode token for login through qrCode.<br/>
     *  this would need a QR code that you should scan with another app to login with. */
    qrCode?: (qrCode: { token: Buffer; expires: number }) => Promise<void>;
    /** when an error happens during auth this function will be called with the error.<br/>
     *  if this returns true the auth operation will stop. */
    onError: (err: Error) => Promise<boolean> | void;
}

export interface TwoFaParams {
    isCheckPassword?: boolean;
    currentPassword?: string;
    newPassword?: string;
    hint?: string;
    email?: string;
    emailCodeCallback?: (length: number) => Promise<string>;
    onEmailCodeError?: (err: Error) => void;
}

export interface DownloadMediaInterface {
    outputFile?: OutFile;
    thumb?: number | Api.TypePhotoSize;
    progressCallback?: ProgressCallback;
}

export interface FileToMediaInterface {
    file: Api.TypeFileLike;
    forceDocument?: boolean;
    fileSize?: number;
    progressCallback?: OnProgress;
    attributes?: Api.TypeDocumentAttribute[];
    thumb?: Api.TypeFileLike;
    voiceNote?: boolean;
    videoNote?: boolean;
    supportsStreaming?: boolean;
    mimeType?: string;
    asImage?: boolean;
    workers?: number;
}

export interface ParseInterface {
    parse: (message: string) => [string, Api.TypeMessageEntity[]];
    unparse: (text: string, entities: Api.TypeMessageEntity[]) => string;
}

/**
 * Interface for sending a message. only message is required
 */
export interface SendMessageParams {
    /**  The message to be sent, or another message object to resend as a copy.<br/>
     * The maximum length for a message is 35,000 bytes or 4,096 characters.<br/>
     * Longer messages will not be sliced automatically, and you should slice them manually if the text to send is longer than said length. */
    message?: Api.TypeMessageLike;
    /** Whether to reply to a message or not. If an integer is provided, it should be the ID of the message that it should reply to. */
    replyTo?: number | Api.Message;
    /** Optional attributes that override the inferred ones, like DocumentAttributeFilename and so on. */
    attributes?: Api.TypeDocumentAttribute[];
    /** See the {@link parseMode} property for allowed values. Markdown parsing will be used by default. */
    parseMode?: any;
    /** A list of message formatting entities. When provided, the parseMode is ignored. */
    formattingEntities?: Api.TypeMessageEntity[];
    /** Should the link preview be shown? */
    linkPreview?: boolean;
    /** Sends a message with a file attached (e.g. a photo, video, audio or document). The message may be empty. */
    file?: Api.TypeFileLike | Api.TypeFileLike[];
    /** Optional JPEG thumbnail (for documents). Telegram will ignore this parameter unless you pass a .jpg file!<br/>
     * The file must also be small in dimensions and in disk size. Successful thumbnails were files below 20kB and 320x320px.<br/>
     *  Width/height and dimensions/size ratios may be important.
     *  For Telegram to accept a thumbnail, you must provide the dimensions of the underlying media through `attributes:` with DocumentAttributesVideo.
     */
    thumb?: Api.TypeFileLike;
    /** Whether to send the given file as a document or not. */
    forceDocument?: false;
    /** Whether the existing draft should be cleared or not. */
    clearDraft?: false;
    /** The matrix (list of lists), row list or button to be shown after sending the message.<br/>
     *  This parameter will only work if you have signed in as a bot. You can also pass your own ReplyMarkup here.<br/>
     *  <br/>
     *  All the following limits apply together:
     *   - There can be 100 buttons at most (any more are ignored).
     *   - There can be 8 buttons per row at most (more are ignored).
     *   - The maximum callback data per button is 64 bytes.
     *   - The maximum data that can be embedded in total is just over 4KB, shared between inline callback data and text.
     */
    buttons?: Api.TypeMarkupLike;
    /** Whether the message should notify people in a broadcast channel or not. Defaults to false, which means it will notify them. Set it to True to alter this behaviour. */
    silent?: boolean;
    /** Whether the sent video supports streaming or not.<br/>
     *  Note that Telegram only recognizes as streamable some formats like MP4, and others like AVI or MKV will not work.<br/>
     *  You should convert these to MP4 before sending if you want them to be streamable. Unsupported formats will result in VideoContentTypeError. */
    supportStreaming?: boolean;
    /** If set, the message won't send immediately, and instead it will be scheduled to be automatically sent at a later time. */
    schedule?: DateLike;
    noforwards?: boolean;
    /** Similar to ``replyTo``, but replies in the linked group of a broadcast channel instead (effectively leaving a "comment to" the specified message).

     This parameter takes precedence over ``replyTo``.
     If there is no linked chat, `SG_ID_INVALID` is thrown.
     */
    commentTo?: number | Api.Message;
}

/** interface used for forwarding messages */
export interface ForwardMessagesParams {
    /** The message(s) to forward, or their integer IDs. */
    messages: Api.TypeMessageIDLike | Api.TypeMessageIDLike[];
    /** If the given messages are integer IDs and not instances of the Message class, this must be specified in order for the forward to work.<br/> */
    fromPeer: Api.TypeEntityLike;
    /** Whether the message should notify people with sound or not.<br/>
     * Defaults to false (send with a notification sound unless the person has the chat muted). Set it to true to alter this behaviour. */
    silent?: boolean;
    /** If set, the message(s) won't forward immediately, and instead they will be scheduled to be automatically sent at a later time. */
    schedule?: DateLike;
    noforwards?: boolean;
}

/** Interface for editing messages */
export interface EditMessageParams {
    /** The ID of the message (or Message itself) to be edited. If the entity was a Message, then this message will be treated as the new text. */
    message: Api.Message | number;
    /** The new text of the message. Does nothing if the entity was a Message. */
    text?: string;
    /** See the {@link TelegramClient.parseMode} property for allowed values. Markdown parsing will be used by default. */
    parseMode?: any;
    /** A list of message formatting entities. When provided, the parseMode is ignored. */
    formattingEntities?: Api.TypeMessageEntity[];
    /** Should the link preview be shown? */
    linkPreview?: boolean;
    /** The file object that should replace the existing media in the message. Does nothing if entity was a Message */
    file?: Api.TypeFileLike;
    /** Whether to send the given file as a document or not. */
    forceDocument?: false;
    /** The matrix (list of lists), row list or button to be shown after sending the message.<br/>
     *  This parameter will only work if you have signed in as a bot. You can also pass your own ReplyMarkup here.<br/>
     *  <br/>
     *  All the following limits apply together:
     *   - There can be 100 buttons at most (any more are ignored).
     *   - There can be 8 buttons per row at most (more are ignored).
     *   - The maximum callback data per button is 64 bytes.
     *   - The maximum data that can be embedded in total is just over 4KB, shared between inline callback data and text.
     */
    buttons?: Api.TypeMarkupLike;
    /** If set, the message won't be edited immediately, and instead it will be scheduled to be automatically edited at a later time. */
    schedule?: DateLike;
}

/** Interface for editing messages */
export interface UpdatePinMessageParams {
    /** Whether the pin should notify people or not. <br />
     *  By default it has the opposite behavior of official clients, it will not notify members.
     */
    notify?: boolean;
    /** Whether the message should be pinned for everyone or not. <br />
     *  By default it has the opposite behavior of official clients, and it will pin the message for both sides, in private chats.
     */
    pmOneSide?: boolean;
}

/** Interface for mark message as read */
export interface MarkAsReadParams {
    /**
     * Until which message should the read acknowledge be sent for. <br />
     * This has priority over the `message` parameter.
     */
    maxId?: number;
    /**
     * Whether the mention badge should be cleared (so that there are no more mentions) or not for the given entity. <br />
     * If no message is provided, this will be the only action taken.
     */
    clearMentions?: boolean;
}
