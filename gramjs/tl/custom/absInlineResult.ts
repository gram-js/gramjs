import { Api } from "../api";

export abstract class AbsInlineResult {
    abstract get type(): string;

    abstract get message(): Api.TypeBotInlineMessage;

    abstract get description(): string | undefined;

    abstract get url(): string | undefined;

    abstract get photo(): Api.TypeWebDocument | Api.TypePhoto | undefined;

    abstract get document(): Api.TypeDocument | Api.TypeWebDocument | undefined;

    abstract click(
        entity?: Api.TypeEntityLike,
        replyTo?: Api.TypeMessageIDLike,
        silent?: boolean,
        clearDraft?: boolean,
        hideVia?: boolean
    ): Promise<Api.TypeUpdates>;

    /*
    async downloadMedia(file: FileLike,
                        thumb?: number | Api.TypePhotoSize, processCallback?: ProgressCallback): Promise<string | Buffer> {
        if (this.document || this.photo) {
            return this._client.downloadMedia(
                // I don't like this
                this.document || this.photo,
                file,
                thumb,
                processCallback
            )
        }
        throw new Error("Inline result has no document or photo");
    }*/
}
