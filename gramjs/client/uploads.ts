import { Api } from "../tl";

import { TelegramClient } from "./TelegramClient";
import { generateRandomBytes, readBigIntFromBuffer, sleep } from "../Helpers";
import { getAppropriatedPartSize, getAttributes } from "../Utils";
import { EntityLike, FileLike, MarkupLike, MessageIDLike } from "../define";
import path from "path";
import { promises as fs } from "fs";
import { utils } from "../index";

interface OnProgress {
    // Float between 0 and 1.
    (progress: number): void;

    isCanceled?: boolean;
}

export interface UploadFileParams {
    file: File | CustomFile;
    workers: number;
    onProgress?: OnProgress;
}

export class CustomFile {
    name: string;
    size: number;
    path: string;
    buffer?: Buffer;

    constructor(name: string, size: number, path: string, buffer?: Buffer) {
        this.name = name;
        this.size = size;
        this.path = path;
        this.buffer = buffer;
    }
}

const KB_TO_BYTES = 1024;
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;
const UPLOAD_TIMEOUT = 15 * 1000;

export async function uploadFile(
    client: TelegramClient,
    fileParams: UploadFileParams
): Promise<Api.InputFile | Api.InputFileBig> {
    const { file, onProgress } = fileParams;
    let { workers } = fileParams;

    const { name, size } = file;
    const fileId = readBigIntFromBuffer(generateRandomBytes(8), true, true);
    const isLarge = size > LARGE_FILE_THRESHOLD;

    const partSize = getAppropriatedPartSize(size) * KB_TO_BYTES;
    const partCount = Math.floor((size + partSize - 1) / partSize);
    const buffer = Buffer.from(await fileToBuffer(file));

    // We always upload from the DC we are in.
    const sender = await client._borrowExportedSender(client.session.dcId);

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
        let sendingParts = [];
        let end = i + workers;
        if (end > partCount) {
            end = partCount;
        }

        for (let j = i; j < end; j++) {
            const bytes = buffer.slice(j * partSize, (j + 1) * partSize);

            sendingParts.push(
                (async () => {
                    await sender.send(
                        isLarge
                            ? new Api.upload.SaveBigFilePart({
                                  fileId,
                                  filePart: j,
                                  fileTotalParts: partCount,
                                  bytes,
                              })
                            : new Api.upload.SaveFilePart({
                                  fileId,
                                  filePart: j,
                                  bytes,
                              })
                    );

                    if (onProgress) {
                        if (onProgress.isCanceled) {
                            throw new Error("USER_CANCELED");
                        }

                        progress += 1 / partCount;
                        onProgress(progress);
                    }
                })()
            );
        }
        try {
            await Promise.race([
                await Promise.all(sendingParts),
                sleep(UPLOAD_TIMEOUT * workers).then(() =>
                    Promise.reject(new Error("TIMEOUT"))
                ),
            ]);
        } catch (err) {
            if (err.message === "TIMEOUT") {
                console.warn("Upload timeout. Retrying...");
                i -= workers;
                continue;
            }

            throw err;
        }
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

export interface SendFileInterface {
    file: FileLike;
    caption?: string;
    forceDocument?: boolean;
    fileSize?: number;
    clearDraft?: boolean;
    progressCallback?: OnProgress;
    replyTo?: MessageIDLike;
    attributes?: Api.TypeDocumentAttribute[];
    thumb?: FileLike;
    voiceNote?: boolean;
    videoNote?: boolean;
    supportsStreaming?: boolean;
    parseMode?: any;
    formattingEntities?: Api.TypeMessageEntity[];
    silent?: boolean;
    background?: boolean;
    replyMarkup?: Api.TypeReplyMarkup;
    scheduleDate?: number;
    buttons?: MarkupLike;
    workers?: number;
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

async function _fileToMedia(
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
        "read" in file
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
    } else if (!(typeof file == "string") || (await fs.lstat(file)).isFile()) {
        if (typeof file == "string") {
            createdFile = new CustomFile(
                path.basename(file),
                (await fs.stat(file)).size,
                file
            );
        } else if (typeof File !== "undefined" && file instanceof File) {
            createdFile = file;
        } else {
            let name;
            if ("name" in file) {
                name = file.name;
            } else {
                name = "unnamed";
            }
            if (file instanceof Buffer) {
                createdFile = new CustomFile(name, file.length, "", file);
            }
        }
        if (!createdFile) {
            throw new Error(`Could not create file from ${file}`);
        }
        fileHandle = await uploadFile(client, {
            file: createdFile,
            onProgress: progressCallback,
            workers: workers,
        });
    } else if (file.startsWith("https://") || file.startsWith("http://")) {
        if (asImage) {
            media = new Api.InputMediaPhotoExternal({ url: file });
        } else {
            media = new Api.InputMediaPhotoExternal({ url: file });
        }
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
                if (thumb instanceof Buffer) {
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
    }: SendFileInterface
) {
    if (!file) {
        throw new Error("You need to specify a file");
    }
    if (!caption) {
        caption = "";
    }
    entity = await client.getInputEntity(entity);
    replyTo = utils.getMessageId(replyTo);
    // TODO support albums in the future
    let msgEntities;
    if (formattingEntities != undefined) {
        msgEntities = formattingEntities;
    } else {
        [caption, formattingEntities] = await client._parseMessageText(
            caption,
            parseMode
        );
    }

    const { fileHandle, media, image } = await _fileToMedia(client, {
        file: file,
        forceDocument: forceDocument,
        fileSize: fileSize,
        progressCallback: progressCallback,
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
    const request = new Api.messages.SendMedia({
        peer: entity,
        media: media,
        replyToMsgId: replyTo,
        message: caption,
        entities: msgEntities,
        replyMarkup: markup,
        silent: silent,
        scheduleDate: scheduleDate,
        clearDraft: clearDraft,
    });
    // todo get message
    const result = client.invoke(request);
    return client._getResponseMessage(request, result, entity);
}

function fileToBuffer(file: File | CustomFile) {
    if (typeof File !== "undefined" && file instanceof File) {
        return new Response(file).arrayBuffer();
    } else if (file instanceof CustomFile) {
        if (file.buffer != undefined) {
            return file.buffer;
        } else {
            return fs.readFile(file.path);
        }
    } else {
        throw new Error("Could not create buffer from file " + file);
    }
}
