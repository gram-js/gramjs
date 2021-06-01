import {Api} from '../tl';

import type {TelegramClient} from './TelegramClient';
import {generateRandomBytes, readBigIntFromBuffer, sleep} from '../Helpers';
import {getAppropriatedPartSize, getAttributes} from '../Utils';
import type {EntityLike, FileLike, MessageIDLike} from "../define";
import path from "path";
import fs from "fs";

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

    constructor(name: string, size: number, path: string) {
        this.name = name;
        this.size = size;
        this.path = path;
    }
}

const KB_TO_BYTES = 1024;
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;
const UPLOAD_TIMEOUT = 15 * 1000;

export async function uploadFile(
    client: TelegramClient,
    fileParams: UploadFileParams,
): Promise<Api.InputFile | Api.InputFileBig> {
    const {file, onProgress} = fileParams;
    let {workers} = fileParams;

    const {name, size} = file;
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

            sendingParts.push((async () => {
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
                        }),
                );

                if (onProgress) {
                    if (onProgress.isCanceled) {
                        throw new Error('USER_CANCELED');
                    }

                    progress += (1 / partCount);
                    onProgress(progress);
                }
            })());

        }
        try {
            await Promise.race([
                await Promise.all(sendingParts),
                sleep(UPLOAD_TIMEOUT * workers).then(() => Promise.reject(new Error('TIMEOUT'))),
            ]);
        } catch (err) {
            if (err.message === 'TIMEOUT') {
                console.warn('Upload timeout. Retrying...');
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
            md5Checksum: '', // This is not a "flag", so not sure if we can make it optional.
        });
}

export interface SendFileInterface {
    file: string | CustomFile | File,
    caption?: string,
    forceDocument?: boolean,
    fileSize?: number,
    progressCallback?: OnProgress,
    replyTo?: MessageIDLike,
    attributes?: Api.TypeDocumentAttribute[],
    thumb?: FileLike,
    voiceNote?: boolean,
    videoNote?: boolean,
    supportStreaming?: boolean,
    parseMode?: any,
    formattingEntities?: Api.TypeMessageEntity[],
    silent?: boolean;
    background?: boolean;
    clearDraft?: boolean;
    replyMarkup?: Api.TypeReplyMarkup;
    scheduleDate?: number;

}

export async function sendFile(client: TelegramClient, entity: EntityLike,
                               {   file,
                                   caption,
                                   forceDocument,
                                   fileSize,
                                   progressCallback,
                                   replyTo,
                                   attributes,
                                   thumb, voiceNote,
                                   videoNote,
                                   supportStreaming,
                                   parseMode, formattingEntities,
                                   scheduleDate,
                                   replyMarkup,
                                   clearDraft,
                               }: SendFileInterface) {
    if (!file) {
        throw new Error("You need to specify a file");
    }
    if (!caption) {
        caption = ""
    }
    if (formattingEntities == undefined) {
        [caption, formattingEntities] = await client._parseMessageText(caption, parseMode);
    }

    if (typeof file == "string") {
        file = new CustomFile(path.basename(file), fs.statSync(file).size, file);
    }
    const media = await client.uploadFile({
        file: file,
        workers: 1,
        onProgress: progressCallback,
    });
    if (!attributes) {
        attributes = [];
    }
    let mimeType = "application/octet-stream";
    if (file instanceof CustomFile) {
        const result = (getAttributes(file, {
            attributes: attributes,
            forceDocument: forceDocument,
            voiceNote: voiceNote,
            videoNote: videoNote,
            supportsStreaming: supportStreaming,
            thumb: thumb
        }));
        mimeType = result.mimeType;
        attributes.push(...result.attrs);
    }
    let toSend;
    if (mimeType.startsWith("photo/") || mimeType.startsWith("image/")) {
        toSend = new Api.InputMediaUploadedPhoto({
            file: media,
        })
    } else {
        toSend = new Api.InputMediaUploadedDocument({
            file: media,
            mimeType: mimeType,
            attributes: attributes,
            forceFile: forceDocument,
        })
    }
    const result = await client.invoke(new Api.messages.SendMedia({
        peer: entity,
        media: toSend,
        replyToMsgId: replyTo,
        message: caption,
        entities:formattingEntities,
        scheduleDate,
        replyMarkup,
        clearDraft,
    }));
    // TODO get result
    return result;
}

function fileToBuffer(file: File | CustomFile) {
    if (typeof File !== 'undefined' && file instanceof File) {
        return new Response(file).arrayBuffer();
    } else if (file instanceof CustomFile) {
        return fs.readFileSync(file.path);
    } else {
        throw new Error("Could not create buffer from file " + file);
    }
}
