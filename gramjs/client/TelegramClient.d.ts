import { Api } from '..';

import { BotAuthParams, UserAuthParams } from './auth';
import { uploadFile, UploadFileParams } from './uploadFile';
import { downloadFile, DownloadFileParams } from './downloadFile';

declare class TelegramClient {
    constructor(...args: any)

    async start(authParams: UserAuthParams | BotAuthParams);

    async invoke<R extends Api.AnyRequest>(request: R): Promise<R['__response']>;

    async uploadFile(uploadParams: UploadFileParams): ReturnType<typeof uploadFile>;

    async downloadFile(uploadParams: DownloadFileParams): ReturnType<typeof downloadFile>;

    // Untyped methods.
    [prop: string]: any;
}

export default TelegramClient;
