import { MemorySession } from "./Memory";
import { AuthKey } from "../crypto/AuthKey";
import bigInt from "big-integer";
export declare class StoreSession extends MemorySession {
    private readonly sessionName;
    private store;
    constructor(sessionName: string, divider?: string);
    load(): Promise<void>;
    setDC(dcId: number, serverAddress: string, port: number): void;
    set authKey(value: AuthKey | undefined);
    get authKey(): AuthKey | undefined;
    processEntities(tlo: any): void;
    getEntityRowsById(id: string | bigInt.BigInteger, exact?: boolean): any;
}
