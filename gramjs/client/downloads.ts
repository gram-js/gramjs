import { Api } from "../tl";
import type { TelegramClient } from "./TelegramClient";
import { getAppropriatedPartSize, strippedPhotoToJpg } from "../Utils";
import { sleep } from "../Helpers";
import { Message } from "../tl/patched";
import { EntityLike } from "../define";
import { errors, utils } from "../";

/**
 * progress callback that will be called each time a new chunk is downloaded.
 */
export interface progressCallback {
    (
        /** float between 0 and 1 */
        progress: number,
        /** other args to be passed if needed */
        ...args: any[]
    ): void;

    /** When this value is set to true the download will stop */
    isCanceled?: boolean;
    /** Does nothing for now. */
    acceptsBuffer?: boolean;
}

/**
 * Low level interface for downloading files
 */
export interface DownloadFileParams {
    /** The dcId that the file belongs to. Used to borrow a sender from that DC */
    dcId: number;
    /** How much to download. The library will download until it reaches this amount.<br/>
     *  can be useful for downloading by chunks */
    fileSize: number;
    /** Used to determine how many download tasks should be run in parallel. anything above 16 is unstable. */
    workers?: number;
    /** How much to download in each chunk. The larger the less requests to be made. (max is 512kb). */
    partSizeKb?: number;
    /** Where to start downloading. useful for chunk downloading. */
    start?: number;
    /** Where to stop downloading. useful for chunk downloading. */
    end?: number;
    /** Progress callback accepting one param. (progress :number) which is a float between 0 and 1 */
    progressCallback?: progressCallback;
}

/**
 * contains optional download params for profile photo.
 */
export interface DownloadProfilePhotoParams {
    /** Whether to download the big version or the small one of the photo */
    isBig?: boolean;
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
const DISCONNECT_SLEEP = 1000;

/** @hidden */
export async function downloadFile(
    client: TelegramClient,
    inputLocation: Api.TypeInputFileLocation,
    fileParams: DownloadFileParams
) {
    let { partSizeKb, end } = fileParams;
    const { fileSize, workers = 1 } = fileParams;
    const { dcId, progressCallback, start = 0 } = fileParams;

    end = end && end < fileSize ? end : fileSize - 1;

    if (!partSizeKb) {
        partSizeKb = fileSize
            ? getAppropriatedPartSize(fileSize)
            : DEFAULT_CHUNK_SIZE;
    }

    const partSize = partSizeKb * 1024;
    const partsCount = end ? Math.ceil((end - start) / partSize) : 1;

    if (partSize % MIN_CHUNK_SIZE !== 0) {
        throw new Error(
            `The part size must be evenly divisible by ${MIN_CHUNK_SIZE}`
        );
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

    // Preload sender
    await client.getSender(dcId);

    // eslint-disable-next-line no-constant-condition
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
            foreman.releaseWorker();
            break;
        }
        // eslint-disable-next-line no-loop-func
        promises.push(
            (async (offsetMemo: number) => {
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    let sender;
                    try {
                        sender = await client.getSender(dcId);
                        const result = await sender.send(
                            new Api.upload.GetFile({
                                location: inputLocation,
                                offset: offsetMemo,
                                limit,
                                precise: isPrecise || undefined,
                            })
                        );

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

                        foreman.releaseWorker();

                        return result.bytes;
                    } catch (err) {
                        if (sender && !sender.isConnected()) {
                            await sleep(DISCONNECT_SLEEP);
                            continue;
                        } else if (err instanceof errors.FloodWaitError) {
                            await sleep(err.seconds * 1000);
                            continue;
                        }

                        foreman.releaseWorker();

                        hasEnded = true;
                        throw err;
                    }
                }
            })(offset)
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

/**
 * All of these are optional and will be calculated automatically if not specified.
 */
export interface DownloadMediaInterface {
    sizeType?: string;
    /** where to start downloading **/
    start?: number;
    /** where to stop downloading **/
    end?: number;
    /** a progress callback that will be called each time a new chunk is downloaded and passes a number between 0 and 1*/
    progressCallback?: progressCallback;
    /** number of workers to use while downloading. more means faster but anything above 16 may cause issues. */
    workers?: number;
}

/** @hidden */
export async function downloadMedia(
    client: TelegramClient,
    messageOrMedia: Api.Message | Api.TypeMessageMedia | Message,
    downloadParams: DownloadMediaInterface
): Promise<Buffer> {
    let date;
    let media;

    if (
        messageOrMedia instanceof Message ||
        messageOrMedia instanceof Api.Message
    ) {
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
        return _downloadPhoto(client, media, downloadParams);
    } else if (
        media instanceof Api.MessageMediaDocument ||
        media instanceof Api.Document
    ) {
        return _downloadDocument(client, media, downloadParams);
    } else if (media instanceof Api.MessageMediaContact) {
        return _downloadContact(client, media, downloadParams);
    } else if (
        media instanceof Api.WebDocument ||
        media instanceof Api.WebDocumentNoProxy
    ) {
        return _downloadWebDocument(client, media, downloadParams);
    } else {
        return Buffer.alloc(0);
    }
}

/** @hidden */
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
            return _downloadCachedPhotoSize(size);
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
                    ? size instanceof Api.PhotoSizeProgressive
                        ? Math.max(...size.sizes)
                        : size.size
                    : doc.size,
            progressCallback: args.progressCallback,
            start: args.start,
            end: args.end,
            dcId: doc.dcId,
            workers: args.workers,
        }
    );
}

/** @hidden */
export async function _downloadContact(
    client: TelegramClient,
    media: Api.MessageMediaContact,
    args: DownloadMediaInterface
): Promise<Buffer> {
    throw new Error("not implemented");
}

/** @hidden */
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
        if (size && !(size instanceof Api.PhotoPathSize)) {
            return size;
        }
    }
    return undefined;
}

/** @hidden */
export function _downloadCachedPhotoSize(
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

/** @hidden */
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
        return _downloadCachedPhotoSize(size);
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
            fileSize:
                size instanceof Api.PhotoSizeProgressive
                    ? Math.max(...size.sizes)
                    : size.size,
            progressCallback: args.progressCallback,
        }
    );
}

/** @hidden */
export async function downloadProfilePhoto(
    client: TelegramClient,
    entity: EntityLike,
    fileParams: DownloadProfilePhotoParams
) {
    entity = await client.getEntity(entity);

    let photo;
    if ("photo" in entity) {
        photo = entity.photo;
    } else {
        throw new Error(
            `Could not get photo from ${entity ? entity.className : undefined}`
        );
    }
    let dcId;
    let loc;
    if (
        photo instanceof Api.UserProfilePhoto ||
        photo instanceof Api.ChatPhoto
    ) {
        dcId = photo.dcId;
        loc = new Api.InputPeerPhotoFileLocation({
            peer: utils.getInputPeer(entity),
            photoId: photo.photoId,
            big: fileParams.isBig,
        });
    } else {
        return Buffer.alloc(0);
    }
    return client.downloadFile(loc, {
        dcId,
        fileSize: 2 * 1024 * 1024,
        workers: 1,
    });
}
