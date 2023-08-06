import bigInt from "big-integer";
import Deferred from "../extensions/Deferred";
import { Api } from "../tl";

export class RequestState {
    public containerId?: bigInt.BigInteger;
    public msgId?: bigInt.BigInteger;
    public request: any;
    public data: Buffer;
    public after: any;
    public result: undefined;
    public finished: Deferred;
    public promise: Promise<unknown> | undefined;
    // @ts-ignore
    public resolve: (value?: any) => void;
    // @ts-ignore
    public reject: (reason?: any) => void;

    constructor(request: Api.AnyRequest | Api.MsgsAck | Api.MsgsStateInfo) {
        this.containerId = undefined;
        this.msgId = undefined;
        this.request = request;
        this.data = request.getBytes();
        this.after = undefined;
        this.result = undefined;
        this.finished = new Deferred();

        this.resetPromise();
    }

    isReady() {
        if (!this.after) {
            return true;
        }

        return this.after.finished.promise;
    }

    resetPromise() {
        // Prevent stuck await
        this.reject?.();

        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
