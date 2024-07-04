import type { FileLike } from "../../define";
import { Api } from "../api";
import { _photoSizeByteCount } from "../../Utils";
import { betterConsoleLog } from "../../Helpers";
import { inspect } from "../../inspect";

export class File {
    private readonly media: FileLike;
    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    constructor(media: FileLike) {
        this.media = media;
    }

    get id() {
        throw new Error("Unsupported");
    }

    get name() {
        return this._fromAttr(Api.DocumentAttributeFilename, "fileName");
    }

    get mimeType() {
        if (this.media instanceof Api.Photo) {
            return "image/jpeg";
        } else if (this.media instanceof Api.Document) {
            return this.media.mimeType;
        }
    }

    get width() {
        return this._fromAttr(
            [Api.DocumentAttributeImageSize, Api.DocumentAttributeVideo],
            "w"
        );
    }

    get height() {
        return this._fromAttr(
            [Api.DocumentAttributeImageSize, Api.DocumentAttributeVideo],
            "h"
        );
    }

    get duration() {
        return this._fromAttr(
            [Api.DocumentAttributeAudio, Api.DocumentAttributeVideo],
            "duration"
        );
    }

    get title() {
        return this._fromAttr(Api.DocumentAttributeAudio, "title");
    }

    get performer() {
        return this._fromAttr(Api.DocumentAttributeAudio, "performer");
    }

    get emoji() {
        return this._fromAttr(Api.DocumentAttributeSticker, "alt");
    }

    get stickerSet() {
        return this._fromAttr(Api.DocumentAttributeSticker, "stickerset");
    }

    get size() {
        if (this.media instanceof Api.Photo) {
            return _photoSizeByteCount(
                this.media.sizes[this.media.sizes.length - 1]
            );
        } else if (this.media instanceof Api.Document) {
            return this.media.size;
        }
    }

    _fromAttr(cls: any, field: string) {
        if (this.media instanceof Api.Document) {
            for (const attr of this.media.attributes) {
                if (attr instanceof cls) {
                    return (attr as typeof cls)[field];
                }
            }
        }
    }
}
