import { RequestState } from "../network/RequestState";
import bigInt from "big-integer";

export class PendingState {
    _pending: Map<string, RequestState>;
    constructor() {
        this._pending = new Map();
    }

    set(msgId: bigInt.BigInteger, state: RequestState) {
        this._pending.set(msgId.toString(), state);
    }

    get(msgId: bigInt.BigInteger) {
        return this._pending.get(msgId.toString());
    }

    getAndDelete(msgId: bigInt.BigInteger) {
        const state = this.get(msgId);
        this.delete(msgId);
        return state;
    }

    values() {
        return Array.from(this._pending.values());
    }

    delete(msgId: bigInt.BigInteger) {
        this._pending.delete(msgId.toString());
    }

    clear() {
        this._pending.clear();
    }
}
