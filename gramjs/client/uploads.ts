import { Api } from "../tl";

import { TelegramClient } from "./TelegramClient";
import { generateRandomBytes, readBigIntFromBuffer, sleep } from "../Helpers";
import { getAppropriatedPartSize, getInputMedia, getMessageId } from "../Utils";
import { EntityLike, FileLike, MarkupLike, MessageIDLike } from "../define";
import path from "./path";
import { promises as fs } from "./fs";
import { errors, utils } from "../index";
import { _parseMessageText } from "./messageParse";
import { getCommentData } from "./messages";
import bigInt from "big-integer";

interface OnProgress {
    // Float between 0 and 1.
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
export class CustomFile {
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

    constructor(name: string, size: number, path: string, buffer?: Buffer) {
        this.name = name;
        this.size = size;
        this.path = path;
        this.buffer = buffer;
    }
}

interface CustomBufferOptions {
    filePath?: string;
    buffer?: Buffer;
}

class CustomBuffer {
    constructor(private readonly options: CustomBufferOptions) {
        if (!options.buffer && !options.filePath) {
            throw new Error(
                "Either one of `buffer` or `filePath` should be specified"
            );
        }
    }

    async slice(begin: number, end: number): Promise<Buffer> {
        const { buffer, filePath } = this.options;
        if (buffer) {
            return buffer.slice(begin, end);
        } else if (filePath) {
            const buffSize = end - begin;
            const buff = Buffer.alloc(buffSize);
            const fHandle = await fs.open(filePath, "r");

            await fHandle.read(buff, 0, buffSize, begin);
            await fHandle.close();

            return Buffer.from(buff);
        }

        return Buffer.alloc(0);
    }
}

const KB_TO_BYTES = 1024;
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;
const UPLOAD_TIMEOUT = 15 * 1000;
const DISCONNECT_SLEEP = 1000;
const BUFFER_SIZE_2GB = 2 ** 31;
const BUFFER_SIZE_20MB = 20 * 1024 * 1024;

async function getFileBuffer(
    file: File | CustomFile,
    fileSize: number,
    maxBufferSize: number
): Promise<CustomBuffer> {
    const options: CustomBufferOptions = {};
    if (fileSize > maxBufferSize && file instanceof CustomFile) {
        options.filePath = file.path;
    } else {
        options.buffer = Buffer.from(await fileToBuffer(file));
    }

    return new CustomBuffer(options);
}

/** @hidden */
export async function uploadFile(
    client: TelegramClient,
    fileParams: UploadFileParams
): Promise<Api.InputFile | Api.InputFileBig> {
    const { file, onProgress } = fileParams;
    let { workers } = fileParams;

    const { name, size } = file;
    const fileId = readBigIntFromBuffer(generateRandomBytes(8), true, true);
    const isLarge = size > LARGE_FILE_THRESHOLD;

    const partSize = getAppropriatedPartSize(bigInt(size)) * KB_TO_BYTES;
    const partCount = Math.floor((size + partSize - 1) / partSize);
    const buffer = await getFileBuffer(
        file,
        size,
        fileParams.maxBufferSize || BUFFER_SIZE_20MB - 1
    );

    // Make sure a new sender can be created before starting upload
    await client.getSender(client.session.dcId);

    if (!workers || !size) {
        workers = 1;
    }
    if (workers >= partCount) {
        workers = partCount;
    }

    let progress = 0;
    if (onProgress) {
        onProgress(progress);
    }

    for (let i = 0; i < partCount; i += workers) {
        const sendingParts = [];
        let end = i + workers;
        if (end > partCount) {
            end = partCount;
        }

        for (let j = i; j < end; j++) {
            let endPart = (j + 1) * partSize;
            if (endPart > size) {
                endPart = size;
            }
            if (endPart == j * partSize) {
                break;
            }

            const bytes = await buffer.slice(j * partSize, endPart);

            // eslint-disable-next-line no-loop-func
            sendingParts.push(
                (async (jMemo: number, bytesMemo: Buffer) => {
                    while (true) {
                        let sender;
                        try {
                            // We always upload from the DC we are in
                            sender = await client.getSender(
                                client.session.dcId
                            );
                            await sender.send(
                                isLarge
                                    ? new Api.upload.SaveBigFilePart({
                                          fileId,
                                          filePart: jMemo,
                                          fileTotalParts: partCount,
                                          bytes: bytesMemo,
                                      })
                                    : new Api.upload.SaveFilePart({
                                          fileId,
                                          filePart: jMemo,
                                          bytes: bytesMemo,
                                      })
                            );
                        } catch (err: any) {
                            if (sender && !sender.isConnected()) {
                                await sleep(DISCONNECT_SLEEP);
                                continue;
                            } else if (err instanceof errors.FloodWaitError) {
                                await sleep(err.seconds * 1000);
                                continue;
                            }
                            throw err;
                        }

                        if (onProgress) {
                            if (onProgress.isCanceled) {
                                throw new Error("USER_CANCELED");
                            }

                            progress += 1 / partCount;
                            onProgress(progress);
                        }
                        break;
                    }
                })(j, bytes)
            );
        }

        await Promise.all(sendingParts);
    }

    return isLarge
        ? new Api.InputFileBig({
              id: fileId,
              parts: partCount,
              name,
          })
        : new Api.InputFile({
              id: fileId,
              parts: partCount,
              name,
              md5Checksum: "", // This is not a "flag", so not sure if we can make it optional.
          });
}

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
export async function _fileToMedia(
    client: TelegramClient,
    {
        file,
        forceDocument,
        fileSize,
        progressCallback,
        attributes,
        thumb,
        voiceNote = false,
        videoNote = false,
        supportsStreaming = false,
        mimeType,
        asImage,
        workers = 1,
    }: FileToMediaInterface
): Promise<{
    fileHandle?: any;
    media?: Api.TypeInputMedia;
    image?: boolean;
}> {
    if (!file) {
        return { fileHandle: undefined, media: undefined, image: undefined };
    }
    const isImage = utils.isImage(file);

    if (asImage == undefined) {
        asImage = isImage && !forceDocument;
    }
    if (
        typeof file == "object" &&
        !Buffer.isBuffer(file) &&
        !(file instanceof Api.InputFile) &&
        !(file instanceof Api.InputFileBig) &&
        !(file instanceof CustomFile) &&
        !("read" in file)
    ) {
        try {
            return {
                fileHandle: undefined,
                media: utils.getInputMedia(file, {
                    isPhoto: asImage,
                    attributes: attributes,
                    forceDocument: forceDocument,
                    voiceNote: voiceNote,
                    videoNote: videoNote,
                    supportsStreaming: supportsStreaming,
                }),
                image: asImage,
            };
        } catch (e) {
            return {
                fileHandle: undefined,
                media: undefined,
                image: isImage,
            };
        }
    }
    let media;
    let fileHandle;
    let createdFile;

    if (file instanceof Api.InputFile || file instanceof Api.InputFileBig) {
        fileHandle = file;
    } else if (
        typeof file == "string" &&
        (file.startsWith("https://") || file.startsWith("http://"))
    ) {
        if (asImage) {
            media = new Api.InputMediaPhotoExternal({ url: file });
        } else {
            media = new Api.InputMediaDocumentExternal({ url: file });
        }
    } else if (!(typeof file == "string") || (await fs.lstat(file)).isFile()) {
        if (typeof file == "string") {
            createdFile = new CustomFile(
                path.basename(file),
                (await fs.stat(file)).size,
                file
            );
        } else if (
            (typeof File !== "undefined" && file instanceof File) ||
            file instanceof CustomFile
        ) {
            createdFile = file;
        } else {
            let name;
            if ("name" in file) {
                // @ts-ignore
                name = file.name;
            } else {
                name = "unnamed";
            }
            if (Buffer.isBuffer(file)) {
                createdFile = new CustomFile(name, file.length, "", file);
            }
        }
        if (!createdFile) {
            throw new Error(
                `Could not create file from ${JSON.stringify(file)}`
            );
        }
        fileHandle = await uploadFile(client, {
            file: createdFile,
            onProgress: progressCallback,
            workers: workers,
        });
    } else {
        throw new Error(`"Not a valid path nor a url ${file}`);
    }
    if (media != undefined) {
    } else if (fileHandle == undefined) {
        throw new Error(
            `Failed to convert ${file} to media. Not an existing file or an HTTP URL`
        );
    } else if (asImage) {
        media = new Api.InputMediaUploadedPhoto({
            file: fileHandle,
        });
    } else {
        // @ts-ignore
        let res = utils.getAttributes(file, {
            mimeType: mimeType,
            attributes: attributes,
            forceDocument: forceDocument && !isImage,
            voiceNote: voiceNote,
            videoNote: videoNote,
            supportsStreaming: supportsStreaming,
            thumb: thumb,
        });
        attributes = res.attrs;
        mimeType = res.mimeType;

        let uploadedThumb;
        if (!thumb) {
            uploadedThumb = undefined;
        } else {
            // todo refactor
            if (typeof thumb == "string") {
                uploadedThumb = new CustomFile(
                    path.basename(thumb),
                    (await fs.stat(thumb)).size,
                    thumb
                );
            } else if (typeof File !== "undefined" && thumb instanceof File) {
                uploadedThumb = thumb;
            } else {
                let name;
                if ("name" in thumb) {
                    name = thumb.name;
                } else {
                    name = "unnamed";
                }
                if (Buffer.isBuffer(thumb)) {
                    uploadedThumb = new CustomFile(
                        name,
                        thumb.length,
                        "",
                        thumb
                    );
                }
            }
            if (!uploadedThumb) {
                throw new Error(`Could not create file from ${file}`);
            }
            uploadedThumb = await uploadFile(client, {
                file: uploadedThumb,
                workers: 1,
            });
        }
        media = new Api.InputMediaUploadedDocument({
            file: fileHandle,
            mimeType: mimeType,
            attributes: attributes,
            thumb: uploadedThumb,
            forceFile: forceDocument && !isImage,
        });
    }
    return {
        fileHandle: fileHandle,
        media: media,
        image: asImage,
    };
}

/** @hidden */
export async function _sendAlbum(
    client: TelegramClient,
    entity: EntityLike,
    {
        file,
        caption,
        forceDocument = false,
        fileSize,
        clearDraft = false,
        progressCallback,
        replyTo,
        attributes,
        thumb,
        parseMode,
        voiceNote = false,
        videoNote = false,
        silent,
        supportsStreaming = false,
        scheduleDate,
        workers = 1,
        noforwards,
        commentTo,
        topMsgId,
    }: SendFileInterface
) {
    entity = await client.getInputEntity(entity);
    let files = [];
    if (!Array.isArray(file)) {
        files = [file];
    } else {
        files = file;
    }
    if (!Array.isArray(caption)) {
        if (!caption) {
            caption = "";
        }
        caption = [caption];
    }
    const captions: [string, Api.TypeMessageEntity[]][] = [];
    for (const c of caption) {
        captions.push(await _parseMessageText(client, c, parseMode));
    }
    if (commentTo != undefined) {
        const discussionData = await getCommentData(client, entity, commentTo);
        entity = discussionData.entity;
        replyTo = discussionData.replyTo;
    } else {
        replyTo = utils.getMessageId(replyTo);
    }
    if (!attributes) {
        attributes = [];
    }

    let index = 0;
    const albumFiles = [];
    for (const file of files) {
        let { fileHandle, media, image } = await _fileToMedia(client, {
            file: file,
            forceDocument: forceDocument,
            fileSize: fileSize,
            progressCallback: progressCallback,
            // @ts-ignore
            attributes: attributes[index],
            thumb: thumb,
            voiceNote: voiceNote,
            videoNote: videoNote,
            supportsStreaming: supportsStreaming,
            workers: workers,
        });
        index++;
        if (
            media instanceof Api.InputMediaUploadedPhoto ||
            media instanceof Api.InputMediaPhotoExternal
        ) {
            const r = await client.invoke(
                new Api.messages.UploadMedia({
                    peer: entity,
                    media,
                })
            );
            if (r instanceof Api.MessageMediaPhoto) {
                media = getInputMedia(r.photo);
            }
        } else if (media instanceof Api.InputMediaUploadedDocument) {
            const r = await client.invoke(
                new Api.messages.UploadMedia({
                    peer: entity,
                    media,
                })
            );
            if (r instanceof Api.MessageMediaDocument) {
                media = getInputMedia(r.document);
            }
        }
        let text = "";
        let msgEntities: Api.TypeMessageEntity[] = [];
        if (captions.length) {
            [text, msgEntities] = captions.shift()!;
        }
        albumFiles.push(
            new Api.InputSingleMedia({
                media: media!,
                message: text,
                entities: msgEntities,
            })
        );
    }
    let replyObject = undefined;
    if (replyTo != undefined) {
        replyObject = new Api.InputReplyToMessage({
            replyToMsgId: getMessageId(replyTo)!,
            topMsgId: getMessageId(topMsgId),
        });
    }

    const result = await client.invoke(
        new Api.messages.SendMultiMedia({
            peer: entity,
            replyTo: replyObject,
            multiMedia: albumFiles,
            silent: silent,
            scheduleDate: scheduleDate,
            clearDraft: clearDraft,
            noforwards: noforwards,
        })
    );
    const randomIds = albumFiles.map((m) => m.randomId);
    return client._getResponseMessage(randomIds, result, entity) as Api.Message;
}

/** @hidden */
export async function sendFile(
    client: TelegramClient,
    entity: EntityLike,
    {
        file,
        caption,
        forceDocument = false,
        fileSize,
        clearDraft = false,
        progressCallback,
        replyTo,
        attributes,
        thumb,
        parseMode,
        formattingEntities,
        voiceNote = false,
        videoNote = false,
        buttons,
        silent,
        supportsStreaming = false,
        scheduleDate,
        workers = 1,
        noforwards,
        commentTo,
        topMsgId,
    }: SendFileInterface
) {
    if (!file) {
        throw new Error("You need to specify a file");
    }
    if (!caption) {
        caption = "";
    }
    entity = await client.getInputEntity(entity);
    if (commentTo != undefined) {
        const discussionData = await getCommentData(client, entity, commentTo);
        entity = discussionData.entity;
        replyTo = discussionData.replyTo;
    } else {
        replyTo = utils.getMessageId(replyTo);
    }
    if (Array.isArray(file)) {
        return await _sendAlbum(client, entity, {
            file: file,
            caption: caption,
            replyTo: replyTo,
            parseMode: parseMode,
            attributes: attributes,
            silent: silent,
            scheduleDate: scheduleDate,
            supportsStreaming: supportsStreaming,
            clearDraft: clearDraft,
            forceDocument: forceDocument,
            noforwards: noforwards,
            topMsgId: topMsgId,
        });
    }
    if (Array.isArray(caption)) {
        caption = caption[0] || "";
    }
    let msgEntities;
    if (formattingEntities != undefined) {
        msgEntities = formattingEntities;
    } else {
        [caption, msgEntities] = await _parseMessageText(
            client,
            caption,
            parseMode
        );
    }

    const { fileHandle, media, image } = await _fileToMedia(client, {
        file: file,
        forceDocument: forceDocument,
        fileSize: fileSize,
        progressCallback: progressCallback,
        // @ts-ignore
        attributes: attributes,
        thumb: thumb,
        voiceNote: voiceNote,
        videoNote: videoNote,
        supportsStreaming: supportsStreaming,
        workers: workers,
    });
    if (media == undefined) {
        throw new Error(`Cannot use ${file} as file.`);
    }
    const markup = client.buildReplyMarkup(buttons);
    let replyObject = undefined;
    if (replyTo != undefined) {
        replyObject = new Api.InputReplyToMessage({
            replyToMsgId: getMessageId(replyTo)!,
            topMsgId: getMessageId(topMsgId),
        });
    }

    const request = new Api.messages.SendMedia({
        peer: entity,
        media: media,
        replyTo: replyObject,
        message: caption,
        entities: msgEntities,
        replyMarkup: markup,
        silent: silent,
        scheduleDate: scheduleDate,
        clearDraft: clearDraft,
        noforwards: noforwards,
    });
    const result = await client.invoke(request);
    return client._getResponseMessage(request, result, entity) as Api.Message;
}

function fileToBuffer(file: File | CustomFile): Promise<Buffer> | Buffer {
    if (typeof File !== "undefined" && file instanceof File) {
        return new Response(file).arrayBuffer() as Promise<Buffer>;
    } else if (file instanceof CustomFile) {
        if (file.buffer != undefined) {
            return file.buffer;
        } else {
            return fs.readFile(file.path) as unknown as Buffer;
        }
    } else {
        throw new Error("Could not create buffer from file " + file);
    }
}
