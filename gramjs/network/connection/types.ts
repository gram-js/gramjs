export interface ProxyInterface {
    socksType?: 4 | 5;
    ip: string;
    port: number;
    secret?: string;
    MTProxy?: boolean;
    timeout?: number;
    username?: string;
    password?: string;
}
