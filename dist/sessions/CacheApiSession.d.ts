export = CacheApi;
declare class CacheApi {
    constructor(sessionId: any);
    _storageKey: any;
    _authKeys: {};
    load(): Promise<void>;
    setDC(dcId: any, serverAddress: any, port: any, skipUpdateStorage?: boolean): void;
    _dcId: any;
    _serverAddress: any;
    _port: any;
    save(): Promise<any>;
    set authKey(arg: void);
    get authKey(): void;
    getAuthKey(dcId?: any): any;
    setAuthKey(authKey: any, dcId?: any): void;
    _updateStorage(): Promise<void>;
    delete(): Promise<void>;
}
