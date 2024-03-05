"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.File = void 0;
const api_1 = require("../api");
const Utils_1 = require("../../Utils");
const Helpers_1 = require("../../Helpers");
const inspect_1 = require("../../inspect");
class File {
    constructor(media) {
        this.media = media;
    }
    [inspect_1.inspect.custom]() {
        return (0, Helpers_1.betterConsoleLog)(this);
    }
    get id() {
        throw new Error("Unsupported");
    }
    get name() {
        return this._fromAttr(api_1.Api.DocumentAttributeFilename, "fileName");
    }
    get mimeType() {
        if (this.media instanceof api_1.Api.Photo) {
            return "image/jpeg";
        }
        else if (this.media instanceof api_1.Api.Document) {
            return this.media.mimeType;
        }
    }
    get width() {
        return this._fromAttr([api_1.Api.DocumentAttributeImageSize, api_1.Api.DocumentAttributeVideo], "w");
    }
    get height() {
        return this._fromAttr([api_1.Api.DocumentAttributeImageSize, api_1.Api.DocumentAttributeVideo], "h");
    }
    get duration() {
        return this._fromAttr([api_1.Api.DocumentAttributeAudio, api_1.Api.DocumentAttributeVideo], "duration");
    }
    get title() {
        return this._fromAttr(api_1.Api.DocumentAttributeAudio, "title");
    }
    get performer() {
        return this._fromAttr(api_1.Api.DocumentAttributeAudio, "performer");
    }
    get emoji() {
        return this._fromAttr(api_1.Api.DocumentAttributeSticker, "alt");
    }
    get stickerSet() {
        return this._fromAttr(api_1.Api.DocumentAttributeSticker, "stickerset");
    }
    get size() {
        if (this.media instanceof api_1.Api.Photo) {
            return (0, Utils_1._photoSizeByteCount)(this.media.sizes[-1]);
        }
        else if (this.media instanceof api_1.Api.Document) {
            return this.media.size;
        }
    }
    _fromAttr(cls, field) {
        if (this.media instanceof api_1.Api.Document) {
            for (const attr of this.media.attributes) {
                if (attr instanceof cls) {
                    return attr[field];
                }
            }
        }
    }
}
exports.File = File;
