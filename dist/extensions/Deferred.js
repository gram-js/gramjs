"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
        });
    }
    static resolved(value) {
        const deferred = new Deferred();
        deferred.resolve(value);
        return deferred;
    }
}
exports.default = Deferred;
