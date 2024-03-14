import { Api } from "../tl";
import type { TelegramClient } from "./TelegramClient";
import { strippedPhotoToJpg } from "../Utils";
import { sleep } from "../Helpers";
import { EntityLike, OutFile, ProgressCallback } from "../define";
import { utils } from "../";
import { RequestIter } from "../requestIter";
import { MTProtoSender } from "../network";
import { FileMigrateError } from "../errors";
import { createWriteStream } from "./fs";
import { BinaryWriter } from "../extensions";
import * as fs from "./fs";
import path from "./path";
import bigInt from "big-integer";

/**
 * progress callback that will be called each time a new chunk is downloaded.
 */
export interface progressCallback {
    (
        /** How much was downloaded */
        downloaded: bigInt.BigInteger,
        /** Full size of the file to be downloaded */
        fullSize: bigInt.BigInteger,
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
    fileSize?: number;
    /** Used to determine how many download tasks should be run in parallel. anything above 16 is unstable. */
    workers?: number;
    /** How much to download in each chunk. The larger the less requests to be made. (max is 512kb). */
    partSizeKb?: number;
    /** Where to start downloading. useful for chunk downloading. */
    start?: number;
    /** Where to stop downloading. useful for chunk downloading. */
    end?: number;
    /** A callback function accepting two parameters:     ``(received bytes, total)``.     */
    progressCallback?: progressCallback;
}

/**
 * Low level interface for downloading files
 */
export interface DownloadFileParamsV2 {
    /**
     * The output file path, directory,buffer, or stream-like object.
     * If the path exists and is a file, it will be overwritten.

     * If the file path is `undefined` or `Buffer`, then the result
     will be saved in memory and returned as `Buffer`.
     */
    outputFile?: OutFile;
    /** The dcId that the file belongs to. Used to borrow a sender from that DC. The library should handle this for you */
    dcId?: number;
    /** The file size that is about to be downloaded, if known.<br/>
     Only used if ``progressCallback`` is specified. */
    fileSize?: bigInt.BigInteger;
    /** How much to download in each chunk. The larger the less requests to be made. (max is 512kb). */
    partSizeKb?: number;
    /** Progress callback accepting one param. (progress :number) which is a float between 0 and 1 */
    progressCallback?: progressCallback;
    /** */

    msgData?: [EntityLike, number];
}

/**
 * contains optional download params for profile photo.
 */
export interface DownloadProfilePhotoParams {
    /** Whether to download the big version or the small one of the photo */
    isBig?: boolean;
    outputFile?: OutFile;
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
const TIMED_OUT_SLEEP = 1000;
const MAX_CHUNK_SIZE = 512 * 1024;

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

export interface IterDownloadFunction {
    file?: Api.TypeMessageMedia | Api.TypeInputFile | Api.TypeInputFileLocation;
    offset?: bigInt.BigInteger;
    stride?: number;
    limit?: number;
    chunkSize?: number;
    requestSize: number;
    fileSize?: bigInt.BigInteger;
    dcId?: number;
    msgData?: [EntityLike, number];
}

export class DirectDownloadIter extends RequestIter {
    protected request?: Api.upload.GetFile;
    private _sender?: MTProtoSender;
    private _timedOut: boolean = false;
    protected _stride?: number;
    protected _chunkSize?: number;
    protected _lastPart?: Buffer;
    protected buffer: Buffer[] | undefined;

    async _init({
        fileLocation,
        dcId,
        offset,
        stride,
        chunkSize,
        requestSize,
        fileSize,
        msgData,
    }: DirectDownloadIterInterface) {
        this.request = new Api.upload.GetFile({
            location: fileLocation,
            offset,
            limit: requestSize,
        });

        this.total = fileSize;
        this._stride = stride;
        this._chunkSize = chunkSize;
        this._lastPart = undefined;
        //this._msgData = msgData;
        this._timedOut = false;

        this._sender = await this.client.getSender(dcId);
    }

    async _loadNextChunk(): Promise<boolean | undefined> {
        const current = await this._request();
        this.buffer!.push(current);
        if (current.length < this.request!.limit) {
            // we finished downloading
            this.left = this.buffer!.length;
            await this.close();
            return true;
        } else {
            this.request!.offset = this.request!.offset.add(this._stride!);
        }
    }

    async _request(): Promise<Buffer> {
        try {
            this._sender = await this.client.getSender(this._sender!.dcId);
            const result = await this.client.invokeWithSender(
                this.request!,
                this._sender
            );
            this._timedOut = false;
            if (result instanceof Api.upload.FileCdnRedirect) {
                throw new Error(
                    "CDN Not supported. Please Add an issue in github"
                );
            }
            return result.bytes;
        } catch (e: any) {
            if (e.errorMessage == "TIMEOUT") {
                if (this._timedOut) {
                    this.client._log.warn(
                        "Got two timeouts in a row while downloading file"
                    );
                    throw e;
                }
                this._timedOut = true;
                this.client._log.info(
                    "Got timeout while downloading file, retrying once"
                );
                await sleep(TIMED_OUT_SLEEP);
                return await this._request();
            } else if (e instanceof FileMigrateError) {
                this.client._log.info("File lives in another DC");
                this._sender = await this.client.getSender(e.newDc);
                return await this._request();
            } else if (e.errorMessage == "FILEREF_UPGRADE_NEEDED") {
                // TODO later
                throw e;
            } else {
                throw e;
            }
        }
    }

    async close() {
        this.client._log.debug("Finished downloading file ...");
    }

    [Symbol.asyncIterator](): AsyncIterator<Buffer, any, undefined> {
        return super[Symbol.asyncIterator]();
    }
}

export class GenericDownloadIter extends DirectDownloadIter {
    async _loadNextChunk(): Promise<boolean | undefined> {
        // 1. Fetch enough for one chunk
        let data = Buffer.alloc(0);

        //  1.1. ``bad`` is how much into the data we have we need to offset
        const bad = this.request!.offset.mod(this.request!.limit).toJSNumber();
        const before = this.request!.offset;

        // 1.2. We have to fetch from a valid offset, so remove that bad part
        this.request!.offset = this.request!.offset.subtract(bad);

        let done = false;
        while (!done && data.length - bad < this._chunkSize!) {
            const current = await this._request();
            this.request!.offset = this.request!.offset.add(
                this.request!.limit
            );

            data = Buffer.concat([data, current]);
            done = current.length < this.request!.limit;
        }
        // 1.3 Restore our last desired offset
        this.request!.offset = before;

        // 2. Fill the buffer with the data we have
        // 2.1. The current chunk starts at ``bad`` offset into the data,
        //  and each new chunk is ``stride`` bytes apart of the other
        for (let i = bad; i < data.length; i += this._stride!) {
            this.buffer!.push(data.slice(i, i + this._chunkSize!));

            // 2.2. We will yield this offset, so move to the next one
            this.request!.offset = this.request!.offset.add(this._stride!);
        }

        // 2.3. If we are in the last chunk, we will return the last partial data
        if (done) {
            this.left = this.buffer!.length;
            await this.close();
            return;
        }

        // 2.4 If we are not done, we can't return incomplete chunks.
        if (this.buffer![this.buffer!.length - 1].length != this._chunkSize) {
            this._lastPart = this.buffer!.pop();
            //   3. Be careful with the offsets. Re-fetching a bit of data
            //   is fine, since it greatly simplifies things.
            // TODO Try to not re-fetch data
            this.request!.offset = this.request!.offset.subtract(this._stride!);
        }
    }
}

/** @hidden */
export function iterDownload(
    client: TelegramClient,
    {
        file,
        offset = bigInt.zero,
        stride,
        limit,
        chunkSize,
        requestSize = MAX_CHUNK_SIZE,
        fileSize,
        dcId,
        msgData,
    }: IterDownloadFunction
) {
    // we're ignoring here to make it more flexible (which is probably a bad idea)
    // @ts-ignore
    const info = utils.getFileInfo(file);
    if (info.dcId != undefined) {
        dcId = info.dcId;
    }
    if (fileSize == undefined) {
        fileSize = info.size;
    }

    file = info.location;

    if (chunkSize == undefined) {
        chunkSize = requestSize;
    }

    if (limit == undefined && fileSize != undefined) {
        limit = Math.floor(
            fileSize.add(chunkSize).subtract(1).divide(chunkSize).toJSNumber()
        );
    }
    if (stride == undefined) {
        stride = chunkSize;
    } else if (stride < chunkSize) {
        throw new Error("Stride must be >= chunkSize");
    }

    requestSize -= requestSize % MIN_CHUNK_SIZE;

    if (requestSize < MIN_CHUNK_SIZE) {
        requestSize = MIN_CHUNK_SIZE;
    } else if (requestSize > MAX_CHUNK_SIZE) {
        requestSize = MAX_CHUNK_SIZE;
    }
    let cls;
    if (
        chunkSize == requestSize &&
        offset!.divide(MAX_CHUNK_SIZE).eq(bigInt.zero) &&
        stride % MIN_CHUNK_SIZE == 0 &&
        (limit == undefined || offset!.divide(limit).eq(bigInt.zero))
    ) {
        cls = DirectDownloadIter;
        client._log.info(
            `Starting direct file download in chunks of ${requestSize} at ${offset}, stride ${stride}`
        );
    } else {
        cls = GenericDownloadIter;
        client._log.info(
            `Starting indirect file download in chunks of ${requestSize} at ${offset}, stride ${stride}`
        );
    }
    return new cls(
        client,
        limit,
        {},
        {
            fileLocation: file,
            dcId,
            offset,
            stride,
            chunkSize,
            requestSize,
            fileSize,
            msgData,
        }
    );
}

function getWriter(outputFile?: OutFile) {
    if (!outputFile || Buffer.isBuffer(outputFile)) {
        return new BinaryWriter(Buffer.alloc(0));
    } else if (typeof outputFile == "string") {
        // We want to make sure that the path exists.
        return createWriteStream(outputFile);
    } else {
        return outputFile;
    }
}

function closeWriter(
    writer: BinaryWriter | { write: Function; close?: Function }
) {
    if ("close" in writer && writer.close) {
        writer.close();
    }
}

function returnWriterValue(writer: any): Buffer | string | undefined {
    if (writer instanceof BinaryWriter) {
        return writer.getValue();
    }
    if (writer instanceof fs.WriteStream) {
        if (typeof writer.path == "string") {
            return path.resolve(writer.path);
        } else {
            return Buffer.from(writer.path);
        }
    }
}

/** @hidden */
export async function downloadFileV2(
    client: TelegramClient,
    inputLocation: Api.TypeInputFileLocation,
    {
        outputFile = undefined,
        partSizeKb = undefined,
        fileSize = undefined,
        progressCallback = undefined,
        dcId = undefined,
        msgData = undefined,
    }: DownloadFileParamsV2
) {
    if (!partSizeKb) {
        if (!fileSize) {
            partSizeKb = 64;
        } else {
            partSizeKb = utils.getAppropriatedPartSize(fileSize);
        }
    }

    const partSize = Math.floor(partSizeKb * 1024);
    if (partSize % MIN_CHUNK_SIZE != 0) {
        throw new Error("The part size must be evenly divisible by 4096");
    }
    const writer = getWriter(outputFile);

    let downloaded = bigInt.zero;
    try {
        for await (const chunk of iterDownload(client, {
            file: inputLocation,
            requestSize: partSize,
            dcId: dcId,
            msgData: msgData,
        })) {
            await writer.write(chunk);
            downloaded = downloaded.add(chunk.length);
            if (progressCallback) {
                await progressCallback(
                    downloaded,
                    bigInt(fileSize || bigInt.zero)
                );
            }
        }
        return returnWriterValue(writer);
    } finally {
        closeWriter(writer);
    }
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
    /**
     * The output file location, if left undefined this method will return a buffer
     */
    outputFile?: OutFile;
    /**
     * Which thumbnail size from the document or photo to download, instead of downloading the document or photo itself.<br/>
     <br/>
     If it's specified but the file does not have a thumbnail, this method will return `undefined`.<br/>
     <br/>
     The parameter should be an integer index between ``0`` and ``sizes.length``.<br/>
     ``0`` will download the smallest thumbnail, and ``sizes.length - 1`` will download the largest thumbnail.<br/>
     <br/>
     You can also pass the `Api.PhotoSize` instance to use.  Alternatively, the thumb size type `string` may be used.<br/>
     <br/>
     In short, use ``thumb=0`` if you want the smallest thumbnail and ``thumb=sizes.length`` if you want the largest thumbnail.
     */
    thumb?: number | Api.TypePhotoSize;
    /**
     *  A callback function accepting two parameters:
     * ``(received bytes, total)``.
     */
    progressCallback?: ProgressCallback;
}

/** @hidden */
export async function downloadMedia(
    client: TelegramClient,
    messageOrMedia: Api.Message | Api.TypeMessageMedia,
    outputFile?: OutFile,
    thumb?: number | Api.TypePhotoSize,
    progressCallback?: ProgressCallback
): Promise<Buffer | string | undefined> {
    /*
      Downloading large documents may be slow enough to require a new file reference
      to be obtained mid-download. Store (input chat, message id) so that the message
      can be re-fetched.
     */
    let msgData: [EntityLike, number] | undefined;
    let date;
    let media;

    if (messageOrMedia instanceof Api.Message) {
        media = messageOrMedia.media;
        date = messageOrMedia.date;
        msgData = messageOrMedia.inputChat
            ? [messageOrMedia.inputChat, messageOrMedia.id]
            : undefined;
    } else {
        media = messageOrMedia;
        date = Date.now();
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
        return _downloadPhoto(
            client,
            media,
            outputFile,
            date,
            thumb,
            progressCallback
        );
    } else if (
        media instanceof Api.MessageMediaDocument ||
        media instanceof Api.Document
    ) {
        return _downloadDocument(
            client,
            media,
            outputFile,
            date,
            thumb,
            progressCallback,
            msgData
        );
    } else if (media instanceof Api.MessageMediaContact) {
        return _downloadContact(client, media, {});
    } else if (
        media instanceof Api.WebDocument ||
        media instanceof Api.WebDocumentNoProxy
    ) {
        return _downloadWebDocument(client, media, {});
    } else {
        return Buffer.alloc(0);
    }
}

/** @hidden */
export async function _downloadDocument(
    client: TelegramClient,
    doc: Api.MessageMediaDocument | Api.TypeDocument,
    outputFile: OutFile | undefined,
    date: number,
    thumb?: number | string | Api.TypePhotoSize,
    progressCallback?: ProgressCallback,
    msgData?: [EntityLike, number]
): Promise<Buffer | string | undefined> {
    if (doc instanceof Api.MessageMediaDocument) {
        if (!doc.document) {
            return Buffer.alloc(0);
        }
        doc = doc.document;
    }
    if (!(doc instanceof Api.Document)) {
        return Buffer.alloc(0);
    }
    let size;
    if (thumb == undefined) {
        outputFile = getProperFilename(
            outputFile,
            "document",
            "." + (utils.getExtension(doc) || "bin"),
            date
        );
    } else {
        outputFile = getProperFilename(outputFile, "photo", ".jpg", date);
        size = getThumb(doc.thumbs || [], thumb);
        if (
            size instanceof Api.PhotoCachedSize ||
            size instanceof Api.PhotoStrippedSize
        ) {
            return _downloadCachedPhotoSize(size, outputFile);
        }
    }
    return await downloadFileV2(
        client,
        new Api.InputDocumentFileLocation({
            id: doc.id,
            accessHash: doc.accessHash,
            fileReference: doc.fileReference,
            thumbSize: size && "type" in size ? size.type : "",
        }),
        {
            outputFile: outputFile,
            fileSize: size && "size" in size ? bigInt(size.size) : doc.size,
            progressCallback: progressCallback,
            msgData: msgData,
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
function getThumb(
    thumbs: (Api.TypePhotoSize | Api.TypeVideoSize)[],
    thumb?: number | string | Api.TypePhotoSize | Api.VideoSize
) {
    function sortThumb(thumb: Api.TypePhotoSize | Api.TypeVideoSize) {
        if (thumb instanceof Api.PhotoStrippedSize) {
            return thumb.bytes.length;
        }
        if (thumb instanceof Api.PhotoCachedSize) {
            return thumb.bytes.length;
        }
        if (thumb instanceof Api.PhotoSize) {
            return thumb.size;
        }
        if (thumb instanceof Api.PhotoSizeProgressive) {
            return Math.max(...thumb.sizes);
        }
        if (thumb instanceof Api.VideoSize) {
            return thumb.size;
        }
        return 0;
    }

    thumbs = thumbs.sort((a, b) => sortThumb(a) - sortThumb(b));
    const correctThumbs = [];
    for (const t of thumbs) {
        if (!(t instanceof Api.PhotoPathSize)) {
            correctThumbs.push(t);
        }
    }
    if (thumb == undefined) {
        return correctThumbs.pop();
    } else if (typeof thumb == "number") {
        return correctThumbs[thumb];
    } else if (typeof thumb == "string") {
        for (const t of correctThumbs) {
            if ("type" in t && t.type == thumb) {
                return t;
            }
        }
    } else if (
        thumb instanceof Api.PhotoSize ||
        thumb instanceof Api.PhotoCachedSize ||
        thumb instanceof Api.PhotoStrippedSize ||
        thumb instanceof Api.VideoSize
    ) {
        return thumb;
    }
}

/** @hidden */
export async function _downloadCachedPhotoSize(
    size: Api.PhotoCachedSize | Api.PhotoStrippedSize,
    outputFile?: OutFile
) {
    // No need to download anything, simply write the bytes
    let data: Buffer;
    if (size instanceof Api.PhotoStrippedSize) {
        data = strippedPhotoToJpg(size.bytes);
    } else {
        data = size.bytes;
    }
    const writer = getWriter(outputFile);
    try {
        await writer.write(data);
    } finally {
        closeWriter(writer);
    }

    return returnWriterValue(writer);
}

/** @hidden */

function getProperFilename(
    file: OutFile | undefined,
    fileType: string,
    extension: string,
    date: number
) {
    if (!file || typeof file != "string") {
        return file;
    }

    if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
        let fullName = fileType + date + extension;
        return path.join(file, fullName);
    }
    return file;
}

/** @hidden */
export async function _downloadPhoto(
    client: TelegramClient,
    photo: Api.MessageMediaPhoto | Api.Photo,
    file?: OutFile,
    date?: number,
    thumb?: number | string | Api.TypePhotoSize,
    progressCallback?: progressCallback
): Promise<Buffer | string | undefined> {
    if (photo instanceof Api.MessageMediaPhoto) {
        if (photo.photo instanceof Api.PhotoEmpty || !photo.photo) {
            return Buffer.alloc(0);
        }
        photo = photo.photo;
    }
    if (!(photo instanceof Api.Photo)) {
        return Buffer.alloc(0);
    }
    const photoSizes = [...(photo.sizes || []), ...(photo.videoSizes || [])];
    const size = getThumb(photoSizes, thumb);
    if (!size || size instanceof Api.PhotoSizeEmpty) {
        return Buffer.alloc(0);
    }
    if (!date) {
        date = Date.now();
    }

    file = getProperFilename(file, "photo", ".jpg", date);
    if (
        size instanceof Api.PhotoCachedSize ||
        size instanceof Api.PhotoStrippedSize
    ) {
        return _downloadCachedPhotoSize(size, file);
    }
    let fileSize: number;
    if (size instanceof Api.PhotoSizeProgressive) {
        fileSize = Math.max(...size.sizes);
    } else {
        fileSize = "size" in size ? size.size : 512;
    }

    return downloadFileV2(
        client,
        new Api.InputPhotoFileLocation({
            id: photo.id,
            accessHash: photo.accessHash,
            fileReference: photo.fileReference,
            thumbSize: "type" in size ? size.type : "",
        }),
        {
            outputFile: file,
            fileSize: bigInt(fileSize),
            progressCallback: progressCallback,
            dcId: photo.dcId,
        }
    );
}

/** @hidden */
export async function downloadProfilePhoto(
    client: TelegramClient,
    entity: EntityLike,
    fileParams: DownloadProfilePhotoParams
) {
    let photo;
    if (typeof entity == "object" && "photo" in entity) {
        photo = entity.photo;
    } else {
        entity = await client.getEntity(entity);
        if ("photo" in entity) {
            photo = entity.photo;
        } else {
            throw new Error(
                `Could not get photo from ${
                    entity ? entity.className : undefined
                }`
            );
        }
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
        outputFile: fileParams.outputFile,
        dcId,
    });
}
