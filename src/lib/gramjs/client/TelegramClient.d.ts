import { GramJsApi } from '..';

declare class TelegramClient {
    constructor(...args: any)

    async invoke<I extends InstanceType<GramJsApi.AnyRequest>>(request: I): Promise<I['__response']>;

    [prop: string]: any;
}

export default TelegramClient;
