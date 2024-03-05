import { RequestState } from "../network/RequestState";
import bigInt from "big-integer";
export declare class PendingState {
    _pending: Map<string, RequestState>;
    constructor();
    set(msgId: bigInt.BigInteger, state: RequestState): void;
    get(msgId: bigInt.BigInteger): RequestState | undefined;
    getAndDelete(msgId: bigInt.BigInteger): RequestState | undefined;
    values(): RequestState[];
    delete(msgId: bigInt.BigInteger): void;
    clear(): void;
}
