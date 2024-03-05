/// <reference types="node" />
import { Api } from "../tl";
import { TelegramClient } from "./TelegramClient";
import { EntityLike, FileLike, MarkupLike, MessageIDLike } from "../define";
interface OnProgress {
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
    maxBufferSize?: number;
}
/**
 * A custom file class that mimics the browser's File class.<br/>
 * You should use this whenever you want to upload a file.
 */
export declare class CustomFile {
    /** The name of the file to be uploaded. This is what will be shown in telegram */
    name: string;
    /** The size of the file. this should be the exact size to not lose any information */
    size: number;
    /** The full path on the system to where the file is. this will be used to read the file from.<br/>
     * Can be left empty to use a buffer instead
     */
    path: string;
    /** in case of the no path a buffer can instead be passed instead to upload. */
    buffer?: Buffer;
    constructor(name: string, size: number, path: string, buffer?: Buffer);
}
/** @hidden */
export declare function uploadFile(client: TelegramClient, fileParams: UploadFileParams): Promise<Api.InputFile | Api.InputFileBig>;
/**
 * Interface for sending files to a chat.
 */
export interface SendFileInterface {
    /** a file like object.
     *   - can be a localpath. the file name will be used.
     *   - can be a Buffer with a ".name" attribute to use as the file name.
     *   - can be an external direct URL. Telegram will download the file and send it.
     *   - can be an existing media from another message.
     *   - can be a handle to a file that was received by using {@link uploadFile}
     *   - can be a list when using an album
     *   - can be {@link Api.TypeInputMedia} instance. For example if you want to send a dice you would use {@link Api.InputMediaDice}
     */
    file: FileLike | FileLike[];
    /** Optional caption for the sent media message. can be a list for albums*/
    caption?: string | string[];
    /** If left to false and the file is a path that ends with the extension of an image file or a video file, it will be sent as such. Otherwise always as a document. */
    forceDocument?: boolean;
    /** The size of the file to be uploaded if it needs to be uploaded, which will be determined automatically if not specified. */
    fileSize?: number;
    /** Whether the existing draft should be cleared or not. */
    clearDraft?: boolean;
    /** progress callback that will be called each time a new chunk is downloaded. */
    progressCallback?: OnProgress;
    /** Same as `replyTo` from {@link sendMessage}. */
    replyTo?: MessageIDLike;
    /** Optional attributes that override the inferred ones, like {@link Api.DocumentAttributeFilename} and so on.*/
    attributes?: Api.TypeDocumentAttribute[] | Api.TypeDocumentAttribute[][];
    /** Optional JPEG thumbnail (for documents). Telegram will ignore this parameter unless you pass a .jpg file!<br/>
     * The file must also be small in dimensions and in disk size. Successful thumbnails were files below 20kB and 320x320px.<br/>
     *  Width/height and dimensions/size ratios may be important.
     *  For Telegram to accept a thumbnail, you must provide the dimensions of the underlying media through `attributes:` with DocumentAttributesVideo.
     */
    thumb?: FileLike;
    /** If true the audio will be sent as a voice note. */
    voiceNote?: boolean;
    /** If true the video will be sent as a video note, also known as a round video message.*/
    videoNote?: boolean;
    /** Whether the sent video supports streaming or not.<br/>
     *  Note that Telegram only recognizes as streamable some formats like MP4, and others like AVI or MKV will not work.<br/>
     *  You should convert these to MP4 before sending if you want them to be streamable. Unsupported formats will result in VideoContentTypeError. */
    supportsStreaming?: boolean;
    /** See the {@link parseMode} property for allowed values. Markdown parsing will be used by default. */
    parseMode?: any;
    /** A list of message formatting entities. When provided, the parseMode is ignored. */
    formattingEntities?: Api.TypeMessageEntity[];
    /** Whether the message should notify people in a broadcast channel or not. Defaults to false, which means it will notify them. Set it to True to alter this behaviour. */
    silent?: boolean;
    /**
     * If set, the file won't send immediately, and instead it will be scheduled to be automatically sent at a later time.
     */
    scheduleDate?: number;
    /**
     * The matrix (list of lists), row list or button to be shown after sending the message.<br/>
     * This parameter will only work if you have signed in as a bot. You can also pass your own ReplyMarkup here.
     */
    buttons?: MarkupLike;
    /** How many workers to use to upload the file. anything above 16 is unstable. */
    workers?: number;
    noforwards?: boolean;
    /** Similar to ``replyTo``, but replies in the linked group of a broadcast channel instead (effectively leaving a "comment to" the specified message).

     This parameter takes precedence over ``replyTo``.
     If there is no linked chat, `SG_ID_INVALID` is thrown.
     */
    commentTo?: number | Api.Message;
    /**
     * Used for threads to reply to a specific thread
     */
    topMsgId?: number | Api.Message;
}
interface FileToMediaInterface {
    file: FileLike;
    forceDocument?: boolean;
    fileSize?: number;
    progressCallback?: OnProgress;
    attributes?: Api.TypeDocumentAttribute[];
    thumb?: FileLike;
    voiceNote?: boolean;
    videoNote?: boolean;
    supportsStreaming?: boolean;
    mimeType?: string;
    asImage?: boolean;
    workers?: number;
}
/** @hidden */
export declare function _fileToMedia(client: TelegramClient, { file, forceDocument, fileSize, progressCallback, attributes, thumb, voiceNote, videoNote, supportsStreaming, mimeType, asImage, workers, }: FileToMediaInterface): Promise<{
    fileHandle?: any;
    media?: Api.TypeInputMedia;
    image?: boolean;
}>;
/** @hidden */
export declare function _sendAlbum(client: TelegramClient, entity: EntityLike, { file, caption, forceDocument, fileSize, clearDraft, progressCallback, replyTo, attributes, thumb, parseMode, voiceNote, videoNote, silent, supportsStreaming, scheduleDate, workers, noforwards, commentTo, topMsgId, }: SendFileInterface): Promise<Api.Message>;
/** @hidden */
export declare function sendFile(client: TelegramClient, entity: EntityLike, { file, caption, forceDocument, fileSize, clearDraft, progressCallback, replyTo, attributes, thumb, parseMode, formattingEntities, voiceNote, videoNote, buttons, silent, supportsStreaming, scheduleDate, workers, noforwards, commentTo, topMsgId, }: SendFileInterface): Promise<Api.Message>;
export {};
