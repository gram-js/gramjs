import { Api } from "../tl";
import type { TelegramClient } from "./TelegramClient";
import { getAppropriatedPartSize, strippedPhotoToJpg } from "../Utils";
import { sleep } from "../Helpers";
import { MTProtoSender } from "../network";
import type { Message } from "../tl/custom/message";

export interface progressCallback {
    (
        progress: number, // Float between 0 and 1.
        ...args: any[]
    ): void;

    isCanceled?: boolean;
    acceptsBuffer?: boolean;
}

export interface DownloadFileParams {
    dcId: number;
    fileSize: number;
    workers?: number;
    partSizeKb?: number;
    start?: number;
    end?: number;
    progressCallback?: progressCallback;
}

interface Deferred {
    promise: Promise<any>;
    resolve: (value?: any) => void;
}

// All types
const sizeTypes = ["w", "y", "d", "x", "c", "m", "b", "a", "s"];

// Chunk sizes for `upload.getFile` must be multiple of the smallest size
const MIN_CHUNK_SIZE = 4096;
const DEFAULT_CHUNK_SIZE = 64; // kb
const ONE_MB = 1024 * 1024;
const REQUEST_TIMEOUT = 15000;

export async function downloadFile(
    client: TelegramClient,
    inputLocation: Api.TypeInputFileLocation,
    fileParams: DownloadFileParams
) {
    let { partSizeKb, fileSize, workers = 1, end } = fileParams;
    const { dcId, progressCallback, start = 0 } = fileParams;

    end = end && end < fileSize ? end : fileSize - 1;

    if (!partSizeKb) {
        partSizeKb = fileSize
            ? getAppropriatedPartSize(fileSize)
            : DEFAULT_CHUNK_SIZE;
    }

    // @ts-ignore
    const partSize = partSizeKb * 1024;
    const partsCount = end ? Math.ceil((end - start) / partSize) : 1;

    if (partSize % MIN_CHUNK_SIZE !== 0) {
        throw new Error(
            `The part size must be evenly divisible by ${MIN_CHUNK_SIZE}`
        );
    }

    let sender: MTProtoSender;
    if (dcId) {
        try {
            sender = await client._borrowExportedSender(dcId);
            client._log.debug(`Finished creating sender for ${dcId}`);
        } catch (e) {
            // This should never raise
            client._log.error(e);
            if (e.message === "DC_ID_INVALID") {
                // Can't export a sender for the ID we are currently in
                sender = client._sender;
            } else {
                throw e;
            }
        }
    } else {
        sender = client._sender;
    }

    client._log.info(`Downloading file in chunks of ${partSize} bytes`);

    const foreman = new Foreman(workers);
    const promises: Promise<any>[] = [];
    let offset = start;
    // Used for files with unknown size and for manual cancellations
    let hasEnded = false;

    let progress = 0;
    if (progressCallback) {
        progressCallback(progress);
    }

    while (true) {
        let limit = partSize;
        let isPrecise = false;

        if (
            Math.floor(offset / ONE_MB) !==
            Math.floor((offset + limit - 1) / ONE_MB)
        ) {
            limit = ONE_MB - (offset % ONE_MB);
            isPrecise = true;
        }

        await foreman.requestWorker();

        if (hasEnded) {
            await foreman.releaseWorker();
            break;
        }
        promises.push(
            (async () => {
                try {
                    const result = await Promise.race([
                        await sender.send(
                            new Api.upload.GetFile({
                                location: inputLocation,
                                offset,
                                limit,
                                precise: isPrecise || undefined,
                            })
                        ),
                        sleep(REQUEST_TIMEOUT).then(() =>
                            Promise.reject(new Error("REQUEST_TIMEOUT"))
                        ),
                    ]);

                    if (progressCallback) {
                        if (progressCallback.isCanceled) {
                            throw new Error("USER_CANCELED");
                        }

                        progress += 1 / partsCount;
                        progressCallback(progress);
                    }

                    if (!end && result.bytes.length < limit) {
                        hasEnded = true;
                    }

                    return result.bytes;
                } catch (err) {
                    hasEnded = true;
                    throw err;
                } finally {
                    foreman.releaseWorker();
                }
            })()
        );

        offset += limit;

        if (end && offset > end) {
            break;
        }
    }

    const results = await Promise.all(promises);
    const buffers = results.filter(Boolean);
    const totalLength = end ? end + 1 - start : undefined;
    return Buffer.concat(buffers, totalLength);
}

class Foreman {
    private deferred: Deferred | undefined;
    private activeWorkers = 0;

    constructor(private maxWorkers: number) {}

    requestWorker() {
        this.activeWorkers++;

        if (this.activeWorkers > this.maxWorkers) {
            this.deferred = createDeferred();
            return this.deferred.promise;
        }

        return Promise.resolve();
    }

    releaseWorker() {
        this.activeWorkers--;

        if (this.deferred && this.activeWorkers <= this.maxWorkers) {
            this.deferred.resolve();
        }
    }
}

function createDeferred(): Deferred {
    let resolve: Deferred["resolve"];
    const promise = new Promise((_resolve) => {
        resolve = _resolve;
    });

    return {
        promise,
        resolve: resolve!,
    };
}

export interface DownloadMediaInterface {
    sizeType?: string;
    /** where to start downloading **/
    start?: number;
    /** where to stop downloading **/
    end?: number;
    progressCallback?: progressCallback;
    workers?: number;
}

export async function downloadMedia(
    client: TelegramClient,
    messageOrMedia: Api.Message | Api.TypeMessageMedia | Message,
    args: DownloadMediaInterface
): Promise<Buffer> {
    let date;
    let media;
    if (messageOrMedia instanceof Api.Message) {
        media = messageOrMedia.media;
    } else {
        media = messageOrMedia;
    }
    if (typeof media == "string") {
        throw new Error("not implemented");
    }

    if (media instanceof Api.MessageMediaWebPage) {
        if (media.webpage instanceof Api.WebPage) {
            media = media.webpage.document || media.webpage.photo;
        }
    }
    if (media instanceof Api.MessageMediaPhoto || media instanceof Api.Photo) {
        return client._downloadPhoto(media, args);
    } else if (
        media instanceof Api.MessageMediaDocument ||
        media instanceof Api.Document
    ) {
        return client._downloadDocument(media, args);
    } else if (media instanceof Api.MessageMediaContact) {
        return client._downloadContact(media, args);
    } else if (
        media instanceof Api.WebDocument ||
        media instanceof Api.WebDocumentNoProxy
    ) {
        return client._downloadWebDocument(media, args);
    } else {
        return Buffer.alloc(0);
    }
}

export async function _downloadDocument(
    client: TelegramClient,
    doc: Api.MessageMediaDocument | Api.Document,
    args: DownloadMediaInterface
): Promise<Buffer> {
    if (doc instanceof Api.MessageMediaDocument) {
        if (!doc.document) {
            return Buffer.alloc(0);
        }

        doc = doc.document;
    }
    if (!(doc instanceof Api.Document)) {
        return Buffer.alloc(0);
    }

    let size = undefined;
    if (args.sizeType) {
        size = doc.thumbs ? pickFileSize(doc.thumbs, args.sizeType) : undefined;
        if (!size && doc.mimeType.startsWith("video/")) {
            return Buffer.alloc(0);
        }

        if (
            size &&
            (size instanceof Api.PhotoCachedSize ||
                size instanceof Api.PhotoStrippedSize)
        ) {
            return client._downloadCachedPhotoSize(size);
        }
    }
    return client.downloadFile(
        new Api.InputDocumentFileLocation({
            id: doc.id,
            accessHash: doc.accessHash,
            fileReference: doc.fileReference,
            thumbSize: size ? size.type : "",
        }),
        {
            fileSize:
                size && !(size instanceof Api.PhotoSizeEmpty)
                    ? size.size
                    : doc.size,
            progressCallback: args.progressCallback,
            start: args.start,
            end: args.end,
            dcId: doc.dcId,
            workers: args.workers,
        }
    );
}

export async function _downloadContact(
    client: TelegramClient,
    media: Api.MessageMediaContact,
    args: DownloadMediaInterface
): Promise<Buffer> {
    throw new Error("not implemented");
}

export async function _downloadWebDocument(
    client: TelegramClient,
    media: Api.WebDocument | Api.WebDocumentNoProxy,
    args: DownloadMediaInterface
): Promise<Buffer> {
    throw new Error("not implemented");
}

function pickFileSize(sizes: Api.TypePhotoSize[], sizeType: string) {
    if (!sizeType || !sizes || !sizes.length) {
        return undefined;
    }
    const indexOfSize = sizeTypes.indexOf(sizeType);
    let size;
    for (let i = indexOfSize; i < sizeTypes.length; i++) {
        size = sizes.find((s) => s.type === sizeTypes[i]);
        if (
            size &&
            !(
                size instanceof Api.PhotoSizeProgressive ||
                size instanceof Api.PhotoPathSize
            )
        ) {
            return size;
        }
    }
    return undefined;
}

export function _downloadCachedPhotoSize(
    client: TelegramClient,
    size: Api.PhotoCachedSize | Api.PhotoStrippedSize
) {
    // No need to download anything, simply write the bytes
    let data;
    if (size instanceof Api.PhotoStrippedSize) {
        data = strippedPhotoToJpg(size.bytes);
    } else {
        data = size.bytes;
    }
    return data;
}

export async function _downloadPhoto(
    client: TelegramClient,
    photo: Api.MessageMediaPhoto | Api.Photo,
    args: DownloadMediaInterface
): Promise<Buffer> {
    if (photo instanceof Api.MessageMediaPhoto) {
        if (photo.photo instanceof Api.PhotoEmpty || !photo.photo) {
            return Buffer.alloc(0);
        }
        photo = photo.photo;
    }
    if (!(photo instanceof Api.Photo)) {
        return Buffer.alloc(0);
    }
    const size = pickFileSize(photo.sizes, args.sizeType || sizeTypes[0]);
    if (!size || size instanceof Api.PhotoSizeEmpty) {
        return Buffer.alloc(0);
    }

    if (
        size instanceof Api.PhotoCachedSize ||
        size instanceof Api.PhotoStrippedSize
    ) {
        return client._downloadCachedPhotoSize(size);
    }
    return client.downloadFile(
        new Api.InputPhotoFileLocation({
            id: photo.id,
            accessHash: photo.accessHash,
            fileReference: photo.fileReference,
            thumbSize: size.type,
        }),
        {
            dcId: photo.dcId,
            fileSize: size.size,
            progressCallback: args.progressCallback,
        }
    );
}
