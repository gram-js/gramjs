/// <reference types="node" />
import type { MTProtoState } from "../network/MTProtoState";
import type { RequestState } from "../network/RequestState";
export declare class MessagePacker {
    private _state;
    private _pendingStates;
    private _queue;
    private _ready;
    private setReady;
    private _log;
    constructor(state: MTProtoState, logger: any);
    values(): any[];
    append(state?: RequestState, setReady?: boolean, atStart?: boolean): void;
    prepend(states: RequestState[]): void;
    extend(states: RequestState[]): void;
    clear(): void;
    wait(): Promise<void>;
    get(): Promise<{
        batch: any[];
        data: Buffer;
    } | null | undefined>;
}
