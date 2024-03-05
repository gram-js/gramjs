/// <reference types="node" />
import { Api } from "../tl";
import type { TelegramClient } from "./TelegramClient";
import { EntityLike, OutFile, ProgressCallback } from "../define";
import { RequestIter } from "../requestIter";
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
    ...args: any[]): void;
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
export declare class DirectDownloadIter extends RequestIter {
    protected request?: Api.upload.GetFile;
    private _sender?;
    private _timedOut;
    protected _stride?: number;
    protected _chunkSize?: number;
    protected _lastPart?: Buffer;
    protected buffer: Buffer[] | undefined;
    _init({ fileLocation, dcId, offset, stride, chunkSize, requestSize, fileSize, msgData, }: DirectDownloadIterInterface): Promise<void>;
    _loadNextChunk(): Promise<boolean | undefined>;
    _request(): Promise<Buffer>;
    close(): Promise<void>;
    [Symbol.asyncIterator](): AsyncIterator<Buffer, any, undefined>;
}
export declare class GenericDownloadIter extends DirectDownloadIter {
    _loadNextChunk(): Promise<boolean | undefined>;
}
/** @hidden */
export declare function iterDownload(client: TelegramClient, { file, offset, stride, limit, chunkSize, requestSize, fileSize, dcId, msgData, }: IterDownloadFunction): DirectDownloadIter;
/** @hidden */
export declare function downloadFileV2(client: TelegramClient, inputLocation: Api.TypeInputFileLocation, { outputFile, partSizeKb, fileSize, progressCallback, dcId, msgData, }: DownloadFileParamsV2): Promise<string | Buffer | undefined>;
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
export declare function downloadMedia(client: TelegramClient, messageOrMedia: Api.Message | Api.TypeMessageMedia, outputFile?: OutFile, thumb?: number | Api.TypePhotoSize, progressCallback?: ProgressCallback): Promise<Buffer | string | undefined>;
/** @hidden */
export declare function _downloadDocument(client: TelegramClient, doc: Api.MessageMediaDocument | Api.TypeDocument, outputFile: OutFile | undefined, date: number, thumb?: number | string | Api.TypePhotoSize, progressCallback?: ProgressCallback, msgData?: [EntityLike, number]): Promise<Buffer | string | undefined>;
/** @hidden */
export declare function _downloadContact(client: TelegramClient, media: Api.MessageMediaContact, args: DownloadMediaInterface): Promise<Buffer>;
/** @hidden */
export declare function _downloadWebDocument(client: TelegramClient, media: Api.WebDocument | Api.WebDocumentNoProxy, args: DownloadMediaInterface): Promise<Buffer>;
/** @hidden */
export declare function _downloadCachedPhotoSize(size: Api.PhotoCachedSize | Api.PhotoStrippedSize, outputFile?: OutFile): Promise<string | Buffer | undefined>;
/** @hidden */
export declare function _downloadPhoto(client: TelegramClient, photo: Api.MessageMediaPhoto | Api.Photo, file?: OutFile, date?: number, thumb?: number | string | Api.TypePhotoSize, progressCallback?: progressCallback): Promise<Buffer | string | undefined>;
/** @hidden */
export declare function downloadProfilePhoto(client: TelegramClient, entity: EntityLike, fileParams: DownloadProfilePhotoParams): Promise<string | Buffer | undefined>;
