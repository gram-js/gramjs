export default class Deferred<T = void> {
    promise: Promise<T>;
    reject: (reason?: any) => void;
    resolve: (value: T | PromiseLike<T>) => void;
    constructor();
    static resolved(): Deferred<void>;
    static resolved<T>(value: T): Deferred<T>;
}
