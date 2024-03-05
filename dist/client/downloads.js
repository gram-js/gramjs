"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadProfilePhoto = exports._downloadPhoto = exports._downloadCachedPhotoSize = exports._downloadWebDocument = exports._downloadContact = exports._downloadDocument = exports.downloadMedia = exports.downloadFileV2 = exports.iterDownload = exports.GenericDownloadIter = exports.DirectDownloadIter = void 0;
const tl_1 = require("../tl");
const Utils_1 = require("../Utils");
const Helpers_1 = require("../Helpers");
const __1 = require("../");
const requestIter_1 = require("../requestIter");
const errors_1 = require("../errors");
const fs_1 = require("./fs");
const extensions_1 = require("../extensions");
const fs = __importStar(require("./fs"));
const path_1 = __importDefault(require("./path"));
const big_integer_1 = __importDefault(require("big-integer"));
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
class DirectDownloadIter extends requestIter_1.RequestIter {
    constructor() {
        super(...arguments);
        this._timedOut = false;
    }
    async _init({ fileLocation, dcId, offset, stride, chunkSize, requestSize, fileSize, msgData, }) {
        this.request = new tl_1.Api.upload.GetFile({
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
    async _loadNextChunk() {
        const current = await this._request();
        this.buffer.push(current);
        if (current.length < this.request.limit) {
            // we finished downloading
            this.left = this.buffer.length;
            await this.close();
            return true;
        }
        else {
            this.request.offset = this.request.offset.add(this._stride);
        }
    }
    async _request() {
        try {
            this._sender = await this.client.getSender(this._sender.dcId);
            const result = await this.client.invokeWithSender(this.request, this._sender);
            this._timedOut = false;
            if (result instanceof tl_1.Api.upload.FileCdnRedirect) {
                throw new Error("CDN Not supported. Please Add an issue in github");
            }
            return result.bytes;
        }
        catch (e) {
            if (e.errorMessage == "TIMEOUT") {
                if (this._timedOut) {
                    this.client._log.warn("Got two timeouts in a row while downloading file");
                    throw e;
                }
                this._timedOut = true;
                this.client._log.info("Got timeout while downloading file, retrying once");
                await (0, Helpers_1.sleep)(TIMED_OUT_SLEEP);
                return await this._request();
            }
            else if (e instanceof errors_1.FileMigrateError) {
                this.client._log.info("File lives in another DC");
                this._sender = await this.client.getSender(e.newDc);
                return await this._request();
            }
            else if (e.errorMessage == "FILEREF_UPGRADE_NEEDED") {
                // TODO later
                throw e;
            }
            else {
                throw e;
            }
        }
    }
    async close() {
        this.client._log.debug("Finished downloading file ...");
    }
    [Symbol.asyncIterator]() {
        return super[Symbol.asyncIterator]();
    }
}
exports.DirectDownloadIter = DirectDownloadIter;
class GenericDownloadIter extends DirectDownloadIter {
    async _loadNextChunk() {
        // 1. Fetch enough for one chunk
        let data = Buffer.alloc(0);
        //  1.1. ``bad`` is how much into the data we have we need to offset
        const bad = this.request.offset.mod(this.request.limit).toJSNumber();
        const before = this.request.offset;
        // 1.2. We have to fetch from a valid offset, so remove that bad part
        this.request.offset = this.request.offset.subtract(bad);
        let done = false;
        while (!done && data.length - bad < this._chunkSize) {
            const current = await this._request();
            this.request.offset = this.request.offset.add(this.request.limit);
            data = Buffer.concat([data, current]);
            done = current.length < this.request.limit;
        }
        // 1.3 Restore our last desired offset
        this.request.offset = before;
        // 2. Fill the buffer with the data we have
        // 2.1. The current chunk starts at ``bad`` offset into the data,
        //  and each new chunk is ``stride`` bytes apart of the other
        for (let i = bad; i < data.length; i += this._stride) {
            this.buffer.push(data.slice(i, i + this._chunkSize));
            // 2.2. We will yield this offset, so move to the next one
            this.request.offset = this.request.offset.add(this._stride);
        }
        // 2.3. If we are in the last chunk, we will return the last partial data
        if (done) {
            this.left = this.buffer.length;
            await this.close();
            return;
        }
        // 2.4 If we are not done, we can't return incomplete chunks.
        if (this.buffer[this.buffer.length - 1].length != this._chunkSize) {
            this._lastPart = this.buffer.pop();
            //   3. Be careful with the offsets. Re-fetching a bit of data
            //   is fine, since it greatly simplifies things.
            // TODO Try to not re-fetch data
            this.request.offset = this.request.offset.subtract(this._stride);
        }
    }
}
exports.GenericDownloadIter = GenericDownloadIter;
/** @hidden */
function iterDownload(client, { file, offset = big_integer_1.default.zero, stride, limit, chunkSize, requestSize = MAX_CHUNK_SIZE, fileSize, dcId, msgData, }) {
    // we're ignoring here to make it more flexible (which is probably a bad idea)
    // @ts-ignore
    const info = __1.utils.getFileInfo(file);
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
        limit = Math.floor(fileSize.add(chunkSize).subtract(1).divide(chunkSize).toJSNumber());
    }
    if (stride == undefined) {
        stride = chunkSize;
    }
    else if (stride < chunkSize) {
        throw new Error("Stride must be >= chunkSize");
    }
    requestSize -= requestSize % MIN_CHUNK_SIZE;
    if (requestSize < MIN_CHUNK_SIZE) {
        requestSize = MIN_CHUNK_SIZE;
    }
    else if (requestSize > MAX_CHUNK_SIZE) {
        requestSize = MAX_CHUNK_SIZE;
    }
    let cls;
    if (chunkSize == requestSize &&
        offset.divide(MAX_CHUNK_SIZE).eq(big_integer_1.default.zero) &&
        stride % MIN_CHUNK_SIZE == 0 &&
        (limit == undefined || offset.divide(limit).eq(big_integer_1.default.zero))) {
        cls = DirectDownloadIter;
        client._log.info(`Starting direct file download in chunks of ${requestSize} at ${offset}, stride ${stride}`);
    }
    else {
        cls = GenericDownloadIter;
        client._log.info(`Starting indirect file download in chunks of ${requestSize} at ${offset}, stride ${stride}`);
    }
    return new cls(client, limit, {}, {
        fileLocation: file,
        dcId,
        offset,
        stride,
        chunkSize,
        requestSize,
        fileSize,
        msgData,
    });
}
exports.iterDownload = iterDownload;
function getWriter(outputFile) {
    if (!outputFile || Buffer.isBuffer(outputFile)) {
        return new extensions_1.BinaryWriter(Buffer.alloc(0));
    }
    else if (typeof outputFile == "string") {
        // We want to make sure that the path exists.
        return (0, fs_1.createWriteStream)(outputFile);
    }
    else {
        return outputFile;
    }
}
function closeWriter(writer) {
    if ("close" in writer && writer.close) {
        writer.close();
    }
}
function returnWriterValue(writer) {
    if (writer instanceof extensions_1.BinaryWriter) {
        return writer.getValue();
    }
    if (writer instanceof fs.WriteStream) {
        if (typeof writer.path == "string") {
            return path_1.default.resolve(writer.path);
        }
        else {
            return Buffer.from(writer.path);
        }
    }
}
/** @hidden */
async function downloadFileV2(client, inputLocation, { outputFile = undefined, partSizeKb = undefined, fileSize = undefined, progressCallback = undefined, dcId = undefined, msgData = undefined, }) {
    var e_1, _a;
    if (!partSizeKb) {
        if (!fileSize) {
            partSizeKb = 64;
        }
        else {
            partSizeKb = __1.utils.getAppropriatedPartSize(fileSize);
        }
    }
    const partSize = Math.floor(partSizeKb * 1024);
    if (partSize % MIN_CHUNK_SIZE != 0) {
        throw new Error("The part size must be evenly divisible by 4096");
    }
    const writer = getWriter(outputFile);
    let downloaded = big_integer_1.default.zero;
    try {
        try {
            for (var _b = __asyncValues(iterDownload(client, {
                file: inputLocation,
                requestSize: partSize,
                dcId: dcId,
                msgData: msgData,
            })), _c; _c = await _b.next(), !_c.done;) {
                const chunk = _c.value;
                await writer.write(chunk);
                if (progressCallback) {
                    await progressCallback(downloaded, (0, big_integer_1.default)(fileSize || big_integer_1.default.zero));
                }
                downloaded = downloaded.add(chunk.length);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return returnWriterValue(writer);
    }
    finally {
        closeWriter(writer);
    }
}
exports.downloadFileV2 = downloadFileV2;
class Foreman {
    constructor(maxWorkers) {
        this.maxWorkers = maxWorkers;
        this.activeWorkers = 0;
    }
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
function createDeferred() {
    let resolve;
    const promise = new Promise((_resolve) => {
        resolve = _resolve;
    });
    return {
        promise,
        resolve: resolve,
    };
}
/** @hidden */
async function downloadMedia(client, messageOrMedia, outputFile, thumb, progressCallback) {
    /*
      Downloading large documents may be slow enough to require a new file reference
      to be obtained mid-download. Store (input chat, message id) so that the message
      can be re-fetched.
     */
    let msgData;
    let date;
    let media;
    if (messageOrMedia instanceof tl_1.Api.Message) {
        media = messageOrMedia.media;
        date = messageOrMedia.date;
        msgData = messageOrMedia.inputChat
            ? [messageOrMedia.inputChat, messageOrMedia.id]
            : undefined;
    }
    else {
        media = messageOrMedia;
        date = Date.now();
    }
    if (typeof media == "string") {
        throw new Error("not implemented");
    }
    if (media instanceof tl_1.Api.MessageMediaWebPage) {
        if (media.webpage instanceof tl_1.Api.WebPage) {
            media = media.webpage.document || media.webpage.photo;
        }
    }
    if (media instanceof tl_1.Api.MessageMediaPhoto || media instanceof tl_1.Api.Photo) {
        return _downloadPhoto(client, media, outputFile, date, thumb, progressCallback);
    }
    else if (media instanceof tl_1.Api.MessageMediaDocument ||
        media instanceof tl_1.Api.Document) {
        return _downloadDocument(client, media, outputFile, date, thumb, progressCallback, msgData);
    }
    else if (media instanceof tl_1.Api.MessageMediaContact) {
        return _downloadContact(client, media, {});
    }
    else if (media instanceof tl_1.Api.WebDocument ||
        media instanceof tl_1.Api.WebDocumentNoProxy) {
        return _downloadWebDocument(client, media, {});
    }
    else {
        return Buffer.alloc(0);
    }
}
exports.downloadMedia = downloadMedia;
/** @hidden */
async function _downloadDocument(client, doc, outputFile, date, thumb, progressCallback, msgData) {
    if (doc instanceof tl_1.Api.MessageMediaDocument) {
        if (!doc.document) {
            return Buffer.alloc(0);
        }
        doc = doc.document;
    }
    if (!(doc instanceof tl_1.Api.Document)) {
        return Buffer.alloc(0);
    }
    let size;
    if (thumb == undefined) {
        outputFile = getProperFilename(outputFile, "document", "." + (__1.utils.getExtension(doc) || "bin"), date);
    }
    else {
        outputFile = getProperFilename(outputFile, "photo", ".jpg", date);
        size = getThumb(doc.thumbs || [], thumb);
        if (size instanceof tl_1.Api.PhotoCachedSize ||
            size instanceof tl_1.Api.PhotoStrippedSize) {
            return _downloadCachedPhotoSize(size, outputFile);
        }
    }
    return await downloadFileV2(client, new tl_1.Api.InputDocumentFileLocation({
        id: doc.id,
        accessHash: doc.accessHash,
        fileReference: doc.fileReference,
        thumbSize: size && "type" in size ? size.type : "",
    }), {
        outputFile: outputFile,
        fileSize: size && "size" in size ? (0, big_integer_1.default)(size.size) : doc.size,
        progressCallback: progressCallback,
        msgData: msgData,
    });
}
exports._downloadDocument = _downloadDocument;
/** @hidden */
async function _downloadContact(client, media, args) {
    throw new Error("not implemented");
}
exports._downloadContact = _downloadContact;
/** @hidden */
async function _downloadWebDocument(client, media, args) {
    throw new Error("not implemented");
}
exports._downloadWebDocument = _downloadWebDocument;
function pickFileSize(sizes, sizeType) {
    if (!sizeType || !sizes || !sizes.length) {
        return undefined;
    }
    const indexOfSize = sizeTypes.indexOf(sizeType);
    let size;
    for (let i = indexOfSize; i < sizeTypes.length; i++) {
        size = sizes.find((s) => s.type === sizeTypes[i]);
        if (size && !(size instanceof tl_1.Api.PhotoPathSize)) {
            return size;
        }
    }
    return undefined;
}
/** @hidden */
function getThumb(thumbs, thumb) {
    function sortThumb(thumb) {
        if (thumb instanceof tl_1.Api.PhotoStrippedSize) {
            return thumb.bytes.length;
        }
        if (thumb instanceof tl_1.Api.PhotoCachedSize) {
            return thumb.bytes.length;
        }
        if (thumb instanceof tl_1.Api.PhotoSize) {
            return thumb.size;
        }
        if (thumb instanceof tl_1.Api.PhotoSizeProgressive) {
            return Math.max(...thumb.sizes);
        }
        if (thumb instanceof tl_1.Api.VideoSize) {
            return thumb.size;
        }
        return 0;
    }
    thumbs = thumbs.sort((a, b) => sortThumb(a) - sortThumb(b));
    const correctThumbs = [];
    for (const t of thumbs) {
        if (!(t instanceof tl_1.Api.PhotoPathSize)) {
            correctThumbs.push(t);
        }
    }
    if (thumb == undefined) {
        return correctThumbs.pop();
    }
    else if (typeof thumb == "number") {
        return correctThumbs[thumb];
    }
    else if (typeof thumb == "string") {
        for (const t of correctThumbs) {
            if ("type" in t && t.type == thumb) {
                return t;
            }
        }
    }
    else if (thumb instanceof tl_1.Api.PhotoSize ||
        thumb instanceof tl_1.Api.PhotoCachedSize ||
        thumb instanceof tl_1.Api.PhotoStrippedSize ||
        thumb instanceof tl_1.Api.VideoSize) {
        return thumb;
    }
}
/** @hidden */
async function _downloadCachedPhotoSize(size, outputFile) {
    // No need to download anything, simply write the bytes
    let data;
    if (size instanceof tl_1.Api.PhotoStrippedSize) {
        data = (0, Utils_1.strippedPhotoToJpg)(size.bytes);
    }
    else {
        data = size.bytes;
    }
    const writer = getWriter(outputFile);
    try {
        await writer.write(data);
    }
    finally {
        closeWriter(writer);
    }
    return returnWriterValue(writer);
}
exports._downloadCachedPhotoSize = _downloadCachedPhotoSize;
/** @hidden */
function getProperFilename(file, fileType, extension, date) {
    if (!file || typeof file != "string") {
        return file;
    }
    if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
        let fullName = fileType + date + extension;
        return path_1.default.join(file, fullName);
    }
    return file;
}
/** @hidden */
async function _downloadPhoto(client, photo, file, date, thumb, progressCallback) {
    if (photo instanceof tl_1.Api.MessageMediaPhoto) {
        if (photo.photo instanceof tl_1.Api.PhotoEmpty || !photo.photo) {
            return Buffer.alloc(0);
        }
        photo = photo.photo;
    }
    if (!(photo instanceof tl_1.Api.Photo)) {
        return Buffer.alloc(0);
    }
    const photoSizes = [...(photo.sizes || []), ...(photo.videoSizes || [])];
    const size = getThumb(photoSizes, thumb);
    if (!size || size instanceof tl_1.Api.PhotoSizeEmpty) {
        return Buffer.alloc(0);
    }
    if (!date) {
        date = Date.now();
    }
    file = getProperFilename(file, "photo", ".jpg", date);
    if (size instanceof tl_1.Api.PhotoCachedSize ||
        size instanceof tl_1.Api.PhotoStrippedSize) {
        return _downloadCachedPhotoSize(size, file);
    }
    let fileSize;
    if (size instanceof tl_1.Api.PhotoSizeProgressive) {
        fileSize = Math.max(...size.sizes);
    }
    else {
        fileSize = "size" in size ? size.size : 512;
    }
    return downloadFileV2(client, new tl_1.Api.InputPhotoFileLocation({
        id: photo.id,
        accessHash: photo.accessHash,
        fileReference: photo.fileReference,
        thumbSize: "type" in size ? size.type : "",
    }), {
        outputFile: file,
        fileSize: (0, big_integer_1.default)(fileSize),
        progressCallback: progressCallback,
        dcId: photo.dcId,
    });
}
exports._downloadPhoto = _downloadPhoto;
/** @hidden */
async function downloadProfilePhoto(client, entity, fileParams) {
    let photo;
    if (typeof entity == "object" && "photo" in entity) {
        photo = entity.photo;
    }
    else {
        entity = await client.getEntity(entity);
        if ("photo" in entity) {
            photo = entity.photo;
        }
        else {
            throw new Error(`Could not get photo from ${entity ? entity.className : undefined}`);
        }
    }
    let dcId;
    let loc;
    if (photo instanceof tl_1.Api.UserProfilePhoto ||
        photo instanceof tl_1.Api.ChatPhoto) {
        dcId = photo.dcId;
        loc = new tl_1.Api.InputPeerPhotoFileLocation({
            peer: __1.utils.getInputPeer(entity),
            photoId: photo.photoId,
            big: fileParams.isBig,
        });
    }
    else {
        return Buffer.alloc(0);
    }
    return client.downloadFile(loc, {
        outputFile: fileParams.outputFile,
        dcId,
    });
}
exports.downloadProfilePhoto = downloadProfilePhoto;
